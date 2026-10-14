import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';
import {
  calculateEqualSplit,
  validateAndCalculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '../groups/group.split';

export async function getTransactions(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const {
    startDate,
    endDate,
    categoryId,
    accountId,
    type,
    paymentMethod,
    search,
    sortBy = 'date',
    sortOrder = 'desc',
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const whereClause: any = {
    userId,
  };

  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) {
      whereClause.date.gte = new Date(String(startDate));
    }
    if (endDate) {
      const end = new Date(String(endDate));
      // If only date is provided, include the full end day up to 23:59:59.999
      if (String(endDate).length <= 10) {
        end.setHours(23, 59, 59, 999);
      }
      whereClause.date.lte = end;
    }
  }

  if (categoryId) {
    whereClause.categoryId = String(categoryId);
  }

  if (accountId) {
    whereClause.OR = [
      { accountId: String(accountId) },
      { toAccountId: String(accountId) },
    ];
  }

  if (type) {
    whereClause.type = String(type);
  }

  if (paymentMethod) {
    whereClause.paymentMethod = String(paymentMethod);
  }

  if (search) {
    const term = String(search).trim();
    whereClause.AND = [
      {
        OR: [
          { description: { contains: term } },
          { merchant: { contains: term } },
          { notes: { contains: term } },
        ],
      },
    ];
  }

  // Calculate totals for filtered transactions
  const incomeAgg = await prisma.transaction.aggregate({
    where: { ...whereClause, type: 'INCOME' },
    _sum: { amount: true },
    _count: true,
  });

  const expenseAgg = await prisma.transaction.aggregate({
    where: { ...whereClause, type: 'EXPENSE' },
    _sum: { amount: true },
    _count: true,
  });

  const transferAgg = await prisma.transaction.aggregate({
    where: { ...whereClause, type: 'TRANSFER' },
    _sum: { amount: true },
    _count: true,
  });

  const totalCount = await prisma.transaction.count({ where: whereClause });

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;
  const totalTransfers = transferAgg._sum.amount || 0;
  const netCashFlow = totalIncome - totalExpense;

  const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';
  const orderByClause: any = {};
  if (sortBy === 'amount') {
    orderByClause.amount = orderDirection;
  } else {
    orderByClause.date = orderDirection;
  }

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      account: { select: { id: true, name: true, type: true, color: true } },
      toAccount: { select: { id: true, name: true, type: true, color: true } },
      category: { select: { id: true, name: true, icon: true, color: true, type: true } },
    },
    orderBy: [orderByClause, { createdAt: 'desc' }],
    skip,
    take: limitNum,
  });

  res.json({
    success: true,
    data: {
      transactions,
      meta: {
        page: pageNum,
        limit: limitNum,
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
      summary: {
        totalIncome,
        totalExpense,
        totalTransfers,
        netCashFlow,
        count: totalCount,
      },
    },
  });
}

export async function createTransaction(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const {
    accountId,
    toAccountId,
    categoryId,
    type,
    amount,
    date,
    merchant,
    description,
    notes,
    paymentMethod,
  } = req.body;

  // Verify account ownership
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) {
    res.status(400).json({ success: false, message: 'Invalid source account' });
    return;
  }

  if (type === 'TRANSFER' && toAccountId) {
    const toAccount = await prisma.account.findFirst({
      where: { id: toAccountId, userId },
    });
    if (!toAccount) {
      res.status(400).json({ success: false, message: 'Invalid destination account' });
      return;
    }
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : null,
      categoryId: type === 'TRANSFER' ? null : categoryId,
      type,
      amount: parseInt(amount, 10),
      date: new Date(date),
      merchant: merchant || null,
      description,
      notes: notes || null,
      paymentMethod: paymentMethod || 'UPI',
    },
    include: {
      account: true,
      toAccount: true,
      category: true,
    },
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
}

export async function updateTransaction(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const updateData = req.body;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Transaction not found' });
    return;
  }

  if (updateData.accountId) {
    const acc = await prisma.account.findFirst({
      where: { id: updateData.accountId, userId },
    });
    if (!acc) {
      res.status(400).json({ success: false, message: 'Invalid source account' });
      return;
    }
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(updateData.accountId && { accountId: updateData.accountId }),
      ...(updateData.toAccountId !== undefined && { toAccountId: updateData.toAccountId }),
      ...(updateData.categoryId !== undefined && { categoryId: updateData.categoryId }),
      ...(updateData.type && { type: updateData.type }),
      ...(updateData.amount !== undefined && { amount: parseInt(updateData.amount, 10) }),
      ...(updateData.date && { date: new Date(updateData.date) }),
      ...(updateData.merchant !== undefined && { merchant: updateData.merchant }),
      ...(updateData.description && { description: updateData.description }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.paymentMethod && { paymentMethod: updateData.paymentMethod }),
    },
    include: {
      account: true,
      toAccount: true,
      category: true,
    },
  });

  res.json({
    success: true,
    data: updated,
  });
}

export async function deleteTransaction(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ success: false, message: 'Transaction not found' });
    return;
  }

  await prisma.transaction.delete({ where: { id } });

  res.json({
    success: true,
    message: 'Transaction deleted successfully',
  });
}

