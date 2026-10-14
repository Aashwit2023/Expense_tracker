import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function getBudgets(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const now = new Date();
  const month = parseInt(String(req.query.month || now.getMonth() + 1), 10);
  const year = parseInt(String(req.query.year || now.getFullYear()), 10);

  const budgets = await prisma.budget.findMany({
    where: { userId, month, year },
    include: {
      category: true,
    },
    orderBy: { amount: 'desc' },
  });

  // Calculate start and end of the specified month
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Compute spending for each budget
  const enrichedBudgets = await Promise.all(
    budgets.map(async (b) => {
      // Find actual EXPENSES for this category in this month (ignoring transfers)
      const spendingAgg = await prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: b.categoryId,
          type: 'EXPENSE',
          date: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { amount: true },
        _count: true,
      });

      const spent = spendingAgg._sum.amount || 0;
      const remaining = b.amount - spent;
      const percentage = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
      const isExceeded = spent > b.amount;
      const isWarning = !isExceeded && percentage >= 80;

      return {
        ...b,
        spent,
        remaining,
        percentage,
        isExceeded,
        isWarning,
        transactionCount: spendingAgg._count,
      };
    })
  );

  const totalBudgeted = enrichedBudgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = enrichedBudgets.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  res.json({
    success: true,
    data: {
      month,
      year,
      budgets: enrichedBudgets,
      summary: {
        totalBudgeted,
        totalSpent,
        totalRemaining,
        overallPercentage,
      },
    },
  });
}

export async function upsertBudget(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { categoryId, month, year, amount } = req.body;

  if (!categoryId || !month || !year || amount === undefined) {
    res.status(400).json({ success: false, message: 'CategoryId, month, year, and amount are required' });
    return;
  }

  const budget = await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId,
        categoryId,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
    },
    update: {
      amount: parseInt(amount, 10),
    },
    create: {
      userId,
      categoryId,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      amount: parseInt(amount, 10),
    },
    include: {
      category: true,
    },
  });

  res.json({ success: true, data: budget });
}

export async function deleteBudget(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.budget.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Budget not found' });
    return;
  }

  await prisma.budget.delete({ where: { id } });

  res.json({ success: true, message: 'Budget removed successfully' });
}
