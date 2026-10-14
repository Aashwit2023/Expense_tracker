import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Transaction, GroupListItem, GroupMember, SplitMethod } from '../../types';
import { formatCurrency, rupeesToPaise } from '../../utils/formatters';
import {
  calculateEqualSplit,
  validateAndCalculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '../../utils/splitCalculations';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Percent,
  Divide,
  Scale,
  Receipt,
  ArrowRight,
  Info,
} from 'lucide-react';
import api from '../../api/client';

interface SplitTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transaction: Transaction | null;
}

export const SplitTransactionModal: React.FC<SplitTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transaction,
}) => {
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Split configurations
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('EQUAL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [unequalAmounts, setUnequalAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original transaction amount in paise
  const totalPaise = transaction ? transaction.originalAmount || transaction.amount : 0;

  const loadGroupMembers = async (groupId: string) => {
    if (!groupId) return;
    setLoadingMembers(true);
    try {
      const res = await api.get(`/groups/${groupId}`);
      const details = res.data.data;
      const members: GroupMember[] = details.members || [];
      setGroupMembers(members);

      // Current member fallback: check currentMember, or match ADMIN/creator, or members[0]
      const curId =
        details.currentMember?.id ||
        members.find((m) => m.role === 'ADMIN')?.id ||
        members[0]?.id ||
        '';
      setCurrentMemberId(curId);

      // By default select all members
      const allIds = members.map((m) => m.id);
      setSelectedMemberIds(allIds);

      // Reset split states
      const initialMap: Record<string, string> = {};
      allIds.forEach((id) => {
        initialMap[id] = '';
      });
      setUnequalAmounts(initialMap);

      const initialPercentages: Record<string, string> = {};
      const evenPct = allIds.length > 0 ? (100 / allIds.length).toFixed(2) : '0';
      allIds.forEach((id) => {
        initialPercentages[id] = evenPct;
      });
      setPercentages(initialPercentages);

      const initialShares: Record<string, string> = {};
      allIds.forEach((id) => {
        initialShares[id] = '1';
      });
      setShares(initialShares);
    } catch {
      setError('Failed to load group members.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // 1. Fetch available groups and members when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingGroups(true);
      setError(null);
      api
        .get('/groups')
        .then((res) => {
          const list: GroupListItem[] = res.data.data || [];
          setGroups(list);
          if (list.length > 0) {
            const targetId = selectedGroupId && list.some((g) => g.id === selectedGroupId)
              ? selectedGroupId
              : list[0].id;
            setSelectedGroupId(targetId);
            loadGroupMembers(targetId);
          }
        })
        .catch(() => setError('Failed to load your groups.'))
        .finally(() => setLoadingGroups(false));
    }
  }, [isOpen, transaction]);

  // Handle manual group change
  const handleGroupChange = (newGroupId: string) => {
    setSelectedGroupId(newGroupId);
    loadGroupMembers(newGroupId);
  };

  // Member toggle
  const toggleMember = (mId: string) => {
    if (selectedMemberIds.includes(mId)) {
      if (selectedMemberIds.length === 1) return; // Keep at least one
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== mId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, mId]);
    }
  };

  // 3. Client live calculation of shares
  const calculatedShares = useMemo(() => {
    if (!totalPaise || selectedMemberIds.length === 0) return [];

    try {
      switch (splitMethod) {
        case 'EQUAL':
          return calculateEqualSplit(totalPaise, selectedMemberIds);
        case 'UNEQUAL': {
          const allocations = selectedMemberIds.map((mId) => ({
            memberId: mId,
            amountPaise: rupeesToPaise(unequalAmounts[mId] || 0),
          }));
          return validateAndCalculateUnequalSplit(totalPaise, allocations);
        }
        case 'PERCENTAGE': {
          const pList = selectedMemberIds.map((mId) => ({
            memberId: mId,
            percentage: parseFloat(percentages[mId] || '0'),
          }));
          return calculatePercentageSplit(totalPaise, pList);
        }
        case 'SHARES': {
          const sList = selectedMemberIds.map((mId) => ({
            memberId: mId,
            share: parseFloat(shares[mId] || '1'),
          }));
          return calculateSharesSplit(totalPaise, sList);
        }
        default:
          return calculateEqualSplit(totalPaise, selectedMemberIds);
      }
    } catch {
      return [];
    }
  }, [totalPaise, splitMethod, selectedMemberIds, unequalAmounts, percentages, shares]);

  // Calculate user share vs others
  const userShareObj = calculatedShares.find((s) => s.memberId === currentMemberId);
  const userSharePaise = userShareObj ? userShareObj.shareAmount : 0;
  const othersSharePaise = Math.max(0, totalPaise - userSharePaise);

  // Validation
  const validationError = useMemo(() => {
    if (selectedMemberIds.length === 0) return 'Select at least one participant';
    if (splitMethod === 'UNEQUAL') {
      const sum = selectedMemberIds.reduce(
        (acc, id) => acc + rupeesToPaise(unequalAmounts[id] || 0),
        0
      );
      if (sum !== totalPaise) {
        const diffRupees = ((totalPaise - sum) / 100).toFixed(2);
        return `Custom amounts sum to ₹${(sum / 100).toFixed(2)}. Difference: ₹${diffRupees}`;
      }
    }
    if (splitMethod === 'PERCENTAGE') {
      const sumPct = selectedMemberIds.reduce(
        (acc, id) => acc + parseFloat(percentages[id] || '0'),
        0
      );
      if (Math.abs(sumPct - 100) > 0.01) {
        return `Percentages sum to ${sumPct.toFixed(2)}% (must equal 100%)`;
      }
    }
    if (splitMethod === 'SHARES') {
      const totalShares = selectedMemberIds.reduce(
        (acc, id) => acc + parseFloat(shares[id] || '0'),
        0
      );
      if (totalShares <= 0) return 'Total shares must be greater than 0';
    }
    return null;
  }, [splitMethod, selectedMemberIds, totalPaise, unequalAmounts, percentages, shares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    if (!selectedGroupId) {
      setError('Please select a group');
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: any = {
        groupId: selectedGroupId,
        splitMethod,
        participantIds: selectedMemberIds,
        notes: notes.trim() || undefined,
      };

      if (splitMethod === 'UNEQUAL') {
        payload.allocations = selectedMemberIds.map((mId) => ({
          memberId: mId,
          amountPaise: rupeesToPaise(unequalAmounts[mId] || 0),
        }));
      } else if (splitMethod === 'PERCENTAGE') {
        payload.percentages = selectedMemberIds.map((mId) => ({
          memberId: mId,
          percentage: parseFloat(percentages[mId] || '0'),
        }));
      } else if (splitMethod === 'SHARES') {
        payload.shares = selectedMemberIds.map((mId) => ({
          memberId: mId,
          share: parseFloat(shares[mId] || '1'),
        }));
      }

      await api.post(`/transactions/${transaction.id}/split`, payload);

      window.dispatchEvent(new CustomEvent('transaction-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to split transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Personal Bill with Group"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Transaction Summary Banner */}
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Personal Transaction
              </span>
              <h3 className="text-sm font-semibold text-white">{transaction.description}</h3>
              <p className="text-[11px] text-slate-400">
                Paid from {transaction.account?.name || 'Account'} • {transaction.date.slice(0, 10)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Total Bill
              </span>
              <p className="text-base font-extrabold text-white">{formatCurrency(totalPaise)}</p>
            </div>
          </div>
        </div>

        {/* Ledger Impact Explanation */}
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-xs text-indigo-950 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">How splitting updates your system:</p>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Your financial dashboard will be updated to count only your personal share (
              <strong>{formatCurrency(userSharePaise)}</strong>) as an expense. The remainder (
              <strong>{formatCurrency(othersSharePaise)}</strong>) is tracked as group receivables.
              Your bank balance remains fully consistent, and will increment only when members pay you back!
            </p>
          </div>
        </div>

        {/* Group Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Select Group to Split With *
          </label>
          {loadingGroups ? (
            <div className="text-xs text-slate-400 py-2">Loading your groups...</div>
          ) : groups.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg">
              You are not a member of any group yet. Please create a group from the Groups tab first!
            </div>
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-medium"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.type})
                </option>
              ))}
            </select>
          )}
        </div>

        {groupMembers.length > 0 && (
          <>
            {/* Split Method Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Split Method
              </label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
                {[
                  { id: 'EQUAL', label: 'Equally', icon: Divide },
                  { id: 'UNEQUAL', label: 'Exact (₹)', icon: Receipt },
                  { id: 'PERCENTAGE', label: 'Percent (%)', icon: Percent },
                  { id: 'SHARES', label: 'Shares', icon: Scale },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = splitMethod === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSplitMethod(tab.id as SplitMethod)}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-medium transition-all ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Participants & Share breakdown list */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Split Among Participants ({selectedMemberIds.length} of {groupMembers.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                {groupMembers.map((m) => {
                  const isSelected = selectedMemberIds.includes(m.id);
                  const isUser = m.id === currentMemberId;
                  const memberShare = calculatedShares.find((s) => s.memberId === m.id);

                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-md border text-xs transition-colors ${
                        isSelected
                          ? 'bg-white border-slate-300 shadow-2xs'
                          : 'bg-slate-100/60 border-transparent opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMember(m.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span className="font-medium text-slate-900">
                          {m.name} {isUser && '(You)'}
                        </span>
                      </label>

                      {/* Input based on split method */}
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          {splitMethod === 'UNEQUAL' && (
                            <div className="relative w-24">
                              <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">
                                ₹
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={unequalAmounts[m.id] || ''}
                                onChange={(e) =>
                                  setUnequalAmounts({
                                    ...unequalAmounts,
                                    [m.id]: e.target.value,
                                  })
                                }
                                className="w-full text-right text-xs pl-5 pr-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 font-medium"
                              />
                            </div>
                          )}

                          {splitMethod === 'PERCENTAGE' && (
                            <div className="relative w-20">
                              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400">
                                %
                              </span>
                              <input
                                type="number"
                                step="0.1"
                                placeholder="0"
                                value={percentages[m.id] || ''}
                                onChange={(e) =>
                                  setPercentages({
                                    ...percentages,
                                    [m.id]: e.target.value,
                                  })
                                }
                                className="w-full text-right text-xs pl-2 pr-5 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 font-medium"
                              />
                            </div>
                          )}

                          {splitMethod === 'SHARES' && (
                            <div className="relative w-20">
                              <input
                                type="number"
                                step="1"
                                min="1"
                                placeholder="1"
                                value={shares[m.id] || '1'}
                                onChange={(e) =>
                                  setShares({
                                    ...shares,
                                    [m.id]: e.target.value,
                                  })
                                }
                                className="w-full text-right text-xs px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-slate-900 font-medium"
                              />
                            </div>
                          )}

                          {/* Calculated final share preview */}
                          <span className="text-xs font-bold text-slate-700 min-w-16 text-right">
                            {memberShare ? formatCurrency(memberShare.shareAmount) : '₹0.00'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live calculation overview pill */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-100 rounded-lg text-xs">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  Your New Expense
                </span>
                <p className="text-sm font-bold text-rose-700">{formatCurrency(userSharePaise)}</p>
                <p className="text-[10px] text-slate-500">Updated in your dashboard</p>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  Others Will Owe You
                </span>
                <p className="text-sm font-bold text-emerald-700">
                  {formatCurrency(othersSharePaise)}
                </p>
                <p className="text-[10px] text-slate-500">Credited to bank when paid</p>
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {validationError}
              </p>
            )}

            {/* Optional notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner bill split with roommates"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={Boolean(validationError) || groups.length === 0}
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            Confirm & Split Bill
          </Button>
        </div>
      </form>
    </Modal>
  );
};
