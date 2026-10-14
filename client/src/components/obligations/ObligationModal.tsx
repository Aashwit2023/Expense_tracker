import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ObligationType, Obligation, Account } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import api from '../../api/client';

interface ObligationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: ObligationType;
  initialObligation?: Obligation | null;
}

export const ObligationModal: React.FC<ObligationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'LENT',
  initialObligation,
}) => {
  const [type, setType] = useState<ObligationType>(defaultType);
  const [personName, setPersonName] = useState('');
  const [personContact, setPersonContact] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);

      // Fetch accounts to link obligation with bank balance
      api.get('/accounts')
        .then((res) => {
          const accs: Account[] = res.data.data || [];
          setAccounts(accs);
          if (initialObligation?.accountId) {
            setAccountId(initialObligation.accountId);
          } else if (!initialObligation) {
            const defaultAcc = accs.find((a) => a.isDefault) || accs[0];
            if (defaultAcc) {
              setAccountId(defaultAcc.id);
            }
          }
        })
        .catch(() => {
          setError('Failed to load accounts list');
        });

      if (initialObligation) {
        setType(initialObligation.type);
        setPersonName(initialObligation.personName);
        setPersonContact(initialObligation.personContact || '');
        setAmountRupees(String(paiseToRupees(initialObligation.amount)));
        setDueDate(
          initialObligation.dueDate
            ? new Date(initialObligation.dueDate).toISOString().split('T')[0]
            : ''
        );
        setDescription(initialObligation.description);
        setNotes(initialObligation.notes || '');
        if (initialObligation.accountId) {
          setAccountId(initialObligation.accountId);
        }
      } else {
        setType(defaultType);
        setPersonName('');
        setPersonContact('');
        setAmountRupees('');
        setDueDate('');
        setDescription('');
        setNotes('');
      }
    }
  }, [isOpen, defaultType, initialObligation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please provide a valid amount');
      return;
    }

    if (!personName.trim()) {
      setError("Please specify the person or counterparty's name");
      return;
    }

    if (!description.trim()) {
      setError('Please specify a brief purpose or reason');
      return;
    }

    const payload = {
      type,
      personName: personName.trim(),
      personContact: personContact.trim() || null,
      amount: rupeesToPaise(parsedRupees),
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      description: description.trim(),
      notes: notes.trim() || null,
      accountId: accountId || null,
    };

    setIsSubmitting(true);
    try {
      if (initialObligation) {
        await api.put(`/obligations/${initialObligation.id}`, payload);
      } else {
        await api.post('/obligations', payload);
      }

      window.dispatchEvent(new CustomEvent('transaction-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save obligation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(amountRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialObligation ? 'Edit Financial Obligation' : 'Record Financial Obligation'}
      subtitle="Track money lent, money borrowed, or advances"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Obligation Type</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setType('LENT')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'LENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Money Lent (Owed to me)
            </button>
            <button
              type="button"
              onClick={() => setType('BORROWED')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'BORROWED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Money Borrowed (I owe)
            </button>
            <button
              type="button"
              onClick={() => setType('ADVANCE')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'ADVANCE' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Advance Paid
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Person / Counterparty *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Contact Phone / Email</label>
            <input
              type="text"
              placeholder="+91 98765 43210 (Optional)"
              value={personContact}
              onChange={(e) => setPersonContact(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Expected Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Bank / Account Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            {type === 'BORROWED' ? 'Deposit Into Account / Bank *' : 'Paid From Account / Bank *'}
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
            {type === 'BORROWED'
              ? '📥 Funds received from lender will increase this bank balance.'
              : '📤 Outflow of money lent will decrease this bank balance.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Description / Purpose *</label>
          <input
            type="text"
            required
            placeholder="e.g. Concert tickets booking, Emergency medical loan"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Additional context or repayment terms..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialObligation ? 'Update Obligation' : 'Record Obligation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
