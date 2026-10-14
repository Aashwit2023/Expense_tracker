import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { RecurringModal } from '../components/recurring/RecurringModal';
import { RecurringTransaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../api/client';

export const RecurringPage: React.FC = () => {
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const fetchRecurring = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/recurring');
      setItems(res.data.data.items);
    } catch {
      setError('Could not load recurring transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const handleToggleActive = async (item: RecurringTransaction) => {
    try {
      await api.put(`/recurring/${item.id}`, { isActive: !item.isActive });
      fetchRecurring();
    } catch {
      alert('Failed to update status');
    }
  };

  const handlePostTransaction = async () => {
    if (!postingId) return;
    setIsPosting(true);
    try {
      await api.post(`/recurring/${postingId}/post-transaction`, {});
      setPostingId(null);
      fetchRecurring();
      alert('Recorded as completed transaction and advanced schedule!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post transaction');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/recurring/${deletingId}`);
      setDeletingId(null);
      fetchRecurring();
    } catch {
      alert('Failed to remove schedule');
    }
  };

  const selectedItemToPost = items.find((i) => i.id === postingId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Recurring Transactions & Bills
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated calendar schedules for rent, EMIs, software subscriptions, and salaries
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          New Recurring Schedule
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading recurring schedules...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <CalendarClock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No recurring transactions</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Schedule recurring expenses like WiFi or rent to remember due dates and post them to
            your ledger in one click.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
          >
            Create First Schedule
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isExpense = item.type === 'EXPENSE';

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl p-5 border shadow-xs flex flex-col justify-between transition-all ${
                  item.isActive ? 'border-slate-200/80' : 'border-slate-200/40 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-lg ${
                          isExpense ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isExpense ? (
                          <TrendingDown className="h-4 w-4" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.frequency} • {item.category?.name || 'General'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(item)}
                      title={item.isActive ? 'Pause Schedule' : 'Activate Schedule'}
                      className="cursor-pointer text-slate-400 hover:text-slate-700"
                    >
                      {item.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-300" />
                      )}
                    </button>
                  </div>

                  <div className="my-3">
                    <span className="text-xs text-slate-400 font-medium">Scheduled Amount</span>
                    <p
                      className={`text-xl font-bold ${
                        isExpense ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(item.amount)}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        Next Due Date:
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatDate(item.nextDueDate)}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/40">
                        {item.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
                  <button
                    onClick={() => setDeletingId(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                    title="Delete schedule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPostingId(item.id)}
                    icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                  >
                    Record as Paid
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      <RecurringModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={fetchRecurring}
        initialItem={editingItem}
      />

      {/* Confirm Post as Transaction Modal */}
      <Modal
        isOpen={Boolean(postingId)}
        onClose={() => setPostingId(null)}
        title="Record as Completed Transaction"
        subtitle="This will post a real transaction entry in your ledger and advance the due date"
      >
        {selectedItemToPost && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Scheduled Title:</span>
                <span className="font-semibold text-slate-900">{selectedItemToPost.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedItemToPost.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Frequency:</span>
                <span className="font-medium text-slate-700">{selectedItemToPost.frequency}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Confirming will debit this amount from your default account and compute the next scheduled due date.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPostingId(null)}
                disabled={isPosting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePostTransaction}
                isLoading={isPosting}
              >
                Confirm Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Schedule Confirmation */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Delete Schedule"
        subtitle="Remove this recurring payment schedule"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to delete this schedule? Already posted past transactions will remain in your ledger.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeletingId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            Confirm Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};
