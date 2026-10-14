import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GroupMember, GroupExpense, SplitMethod, Account } from '../../types';
import { formatCurrency, formatDateInput, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
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
  Save,
} from 'lucide-react';
import api from '../../api/client';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  expense: GroupExpense | null;
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

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  expense,
  members,
  currentMemberId,
}) => {
  const [title, setTitle] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [date, setDate] = useState(formatDateInput());
  const [category, setCategory] = useState('Food');
  const [payerId, setPayerId] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');

  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');

  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [items, setItems] = useState<{ name: string; amountRupees: string; assignedMemberIds: string[] }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill existing expense data
  useEffect(() => {
    if (isOpen && expense) {
      setTitle(expense.title);
      setAmountRupees(paiseToRupees(expense.amount).toString());
      setDate(expense.date ? formatDateInput(new Date(expense.date)) : formatDateInput());
      setCategory(expense.category || 'Food');
      setPayerId(expense.payerId);
      setNotes(expense.notes || '');
      setReceiptUrl(expense.receiptUrl || '');
      setSplitMethod(expense.splitMethod || 'EQUAL');

      const participantIds = expense.participants.map((p) => p.memberId);
      setSelectedMemberIds(participantIds.length > 0 ? participantIds : members.map((m) => m.id));

      const initUnequal: Record<string, string> = {};
      const initPercentages: Record<string, string> = {};
      const initShares: Record<string, string> = {};

      for (const p of expense.participants) {
        initUnequal[p.memberId] = paiseToRupees(p.shareAmount).toString();
        if (p.splitValue != null) {
          initPercentages[p.memberId] = p.splitValue.toString();
          initShares[p.memberId] = p.splitValue.toString();
        } else {
          initPercentages[p.memberId] = (100 / expense.participants.length).toFixed(2);
          initShares[p.memberId] = '1';
        }
      }

      setUnequalAmounts(initUnequal);
      setPercentages(initPercentages);
      setShares(initShares);

      if (expense.items && expense.items.length > 0) {
        setItems(
          expense.items.map((it) => {
            let assigned: string[] = [];
            try {
              assigned = JSON.parse(it.assignedMemberIds || '[]');
            } catch {
              assigned = [];
            }
            return {
              name: it.name,
              amountRupees: paiseToRupees(it.amount).toString(),
              assignedMemberIds: assigned,
            };
          })
        );
      } else {
        setItems([{ name: '', amountRupees: '', assignedMemberIds: [] }]);
      }

      setError(null);
    }
  }, [isOpen, expense, members]);

  if (!expense) return null;

  const toggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      if (selectedMemberIds.length === 1) return; // prevent empty
      setSelectedMemberIds(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const selectAll = () => setSelectedMemberIds(members.map((m) => m.id));
  const deselectAll = () => members.length > 0 && setSelectedMemberIds([members[0].id]);

  const totalPaise = rupeesToPaise(amountRupees || 0);

  let previewShares: { memberId: string; shareAmount: number }[] = [];
  let calculationError: string | null = null;

  if (totalPaise > 0 && selectedMemberIds.length > 0) {
    try {
      if (splitMethod === 'EQUAL') {
        previewShares = calculateEqualSplit(totalPaise, selectedMemberIds);
      } else if (splitMethod === 'UNEQUAL') {
        const allocations = selectedMemberIds.map((mId) => ({
          memberId: mId,
          amountPaise: rupeesToPaise(unequalAmounts[mId] || 0),
        }));
        previewShares = validateAndCalculateUnequalSplit(totalPaise, allocations);
      } else if (splitMethod === 'PERCENTAGE') {
        const pctAllocations = selectedMemberIds.map((mId) => ({
          memberId: mId,
          percentage: parseFloat(percentages[mId] || '0') || 0,
        }));
        previewShares = calculatePercentageSplit(totalPaise, pctAllocations);
      } else if (splitMethod === 'SHARES') {
        const shareAllocations = selectedMemberIds.map((mId) => ({
          memberId: mId,
          share: parseFloat(shares[mId] || '0') || 0,
        }));
        previewShares = calculateSharesSplit(totalPaise, shareAllocations);
      } else if (splitMethod === 'ITEMIZED') {
        const validItems = items
          .filter((it) => it.name && it.assignedMemberIds.length > 0)
          .map((it) => ({
            name: it.name,
            amountPaise: rupeesToPaise(it.amountRupees || 0),
            assignedMemberIds: it.assignedMemberIds,
          }));
        previewShares = calculateItemizedSplit(totalPaise, validItems).shares;
      }
    } catch (err: any) {
      calculationError = err.message;
    }
  }

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

      await api.put(`/groups/${groupId}/expenses/${expense.id}`, payload);

      window.dispatchEvent(new CustomEvent('transaction-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Group Expense" maxWidth="max-w-3xl">
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
              placeholder="e.g. Flight tickets, Hotel stay"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Expense Date *</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {members.map((m) => {
              const isSelected = selectedMemberIds.includes(m.id);
              const isPayer = m.id === payerId;

              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleSelectMember(m.id)}
                  className={`p-2 rounded-lg border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 font-medium text-slate-900 shadow-2xs'
                      : 'bg-white/60 border-slate-200 text-slate-500 hover:bg-white'
                  }`}
                >
                  <span className="truncate">
                    {m.name} {isPayer ? '(Payer)' : ''}
                  </span>
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-slate-900 shrink-0" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Split Method Tabs */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Split Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'EQUAL', label: '= Equal' },
                { id: 'UNEQUAL', label: '₹ Exact' },
                { id: 'PERCENTAGE', label: '% Percent' },
                { id: 'SHARES', label: '1/x Shares' },
              ] as const
            ).map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setSplitMethod(t.id)}
                className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  splitMethod === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unequal Amounts Inputs */}
        {splitMethod === 'UNEQUAL' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Specify exact rupees owed by each participant:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedMemberIds.map((mId) => {
                const m = members.find((x) => x.id === mId);
                return (
                  <div key={mId} className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-slate-200">
                    <span className="text-xs text-slate-700 font-medium truncate">{m?.name}</span>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={unequalAmounts[mId] || ''}
                        onChange={(e) => setUnequalAmounts({ ...unequalAmounts, [mId]: e.target.value })}
                        className="w-full text-xs pl-6 pr-2 py-1 border border-slate-300 rounded focus:outline-none text-right font-medium"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Percentage Inputs */}
        {splitMethod === 'PERCENTAGE' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Specify percentage of bill (must total 100%):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedMemberIds.map((mId) => {
                const m = members.find((x) => x.id === mId);
                return (
                  <div key={mId} className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-slate-200">
                    <span className="text-xs text-slate-700 font-medium truncate">{m?.name}</span>
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0"
                        value={percentages[mId] || ''}
                        onChange={(e) => setPercentages({ ...percentages, [mId]: e.target.value })}
                        className="w-full text-xs pl-2 pr-6 py-1 border border-slate-300 rounded focus:outline-none text-right font-medium"
                      />
                      <span className="absolute right-2.5 top-1 text-xs text-slate-400">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shares Inputs */}
        {splitMethod === 'SHARES' && (
          <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-[11px] text-slate-500">Specify ratio shares (e.g., 1 for single, 2 for couple):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedMemberIds.map((mId) => {
                const m = members.find((x) => x.id === mId);
                return (
                  <div key={mId} className="flex items-center justify-between gap-2 bg-white p-2 rounded border border-slate-200">
                    <span className="text-xs text-slate-700 font-medium truncate">{m?.name}</span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={shares[mId] || '1'}
                      onChange={(e) => setShares({ ...shares, [mId]: e.target.value })}
                      className="w-20 text-xs px-2 py-1 border border-slate-300 rounded focus:outline-none text-right font-medium"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Preview of Calculated Splits */}
        {previewShares.length > 0 && !calculationError && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
              Calculated Split Shares (Live Preview):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {previewShares.map((s) => {
                const m = members.find((x) => x.id === s.memberId);
                return (
                  <div key={s.memberId} className="bg-white p-2 rounded border border-slate-200 text-xs">
                    <p className="text-[11px] text-slate-500 truncate">{m?.name}</p>
                    <p className="font-bold text-slate-900 mt-0.5">{formatCurrency(s.shareAmount)}</p>
                  </div>
                );
              })}
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
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            disabled={!!calculationError}
            icon={<Save className="h-3.5 w-3.5" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
