import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GroupMember, SplitMethod, Account } from '../../types';
import { formatCurrency, formatDateInput, rupeesToPaise } from '../../utils/formatters';
import {
  calculateEqualSplit,
  validateAndCalculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateItemizedSplit,
} from '../../utils/splitCalculations';
import {
  Utensils,
  Building,
  Home,
  Plane,
  Bus,
  ShoppingBag,
  Zap,
  MoreHorizontal,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  Landmark,
} from 'lucide-react';
import api from '../../api/client';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  members: GroupMember[];
  currentMemberId?: string;
}

const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: Utensils },
  { id: 'Hotel', label: 'Hotel & Stay', icon: Building },
  { id: 'Rent', label: 'Rent & Living', icon: Home },
  { id: 'Travel', label: 'Travel & Flights', icon: Plane },
  { id: 'Transport', label: 'Local Transport', icon: Bus },
  { id: 'Shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'Utilities', label: 'Bills & Utilities', icon: Zap },
  { id: 'Other', label: 'Other', icon: MoreHorizontal },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  members,
  currentMemberId,
}) => {
  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [date, setDate] = useState(formatDateInput());
  const [category, setCategory] = useState('Food');
  const [payerId, setPayerId] = useState(currentMemberId || (members[0]?.id || ''));
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  // Selected participants (defaults to all members)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Split Method
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');

  // Unequal split state: { memberId: rupeesString }
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});

  // Percentage split state: { memberId: percentageString }
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  // Shares split state: { memberId: shareString }
  const [shares, setShares] = useState<Record<string, string>>({});

  // Itemized split state: items array
  const [items, setItems] = useState<{ name: string; amountRupees: string; assignedMemberIds: string[] }[]>([
    { name: '', amountRupees: '', assignedMemberIds: [] },
  ]);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [linkPersonalAccount, setLinkPersonalAccount] = useState(false);
  const [paymentAccountId, setPaymentAccountId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize selected participants and payer when modal opens
  useEffect(() => {
    if (isOpen) {
      api.get('/accounts').then((res) => {
        const accs: Account[] = res.data.data || [];
        setAccounts(accs);
        const def = accs.find((a) => a.isDefault) || accs[0];
        if (def) setPaymentAccountId(def.id);
      }).catch(() => {});
    }

    if (isOpen && members.length > 0) {
      const allIds = members.map((m) => m.id);
      setSelectedMemberIds(allIds);
      if (currentMemberId && members.some((m) => m.id === currentMemberId)) {
        setPayerId(currentMemberId);
      } else {
        setPayerId(members[0].id);
      }

      // Pre-fill percentages equally
      const equalPct = (100 / members.length).toFixed(2);
      const initPct: Record<string, string> = {};
      const initShares: Record<string, string> = {};
      const initUnequal: Record<string, string> = {};
      for (const m of members) {
        initPct[m.id] = equalPct;
        initShares[m.id] = '1';
        initUnequal[m.id] = '';
      }
      setPercentages(initPct);
      setShares(initShares);
      setUnequalAmounts(initUnequal);
    }
  }, [isOpen, members, currentMemberId]);

  const toggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) return; // Prevent deselecting all
      setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const selectAll = () => {
    setSelectedMemberIds(members.map((m) => m.id));
  };

  const deselectAll = () => {
    if (members.length > 0) {
      setSelectedMemberIds([members[0].id]);
    }
  };

  // Live calculation of preview
  const totalPaise = rupeesToPaise(amountRupees || 0);

  let previewShares: { memberId: string; shareAmount: number }[] = [];
  let calculationError: string | null = null;

  try {
    if (totalPaise > 0 && selectedMemberIds.length > 0) {
      if (splitMethod === 'EQUAL') {
        previewShares = calculateEqualSplit(totalPaise, selectedMemberIds);
      } else if (splitMethod === 'UNEQUAL') {
        const allocs = selectedMemberIds.map((mId) => ({
          memberId: mId,
          amountPaise: rupeesToPaise(unequalAmounts[mId] || 0),
        }));
        const sumAlloc = allocs.reduce((sum, a) => sum + a.amountPaise, 0);
        if (sumAlloc !== totalPaise) {
          const diff = Math.abs(totalPaise - sumAlloc);
          calculationError = `Sum of shares (₹${(sumAlloc / 100).toFixed(2)}) is ₹${(diff / 100).toFixed(
            2
          )} ${sumAlloc < totalPaise ? 'less' : 'more'} than total (₹${(totalPaise / 100).toFixed(2)})`;
        } else {
          previewShares = validateAndCalculateUnequalSplit(totalPaise, allocs);
        }
      } else if (splitMethod === 'PERCENTAGE') {
        const pcts = selectedMemberIds.map((mId) => ({
          memberId: mId,
          percentage: parseFloat(percentages[mId] || '0') || 0,
        }));
        const sumPct = pcts.reduce((sum, p) => sum + p.percentage, 0);
        if (Math.abs(sumPct - 100) > 0.05) {
          calculationError = `Percentages sum to ${sumPct.toFixed(2)}% (must equal 100%)`;
        } else {
          previewShares = calculatePercentageSplit(totalPaise, pcts);
        }
      } else if (splitMethod === 'SHARES') {
        const shrs = selectedMemberIds.map((mId) => ({
          memberId: mId,
          share: parseFloat(shares[mId] || '0') || 0,
        }));
        const sumShares = shrs.reduce((sum, s) => sum + s.share, 0);
        if (sumShares <= 0) {
          calculationError = 'Total shares must be greater than zero';
        } else {
          previewShares = calculateSharesSplit(totalPaise, shrs);
        }
      } else if (splitMethod === 'ITEMIZED') {
        const validItems = items
          .filter((it) => it.name && it.assignedMemberIds.length > 0)
          .map((it) => ({
            name: it.name,
            amountPaise: rupeesToPaise(it.amountRupees || 0),
            assignedMemberIds: it.assignedMemberIds,
          }));
        if (validItems.length > 0) {
          const res = calculateItemizedSplit(totalPaise, validItems);
          previewShares = res.shares;
        } else {
          calculationError = 'Add at least one item with assigned members';
        }
      }
    }
  } catch (err: any) {
    calculationError = err.message;
  }

  // Itemized handlers
  const handleAddItem = () => {
    setItems([...items, { name: '', amountRupees: '', assignedMemberIds: [...selectedMemberIds] }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleToggleItemMember = (itemIndex: number, memberId: string) => {
    const item = items[itemIndex];
    let newAssigned: string[];
    if (item.assignedMemberIds.includes(memberId)) {
      newAssigned = item.assignedMemberIds.filter((id) => id !== memberId);
    } else {
      newAssigned = [...item.assignedMemberIds, memberId];
    }
    handleUpdateItem(itemIndex, 'assignedMemberIds', newAssigned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Expense title is required');
      return;
    }
    if (totalPaise <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('At least one participant must be selected');
      return;
    }
    if (calculationError) {
      setError(calculationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: any = {
        title: title.trim(),
        amount: totalPaise,
        date,
        category,
        payerId,
        splitMethod,
        participantIds: selectedMemberIds,
        notes: notes.trim() || undefined,
        receiptUrl: receiptUrl.trim() || undefined,
      };

      if (splitMethod === 'UNEQUAL') {
        payload.allocations = selectedMemberIds.map((mId) => ({
          memberId: mId,
          amountPaise: rupeesToPaise(unequalAmounts[mId] || 0),
        }));
      } else if (splitMethod === 'PERCENTAGE') {
        payload.percentages = selectedMemberIds.map((mId) => ({
          memberId: mId,
          percentage: parseFloat(percentages[mId] || '0') || 0,
        }));
      } else if (splitMethod === 'SHARES') {
        payload.shares = selectedMemberIds.map((mId) => ({
          memberId: mId,
          share: parseFloat(shares[mId] || '0') || 0,
        }));
      } else if (splitMethod === 'ITEMIZED') {
        payload.items = items
          .filter((it) => it.name && it.assignedMemberIds.length > 0)
          .map((it) => ({
            name: it.name,
            amountPaise: rupeesToPaise(it.amountRupees || 0),
            assignedMemberIds: it.assignedMemberIds,
          }));
      }

      if (linkPersonalAccount && paymentAccountId) {
        payload.paymentAccountId = paymentAccountId;
      }

      await api.post(`/groups/${groupId}/expenses`, payload);

      window.dispatchEvent(new CustomEvent('transaction-updated'));

      setTitle('');
      setAmountRupees('');
      setNotes('');
      setReceiptUrl('');
      setLinkPersonalAccount(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Group Expense" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title, Amount, Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Dinner, Fuel, Airbnb"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Total Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Category & Payer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By *</label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentMemberId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pay from Personal Bank Account Option */}
        {payerId === currentMemberId && accounts.length > 0 && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-900">
                <input
                  type="checkbox"
                  checked={linkPersonalAccount}
                  onChange={(e) => setLinkPersonalAccount(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-blue-600" />
                  Pay from my personal bank account (record as purchase in financial dashboard)
                </span>
              </label>
            </div>
            {linkPersonalAccount && (
              <div>
                <label className="block text-[11px] font-medium text-blue-800 mb-1">
                  Select payment account:
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-600 bg-white font-medium text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: ₹{(((acc.currentBalance ?? acc.initialBalance) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-700 mt-1">
                  This deducts payment from your bank account: your personal share is logged as an Expense, and others' shares are logged as a Lent receivable.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Participant Selection */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-800">
              Split with ({selectedMemberIds.length} selected):
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Select all
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              const isPayer = m.id === payerId;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleSelectMember(m.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 text-slate-900 shadow-xs ring-1 ring-slate-900'
                      : 'bg-white/60 border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-slate-900" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>{m.name}</span>
                  {isPayer && (
                    <span className="text-[10px] px-1 py-0.2 bg-slate-100 text-slate-600 rounded">
                      Payer
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Methods Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Split Method</label>
          <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            {(
              [
                ['EQUAL', 'Equal (=)'],
                ['UNEQUAL', 'Unequal (₹)'],
                ['PERCENTAGE', 'Percentage (%)'],
                ['SHARES', 'Shares (1:1)'],
                ['ITEMIZED', 'Itemized (🧾)'],
              ] as [SplitMethod, string][]
            ).map(([method, label]) => (
              <button
                type="button"
                key={method}
                onClick={() => setSplitMethod(method)}
                className={`py-1.5 rounded-md text-center transition-all cursor-pointer ${
                  splitMethod === method
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Split Details by Method */}
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          {splitMethod === 'EQUAL' && (
            <div>
              <p className="text-[11px] text-slate-500 mb-2">
                Total will be split equally among {selectedMemberIds.length} participants with exact paise reconciliation.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedMemberIds.map((mId) => {
                  const m = members.find((x) => x.id === mId);
                  const share = previewShares.find((p) => p.memberId === mId);
                  return (
                    <div key={mId} className="bg-white p-2 rounded border border-slate-200">
                      <p className="text-[11px] font-medium text-slate-800 truncate">{m?.name}</p>
                      <p className="text-xs font-semibold text-slate-900 mt-0.5">
                        {share ? formatCurrency(share.shareAmount) : '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === 'UNEQUAL' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Specify exact rupee amounts for each participant. Sum must match total expense.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedMemberIds.map((mId) => {
                  const m = members.find((x) => x.id === mId);
                  return (
                    <div key={mId} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                      <span className="text-xs font-medium text-slate-800 flex-1 truncate">{m?.name}</span>
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1.5 text-slate-400">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={unequalAmounts[mId] || ''}
                          onChange={(e) =>
                            setUnequalAmounts({ ...unequalAmounts, [mId]: e.target.value })
                          }
                          className="w-full pl-5 pr-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === 'PERCENTAGE' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Enter percentages for each participant. Total must equal 100%.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedMemberIds.map((mId) => {
                  const m = members.find((x) => x.id === mId);
                  const share = previewShares.find((p) => p.memberId === mId);
                  return (
                    <div key={mId} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                      <span className="text-xs font-medium text-slate-800 flex-1 truncate">{m?.name}</span>
                      <div className="relative w-24">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0"
                          value={percentages[mId] || ''}
                          onChange={(e) =>
                            setPercentages({ ...percentages, [mId]: e.target.value })
                          }
                          className="w-full pr-5 pl-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none text-right"
                        />
                        <span className="absolute right-2 top-1.5 text-slate-400">%</span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 w-16 text-right">
                        {share ? formatCurrency(share.shareAmount) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === 'SHARES' && (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500">
                Assign share weights (e.g. 1 share each, 2 shares for couples).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedMemberIds.map((mId) => {
                  const m = members.find((x) => x.id === mId);
                  const share = previewShares.find((p) => p.memberId === mId);
                  return (
                    <div key={mId} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                      <span className="text-xs font-medium text-slate-800 flex-1 truncate">{m?.name}</span>
                      <div className="w-20">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="1"
                          value={shares[mId] || '1'}
                          onChange={(e) => setShares({ ...shares, [mId]: e.target.value })}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 focus:outline-none text-right"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 w-16 text-right">
                        {share ? formatCurrency(share.shareAmount) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitMethod === 'ITEMIZED' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Add items and select who shared each item. Any extra fees or tax reconcile automatically.
                </p>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-xs text-slate-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((it, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded border border-slate-200 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Item name (e.g. Pizza, Drinks)"
                        value={it.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        className="flex-1 text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none"
                      />
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1 text-slate-400">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={it.amountRupees}
                          onChange={(e) => handleUpdateItem(idx, 'amountRupees', e.target.value)}
                          className="w-full pl-5 pr-2 py-1 text-xs border border-slate-300 rounded focus:outline-none"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-[10px] text-slate-400 mr-1">For:</span>
                      {selectedMemberIds.map((mId) => {
                        const m = members.find((x) => x.id === mId);
                        const isAssigned = it.assignedMemberIds.includes(mId);
                        return (
                          <button
                            type="button"
                            key={mId}
                            onClick={() => handleToggleItemMember(idx, mId)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                              isAssigned
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {m?.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error warning if calculation fails validation */}
          {calculationError && (
            <p className="mt-2 text-[11px] text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {calculationError}
            </p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
          <input
            type="text"
            placeholder="Additional notes about this bill..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!!calculationError}>
            Add Expense
          </Button>
        </div>
      </form>
    </Modal>
  );
};
