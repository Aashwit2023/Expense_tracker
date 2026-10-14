import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Category, Frequency, RecurringTransaction, TransactionType } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import api from '../../api/client';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItem?: RecurringTransaction | null;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialItem,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountRupees, setAmountRupees] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDays, setReminderDays] = useState('2');
  const [notes, setNotes] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchCategories();
      if (initialItem) {
        setTitle(initialItem.title);
        setType(initialItem.type);
        setAmountRupees(String(paiseToRupees(initialItem.amount)));
        setCategoryId(initialItem.categoryId || '');
        setFrequency(initialItem.frequency);
        setStartDate(new Date(initialItem.startDate).toISOString().split('T')[0]);
        setNextDueDate(new Date(initialItem.nextDueDate).toISOString().split('T')[0]);
        setReminderDays(String(initialItem.reminderDays || 2));
        setNotes(initialItem.notes || '');
      } else {
        setTitle('');
        setType('EXPENSE');
        setAmountRupees('');
        setCategoryId('');
        setFrequency('MONTHLY');
        setStartDate(new Date().toISOString().split('T')[0]);
        setNextDueDate(new Date().toISOString().split('T')[0]);
        setReminderDays('2');
        setNotes('');
      }
    }
  }, [isOpen, initialItem]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch {
      setError('Could not load categories');
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please provide a valid amount');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const payload = {
      title: title.trim(),
      type,
      amount: rupeesToPaise(parsedRupees),
      categoryId: categoryId || null,
      frequency,
      startDate: new Date(startDate).toISOString(),
      nextDueDate: new Date(nextDueDate).toISOString(),
      reminderDays: parseInt(reminderDays, 10) || 1,
      notes: notes.trim() || null,
    };

    setIsSubmitting(true);
    try {
      if (initialItem) {
        await api.put(`/recurring/${initialItem.id}`, payload);
      } else {
        await api.post('/recurring', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save recurring item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(amountRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialItem ? 'Edit Recurring Schedule' : 'Schedule Recurring Transaction / Bill'}
      subtitle="Track fixed salaries, rent, subscriptions, and EMIs"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recurring Bill / Expense
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              type === 'INCOME' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Recurring Income (Salary)
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Netflix Subscription, House Rent, Monthly Salary"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-medium text-slate-700">Amount (₹) *</label>
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
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Select category...</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
              <option value="DAILY">Daily</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Next Due Date</label>
            <input
              type="date"
              required
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <input
            type="text"
            placeholder="e.g. Direct auto-debit on 5th"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialItem ? 'Save Schedule' : 'Create Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
