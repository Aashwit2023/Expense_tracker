import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Pencil,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  X,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TransactionModal } from '../components/transactions/TransactionModal';
import { SplitTransactionModal } from '../components/transactions/SplitTransactionModal';
import { Transaction, Category, Account } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../api/client';

export const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search state
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filtered Totals
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    count: 0,
  });

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiltersPrerequisites = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get('/categories'),
        api.get('/accounts'),
      ]);
      setCategories(catRes.data.data);
      setAccounts(accRes.data.data);
    } catch {
      // continue
    }
  };

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (type) params.append('type', type);
      if (categoryId) params.append('categoryId', categoryId);
      if (accountId) params.append('accountId', accountId);
      if (paymentMethod) params.append('paymentMethod', paymentMethod);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      params.append('page', String(page));
      params.append('limit', '25');

      const res = await api.get(`/transactions?${params.toString()}`);
      setTransactions(res.data.data.transactions);
      setTotalPages(res.data.data.meta.totalPages || 1);
      setSummary(res.data.data.summary);
    } catch {
      setError('Could not load transaction records.');
    } finally {
      setLoading(false);
    }
  }, [search, type, categoryId, accountId, paymentMethod, startDate, endDate, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchFiltersPrerequisites();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async () => {
    if (!deletingTxId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/transactions/${deletingTxId}`);
      setDeletingTxId(null);
      fetchTransactions();
    } catch {
      alert('Failed to delete transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (categoryId) params.append('categoryId', categoryId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/reports/export-csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Could not export CSV');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setType('');
    setCategoryId('');
    setAccountId('');
    setPaymentMethod('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || type || categoryId || accountId || paymentMethod || startDate || endDate
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Transactions Ledger</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete audited record of all your financial events
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsTxModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filtered Totals Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Filtered Income
          </span>
          <p className="text-base font-bold text-emerald-700 mt-0.5">
            +{formatCurrency(summary.totalIncome)}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Filtered Expenses
          </span>
          <p className="text-base font-bold text-rose-700 mt-0.5">
            -{formatCurrency(summary.totalExpense)}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Net Cash Flow
          </span>
          <p
            className={`text-base font-bold mt-0.5 ${
              summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatCurrency(summary.netCashFlow)}
          </p>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">
            Transactions
          </span>
          <p className="text-base font-bold text-slate-900 mt-0.5">{summary.count} entries</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, merchant, or notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Type Selector */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Types (Income / Expense / Transfer)</option>
            <option value="EXPENSE">Expense (-)</option>
            <option value="INCOME">Income (+)</option>
            <option value="TRANSFER">Transfer (⇄)</option>
          </select>

          {/* Category Selector */}
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Second Filter Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <span>More Filters:</span>
          </div>

          {/* Account Filter */}
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="">All Accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* Payment Method */}
          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md"
          >
            <option value="">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
            <option value="CASH">Cash</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            />
          </div>

          {/* Sort Control */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-slate-500 hover:text-slate-900 underline flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading ledger...</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">{error}</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description / Merchant</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onDoubleClick={() => {
                      setEditingTransaction(tx);
                      setIsTxModalOpen(true);
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-medium">
                      {formatDate(tx.date)}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{tx.description}</div>
                      {tx.merchant && (
                        <div className="text-[11px] text-slate-500 truncate">{tx.merchant}</div>
                      )}
                      {tx.splitGroupId && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Users className="h-3 w-3" />
                            <span>Split with Group</span>
                            {tx.originalAmount && tx.userShareAmount && (
                              <span className="text-indigo-900 font-bold ml-0.5">
                                (You: {formatCurrency(tx.userShareAmount)} / Total: {formatCurrency(tx.originalAmount)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.category ? (
                        <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tx.category.color }}
                          />
                          {tx.category.name}
                        </span>
                      ) : tx.type === 'TRANSFER' ? (
                        <span className="text-sky-700 font-medium">Account Transfer</span>
                      ) : (
                        <span className="text-slate-400">Uncategorized</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {tx.type === 'TRANSFER' ? (
                        <span>
                          {tx.account?.name} → {tx.toAccount?.name}
                        </span>
                      ) : (
                        tx.account?.name
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="neutral">{tx.paymentMethod}</Badge>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right font-bold">
                      <span
                        className={
                          tx.type === 'INCOME'
                            ? 'text-emerald-700'
                            : tx.type === 'EXPENSE'
                            ? 'text-rose-700'
                            : 'text-slate-900'
                        }
                      >
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        {formatCurrency(tx.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {tx.type === 'EXPENSE' && (
                          !tx.splitGroupId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSplittingTransaction(tx);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-md transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                              title="Split bill with a group"
                            >
                              <Users className="h-3 w-3" />
                              <span>Split</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/groups/${tx.splitGroupId}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-md transition-colors cursor-pointer border border-emerald-200 shadow-2xs"
                              title="View and edit split in group"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit Split</span>
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransaction(tx);
                            setIsTxModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-md transition-colors cursor-pointer border border-slate-200/80 hover:border-slate-900 shadow-2xs"
                          title="Edit transaction"
                        >
                          <Edit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTxId(tx.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete transaction"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTransaction(null);
        }}
        onSuccess={fetchTransactions}
        initialTransaction={editingTransaction}
        onSplitRequested={(tx) => setSplittingTransaction(tx)}
      />

      {/* Split Transaction Modal */}
      <SplitTransactionModal
        isOpen={Boolean(splittingTransaction)}
        onClose={() => setSplittingTransaction(null)}
        onSuccess={() => {
          setSplittingTransaction(null);
          fetchTransactions();
        }}
        transaction={splittingTransaction}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingTxId)}
        onClose={() => setDeletingTxId(null)}
        title="Confirm Deletion"
        subtitle="This action will permanently remove the record from your ledger"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to delete this transaction? All associated account balance
            calculations and monthly reports will automatically update.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingTxId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete Record
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
