import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Trip, PaymentMethod } from '../../types';
import { formatCurrency, rupeesToPaise } from '../../utils/formatters';
import api from '../../api/client';

interface TripExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: Trip | null;
}

export const TripExpenseModal: React.FC<TripExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  trip,
}) => {
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('TRAVEL');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!trip) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please provide a valid expense amount');
      return;
    }

    if (!description.trim()) {
      setError('Please provide a brief description');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/trips/${trip.id}/expenses`, {
        amount: rupeesToPaise(parsedRupees),
        category,
        date: new Date(date).toISOString(),
        description: description.trim(),
        paymentMethod,
        notes: notes.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add trip expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(amountRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Trip Expense"
      subtitle={`Adding to ${trip.name} (${trip.destination})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="TRAVEL">Travel / Flight / Train</option>
              <option value="ACCOMMODATION">Hotel / Stay / Resort</option>
              <option value="FOOD">Food & Meals</option>
              <option value="SHOPPING">Shopping & Souvenirs</option>
              <option value="TRANSPORT">Local Taxi / Transit</option>
              <option value="ACTIVITIES">Sightseeing & Tickets</option>
              <option value="OTHER">Other Expenses</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="CASH">Cash</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
          <input
            type="text"
            required
            placeholder="e.g. Flight tickets, Hotel booking, Dinner at cafe"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
          <input
            type="text"
            placeholder="Bill split note or reference..."
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
            Add Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
