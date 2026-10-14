import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function getAccounts(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate current balances dynamically factoring transactions AND debt/lent obligations
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      // 1. Routine Income
      const incomeSum = await prisma.transaction.aggregate({
        where: { userId, accountId: acc.id, type: 'INCOME' },
        _sum: { amount: true },
      });

      // 2. Routine Expenses
      const expenseSum = await prisma.transaction.aggregate({
        where: { userId, accountId: acc.id, type: 'EXPENSE' },
        _sum: { amount: true },
      });

      // 3. Transfers between own accounts
      const transferOutSum = await prisma.transaction.aggregate({
        where: { userId, accountId: acc.id, type: 'TRANSFER' },
        _sum: { amount: true },
      });

      const transferInSum = await prisma.transaction.aggregate({
        where: { userId, toAccountId: acc.id, type: 'TRANSFER' },
        _sum: { amount: true },
      });

      // 4. Money Lent or Advances paid out from this account (Bank outflow)
      const lentOutSum = await prisma.obligation.aggregate({
        where: { userId, accountId: acc.id, type: { in: ['LENT', 'ADVANCE'] } },
        _sum: { amount: true },
      });

      // 5. Money Borrowed deposited into this account (Bank inflow)
      const borrowedInSum = await prisma.obligation.aggregate({
        where: { userId, accountId: acc.id, type: 'BORROWED' },
        _sum: { amount: true },
      });

      // 6. Repayments received on money lent (Bank inflow)
      const lentRepaidInSum = await prisma.repayment.aggregate({
        where: {
          accountId: acc.id,
          obligation: { userId, type: { in: ['LENT', 'ADVANCE'] } },
        },
        _sum: { amount: true },
      });

      // 7. Repayments made on money borrowed (Bank outflow)
      const borrowedRepaidOutSum = await prisma.repayment.aggregate({
        where: {
          accountId: acc.id,
          obligation: { userId, type: 'BORROWED' },
        },
        _sum: { amount: true },
      });

      const income = incomeSum._sum.amount || 0;
      const expense = expenseSum._sum.amount || 0;
      const transferOut = transferOutSum._sum.amount || 0;
      const transferIn = transferInSum._sum.amount || 0;
      const lentOut = lentOutSum._sum.amount || 0;
      const borrowedIn = borrowedInSum._sum.amount || 0;
      const lentRepaidIn = lentRepaidInSum._sum.amount || 0;
      const borrowedRepaidOut = borrowedRepaidOutSum._sum.amount || 0;

      // Net current balance calculation
      const currentBalance =
        acc.initialBalance +
        income -
        expense +
        transferIn -
        transferOut -
        lentOut +
        borrowedIn +
        lentRepaidIn -
        borrowedRepaidOut;

      return {
        ...acc,
        currentBalance,
      };
    })
  );

  res.json({
    success: true,
    data: accountsWithBalances,
  });
}

export async function createAccount(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, type, initialBalance, color, isDefault } = req.body;

  if (!name || !type) {
    res.status(400).json({ success: false, message: 'Account name and type are required' });
    return;
  }

  if (isDefault) {
    await prisma.account.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const account = await prisma.account.create({
    data: {
      userId,
      name,
      type,
      initialBalance: parseInt(initialBalance || 0, 10),
      color: color || '#0F172A',
      isDefault: Boolean(isDefault),
    },
  });

  res.status(201).json({
    success: true,
    data: { ...account, currentBalance: account.initialBalance },
  });
}

export async function updateAccount(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, type, color, isDefault } = req.body;

  const existing = await prisma.account.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Account not found' });
    return;
  }

  if (isDefault) {
    await prisma.account.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.account.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...(color && { color }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  res.json({ success: true, data: updated });
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.account.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Account not found' });
    return;
  }

  await prisma.account.delete({ where: { id } });

  res.json({ success: true, message: 'Account deleted successfully' });
}
