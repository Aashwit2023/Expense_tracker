import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Scale,
  Receipt,
  Users,
  PiggyBank,
  History,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  LogOut,
  UserPlus,
  Filter,
  Search,
  Utensils,
  Building,
  Home,
  Plane,
  Bus,
  ShoppingBag,
  Zap,
  MoreHorizontal,
  CreditCard,
  Pencil,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { AddExpenseModal } from '../components/groups/AddExpenseModal';
import { RecordSettlementModal } from '../components/groups/RecordSettlementModal';
import { AddMemberModal } from '../components/groups/AddMemberModal';
import { GroupBudgetModal } from '../components/groups/GroupBudgetModal';
import { AdjustBalanceModal } from '../components/groups/AdjustBalanceModal';
import { EditExpenseModal } from '../components/groups/EditExpenseModal';
import { GroupDetailsData, SuggestedSettlement, GroupExpense, GroupMember } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../api/client';

export const GroupDetailsPage: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<GroupDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'EXPENSES' | 'BALANCES' | 'BUDGET' | 'MEMBERS' | 'ACTIVITY'>('EXPENSES');

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestedSettlement | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState(false);
  const [selectedAdjustMember, setSelectedAdjustMember] = useState<GroupMember | null>(null);
  const [expenseToEdit, setExpenseToEdit] = useState<GroupExpense | null>(null);
  const [isEditExpenseModalOpen, setIsEditExpenseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Expense filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const fetchGroupDetails = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/groups/${groupId}`);
      setData(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load group details');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleCancelExpense = async (expenseId: string) => {
    if (!window.confirm('Are you sure you want to cancel this expense? The ledger will recalculate automatically.')) {
      return;
    }
    try {
      await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
      fetchGroupDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel expense');
    }
  };

  const handleReverseSettlement = async (settlementId: string) => {
    if (!window.confirm('Reverse this repayment settlement? Outstanding balances will revert.')) {
      return;
    }
    try {
      await api.post(`/groups/${groupId}/settlements/${settlementId}/reverse`);
      fetchGroupDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reverse settlement');
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    try {
      await api.post(`/groups/${groupId}/leave`);
      navigate('/groups');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot leave group');
    }
  };

  const handleDeleteGroup = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/groups/${groupId}`);
      setIsDeleteModalOpen(false);
      navigate('/groups');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Food':
        return <Utensils className="h-3.5 w-3.5" />;
      case 'Hotel':
        return <Building className="h-3.5 w-3.5" />;
      case 'Rent':
        return <Home className="h-3.5 w-3.5" />;
      case 'Travel':
        return <Plane className="h-3.5 w-3.5" />;
      case 'Transport':
        return <Bus className="h-3.5 w-3.5" />;
      case 'Shopping':
        return <ShoppingBag className="h-3.5 w-3.5" />;
      case 'Utilities':
        return <Zap className="h-3.5 w-3.5" />;
      default:
        return <MoreHorizontal className="h-3.5 w-3.5" />;
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading group details...</div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-xs text-rose-600">{error || 'Group not found'}</p>
        <Button size="sm" variant="outline" onClick={() => navigate('/groups')}>
          Back to Groups
        </Button>
      </div>
    );
  }

  const { group, currentMember, members, summary, settlementSuggestions, expenses, settlements, activities, budget, categoryBreakdown } = data;

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/groups')}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{group.name}</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {group.type}
              </span>
            </div>
            {group.description && (
              <p className="text-xs text-slate-600 mt-0.5">{group.description}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => setIsExpenseModalOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Add expense
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedSuggestion(null);
              setIsSettlementModalOpen(true);
            }}
            icon={<Scale className="h-3.5 w-3.5 text-slate-600" />}
          >
            Settle up
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddMemberModalOpen(true)}
            icon={<UserPlus className="h-3.5 w-3.5 text-slate-600" />}
          >
            Add member
          </Button>

          <button
            onClick={handleLeaveGroup}
            title="Leave group"
            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            title="Delete group"
            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-slate-200 cursor-pointer transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Snapshot Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Total Group Spend
          </span>
          <p className="text-base font-bold text-slate-900 mt-0.5">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Your Paid Amount
          </span>
          <p className="text-base font-bold text-slate-800 mt-0.5">
            {formatCurrency(summary.userTotalPaid)}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
            Your Expense Share
          </span>
          <p className="text-base font-bold text-slate-800 mt-0.5">
            {formatCurrency(summary.userTotalShare)}
          </p>
        </div>

        <div className="border-l border-slate-100 pl-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Your Net Position
          </span>
          {summary.userNetBalance > 0 ? (
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              +{formatCurrency(summary.userNetBalance)} (You are owed)
            </p>
          ) : summary.userNetBalance < 0 ? (
            <p className="text-base font-bold text-rose-700 mt-0.5">
              -{formatCurrency(Math.abs(summary.userNetBalance))} (You owe)
            </p>
          ) : (
            <p className="text-base font-bold text-slate-600 mt-0.5">₹0.00 (Settled up)</p>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto text-xs font-medium">
        {[
          { id: 'EXPENSES', label: `Expenses (${expenses.length})`, icon: Receipt },
          { id: 'BALANCES', label: `Balances & Settle Up (${settlementSuggestions.length})`, icon: Scale },
          { id: 'BUDGET', label: 'Trip Budget', icon: PiggyBank },
          { id: 'MEMBERS', label: `Members (${members.length})`, icon: Users },
          { id: 'ACTIVITY', label: `Activity Log (${activities.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 font-medium transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: EXPENSES */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search expense titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs">
              <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3" /> Category:
              </span>
              {['ALL', 'Food', 'Hotel', 'Travel', 'Transport', 'Rent', 'Shopping', 'Utilities'].map(
                (c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      categoryFilter === c
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <Receipt className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No shared expenses found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Add an expense to automatically split costs among group members.
              </p>
              <Button
                size="sm"
                onClick={() => setIsExpenseModalOpen(true)}
                icon={<Plus className="h-3.5 w-3.5" />}
              >
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => {
                const isExpanded = expandedExpenseId === exp.id;
                const isPayer = exp.payerId === currentMember?.id;
                const userParticipant = exp.participants.find(
                  (p) => p.memberId === currentMember?.id
                );

                return (
                  <div
                    key={exp.id}
                    className="bg-white rounded-xl border border-slate-200/80 transition-all hover:border-slate-300"
                  >
                    <div
                      onClick={() => setExpandedExpenseId(isExpanded ? null : exp.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {exp.title}
                            </h4>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                              {exp.splitMethod}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Paid by <strong className="text-slate-800 font-semibold">{exp.payer?.name || 'Member'}</strong> • {formatDate(exp.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">
                            {formatCurrency(exp.amount)}
                          </p>
                          {userParticipant ? (
                            <p className="text-[10px] text-slate-600">
                              Your share: <strong>{formatCurrency(userParticipant.shareAmount)}</strong>
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-600 italic">Not involved</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpenseToEdit(exp);
                            setIsEditExpenseModalOpen(true);
                          }}
                          title="Edit Split Expense"
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Split Details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl space-y-3 text-xs">
                        {exp.notes && (
                          <p className="text-[11px] text-slate-600 italic">
                            Notes: {exp.notes}
                          </p>
                        )}

                        <div>
                          <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                            Participant Breakdown ({exp.participants.length}):
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {exp.participants.map((p) => (
                              <div
                                key={p.id}
                                className="bg-white p-2 rounded border border-slate-200"
                              >
                                <p className="text-[11px] font-medium text-slate-800 truncate">
                                  {p.member?.name || 'Member'}
                                </p>
                                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                                  {formatCurrency(p.shareAmount)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                          <span className="text-[10px] text-slate-600">
                            Exact ledger entry reconciled to paise
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpenseToEdit(exp);
                                setIsEditExpenseModalOpen(true);
                              }}
                              className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-slate-200/60 transition-colors"
                            >
                              <Pencil className="h-3 w-3" /> Edit Expense
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelExpense(exp.id);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1 cursor-pointer px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" /> Cancel Expense
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: BALANCES & SETTLE UP */}
      {activeTab === 'BALANCES' && (
        <div className="space-y-6">
          {/* Settle Up Suggestions Section */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-slate-700" />
                  <span>Optimized Settlement Plan (Who Owes Whom)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Greedy debt simplification minimizes total transactions needed to clear all group debts.
                </p>
              </div>
            </div>

            {settlementSuggestions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-800">All balances are completely settled!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">No member owes money to anyone right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {settlementSuggestions.map((sugg, idx) => {
                  const isYouPaying = sugg.payerId === currentMember?.id;
                  const isYouReceiving = sugg.recipientId === currentMember?.id;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isYouPaying
                          ? 'bg-rose-50/50 border-rose-200'
                          : isYouReceiving
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full font-bold text-xs ${
                            isYouPaying
                              ? 'bg-rose-100 text-rose-800'
                              : isYouReceiving
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-xs text-slate-900">
                            <strong>{sugg.payerName}</strong> {isYouPaying ? '(You)' : ''} owes{' '}
                            <strong>{sugg.recipientName}</strong> {isYouReceiving ? '(You)' : ''}
                          </p>
                          <p className="text-sm font-bold text-slate-900 mt-0.5">
                            {formatCurrency(sugg.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {sugg.upiPaymentLink && (
                          <a
                            href={sugg.upiPaymentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-medium text-xs shadow-xs transition-colors"
                          >
                            <span>Pay via UPI</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSuggestion(sugg);
                            setIsSettlementModalOpen(true);
                          }}
                        >
                          Record Repayment
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complete Member Balances Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Member Net Ledger Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Exact balance accounting calculated transparently from expense shares and recorded settlements.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Member</th>
                    <th className="py-2.5 px-4 text-right">Total Paid (Bills)</th>
                    <th className="py-2.5 px-4 text-right">Total Share</th>
                    <th className="py-2.5 px-4 text-right">Settlements Paid</th>
                    <th className="py-2.5 px-4 text-right">Settlements Recv</th>
                    <th className="py-2.5 px-4 text-right">Net Balance</th>
                    <th className="py-2.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const isYou = m.id === currentMember?.id;
                    const net = m.netBalance || 0;

                    return (
                      <tr key={m.id} className={isYou ? 'bg-slate-50/60 font-semibold' : ''}>
                        <td className="py-3 px-4">
                          <span className="text-slate-900">{m.name}</span>
                          {isYou && <span className="ml-1 text-[10px] text-slate-500">(You)</span>}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatCurrency(m.totalPaid || 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatCurrency(m.totalShare || 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatCurrency(m.settlementsPaid || 0)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700">
                          {formatCurrency(m.settlementsReceived || 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {net > 0 ? (
                            <span className="font-bold text-emerald-700">+{formatCurrency(net)}</span>
                          ) : net < 0 ? (
                            <span className="font-bold text-rose-700">-{formatCurrency(Math.abs(net))}</span>
                          ) : (
                            <span className="text-slate-500 font-medium">₹0.00</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAdjustMember(m);
                              setIsAdjustBalanceModalOpen(true);
                            }}
                            icon={<Pencil className="h-3 w-3 text-slate-500" />}
                          >
                            Adjust
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Repayment History */}
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recorded Repayments History</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditable logs of previous settlements between members.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedSuggestion(null);
                  setIsSettlementModalOpen(true);
                }}
              >
                + Record Repayment
              </Button>
            </div>

            {settlements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No repayments have been recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {settlements.map((set) => {
                  const isReversed = set.status === 'REVERSED';
                  return (
                    <div
                      key={set.id}
                      className={`p-3.5 flex items-center justify-between gap-3 ${
                        isReversed ? 'opacity-50 line-through bg-slate-50' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          <strong>{set.payer?.name}</strong> repaid <strong>{set.recipient?.name}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDate(set.date)} {set.reference ? `• Ref: ${set.reference}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">
                          {formatCurrency(set.amount)}
                        </span>
                        {!isReversed && (
                          <button
                            type="button"
                            onClick={() => handleReverseSettlement(set.id)}
                            title="Reverse settlement"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isReversed && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold no-underline">
                            REVERSED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: TRIP BUDGET */}
      {activeTab === 'BUDGET' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trip & Group Budget Monitor</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set a budget cap for this trip or group to monitor spending limits and burn rate.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIsBudgetModalOpen(true)}>
                {budget ? 'Edit Budget' : 'Configure Budget'}
              </Button>
            </div>

            {budget ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Target Budget</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatCurrency(budget.amount)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Spent</span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatCurrency(budget.totalSpent || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase">Remaining</span>
                    <p
                      className={`text-base font-bold mt-0.5 ${
                        budget.isExceeded ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {budget.isExceeded
                        ? `Over by ${formatCurrency(Math.abs((budget.amount || 0) - (budget.totalSpent || 0)))}`
                        : formatCurrency(budget.remaining || 0)}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-700">Budget Utilization</span>
                    <span
                      className={
                        budget.percentage && budget.percentage > 100
                          ? 'text-rose-700 font-bold'
                          : budget.percentage && budget.percentage > 80
                          ? 'text-amber-700'
                          : 'text-slate-700'
                      }
                    >
                      {budget.percentage || 0}% used
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        budget.percentage && budget.percentage > 100
                          ? 'bg-rose-600'
                          : budget.percentage && budget.percentage > 80
                          ? 'bg-amber-500'
                          : 'bg-slate-900'
                      }`}
                      style={{ width: `${Math.min(100, budget.percentage || 0)}%` }}
                    />
                  </div>
                </div>

                {budget.percentage && budget.percentage > 80 && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      budget.percentage > 100
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      {budget.percentage > 100
                        ? 'Warning: Total group expenses have exceeded the target budget.'
                        : 'Caution: Group spending is approaching the 80% budget limit.'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <PiggyBank className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-800">No budget configured yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                  Set a budget to track group spending limits for vacations and projects.
                </p>
                <Button size="sm" onClick={() => setIsBudgetModalOpen(true)}>
                  Configure Budget
                </Button>
              </div>
            )}
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Category Spending Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(categoryBreakdown).map(([cat, amt]) => (
                <div key={cat} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(amt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: MEMBERS */}
      {activeTab === 'MEMBERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Group Members ({members.length})</h3>
            <Button size="sm" onClick={() => setIsAddMemberModalOpen(true)} icon={<UserPlus className="h-3.5 w-3.5" />}>
              Add Member
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {members.map((m) => {
              const isYou = m.id === currentMember?.id;
              const net = m.netBalance || 0;

              return (
                <div key={m.id} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {m.name} {isYou && '(You)'}
                      </p>
                      {m.email && <p className="text-[11px] text-slate-500">{m.email}</p>}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                      {m.role}
                    </span>
                  </div>

                  {m.upiId && (
                    <p className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-mono truncate">
                      UPI: {m.upiId}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-500">Net Position:</span>
                    {net > 0 ? (
                      <span className="font-bold text-emerald-700">+{formatCurrency(net)}</span>
                    ) : net < 0 ? (
                      <span className="font-bold text-rose-700">-{formatCurrency(Math.abs(net))}</span>
                    ) : (
                      <span className="text-slate-500 font-medium">Settled</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: ACTIVITY */}
      {activeTab === 'ACTIVITY' && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Group Activity & Audit Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical record of expenses, settlements, and member changes.
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No activity logged yet.</div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-3.5 flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-slate-100 text-slate-600 mt-0.5 shrink-0">
                    <History className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-800 font-medium">{act.description}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(act.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
        members={members}
        currentMemberId={currentMember?.id}
      />

      <RecordSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
        members={members}
        currentMemberId={currentMember?.id}
        initialSuggestion={selectedSuggestion}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
      />

      <GroupBudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
        currentBudgetPaise={budget?.amount || 0}
      />

      <AdjustBalanceModal
        isOpen={isAdjustBalanceModalOpen}
        onClose={() => {
          setIsAdjustBalanceModalOpen(false);
          setSelectedAdjustMember(null);
        }}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
        targetMember={selectedAdjustMember}
        members={members}
        currentMemberId={currentMember?.id}
      />

      <EditExpenseModal
        isOpen={isEditExpenseModalOpen}
        onClose={() => {
          setIsEditExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        onSuccess={fetchGroupDetails}
        groupId={group.id}
        expense={expenseToEdit}
        members={members}
        currentMemberId={currentMember?.id}
      />

      {/* Delete Group Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        title="Delete Group"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-rose-900">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              Warning: This action cannot be undone!
            </p>
            <p>
              Deleting <strong>"{group.name}"</strong> will remove all group expense splits, member ledger history, and settlement records.
            </p>
            <p className="text-[11px] text-rose-700">
              Your personal transactions and bank account balances recorded in your personal dashboard will be preserved, but unlinked from this group.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDeleteGroup}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Delete Group Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
