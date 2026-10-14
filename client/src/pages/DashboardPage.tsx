import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart as PieIcon,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  Receipt,
  HandCoins,
  CheckCircle,
  Edit2,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { BudgetModal } from '../components/budgets/BudgetModal';
import { ObligationModal } from '../components/obligations/ObligationModal';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { SplitTransactionModal } from '../components/transactions/SplitTransactionModal';
import { formatCurrency, formatDate, formatChartAxisTick } from '../utils/formatters';
import api from '../api/client';

export const DashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<string>('this-month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Action Modal states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [splittingTransaction, setSplittingTransaction] = useState<any>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false);
  const [trendFilter, setTrendFilter] = useState<'ALL' | 'ROUTINE' | 'DEBT'>('ALL');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/reports/dashboard?period=${period}`);
      setData(res.data.data);
    } catch {
      setError('Failed to load dashboard metrics. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for global transaction events from Topbar "+ Add Transaction"
  useEffect(() => {
    const handleGlobalUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('transaction-updated', handleGlobalUpdate);
    return () => window.removeEventListener('transaction-updated', handleGlobalUpdate);
  }, [fetchDashboardData]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-2"></div>
        <span className="text-xs text-slate-500 font-medium">Calculating financial metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={fetchDashboardData}>
          Try Again
        </Button>
      </div>
    );
  }

  const {
    summary = {},
    accounts = [],
    spendingByCategory = [],
    spendingTrends = [],
    budgetUtilization = {},
    recentTransactions = [],
    upcomingBills = [],
    obligations = {},
    hasData = false,
  } = data || {};

  // Color palette for charts
  const CATEGORY_COLORS = ['#0F172A', '#0D9488', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#64748B'];

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Financial Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified financial summaries and balances for your active accounts
          </p>
        </div>

        {/* Date Filters & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setPeriod('this-week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                period === 'this-week'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('this-month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                period === 'this-month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('last-month')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                period === 'last-month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBudgetModalOpen(true)}
            icon={<PieIcon className="h-3.5 w-3.5" />}
          >
            Budget Target
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsObligationModalOpen(true)}
            icon={<HandCoins className="h-3.5 w-3.5" />}
          >
            Lent / Borrowed
          </Button>
        </div>
      </div>

      {/* Empty State for brand new users */}
      {!hasData && (
        <EmptyState
          icon={<Receipt className="h-8 w-8" />}
          title="No transactions recorded yet"
          description="Your personal ledger is completely clean. Start by adding your first income, expense, or account transfer to view live financial reports."
          actionText="Add First Transaction"
          onAction={() => setIsTxModalOpen(true)}
        />
      )}

      {/* Live Bank Accounts & Net Worth Overview Strip */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Liquid Bank Balance
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(summary.totalLiquidBalance || 0)}
              </span>
              <span className="text-xs text-slate-500 font-medium">across active accounts</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="text-left sm:text-right">
              <span className="text-[11px] text-slate-400 font-medium">Estimated Net Worth</span>
              <p
                className={`font-bold text-base ${
                  (summary.netWorth ?? 0) >= 0 ? 'text-slate-900' : 'text-rose-700'
                }`}
              >
                {formatCurrency(summary.netWorth || 0)}
              </p>
              <span className="text-[10px] text-slate-400">
                (Liquid + Lent - Borrowed)
              </span>
            </div>
          </div>
        </div>

        {accounts && accounts.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-3">
            {accounts.map((acc: any) => (
              <div
                key={acc.id}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: acc.color || '#0F172A' }}
                />
                <span className="font-medium text-slate-700">{acc.name}:</span>
                <span
                  className={`font-bold ${
                    acc.currentBalance < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(acc.currentBalance || 0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          amount={formatCurrency(summary.totalIncome || 0)}
          subtitle={`${summary.incomeCount || 0} credits recorded`}
          variant="income"
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        />

        <StatCard
          title="Total Expenses"
          amount={formatCurrency(summary.totalExpense || 0)}
          subtitle={`${summary.expenseCount || 0} debits recorded`}
          variant="expense"
          icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
        />

        <StatCard
          title="Net Cash Flow"
          amount={formatCurrency(summary.netCashFlow || 0)}
          subtitle={summary.netCashFlow >= 0 ? 'Surplus retained' : 'Deficit in period'}
          variant={summary.netCashFlow >= 0 ? 'income' : 'expense'}
          icon={<ArrowRightLeft className="h-4 w-4 text-slate-600" />}
        />

        <StatCard
          title="Budget Utilization"
          amount={`${budgetUtilization.percentage || 0}%`}
          subtitle={`${formatCurrency(budgetUtilization.totalSpent || 0)} of ${formatCurrency(
            budgetUtilization.totalBudgeted || 0
          )}`}
          variant={
            budgetUtilization.percentage > 100
              ? 'expense'
              : budgetUtilization.percentage >= 80
              ? 'default'
              : 'income'
          }
          icon={<PieIcon className="h-4 w-4 text-slate-600" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending & Debt Flow Timeline Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Cash & Debt Flow Timeline</h3>
              <p className="text-xs text-slate-500">
                Visualizing daily routine spending, income, and debt movements for {period.replace('-', ' ')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setTrendFilter('ALL')}
                  className={`px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                    trendFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Flows
                </button>
                <button
                  type="button"
                  onClick={() => setTrendFilter('ROUTINE')}
                  className={`px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                    trendFilter === 'ROUTINE'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Routine Only
                </button>
                <button
                  type="button"
                  onClick={() => setTrendFilter('DEBT')}
                  className={`px-2 py-0.5 rounded font-medium transition-all cursor-pointer ${
                    trendFilter === 'DEBT'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Debt Only
                </button>
              </div>
            </div>
          </div>

          {/* Visual Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs mb-3 pb-2 border-b border-slate-100">
            {(trendFilter === 'ALL' || trendFilter === 'ROUTINE') && (
              <>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                  Income
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                  Expense
                </span>
              </>
            )}
            {(trendFilter === 'ALL' || trendFilter === 'DEBT') && (
              <>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-600 inline-block"></span>
                  Debt Inflow (Borrow/Repaid to you)
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                  Debt Outflow (Lent/Debt Paid)
                </span>
              </>
            )}
          </div>

          <div className="h-64 w-full">
            {spendingTrends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No transaction or obligation activity during this selected period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spendingTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803D" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#15803D" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="debtInflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="debtOutflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={(val) => (val ? val.slice(8, 10) : '')}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={formatChartAxisTick}
                  />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-md text-xs space-y-1.5 min-w-[200px]">
                          <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
                            Date: {d.date || label}
                          </p>
                          {d.income > 0 && (
                            <div className="flex justify-between text-emerald-700">
                              <span>Income:</span>
                              <span className="font-semibold">+{formatCurrency(d.income)}</span>
                            </div>
                          )}
                          {d.expense > 0 && (
                            <div className="flex justify-between text-rose-700">
                              <span>Expense:</span>
                              <span className="font-semibold">-{formatCurrency(d.expense)}</span>
                            </div>
                          )}
                          {d.debtInflow > 0 && (
                            <div className="flex justify-between text-sky-700">
                              <span>Debt Inflow:</span>
                              <span className="font-semibold">+{formatCurrency(d.debtInflow)}</span>
                            </div>
                          )}
                          {d.debtOutflow > 0 && (
                            <div className="flex justify-between text-amber-700">
                              <span>Debt Outflow:</span>
                              <span className="font-semibold">-{formatCurrency(d.debtOutflow)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold border-t border-slate-100 pt-1 text-slate-900">
                            <span>Net Balance Impact:</span>
                            <span className={(d.netFlow ?? (d.income - d.expense)) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {(d.netFlow ?? (d.income - d.expense)) >= 0 ? '+' : ''}
                              {formatCurrency(d.netFlow ?? (d.income - d.expense))}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {(trendFilter === 'ALL' || trendFilter === 'ROUTINE') && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#15803D"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#incomeGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#DC2626"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#expenseGrad)"
                      />
                    </>
                  )}
                  {(trendFilter === 'ALL' || trendFilter === 'DEBT') && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="debtInflow"
                        stroke="#0284C7"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#debtInflowGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="debtOutflow"
                        stroke="#D97706"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#debtOutflowGrad)"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Spending by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Top expense destinations</p>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {spendingByCategory.length === 0 ? (
              <span className="text-xs text-slate-400">No expenses recorded</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="amount"
                  >
                    {spendingByCategory.map((_item: any, idx: number) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category List */}
          <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
            {spendingByCategory.slice(0, 4).map((cat: any, idx: number) => (
              <div key={cat.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate font-medium">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-slate-900">{formatCurrency(cat.amount)}</span>
                  <span className="text-slate-400 text-[11px]">({cat.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Columns: Recent Transactions & Financial Obligations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Latest entries posted to your ledger</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold text-slate-900 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No transactions available yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx: any) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'INCOME'
                          ? 'bg-emerald-50 text-emerald-700'
                          : tx.type === 'EXPENSE'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-sky-50 text-sky-700'
                      }`}
                    >
                      {tx.type === 'INCOME' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : tx.type === 'EXPENSE' ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        <span>{formatDate(tx.date)}</span>
                        <span>•</span>
                        <span className="truncate">{tx.account?.name || 'Account'}</span>
                        {tx.category && (
                          <>
                            <span>•</span>
                            <span className="truncate">{tx.category.name}</span>
                          </>
                        )}
                      </div>
                      {tx.splitGroupId && (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            <Users className="h-2.5 w-2.5" />
                            <span>Split (Your share: {formatCurrency(tx.userShareAmount || tx.amount)})</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs font-bold ${
                          tx.type === 'INCOME'
                            ? 'text-emerald-700'
                            : tx.type === 'EXPENSE'
                            ? 'text-rose-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </span>
                      <span className="block text-[10px] text-slate-400 uppercase tracking-wider">
                        {tx.paymentMethod}
                      </span>
                    </div>

                    {tx.type === 'EXPENSE' && (
                      !tx.splitGroupId ? (
                        <button
                          type="button"
                          onClick={() => setSplittingTransaction(tx)}
                          className="inline-flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-md transition-all cursor-pointer border border-indigo-200"
                          title="Split with group"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-semibold hidden sm:inline">Split</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 p-1 sm:px-1.5 text-emerald-700 bg-emerald-50 rounded-md text-[10px] font-semibold border border-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span className="hidden sm:inline">Split</span>
                        </span>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() => setEditingTransaction(tx)}
                      className="inline-flex items-center gap-1 p-1.5 sm:px-2 sm:py-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-all cursor-pointer border border-transparent hover:border-slate-200"
                      title="Edit transaction"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-[11px] font-semibold text-slate-600 hidden sm:inline">Edit</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Rail: Upcoming Bills & Debt Summary */}
        <div className="space-y-6">
          {/* Debt & Advances Quick Glance */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Obligations Summary</h3>
              <Link to="/obligations" className="text-xs text-slate-500 hover:text-slate-900">
                Ledger →
              </Link>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-emerald-900">Money Lent (Receivable)</span>
                    <p className="text-[11px] text-emerald-700 font-normal">Pending from borrowers</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-800">
                    {formatCurrency(obligations.totalLentOutstanding || 0)}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${
                        obligations.totalLentOriginal > 0
                          ? Math.min(
                              100,
                              Math.round(
                                ((obligations.totalLentRepaid || 0) /
                                  obligations.totalLentOriginal) *
                                  100
                              )
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-emerald-700 font-medium">
                  <span>
                    Recovered: {formatCurrency(obligations.totalLentRepaid || 0)}
                  </span>
                  <span>
                    Original: {formatCurrency(obligations.totalLentOriginal || obligations.totalLentOutstanding || 0)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-rose-900">Money Borrowed (Payable)</span>
                    <p className="text-[11px] text-rose-700 font-normal">Debt owed to lenders</p>
                  </div>
                  <span className="text-sm font-bold text-rose-800">
                    {formatCurrency(obligations.totalBorrowedOutstanding || 0)}
                  </span>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full bg-rose-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-600 h-1.5 rounded-full transition-all"
                    style={{
                      width: `${
                        obligations.totalBorrowedOriginal > 0
                          ? Math.min(
                              100,
                              Math.round(
                                ((obligations.totalBorrowedRepaid || 0) /
                                  obligations.totalBorrowedOriginal) *
                                  100
                              )
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-rose-700 font-medium">
                  <span>
                    Settled: {formatCurrency(obligations.totalBorrowedRepaid || 0)}
                  </span>
                  <span>
                    Original: {formatCurrency(obligations.totalBorrowedOriginal || obligations.totalBorrowedOutstanding || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Bills & Recurring Payments */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900">Upcoming Bills</h3>
              </div>
              <Link to="/recurring" className="text-xs text-slate-500 hover:text-slate-900">
                Schedules →
              </Link>
            </div>

            {upcomingBills.length === 0 ? (
              <p className="text-xs text-slate-400 py-3">No recurring bills scheduled.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingBills.map((bill: any) => (
                  <div
                    key={bill.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{bill.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Due: {formatDate(bill.nextDueDate)} • {bill.frequency.toLowerCase()}
                      </p>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(bill.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen || Boolean(editingTransaction)}
        initialTransaction={editingTransaction}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={fetchDashboardData}
        onSplitRequested={(tx) => setSplittingTransaction(tx)}
      />

      {/* Split Transaction Modal */}
      <SplitTransactionModal
        isOpen={Boolean(splittingTransaction)}
        onClose={() => setSplittingTransaction(null)}
        onSuccess={() => {
          setSplittingTransaction(null);
          fetchDashboardData();
        }}
        transaction={splittingTransaction}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={fetchDashboardData}
        month={new Date().getMonth() + 1}
        year={new Date().getFullYear()}
      />

      <ObligationModal
        isOpen={isObligationModalOpen}
        onClose={() => setIsObligationModalOpen(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};
