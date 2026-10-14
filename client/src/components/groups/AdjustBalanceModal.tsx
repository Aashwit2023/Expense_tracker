import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GroupMember } from '../../types';
import { rupeesToPaise, paiseToRupees, formatCurrency } from '../../utils/formatters';
import { Scale, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../api/client';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  targetMember: GroupMember | null;
  members: GroupMember[];
  currentMemberId?: string;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  targetMember,
  members,
  currentMemberId,
}) => {
  const [balanceSign, setBalanceSign] = useState<'+' | '-'>('+');
  const [targetAmountRupees, setTargetAmountRupees] = useState('');
  const [balancingMemberId, setBalancingMemberId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && targetMember) {
      const currentNet = targetMember.netBalance || 0;
      setBalanceSign(currentNet < 0 ? '-' : '+');
      setTargetAmountRupees(Math.abs(paiseToRupees(currentNet)).toString());

      // Default counterpart to current user or another member
      const counterpart = members.find(
        (m) => m.id !== targetMember.id && (m.id === currentMemberId || true)
      );
      setBalancingMemberId(counterpart ? counterpart.id : '');
      setNotes('');
      setError(null);
    }
  }, [isOpen, targetMember, members, currentMemberId]);

  if (!targetMember) return null;

  const currentNet = targetMember.netBalance || 0;
  const targetPaise =
    (balanceSign === '-' ? -1 : 1) * rupeesToPaise(targetAmountRupees || 0);
  const deltaPaise = targetPaise - currentNet;

  const handleSetZero = () => {
    setBalanceSign('+');
    setTargetAmountRupees('0');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMember) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post(`/groups/${groupId}/balances/adjust`, {
        memberId: targetMember.id,
        targetBalancePaise: targetPaise,
        balancingMemberId: balancingMemberId || undefined,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const counterpart = members.find((m) => m.id === balancingMemberId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Balance for ${targetMember.name}`}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current status info */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Current Net Balance
            </span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {currentNet > 0 ? (
                <span className="text-emerald-700">+{formatCurrency(currentNet)} (Owed)</span>
              ) : currentNet < 0 ? (
                <span className="text-rose-700">-{formatCurrency(Math.abs(currentNet))} (Owes)</span>
              ) : (
                <span className="text-slate-600">₹0.00 (Settled)</span>
              )}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSetZero}
            icon={<RefreshCw className="h-3 w-3" />}
          >
            Reset to ₹0
          </Button>
        </div>

        {/* Target balance input */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Target Balance (₹) *
          </label>
          <div className="flex gap-2">
            <div className="flex rounded-lg border border-slate-300 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setBalanceSign('+')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  balanceSign === '+'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                + Owed
              </button>
              <button
                type="button"
                onClick={() => setBalanceSign('-')}
                className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                  balanceSign === '-'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                - Owes
              </button>
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={targetAmountRupees}
                onChange={(e) => setTargetAmountRupees(e.target.value)}
                className="w-full text-xs pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Counterpart member selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Balancing Member (Offsetting party) *
          </label>
          <select
            value={balancingMemberId}
            onChange={(e) => setBalancingMemberId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white font-medium"
          >
            {members
              .filter((m) => m.id !== targetMember.id)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentMemberId ? '(You)' : ''}
                </option>
              ))}
          </select>
          <p className="text-[10px] text-slate-500 mt-1">
            Ledger requires double-entry balance. {targetMember.name}'s adjustment will be offset against {counterpart?.name || 'the balancing member'}.
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason / Adjustment Notes
          </label>
          <input
            type="text"
            placeholder="e.g. Settle cash payment outside app, manual correction"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        {/* Preview change */}
        {deltaPaise !== 0 && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
            <span className="font-semibold block mb-0.5">Summary of adjustment:</span>
            {deltaPaise > 0 ? (
              <p>
                Credits <strong>{targetMember.name}</strong> with +{formatCurrency(deltaPaise)} and offsets against <strong>{counterpart?.name || 'balancing member'}</strong>.
              </p>
            ) : (
              <p>
                Debits <strong>{targetMember.name}</strong> with -{formatCurrency(Math.abs(deltaPaise))} and credits <strong>{counterpart?.name || 'balancing member'}</strong>.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          >
            Confirm & Save Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
};
