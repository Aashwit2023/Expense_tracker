import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  PieChart,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { BudgetModal } from '../components/budgets/BudgetModal';
import { Budget } from '../types';
import { formatCurrency } from '../utils/formatters';
import api from '../api/client';

export const BudgetsPage: React.FC = () => {
  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [summary, setSummary] = useState({
    totalBudgeted: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallPercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudgets(res.data.data.budgets);
      setSummary(res.data.data.summary);
    } catch {
      setError('Could not load budget data for this period.');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/budgets/${deletingId}`);
      setDeletingId(null);
      fetchBudgets();
    } catch {
      alert('Failed to remove budget');
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Monthly Budgets</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Category spending caps calculated against real ledger expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200/80 rounded-lg p-1 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-slate-900 min-w-[120px] text-center">
              {monthName}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Set Category Budget
          </Button>
        </div>
      </div>

      {/* Overview Progress Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">
              {monthName} Overall Budget Progress
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(summary.totalSpent)}
              </span>
              <span className="text-xs text-slate-500">
                spent of {formatCurrency(summary.totalBudgeted)} allocated
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                summary.overallPercentage > 100
                  ? 'text-rose-700'
                  : summary.overallPercentage >= 80
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {summary.overallPercentage}% Utilized
            </span>
            <span className="block text-xs text-slate-500">
              {summary.totalRemaining >= 0
                ? `${formatCurrency(summary.totalRemaining)} remaining`
                : `${formatCurrency(Math.abs(summary.totalRemaining))} over budget`}
            </span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              summary.overallPercentage > 100
                ? 'bg-rose-600'
                : summary.overallPercentage >= 80
                ? 'bg-amber-500'
                : 'bg-emerald-600'
            }`}
            style={{ width: `${Math.min(100, summary.overallPercentage)}%` }}
          />
        </div>
      </div>

      {/* Category Budgets Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading budgets...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600">{error}</div>
      ) : budgets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <PieChart className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No budgets set for {monthName}</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create monthly spending limits by category to guard against overspending.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingBudget(null);
              setIsModalOpen(true);
            }}
          >
            Set First Budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const remaining = b.remaining || 0;
            const percentage = b.percentage || 0;
            const isExceeded = b.isExceeded;
            const isWarning = b.isWarning;

            return (
              <div
                key={b.id}
                className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: b.category?.color || '#0F172A' }}
                      />
                      <h4 className="text-sm font-semibold text-slate-900">{b.category?.name}</h4>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingBudget(b);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md"
                        title="Edit limit"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(b.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                        title="Remove budget"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-slate-500 font-medium">Spent:</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(spent)}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        / {formatCurrency(b.amount)}
                      </span>
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  {isExceeded ? (
                    <Badge variant="expense">
                      <AlertTriangle className="h-3 w-3 mr-1 inline" />
                      Exceeded by {formatCurrency(Math.abs(remaining))}
                    </Badge>
                  ) : isWarning ? (
                    <Badge variant="warning">
                      <AlertTriangle className="h-3 w-3 mr-1 inline" />
                      {percentage}% (Approaching limit)
                    </Badge>
                  ) : (
                    <Badge variant="income">
                      <CheckCircle className="h-3 w-3 mr-1 inline" />
                      {formatCurrency(remaining)} remaining
                    </Badge>
                  )}

                  <span className="text-slate-400 font-medium">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        onSuccess={fetchBudgets}
        month={month}
        year={year}
        initialBudget={editingBudget}
      />

      {/* Delete Confirmation */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Remove Budget Target"
        subtitle="The budget target will be deleted for this month"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to remove this budget target? Historical expense records will remain
          untouched.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteBudget}>
            Confirm Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
};
