import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { GroupMember, SuggestedSettlement, Account } from '../../types';
import { formatDateInput, rupeesToPaise, paiseToRupees } from '../../utils/formatters';
import { ExternalLink, CheckCircle2, AlertCircle, ArrowRight, Landmark } from 'lucide-react';
import api from '../../api/client';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupId: string;
  members: GroupMember[];
  currentMemberId?: string;
  initialSuggestion?: SuggestedSettlement | null;
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  groupId,
  members,
  currentMemberId,
  initialSuggestion,
}) => {
  const [payerId, setPayerId] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [date, setDate] = useState(formatDateInput());
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [depositAccountId, setDepositAccountId] = useState('');
  const [autoDeposit, setAutoDeposit] = useState(true);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [autoPayFromAccount, setAutoPayFromAccount] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/accounts').then((res) => {
        const accs: Account[] = res.data.data || [];
        setAccounts(accs);
        const def = accs.find((a) => a.isDefault) || accs[0];
        if (def) {
          setDepositAccountId(def.id);
          setPaymentAccountId(def.id);
        }
      }).catch(() => {});

      if (initialSuggestion) {
        setPayerId(initialSuggestion.payerId);
        setRecipientId(initialSuggestion.recipientId);
        setAmountRupees(paiseToRupees(initialSuggestion.amount).toString());
      } else {
        const defaultPayer = currentMemberId || (members[0]?.id || '');
        setPayerId(defaultPayer);
        const otherMember = members.find((m) => m.id !== defaultPayer);
        setRecipientId(otherMember ? otherMember.id : members[0]?.id || '');
        setAmountRupees('');
      }
      setDate(formatDateInput());
      setNotes('');
      setReference('');
      setError(null);
    }
  }, [isOpen, initialSuggestion, members, currentMemberId]);

  const payer = members.find((m) => m.id === payerId);
  const recipient = members.find((m) => m.id === recipientId);

  // Generate UPI URI if recipient has a UPI ID
  let upiPaymentUrl: string | null = null;
  if (recipient?.upiId && parseFloat(amountRupees) > 0) {
    const amt = parseFloat(amountRupees).toFixed(2);
    upiPaymentUrl = `upi://pay?pa=${encodeURIComponent(recipient.upiId)}&pn=${encodeURIComponent(
      recipient.name
    )}&am=${amt}&cu=INR&tn=Group%20Settlement`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payerId || !recipientId) {
      setError('Please select both payer and recipient');
      return;
    }
    if (payerId === recipientId) {
      setError('Payer and recipient cannot be the same member');
      return;
    }

    const paise = rupeesToPaise(amountRupees || 0);
    if (paise <= 0) {
      setError('Repayment amount must be greater than zero');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await api.post(`/groups/${groupId}/settlements`, {
        payerId,
        recipientId,
        amount: paise,
        date,
        notes: notes.trim() || undefined,
        reference: reference.trim() || undefined,
        depositAccountId: autoDeposit && depositAccountId ? depositAccountId : undefined,
        paymentAccountId: autoPayFromAccount && paymentAccountId ? paymentAccountId : undefined,
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
    <Modal isOpen={isOpen} onClose={onClose} title="Record Repayment / Settle Up" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payer and Recipient selectors */}
        <div className="grid grid-cols-2 gap-3 items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Who paid? (Repayer)
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentMemberId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Who received? (Recipient)
            </label>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-900 focus:outline-none bg-white font-medium"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.id === currentMemberId ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Repayment Amount (₹) *
            </label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Repayment Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* UPI Helper Card if recipient has UPI ID */}
        {recipient?.upiId && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
            <div>
              <p className="font-semibold">{recipient.name}'s UPI ID:</p>
              <p className="font-mono text-[11px] text-emerald-700 mt-0.5">{recipient.upiId}</p>
            </div>
            {upiPaymentUrl && (
              <a
                href={upiPaymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-medium text-[11px] transition-colors shadow-xs"
              >
                <span>Pay via UPI</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Reference & Notes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Payment Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. UPI Ref / UTR / Cash"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Optional remarks"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Bank Account Payment Selection - deducts from user's bank balance if user is payer */}
        {payerId === currentMemberId && accounts.length > 0 && (
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-900">
                <input
                  type="checkbox"
                  checked={autoPayFromAccount}
                  onChange={(e) => setAutoPayFromAccount(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-amber-600" />
                  Pay from my personal bank account (record as my purchase/settlement payment)
                </span>
              </label>
            </div>
            {autoPayFromAccount && (
              <div>
                <label className="block text-[11px] font-medium text-amber-800 mb-1">
                  Select Bank Account to deduct payment:
                </label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-amber-300 rounded-md focus:ring-1 focus:ring-amber-600 bg-white font-medium text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: ₹{(((acc.currentBalance ?? acc.initialBalance) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-amber-700 mt-1">
                  Once recorded, this repayment will immediately deduct from your bank account and update your financial dashboard records.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Bank Account Deposit Selection - increments user's bank balance if paid */}
        {recipientId === currentMemberId && accounts.length > 0 && (
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-900">
                <input
                  type="checkbox"
                  checked={autoDeposit}
                  onChange={(e) => setAutoDeposit(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-blue-600" />
                  Deposit directly into my bank account as my own purchased money / recovery & increment balance
                </span>
              </label>
            </div>
            {autoDeposit && (
              <div>
                <label className="block text-[11px] font-medium text-blue-800 mb-1">
                  Select Bank Account to receive funds:
                </label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-blue-300 rounded-md focus:ring-1 focus:ring-blue-600 bg-white font-medium text-slate-800"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: ₹{(((acc.currentBalance ?? acc.initialBalance) || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-blue-700 mt-1">
                  Once recorded, this repayment will immediately credit your bank account and increment your financial dashboard net worth.
                </p>
              </div>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
          Recording this repayment permanently updates the ledger balances between {payer?.name || 'payer'} and {recipient?.name || 'recipient'}. You can reverse this entry anytime from the activity ledger if recorded mistakenly.
        </p>

        {/* Modal actions */}
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
            Confirm & Save Settlement
          </Button>
        </div>
      </form>
    </Modal>
  );
};
