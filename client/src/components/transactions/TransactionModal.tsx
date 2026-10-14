import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Account, Category, Transaction, TransactionType, PaymentMethod } from '../../types';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { Users } from 'lucide-react';
import api from '../../api/client';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTransaction?: Transaction | null;
  onSplitRequested?: (transaction: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTransaction,
  onSplitRequested,
}) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [merchant, setMerchant] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [splitAfterSave, setSplitAfterSave] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      fetchPrerequisites();
      if (initialTransaction) {
        setType(initialTransaction.type);
        setAmountRupees(String(paiseToRupees(initialTransaction.amount)));
        setAccountId(initialTransaction.accountId);
        setToAccountId(initialTransaction.toAccountId || '');
        setCategoryId(initialTransaction.categoryId || '');
        setDate(new Date(initialTransaction.date).toISOString().split('T')[0]);
        setMerchant(initialTransaction.merchant || '');
        setDescription(initialTransaction.description);
        setNotes(initialTransaction.notes || '');
        setPaymentMethod(initialTransaction.paymentMethod);
        setSplitAfterSave(false);
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialTransaction]);

  const resetForm = () => {
    setType('EXPENSE');
    setAmountRupees('');
    setToAccountId('');
    setMerchant('');
    setDescription('');
    setNotes('');
    setPaymentMethod('UPI');
    setDate(new Date().toISOString().split('T')[0]);
    setSplitAfterSave(false);
  };

  const fetchPrerequisites = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);
      const accList: Account[] = accRes.data.data;
      setAccounts(accList);
      setCategories(catRes.data.data);

      if (!initialTransaction && accList.length > 0) {
        const defaultAcc = accList.find((a) => a.isDefault) || accList[0];
        setAccountId(defaultAcc.id);
      }
    } catch {
      setError('Could not load accounts or categories');
    }
  };

  const filteredCategories = categories.filter((c) => c.type === (type === 'TRANSFER' ? 'EXPENSE' : type));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedRupees = parseFloat(amountRupees);
    if (!parsedRupees || parsedRupees <= 0) {
      setError('Please enter a valid positive amount');
      return;
    }

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (type === 'TRANSFER') {
      if (!toAccountId) {
        setError('Please select a destination account for the transfer');
        return;
      }
      if (accountId === toAccountId) {
        setError('Source and destination accounts must be different');
        return;
      }
    }

    if (!description.trim()) {
      setError('Please provide a brief description');
      return;
    }

    const payload = {
      accountId,
      toAccountId: type === 'TRANSFER' ? toAccountId : null,
      categoryId: type === 'TRANSFER' ? null : categoryId || null,
      type,
      amount: rupeesToPaise(parsedRupees),
      date: new Date(date).toISOString(),
      merchant: merchant.trim() || null,
      description: description.trim(),
      notes: notes.trim() || null,
      paymentMethod,
    };

    setIsSubmitting(true);
    try {
      let savedTx: Transaction | null = null;
      if (initialTransaction) {
        const res = await api.put(`/transactions/${initialTransaction.id}`, payload);
        savedTx = res.data.data;
      } else {
        const res = await api.post('/transactions', payload);
        savedTx = res.data.data;
      }
      window.dispatchEvent(new CustomEvent('transaction-updated'));
      onSuccess();
      onClose();
      if (splitAfterSave && savedTx && onSplitRequested) {
        onSplitRequested(savedTx);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPaise = rupeesToPaise(parseFloat(amountRupees) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
      subtitle="Manual financial record entry"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Transaction Type Tabs */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Transaction Type</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (t === 'TRANSFER') setCategoryId('');
                }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  type === t
                    ? t === 'EXPENSE'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : t === 'INCOME'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t === 'EXPENSE' ? 'Expense (-)' : t === 'INCOME' ? 'Income (+)' : 'Transfer (⇄)'}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label className="text-xs font-medium text-slate-700">Amount (₹)</label>
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
              className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-medium"
            />
          </div>
        </div>

        {/* Accounts Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {type === 'TRANSFER' ? 'From Account' : 'Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {type === 'TRANSFER' ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select destination...</option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
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
          )}
        </div>

        {/* Date and Payment Method */}
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
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="CARD">Card (Debit / Credit)</option>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank NetBanking / IMPS</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Merchant / Payee & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {type === 'INCOME' ? 'Payer / Source' : 'Merchant / Payee'}
            </label>
            <input
              type="text"
              placeholder={type === 'INCOME' ? 'e.g. Employer Inc.' : 'e.g. Starbucks, Amazon'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Grocery restock, Coffee"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Optional Notes</label>
          <textarea
            rows={2}
            placeholder="Add any extra notes or reference IDs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
          />
        </div>

        {/* Optional Split with Group Trigger */}
        {type === 'EXPENSE' && !initialTransaction && onSplitRequested && (
          <div className="p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-indigo-900">
              <input
                type="checkbox"
                checked={splitAfterSave}
                onChange={(e) => setSplitAfterSave(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-indigo-600" />
                Split this expense with a group (Roommates, Trip, Friends)
              </span>
            </label>
            <p className="text-[11px] text-indigo-700 ml-6 mt-0.5">
              Automatically opens the group split calculator right after saving so you can choose who owes what.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {initialTransaction ? 'Update Record' : 'Save Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
