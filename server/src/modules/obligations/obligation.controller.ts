import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function getObligations(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { type, status } = req.query;

  const whereClause: any = { userId };
  if (type) whereClause.type = String(type);
  if (status) whereClause.status = String(status);

  const obligations = await prisma.obligation.findMany({
    where: whereClause,
    include: {
      account: { select: { id: true, name: true, type: true, color: true } },
      repayments: {
        include: {
          account: { select: { id: true, name: true, type: true, color: true } },
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  const now = new Date();

  const enriched = obligations.map((ob) => {
    const totalRepaid = ob.repayments.reduce((acc, r) => acc + r.amount, 0);
    const balanceRemaining = Math.max(0, ob.amount - totalRepaid);
    const isOverdue = ob.status === 'ACTIVE' && ob.dueDate ? new Date(ob.dueDate) < now : false;

    return {
      ...ob,
      totalRepaid,
      balanceRemaining,
      isOverdue,
    };
  });

  // Calculate high-level financial obligation totals
  const totalLentOutstanding = enriched
    .filter((ob) => ob.type === 'LENT' && ob.status === 'ACTIVE')
    .reduce((acc, ob) => acc + ob.balanceRemaining, 0);

  const totalBorrowedOutstanding = enriched
    .filter((ob) => ob.type === 'BORROWED' && ob.status === 'ACTIVE')
    .reduce((acc, ob) => acc + ob.balanceRemaining, 0);

  const totalAdvanceOutstanding = enriched
    .filter((ob) => ob.type === 'ADVANCE' && ob.status === 'ACTIVE')
    .reduce((acc, ob) => acc + ob.balanceRemaining, 0);

  res.json({
    success: true,
    data: {
      obligations: enriched,
      summary: {
        totalLentOutstanding,
        totalBorrowedOutstanding,
        totalAdvanceOutstanding,
      },
    },
  });
}

export async function createObligation(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { type, personName, personContact, amount, dueDate, description, notes, accountId } = req.body;

  if (!type || !personName || !amount || !description) {
    res.status(400).json({ success: false, message: 'Type, person name, amount, and description are required' });
    return;
  }

  // Resolve account that handles the financial transfer
  let resolvedAccountId = accountId;
  if (!resolvedAccountId) {
    const defaultAcc =
      (await prisma.account.findFirst({ where: { userId, isDefault: true } })) ||
      (await prisma.account.findFirst({ where: { userId } }));
    resolvedAccountId = defaultAcc?.id || null;
  } else {
    const acc = await prisma.account.findFirst({ where: { id: resolvedAccountId, userId } });
    if (!acc) {
      res.status(400).json({ success: false, message: 'Invalid bank/wallet account selected' });
      return;
    }
  }

  const obligation = await prisma.obligation.create({
    data: {
      userId,
      accountId: resolvedAccountId,
      type,
      personName,
      personContact: personContact || null,
      amount: parseInt(amount, 10),
      dueDate: dueDate ? new Date(dueDate) : null,
      description,
      notes: notes || null,
      status: 'ACTIVE',
    },
    include: {
      account: true,
      repayments: true,
    },
  });

  res.status(201).json({ success: true, data: obligation });
}

export async function recordRepayment(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params; // obligationId
  const { amount, date, notes, accountId } = req.body;

  const obligation = await prisma.obligation.findFirst({
    where: { id, userId },
    include: { repayments: true },
  });

  if (!obligation) {
    res.status(404).json({ success: false, message: 'Obligation record not found' });
    return;
  }

  const repaymentAmount = parseInt(amount, 10);
  if (repaymentAmount <= 0) {
    res.status(400).json({ success: false, message: 'Repayment amount must be positive' });
    return;
  }

  // Resolve account for this repayment
  let resolvedAccountId = accountId || obligation.accountId;
  if (!resolvedAccountId) {
    const defaultAcc =
      (await prisma.account.findFirst({ where: { userId, isDefault: true } })) ||
      (await prisma.account.findFirst({ where: { userId } }));
    resolvedAccountId = defaultAcc?.id || null;
  } else {
    const acc = await prisma.account.findFirst({ where: { id: resolvedAccountId, userId } });
    if (!acc) {
      res.status(400).json({ success: false, message: 'Invalid bank/wallet account selected' });
      return;
    }
  }

  const repayment = await prisma.repayment.create({
    data: {
      obligationId: id,
      accountId: resolvedAccountId,
      amount: repaymentAmount,
      date: date ? new Date(date) : new Date(),
      notes: notes || null,
    },
    include: {
      account: true,
    },
  });

  // Calculate new remaining balance
  const existingRepaid = obligation.repayments.reduce((acc, r) => acc + r.amount, 0);
  const totalRepaidAfter = existingRepaid + repaymentAmount;

  if (totalRepaidAfter >= obligation.amount) {
    await prisma.obligation.update({
      where: { id },
      data: { status: 'SETTLED' },
    });
  }

  res.status(201).json({
    success: true,
    data: repayment,
    message: totalRepaidAfter >= obligation.amount ? 'Obligation fully settled!' : 'Repayment recorded successfully',
  });
}

export async function updateObligation(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { personName, personContact, amount, dueDate, description, notes, status, accountId } = req.body;

  const existing = await prisma.obligation.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Obligation not found' });
    return;
  }

  if (accountId) {
    const acc = await prisma.account.findFirst({ where: { id: accountId, userId } });
    if (!acc) {
      res.status(400).json({ success: false, message: 'Invalid account' });
      return;
    }
  }

  const updated = await prisma.obligation.update({
    where: { id },
    data: {
      ...(personName && { personName }),
      ...(personContact !== undefined && { personContact }),
      ...(amount !== undefined && { amount: parseInt(amount, 10) }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(description && { description }),
      ...(notes !== undefined && { notes }),
      ...(status && { status }),
      ...(accountId !== undefined && { accountId }),
    },
    include: {
      account: true,
      repayments: { include: { account: true } },
    },
  });

  res.json({ success: true, data: updated });
}

export async function deleteObligation(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.obligation.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Obligation not found' });
    return;
  }

  await prisma.obligation.delete({ where: { id } });

  res.json({ success: true, message: 'Obligation deleted successfully' });
}
