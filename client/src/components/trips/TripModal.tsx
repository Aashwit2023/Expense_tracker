import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Trip, TripStatus } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import api from '../../api/client';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTrip?: Trip | null;
}

export const TripModal: React.FC<TripModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTrip,
}) => {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budgetRupees, setBudgetRupees] = useState('');
  const [status, setStatus] = useState<TripStatus>('PLANNED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialTrip) {
        setName(initialTrip.name);
        setDestination(initialTrip.destination);
        setStartDate(new Date(initialTrip.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(initialTrip.endDate).toISOString().split('T')[0]);
        setBudgetRupees(String(paiseToRupees(initialTrip.budget)));
        setStatus(initialTrip.status);
      } else {
        setName('');
        setDestination('');
        setStartDate(new Date().toISOString().split('T')[0]);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setEndDate(nextWeek.toISOString().split('T')[0]);
        setBudgetRupees('');
        setStatus('PLANNED');
      }
    }
  }, [isOpen, initialTrip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(budgetRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please provide a valid trip budget');
      return;
    }

    if (!name.trim() || !destination.trim()) {
      setError('Trip name and destination are required');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be earlier than start date');
      return;
    }

    const payload = {
      name: name.trim(),
      destination: destination.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      budget: rupeesToPaise(parsedRupees),
      status,
    };

    setIsSubmitting(true);
    try {
      if (initialTrip) {
        await api.put(`/trips/${initialTrip.id}`, payload);
      } else {
        await api.post('/trips', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(budgetRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTrip ? 'Edit Trip Details' : 'Create New Trip'}
      subtitle="Organize travel expenses and track budget limit"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Trip Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Goa Vacation, Manali Trek"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Destination *</label>
            <input
              type="text"
              required
              placeholder="e.g. North Goa, HP, London"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="text-xs font-medium text-slate-700">Trip Budget (₹) *</label>
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
                placeholder="e.g. 35000"
                value={budgetRupees}
                onChange={(e) => setBudgetRupees(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TripStatus)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="PLANNED">Planned</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialTrip ? 'Save Changes' : 'Create Trip'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
