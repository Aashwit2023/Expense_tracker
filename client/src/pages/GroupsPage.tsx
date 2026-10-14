import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users2,
  Plus,
  Plane,
  Home,
  Users,
  Heart,
  Sparkles,
  ArrowRight,
  Receipt,
  Scale,
  HandCoins,
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CreateGroupModal } from '../components/groups/CreateGroupModal';
import { GroupListItem, GroupType } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../api/client';

export const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<GroupListItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/groups');
      setGroups(res.data.data || []);
    } catch {
      setError('Could not load group list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(`/groups/${groupToDelete.id}`);
      setIsDeleteModalOpen(false);
      setGroupToDelete(null);
      fetchGroups();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setIsDeleting(false);
    }
  };

  // Aggregate stats across all user groups
  const totalUserOwed = groups
    .filter((g) => g.userNetBalance > 0)
    .reduce((sum, g) => sum + g.userNetBalance, 0);

  const totalUserOwes = groups
    .filter((g) => g.userNetBalance < 0)
    .reduce((sum, g) => sum + Math.abs(g.userNetBalance), 0);

  const netOverall = totalUserOwed - totalUserOwes;

  const filteredGroups = groups.filter((g) => {
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'ALL' || g.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getGroupTypeBadge = (type: GroupType) => {
    switch (type) {
      case 'TRIP':
        return { label: 'Trip', icon: Plane, color: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'HOME':
        return { label: 'Roommates', icon: Home, color: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'FRIENDS':
        return { label: 'Friends', icon: Users, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'FAMILY':
        return { label: 'Family', icon: Users2, color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'COUPLE':
        return { label: 'Couple', icon: Heart, color: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'Other', icon: Sparkles, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Group Expenses & Split Bills
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Fair bill splitting, shared ledgers, and simplified debt settlements for trips, flatmates & friends
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Create New Group
        </Button>
      </div>

      {/* Aggregate Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">You Are Owed (Total)</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <HandCoins className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            {formatCurrency(totalUserOwed)}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">Owed to you across all groups</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">You Owe (Total)</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-700">
              <Scale className="h-4 w-4" />
            </span>
          </div>
          <p className="text-lg font-bold text-rose-700 mt-1">
            {formatCurrency(totalUserOwes)}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">You need to repay others</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Net Balance</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Receipt className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`text-lg font-bold mt-1 ${
              netOverall > 0
                ? 'text-emerald-700'
                : netOverall < 0
                ? 'text-rose-700'
                : 'text-slate-700'
            }`}
          >
            {netOverall > 0 ? `+${formatCurrency(netOverall)}` : formatCurrency(netOverall)}
          </p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            {netOverall >= 0 ? 'Overall positive net receivable' : 'Overall pending net payable'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search groups by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {['ALL', 'TRIP', 'HOME', 'FRIENDS', 'FAMILY', 'COUPLE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === t
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'All Groups' : t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Groups List / Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading your groups...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600">{error}</div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <Users2 className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">
            {searchQuery || typeFilter !== 'ALL' ? 'No matching groups found' : 'No groups yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create a group for an upcoming trip, shared flat, or friends dinner to split bills automatically.
          </p>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((g) => {
            const badge = getGroupTypeBadge(g.type);
            const BadgeIcon = badge.icon;
            const net = g.userNetBalance;

            return (
              <div
                key={g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                className="bg-white rounded-xl border border-slate-200/80 p-5 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      <BadgeIcon className="h-3 w-3" />
                      <span>{badge.label}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <Users className="h-3 w-3 text-slate-400" />
                        {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupToDelete(g);
                          setIsDeleteModalOpen(true);
                        }}
                        title="Delete Group"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-700 tracking-tight transition-colors">
                    {g.name}
                  </h3>

                  {g.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {g.description}
                    </p>
                  )}

                  {/* Financial snapshot */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-600 font-medium">Total Group Spend</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {formatCurrency(g.totalExpenses)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-600 font-medium">Your Share</p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {formatCurrency(g.userShare)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer with user net balance badge */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    {net > 0 ? (
                      <div>
                        <span className="text-[10px] text-emerald-800 font-medium">You are owed</span>
                        <p className="text-xs font-bold text-emerald-700">+{formatCurrency(net)}</p>
                      </div>
                    ) : net < 0 ? (
                      <div>
                        <span className="text-[10px] text-rose-800 font-medium">You owe</span>
                        <p className="text-xs font-bold text-rose-700">
                          -{formatCurrency(Math.abs(net))}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-block text-xs font-medium text-slate-500">
                        Settled up
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-medium text-slate-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>View Group</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchGroups}
      />

      {/* Delete Group Modal */}
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
              Deleting <strong>"{groupToDelete?.name}"</strong> will remove all group expense splits, member ledger history, and settlement records.
            </p>
            <p className="text-[11px] text-rose-700">
              Your personal transactions and bank account balances recorded in your personal dashboard will remain intact.
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
