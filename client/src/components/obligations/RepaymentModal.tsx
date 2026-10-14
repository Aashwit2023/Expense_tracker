import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Obligation, Account } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import api from '../../api/client';

interface RepaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  obligation: Obligation | null;
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  obligation,
}) => {
  const [amountRupees, setAmountRupees] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && obligation) {
      setError(null);
      const remainingPaise = obligation.balanceRemaining ?? (obligation.amount - (obligation.totalRepaid || 0));
      setAmountRupees(String(paiseToRupees(remainingPaise)));
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      // Fetch accounts to link repayment with proper bank account
      api.get('/accounts')
        .then((res) => {
          const accs: Account[] = res.data.data || [];
          setAccounts(accs);
          const initialAcc =
            (obligation.accountId && accs.find((a) => a.id === obligation.accountId)) ||
            accs.find((a) => a.isDefault) ||
            accs[0];
          if (initialAcc) {
            setAccountId(initialAcc.id);
          }
        })
        .catch(() => {
          setError('Failed to load accounts list');
        });
    }
  }, [isOpen, obligation]);

  if (!obligation) return null;

  const remainingPaise = obligation.balanceRemaining ?? (obligation.amount - (obligation.totalRepaid || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please provide a valid repayment amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/obligations/${obligation.id}/repayments`, {
        amount: rupeesToPaise(parsedRupees),
        date: new Date(date).toISOString(),
        notes: notes.trim() || null,
        accountId: accountId || null,
      });

      window.dispatchEvent(new CustomEvent('transaction-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record repayment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Repayment"
      subtitle={`For ${obligation.personName} • Outstanding balance: ${formatCurrency(remainingPaise)}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Obligation Type:</span>
            <span className="font-semibold text-slate-800">{obligation.type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Original Amount:</span>
            <span className="font-semibold text-slate-800">{formatCurrency(obligation.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Remaining Balance:</span>
            <span className="font-bold text-slate-900">{formatCurrency(remainingPaise)}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-medium text-slate-700">Repayment Amount (₹)</label>
            <button
              type="button"
              onClick={() => setAmountRupees(String(paiseToRupees(remainingPaise)))}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
            >
              Pay Full Remaining ({formatCurrency(remainingPaise)})
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400 font-semibold">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            />
          </div>
        </div>

        {/* Bank / Account Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {obligation.type === 'BORROWED'
              ? 'Pay Repayment From Account / Bank *'
              : 'Deposit Repayment Into Account / Bank *'}
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium cursor-pointer"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type}) — Current: {formatCurrency(acc.currentBalance ?? acc.initialBalance)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            {obligation.type === 'BORROWED'
              ? '📤 Debits this bank balance as you settle what you borrowed.'
              : '📥 Credits this bank balance with the returned repayment funds.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Payment Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes / Reference</label>
          <input
            type="text"
            placeholder="e.g. Received via GPay, Ref #123456"
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
            Confirm Repayment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
