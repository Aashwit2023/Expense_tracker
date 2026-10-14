import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';
import { generateCSV } from '../../utils/csv';
import { formatCurrencyINR, paiseToRupees } from '../../utils/currency';

export async function getDashboardData(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { period = 'this-month', startDate: customStart, endDate: customEnd } = req.query;

  const now = new Date();
  let start: Date;
  let end: Date = new Date();

  if (period === 'this-week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    start = new Date(now.setDate(diff));
    start.setHours(0, 0, 0, 0);
  } else if (period === 'last-month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'custom' && customStart && customEnd) {
    start = new Date(String(customStart));
    end = new Date(String(customEnd));
    if (String(customEnd).length <= 10) end.setHours(23, 59, 59, 999);
  } else {
    // default 'this-month'
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  // 1. Total income, expense, net cashflow
  const incomeAgg = await prisma.transaction.aggregate({
    where: { userId, type: 'INCOME', date: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: true,
  });

  const expenseAgg = await prisma.transaction.aggregate({
    where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: true,
  });

  const totalIncome = incomeAgg._sum.amount || 0;
  const totalExpense = expenseAgg._sum.amount || 0;
  const netCashFlow = totalIncome - totalExpense;

  // 2. Spending by category for period
  const expenses = await prisma.transaction.findMany({
    where: { userId, type: 'EXPENSE', date: { gte: start, lte: end } },
    include: { category: true },
  });

  const categoryMap = new Map<string, { id: string; name: string; color: string; icon: string; amount: number }>();
  for (const exp of expenses) {
    const catId = exp.categoryId || 'uncategorized';
    const catName = exp.category?.name || 'Uncategorized';
    const color = exp.category?.color || '#94A3B8';
    const icon = exp.category?.icon || 'Tag';

    const curr = categoryMap.get(catId) || { id: catId, name: catName, color, icon, amount: 0 };
    curr.amount += exp.amount;
    categoryMap.set(catId, curr);
  }

  const spendingByCategory = Array.from(categoryMap.values())
    .map((c) => ({
      ...c,
      percentage: totalExpense > 0 ? Math.round((c.amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 3. Spending Trends (daily timeline including routine and debt transactions)
  const [allPeriodTransactions, allPeriodObligations, allPeriodRepayments] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
    prisma.obligation.findMany({
      where: { userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.repayment.findMany({
      where: { obligation: { userId }, date: { gte: start, lte: end } },
      include: { obligation: true },
      orderBy: { date: 'asc' },
    }),
  ]);

  const dailyTrendMap = new Map<
    string,
    {
      date: string;
      income: number;
      expense: number;
      debtInflow: number;
      debtOutflow: number;
      totalInflow: number;
      totalOutflow: number;
      netFlow: number;
    }
  >();

  const getOrCreateDay = (dateKey: string) => {
    let day = dailyTrendMap.get(dateKey);
    if (!day) {
      day = {
        date: dateKey,
        income: 0,
        expense: 0,
        debtInflow: 0,
        debtOutflow: 0,
        totalInflow: 0,
        totalOutflow: 0,
        netFlow: 0,
      };
      dailyTrendMap.set(dateKey, day);
    }
    return day;
  };

  for (const tx of allPeriodTransactions) {
    const dateKey = tx.date.toISOString().split('T')[0];
    const day = getOrCreateDay(dateKey);
    if (tx.type === 'INCOME') day.income += tx.amount;
    if (tx.type === 'EXPENSE') day.expense += tx.amount;
  }

  for (const ob of allPeriodObligations) {
    const dateKey = ob.createdAt.toISOString().split('T')[0];
    const day = getOrCreateDay(dateKey);
    if (ob.type === 'LENT' || ob.type === 'ADVANCE') {
      day.debtOutflow += ob.amount;
    } else if (ob.type === 'BORROWED') {
      day.debtInflow += ob.amount;
    }
  }

  for (const rep of allPeriodRepayments) {
    const dateKey = rep.date.toISOString().split('T')[0];
    const day = getOrCreateDay(dateKey);
    if (rep.obligation.type === 'LENT' || rep.obligation.type === 'ADVANCE') {
      day.debtInflow += rep.amount;
    } else if (rep.obligation.type === 'BORROWED') {
      day.debtOutflow += rep.amount;
    }
  }

  for (const day of dailyTrendMap.values()) {
    day.totalInflow = day.income + day.debtInflow;
    day.totalOutflow = day.expense + day.debtOutflow;
    day.netFlow = day.totalInflow - day.totalOutflow;
  }

  const spendingTrends = Array.from(dailyTrendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 4. Budget utilization
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const budgets = await prisma.budget.findMany({
    where: { userId, month: currentMonth, year: currentYear },
    include: { category: true },
  });

  let totalBudgetAmount = 0;
  let totalBudgetSpent = 0;

  const budgetItems = await Promise.all(
    budgets.map(async (b) => {
      const monthStart = new Date(currentYear, currentMonth - 1, 1);
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
      const bSpent = await prisma.transaction.aggregate({
        where: { userId, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      });
      const spent = bSpent._sum.amount || 0;
      totalBudgetAmount += b.amount;
      totalBudgetSpent += spent;
      return {
        ...b,
        spent,
        percentage: b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0,
      };
    })
  );

  const budgetUtilization = {
    totalBudgeted: totalBudgetAmount,
    totalSpent: totalBudgetSpent,
    percentage: totalBudgetAmount > 0 ? Math.round((totalBudgetSpent / totalBudgetAmount) * 100) : 0,
    items: budgetItems,
  };

  // 5. Recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: { userId },
    include: {
      account: { select: { id: true, name: true, color: true } },
      toAccount: { select: { id: true, name: true, color: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { date: 'desc' },
    take: 6,
  });

  // 6. Upcoming bills (recurring expenses)
  const upcomingBills = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, type: 'EXPENSE' },
    include: { category: true },
    orderBy: { nextDueDate: 'asc' },
    take: 5,
  });

  // 7. Outstanding & Historical Obligations
  const allUserObligations = await prisma.obligation.findMany({
    where: { userId },
    include: { repayments: true },
  });

  const totalLentOutstanding = allUserObligations
    .filter((o) => (o.type === 'LENT' || o.type === 'ADVANCE') && o.status === 'ACTIVE')
    .reduce((sum, o) => {
      const repaid = o.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      return sum + Math.max(0, o.amount - repaid);
    }, 0);

  const totalBorrowedOutstanding = allUserObligations
    .filter((o) => o.type === 'BORROWED' && o.status === 'ACTIVE')
    .reduce((sum, o) => {
      const repaid = o.repayments.reduce((rSum, r) => rSum + r.amount, 0);
      return sum + Math.max(0, o.amount - repaid);
    }, 0);

  const totalLentOriginal = allUserObligations
    .filter((o) => o.type === 'LENT' || o.type === 'ADVANCE')
    .reduce((sum, o) => sum + o.amount, 0);

  const totalBorrowedOriginal = allUserObligations
    .filter((o) => o.type === 'BORROWED')
    .reduce((sum, o) => sum + o.amount, 0);

  const totalLentRepaid = allUserObligations
    .filter((o) => o.type === 'LENT' || o.type === 'ADVANCE')
    .reduce((sum, o) => sum + o.repayments.reduce((rSum, r) => rSum + r.amount, 0), 0);

  const totalBorrowedRepaid = allUserObligations
    .filter((o) => o.type === 'BORROWED')
    .reduce((sum, o) => sum + o.repayments.reduce((rSum, r) => rSum + r.amount, 0), 0);

  const personBreakdown = allUserObligations.map((o) => {
    const repaid = o.repayments.reduce((rSum, r) => rSum + r.amount, 0);
    const remaining = Math.max(0, o.amount - repaid);
    return {
      id: o.id,
      personName: o.personName,
      type: o.type,
      amount: o.amount,
      repaid,
      remaining,
      status: o.status,
    };
  });

  // 8. Total user transactions and obligations count (for empty state detection)
  const totalUserTransactionsCount = await prisma.transaction.count({ where: { userId } });
  const totalObligationsCount = await prisma.obligation.count({ where: { userId } });

  // 9. Accounts and Net Worth
  const accounts = await prisma.account.findMany({ where: { userId } });
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const inc = await prisma.transaction.aggregate({ where: { userId, accountId: acc.id, type: 'INCOME' }, _sum: { amount: true } });
      const exp = await prisma.transaction.aggregate({ where: { userId, accountId: acc.id, type: 'EXPENSE' }, _sum: { amount: true } });
      const trOut = await prisma.transaction.aggregate({ where: { userId, accountId: acc.id, type: 'TRANSFER' }, _sum: { amount: true } });
      const trIn = await prisma.transaction.aggregate({ where: { userId, toAccountId: acc.id, type: 'TRANSFER' }, _sum: { amount: true } });
      const lent = await prisma.obligation.aggregate({ where: { userId, accountId: acc.id, type: { in: ['LENT', 'ADVANCE'] } }, _sum: { amount: true } });
      const borrowed = await prisma.obligation.aggregate({ where: { userId, accountId: acc.id, type: 'BORROWED' }, _sum: { amount: true } });
      const lentRepaid = await prisma.repayment.aggregate({ where: { accountId: acc.id, obligation: { userId, type: { in: ['LENT', 'ADVANCE'] } } }, _sum: { amount: true } });
      const borrowedRepaid = await prisma.repayment.aggregate({ where: { accountId: acc.id, obligation: { userId, type: 'BORROWED' } }, _sum: { amount: true } });

      const currentBalance =
        acc.initialBalance +
        (inc._sum.amount || 0) -
        (exp._sum.amount || 0) +
        (trIn._sum.amount || 0) -
        (trOut._sum.amount || 0) -
        (lent._sum.amount || 0) +
        (borrowed._sum.amount || 0) +
        (lentRepaid._sum.amount || 0) -
        (borrowedRepaid._sum.amount || 0);

      return { ...acc, currentBalance };
    })
  );

  const totalLiquidBalance = accountsWithBalances.reduce((sum, a) => sum + a.currentBalance, 0);
  const netWorth = totalLiquidBalance + totalLentOutstanding - totalBorrowedOutstanding;

  res.json({
    success: true,
    data: {
      period,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow,
        incomeCount: incomeAgg._count,
        expenseCount: expenseAgg._count,
        totalLiquidBalance,
        netWorth,
      },
      accounts: accountsWithBalances,
      spendingByCategory,
      spendingTrends,
      budgetUtilization,
      recentTransactions,
      upcomingBills,
      obligations: {
        totalLentOutstanding,
        totalBorrowedOutstanding,
        totalLentOriginal,
        totalBorrowedOriginal,
        totalLentRepaid,
        totalBorrowedRepaid,
        personBreakdown,
      },
      hasData: totalUserTransactionsCount > 0 || totalObligationsCount > 0,
    },
  });
}

export async function getAnalyticsReport(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Current month stats
  const currentMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const currentMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  // Previous month stats
  const prevMonthStart = new Date(currentYear, currentMonth - 2, 1);
  const prevMonthEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59, 999);

  const [curInc, curExp, prevInc, prevExp] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: currentMonthStart, lte: currentMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: currentMonthStart, lte: currentMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'INCOME', date: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId, type: 'EXPENSE', date: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { amount: true },
    }),
  ]);

  const currentMonthIncome = curInc._sum.amount || 0;
  const currentMonthExpense = curExp._sum.amount || 0;
  const prevMonthIncome = prevInc._sum.amount || 0;
  const prevMonthExpense = prevExp._sum.amount || 0;

  const incomeMoMGrowth = prevMonthIncome > 0 ? Math.round(((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100) : 0;
  const expenseMoMGrowth = prevMonthExpense > 0 ? Math.round(((currentMonthExpense - prevMonthExpense) / prevMonthExpense) * 100) : 0;

  // Monthly breakdown for last 6 months including debt transactions
  const monthlyBreakdown = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const mStart = new Date(y, m - 1, 1);
    const mEnd = new Date(y, m, 0, 23, 59, 59, 999);

    const [mInc, mExp, mLent, mBorrowed, mLentRepaid, mBorrowedRepaid] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: 'INCOME', date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: 'EXPENSE', date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.obligation.aggregate({
        where: { userId, type: { in: ['LENT', 'ADVANCE'] }, createdAt: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.obligation.aggregate({
        where: { userId, type: 'BORROWED', createdAt: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.repayment.aggregate({
        where: { obligation: { userId, type: { in: ['LENT', 'ADVANCE'] } }, date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
      prisma.repayment.aggregate({
        where: { obligation: { userId, type: 'BORROWED' }, date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      }),
    ]);

    const inc = mInc._sum.amount || 0;
    const exp = mExp._sum.amount || 0;
    const lent = mLent._sum.amount || 0;
    const borrowed = mBorrowed._sum.amount || 0;
    const lentRepaid = mLentRepaid._sum.amount || 0;
    const borrowedRepaid = mBorrowedRepaid._sum.amount || 0;
    const debtInflow = borrowed + lentRepaid;
    const debtOutflow = lent + borrowedRepaid;

    monthlyBreakdown.push({
      label: d.toLocaleString('default', { month: 'short' }) + ' ' + y,
      month: m,
      year: y,
      income: inc,
      expense: exp,
      debtInflow,
      debtOutflow,
      totalInflow: inc + debtInflow,
      totalOutflow: exp + debtOutflow,
      netCashFlow: (inc + debtInflow) - (exp + debtOutflow),
      savings: inc - exp,
    });
  }

  res.json({
    success: true,
    data: {
      mom: {
        currentMonthIncome,
        currentMonthExpense,
        prevMonthIncome,
        prevMonthExpense,
        incomeMoMGrowth,
        expenseMoMGrowth,
      },
      monthlyBreakdown,
    },
  });
}

export async function exportTransactionsCSV(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { startDate, endDate, categoryId, accountId, type } = req.query;

  const whereClause: any = { userId };
  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(String(startDate));
    if (endDate) {
      const e = new Date(String(endDate));
      if (String(endDate).length <= 10) e.setHours(23, 59, 59, 999);
      whereClause.date.lte = e;
    }
  }
  if (categoryId) whereClause.categoryId = String(categoryId);
  if (accountId) whereClause.accountId = String(accountId);
  if (type) whereClause.type = String(type);

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      account: true,
      toAccount: true,
      category: true,
    },
    orderBy: { date: 'desc' },
  });

  const headers = [
    'Date',
    'Type',
    'Amount (INR)',
    'Category',
    'Account',
    'Transfer Destination',
    'Merchant / Payee',
    'Description',
    'Payment Method',
    'Notes',
  ];

  const rows = transactions.map((t) => [
    t.date.toISOString().split('T')[0],
    t.type,
    paiseToRupees(t.amount).toFixed(2),
    t.category?.name || 'Uncategorized',
    t.account.name,
    t.toAccount?.name || '',
    t.merchant || '',
    t.description,
    t.paymentMethod,
    t.notes || '',
  ]);

  const csvContent = generateCSV(headers, rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`);
  res.status(200).send(csvContent);
}
