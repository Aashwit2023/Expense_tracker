import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { PiggyBank, AlertCircle } from 'lucide-react';
import api from '../../api/client';

interface GroupBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  currentBudgetPaise?: number;
}

export const GroupBudgetModal: React.FC<GroupBudgetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  currentBudgetPaise = 0,
}) => {
  const [amountRupees, setAmountRupees] = useState(
    currentBudgetPaise > 0 ? paiseToRupees(currentBudgetPaise).toString() : ''
  );
  const [period, setPeriod] = useState('TOTAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paise = rupeesToPaise(amountRupees || 0);
    if (paise < 0) {
      setError('Budget cannot be negative');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post(`/groups/${groupId}/budget`, {
        amount: paise,
        period,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Group Budget" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Total Target Budget (₹) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">₹</span>
            <input
              type="number"
              step="1"
              min="0"
              required
              placeholder="e.g. 50000"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none font-medium"
            />
          </div>
          <p className="text-[10px] text-slate-600 mt-1">
            Track total group spend against this budget cap with live percentage warnings.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white"
          >
            <option value="TOTAL">Total Trip / Entire Project Budget</option>
            <option value="MONTHLY">Monthly Recurring Limit</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            icon={<PiggyBank className="h-3.5 w-3.5" />}
          >
            Save Budget
          </Button>
        </div>
      </form>
    </Modal>
  );
};
