import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  HandCoins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  History,
  Trash2,
  Edit2,
  BarChart2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ObligationModal } from '../components/obligations/ObligationModal';
import { RepaymentModal } from '../components/obligations/RepaymentModal';
import { Obligation, ObligationType } from '../types';
import { formatCurrency, formatDate, formatChartAxisTick } from '../utils/formatters';
import api from '../api/client';

export const ObligationsPage: React.FC = () => {
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summary, setSummary] = useState({
    totalLentOutstanding: 0,
    totalBorrowedOutstanding: 0,
    totalAdvanceOutstanding: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab Filter
  const [activeTab, setActiveTab] = useState<'ALL' | 'LENT' | 'BORROWED' | 'ADVANCE' | 'SETTLED'>('ALL');

  // Modal States
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<ObligationType>('LENT');
  const [repaymentObligation, setRepaymentObligation] = useState<Obligation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const fetchObligations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/obligations');
      setObligations(res.data.data.obligations);
      setSummary(res.data.data.summary);
    } catch {
      setError('Could not load financial obligations ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObligations();
  }, [fetchObligations]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/obligations/${deletingId}`);
      setDeletingId(null);
      fetchObligations();
    } catch {
      alert('Could not delete obligation record');
    }
  };

  const filteredObligations = obligations.filter((ob) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SETTLED') return ob.status === 'SETTLED';
    return ob.type === activeTab && ob.status === 'ACTIVE';
  });

  // Calculate settlement comparison metrics for chart
  const totalLentOrig = obligations
    .filter((o) => o.type === 'LENT' || o.type === 'ADVANCE')
    .reduce((s, o) => s + o.amount, 0);
  const totalLentRep = obligations
    .filter((o) => o.type === 'LENT' || o.type === 'ADVANCE')
    .reduce((s, o) => s + (o.totalRepaid || 0), 0);
  const totalLentBal = Math.max(0, totalLentOrig - totalLentRep);

  const totalBorrOrig = obligations
    .filter((o) => o.type === 'BORROWED')
    .reduce((s, o) => s + o.amount, 0);
  const totalBorrRep = obligations
    .filter((o) => o.type === 'BORROWED')
    .reduce((s, o) => s + (o.totalRepaid || 0), 0);
  const totalBorrBal = Math.max(0, totalBorrOrig - totalBorrRep);

  const debtComparisonData = [
    {
      category: 'Money Lent (Owed to You)',
      original: totalLentOrig,
      repaid: totalLentRep,
      remaining: totalLentBal,
    },
    {
      category: 'Money Borrowed (You Owe)',
      original: totalBorrOrig,
      repaid: totalBorrRep,
      remaining: totalBorrBal,
    },
  ];

  // Top Active Counterparties by outstanding balance
  const topCounterparties = obligations
    .filter((o) => (o.balanceRemaining ?? (o.amount - (o.totalRepaid || 0))) > 0)
    .sort((a, b) => {
      const remA = a.balanceRemaining ?? (a.amount - (a.totalRepaid || 0));
      const remB = b.balanceRemaining ?? (b.amount - (b.totalRepaid || 0));
      return remB - remA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Money Lent, Borrowed & Advances
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict ledger for personal debts, loans, and upfront advance payments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setModalDefaultType('LENT');
              setIsObligationModalOpen(true);
            }}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Record Obligation
          </Button>
        </div>
      </div>

      {/* High-level Debt Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider text-emerald-800">
              Money Lent (Owed to You)
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-md">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-emerald-700">
              {formatCurrency(summary.totalLentOutstanding)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Pending receivables from friends/family</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-rose-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider text-rose-800">
              Money Borrowed (You Owe)
            </span>
            <div className="p-1.5 bg-rose-50 text-rose-700 rounded-md">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-rose-700">
              {formatCurrency(summary.totalBorrowedOutstanding)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Payables owed to lenders</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-semibold uppercase tracking-wider text-slate-800">
              Advances Paid Out
            </span>
            <div className="p-1.5 bg-slate-50 text-slate-700 rounded-md">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(summary.totalAdvanceOutstanding)}
            </span>
            <p className="text-xs text-slate-500 mt-1">Deposits or prepayments awaiting service</p>
          </div>
        </div>
      </div>

      {/* Visual Debt & Obligations Flow Graph */}
      {obligations.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Debt Ledger & Settlement Visualization
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Side-by-side comparison of original loan capital, recovered repayments, and pending balances
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                Original Capital
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
                Settled / Repaid
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
                Pending Balance
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Settlement Bar Chart */}
            <div className="lg:col-span-2 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtComparisonData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis
                    dataKey="category"
                    tickLine={false}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    tickFormatter={formatChartAxisTick}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                    }}
                  />
                  <Bar dataKey="original" name="Original Total" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="repaid" name="Repaid / Settled" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="remaining" name="Pending Balance" fill="#E11D48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Active Counterparties */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/60 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 mb-1">
                  Active Counterparty Balances
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  Highest outstanding amounts awaiting settlement
                </p>

                {topCounterparties.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">All obligations are fully settled!</p>
                ) : (
                  <div className="space-y-2.5">
                    {topCounterparties.map((o) => {
                      const remaining = o.balanceRemaining ?? (o.amount - (o.totalRepaid || 0));
                      const percent =
                        o.amount > 0
                          ? Math.min(100, Math.round(((o.totalRepaid || 0) / o.amount) * 100))
                          : 0;
                      return (
                        <div key={o.id} className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                              {o.personName}
                            </span>
                            <span
                              className={`font-bold ${
                                o.type === 'LENT' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatCurrency(remaining)}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200/80 rounded-full h-1 overflow-hidden">
                            <div
                              className={`h-1 rounded-full ${
                                o.type === 'LENT' ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{o.type}</span>
                            <span>{percent}% cleared</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        {(
          [
            { key: 'ALL', label: 'All Records' },
            { key: 'LENT', label: 'Money Lent' },
            { key: 'BORROWED', label: 'Money Borrowed' },
            { key: 'ADVANCE', label: 'Advances' },
            { key: 'SETTLED', label: 'Settled' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-2 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Obligations List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading obligations ledger...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600">{error}</div>
      ) : filteredObligations.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <HandCoins className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No obligations found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Record money you lend, borrow, or pay in advance to track settlements accurately.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setModalDefaultType('LENT');
              setIsObligationModalOpen(true);
            }}
          >
            Record New Obligation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredObligations.map((ob) => {
            const remaining = ob.balanceRemaining ?? (ob.amount - (ob.totalRepaid || 0));
            const isSettled = ob.status === 'SETTLED' || remaining <= 0;
            const isHistoryExpanded = expandedHistoryId === ob.id;

            return (
              <div
                key={ob.id}
                className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            ob.type === 'LENT'
                              ? 'income'
                              : ob.type === 'BORROWED'
                              ? 'expense'
                              : 'neutral'
                          }
                        >
                          {ob.type}
                        </Badge>
                        {isSettled ? (
                          <Badge variant="neutral">SETTLED</Badge>
                        ) : ob.isOverdue ? (
                          <Badge variant="expense">OVERDUE</Badge>
                        ) : (
                          <Badge variant="info">ACTIVE</Badge>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 mt-2">{ob.personName}</h4>
                      {ob.personContact && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Phone className="h-3 w-3" />
                          {ob.personContact}
                        </span>
                      )}
                      {ob.account && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: ob.account.color || '#0F172A' }}
                          />
                          <span className="text-[11px] font-medium text-slate-600">
                            {ob.type === 'BORROWED' ? 'Deposited to: ' : 'Paid from: '}
                            <strong className="text-slate-900">{ob.account.name}</strong>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-medium">Remaining</span>
                      <p
                        className={`text-lg font-bold ${
                          isSettled
                            ? 'text-slate-400 line-through'
                            : ob.type === 'LENT'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(remaining)}
                      </p>
                      <span className="text-[11px] text-slate-400">
                        of {formatCurrency(ob.amount)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3">
                    {ob.description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Created: {formatDate(ob.createdAt)}
                    </span>
                    {ob.dueDate && (
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          ob.isOverdue ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Due: {formatDate(ob.dueDate)}
                      </span>
                    )}
                  </div>

                  {/* Repayment History Expansion */}
                  {ob.repayments && ob.repayments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() =>
                          setExpandedHistoryId(isHistoryExpanded ? null : ob.id)
                        }
                        className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <History className="h-3 w-3" />
                        <span>
                          {ob.repayments.length} Repayment{ob.repayments.length > 1 ? 's' : ''}{' '}
                          Recorded ({isHistoryExpanded ? 'Hide' : 'View'})
                        </span>
                      </button>

                      {isHistoryExpanded && (
                        <div className="mt-2 space-y-1.5 bg-slate-50 p-2.5 rounded-lg text-xs">
                          {ob.repayments.map((rep: any) => (
                            <div
                              key={rep.id}
                              className="flex items-center justify-between border-b border-slate-200/50 pb-1 last:border-0 last:pb-0"
                            >
                              <div>
                                <span className="font-semibold text-slate-900">
                                  {formatCurrency(rep.amount)}
                                </span>
                                {rep.account && (
                                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded ml-1.5">
                                    {rep.account.name}
                                  </span>
                                )}
                                {rep.notes && (
                                  <span className="text-[11px] text-slate-500 ml-1.5">
                                    ({rep.notes})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatDate(rep.date)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingObligation(ob)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                      title="Edit obligation details"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(ob.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Delete obligation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!isSettled ? (
                    <Button
                      size="sm"
                      onClick={() => setRepaymentObligation(ob)}
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    >
                      Record Repayment
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Settled in full
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record / Edit Obligation Modal */}
      <ObligationModal
        isOpen={isObligationModalOpen || Boolean(editingObligation)}
        initialObligation={editingObligation}
        onClose={() => {
          setIsObligationModalOpen(false);
          setEditingObligation(null);
        }}
        onSuccess={fetchObligations}
        defaultType={modalDefaultType}
      />

      {/* Record Repayment Modal */}
      <RepaymentModal
        isOpen={Boolean(repaymentObligation)}
        onClose={() => setRepaymentObligation(null)}
        onSuccess={fetchObligations}
        obligation={repaymentObligation}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Delete Obligation Record"
        subtitle="This will permanently delete this ledger record"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to remove this debt record and its repayment logs?
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
