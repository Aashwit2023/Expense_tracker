import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Category, Budget } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import api from '../../api/client';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  month: number;
  year: number;
  initialBudget?: Budget | null;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  month,
  year,
  initialBudget,
}) => {
  const [categoryId, setCategoryId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchCategories();
      if (initialBudget) {
        setCategoryId(initialBudget.categoryId);
        setAmountRupees(String(paiseToRupees(initialBudget.amount)));
      } else {
        setCategoryId('');
        setAmountRupees('');
      }
    }
  }, [isOpen, initialBudget]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories?type=EXPENSE');
      setCategories(res.data.data);
      if (!initialBudget && res.data.data.length > 0) {
        setCategoryId(res.data.data[0].id);
      }
    } catch {
      setError('Could not load expense categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please specify a positive budget amount');
      return;
    }

    if (!categoryId) {
      setError('Please select a category');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/budgets', {
        categoryId,
        month,
        year,
        amount: rupeesToPaise(parsedRupees),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(amountRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialBudget ? 'Update Budget' : 'Set Category Budget'}
      subtitle={`Budget for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
          <select
            disabled={!!initialBudget}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-medium text-slate-700">Monthly Limit (₹)</label>
            {currentPaise > 0 && (
              <span className="text-xs font-semibold text-slate-600">
                {formatCurrency(currentPaise)}
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">₹</span>
            <input
              type="number"
              step="1"
              min="1"
              required
              placeholder="e.g. 10000"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Save Budget
          </Button>
        </div>
      </form>
    </Modal>
  );
};