export async function splitTransaction(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const {
    groupId,
    splitMethod = 'EQUAL',
    participantIds,
    allocations,
    percentages,
    shares,
    notes,
  } = req.body;

  if (!groupId || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
    res.status(400).json({ success: false, message: 'Group ID and participant IDs are required' });
    return;
  }

  const existingTx = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { account: true, category: true },
  });

  if (!existingTx) {
    res.status(404).json({ success: false, message: 'Transaction not found' });
    return;
  }

  if (existingTx.type !== 'EXPENSE') {
    res.status(400).json({ success: false, message: 'Only expense transactions can be split with a group' });
    return;
  }

  // Find target group and user's membership
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) {
    res.status(404).json({ success: false, message: 'Selected group not found' });
    return;
  }

  let userMember = group.members.find((m) => m.userId === userId);
  if (!userMember && group.createdById === userId) {
    userMember = group.members.find((m) => m.role === 'ADMIN') || group.members[0];
  }
  if (!userMember) {
    res.status(403).json({ success: false, message: 'You are not a member of this group' });
    return;
  }

  // Determine original full amount
  const fullAmount = existingTx.originalAmount || existingTx.amount;

  // Calculate split shares
  let calculatedShares: { memberId: string; shareAmount: number }[] = [];
  try {
    switch (splitMethod) {
      case 'EQUAL':
        calculatedShares = calculateEqualSplit(fullAmount, participantIds);
        break;
      case 'UNEQUAL': {
        if (!allocations) throw new Error('Allocations required for unequal split');
        const normalized = allocations.map((a: any) => ({
          memberId: a.memberId,
          amountPaise: Number(a.amountPaise ?? a.amount ?? 0),
        }));
        calculatedShares = validateAndCalculateUnequalSplit(fullAmount, normalized);
        break;
      }
      case 'PERCENTAGE': {
        if (!percentages) throw new Error('Percentages required for percentage split');
        const normalized = percentages.map((p: any) => ({
          memberId: p.memberId,
          percentage: Number(p.percentage ?? p.percent ?? 0),
        }));
        calculatedShares = calculatePercentageSplit(fullAmount, normalized);
        break;
      }
      case 'SHARES': {
        if (!shares) throw new Error('Shares required for shares split');
        const normalized = shares.map((s: any) => ({
          memberId: s.memberId,
          share: Number(s.share ?? s.shares ?? 1),
        }));
        calculatedShares = calculateSharesSplit(fullAmount, normalized);
        break;
      }
      default:
        calculatedShares = calculateEqualSplit(fullAmount, participantIds);
    }
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Invalid split calculation' });
    return;
  }

  // User's own personal share vs amount to collect from others
  const userShareObj = calculatedShares.find((s) => s.memberId === userMember.id);
  const userShare = userShareObj ? userShareObj.shareAmount : 0;
  const othersShare = fullAmount - userShare;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the GroupExpense in the selected group
    const groupExpense = await tx.groupExpense.create({
      data: {
        groupId,
        payerId: userMember.id,
        createdById: userId,
        title: existingTx.description || 'Shared Expense',
        amount: fullAmount,
        date: existingTx.date,
        category: existingTx.category?.name || 'Other',
        splitMethod,
        notes: notes || `Split from personal transaction on ${existingTx.date.toISOString().slice(0, 10)}`,
        status: 'ACTIVE',
      },
    });

    // 2. Create the participants in the group expense
    for (const s of calculatedShares) {
      await tx.expenseParticipant.create({
        data: {
          expenseId: groupExpense.id,
          memberId: s.memberId,
          shareAmount: s.shareAmount,
        },
      });
    }

    // 3. Update the user's personal Transaction so financial dashboard reflects user's true expense
    const updatedTx = await tx.transaction.update({
      where: { id },
      data: {
        originalAmount: fullAmount,
        amount: userShare, // Net expense on user's living budget is only their share!
        userShareAmount: userShare,
        splitGroupId: groupId,
        splitExpenseId: groupExpense.id,
        notes: (existingTx.notes ? existingTx.notes + ' • ' : '') +
          `Split with ${group.name} (Your share: ₹${(userShare / 100).toFixed(2)}, Others owe: ₹${(othersShare / 100).toFixed(2)})`,
      },
      include: {
        account: true,
        category: true,
      },
    });

    // 4. Create an Obligation (Money Lent/Receivable) for others' share from this account
    // This preserves bank account ledger integrity:
    // Net bank outflow remains userShare + lentOut = fullAmount until repayments are received!
    if (othersShare > 0) {
      await tx.obligation.create({
        data: {
          userId,
          accountId: existingTx.accountId,
          type: 'LENT',
          personName: group.name,
          amount: othersShare,
          description: `Group split receivable for ${existingTx.description}`,
          notes: `Linked to group "${group.name}" expense "${groupExpense.title}" (ID: ${groupExpense.id})`,
          status: 'ACTIVE',
        },
      });
    }

    // 5. Activity log in group
    const userObj = await tx.user.findUnique({ where: { id: userId } });
    await tx.groupActivity.create({
      data: {
        groupId,
        actorId: userId,
        action: 'EXPENSE_ADDED',
        description: `${userObj?.name || 'A member'} split bill "${existingTx.description}" for ₹${(fullAmount / 100).toFixed(2)}`,
        entityType: 'EXPENSE',
        entityId: groupExpense.id,
      },
    });

    return {
      transaction: updatedTx,
      groupExpense,
      userShare,
      othersShare,
    };
  });

  res.json({
    success: true,
    data: result,
  });
}
