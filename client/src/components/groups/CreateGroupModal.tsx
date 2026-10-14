import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Users, Plane, Home, Heart, Users2, Sparkles, Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { GroupType } from '../../types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GROUP_TYPES: { type: GroupType; label: string; icon: any; desc: string }[] = [
  { type: 'TRIP', label: 'Trip & Vacation', icon: Plane, desc: 'Trek, weekend getaway, tour' },
  { type: 'HOME', label: 'Home & Flatmates', icon: Home, desc: 'Shared rent, groceries, utilities' },
  { type: 'FRIENDS', label: 'Friends & Hangouts', icon: Users, desc: 'Dinners, movies, events' },
  { type: 'FAMILY', label: 'Family', icon: Users2, desc: 'Household & common expenses' },
  { type: 'COUPLE', label: 'Couple', icon: Heart, desc: 'Shared dates & lifestyle' },
  { type: 'OTHER', label: 'Other', icon: Sparkles, desc: 'Projects, events, or custom' },
];

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType>('TRIP');
  const [creatorUpiId, setCreatorUpiId] = useState('');
  const [initialMembers, setInitialMembers] = useState<{ name: string; email?: string; upiId?: string }[]>([
    { name: '', email: '', upiId: '' },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMemberRow = () => {
    setInitialMembers([...initialMembers, { name: '', email: '', upiId: '' }]);
  };

  const handleRemoveMemberRow = (idx: number) => {
    setInitialMembers(initialMembers.filter((_, i) => i !== idx));
  };

  const handleUpdateMember = (idx: number, field: string, val: string) => {
    const updated = [...initialMembers];
    updated[idx] = { ...updated[idx], [field]: val };
    setInitialMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a group name');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const filteredMembers = initialMembers
        .map((m) => ({
          name: m.name.trim(),
          email: m.email?.trim() || undefined,
          upiId: m.upiId?.trim() || undefined,
        }))
        .filter((m) => m.name.length > 0);

      await api.post('/groups', {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        currency: 'INR',
        creatorUpiId: creatorUpiId.trim() || undefined,
        initialMembers: filteredMembers,
      });

      setName('');
      setDescription('');
      setType('TRIP');
      setCreatorUpiId('');
      setInitialMembers([{ name: '', email: '', upiId: '' }]);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Group" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Group Name & Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Group Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Goa Roadtrip, Flat 402 Rent & Bills, Weekend Dinner"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
          <textarea
            rows={2}
            placeholder="Short note about what this group tracks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none resize-none"
          />
        </div>

        {/* Group Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Group Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GROUP_TYPES.map((gt) => {
              const Icon = gt.icon;
              const isSelected = type === gt.type;
              return (
                <button
                  type="button"
                  key={gt.type}
                  onClick={() => setType(gt.type)}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md ${
                      isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-900 leading-tight">{gt.label}</p>
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{gt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Creator UPI ID */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Your UPI ID (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. username@okhdfcbank (for receiving instant repayments)"
            value={creatorUpiId}
            onChange={(e) => setCreatorUpiId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
          />
          <span className="text-[10px] text-slate-600">
            Enables one-click "Pay via UPI" links for other members when settling up with you.
          </span>
        </div>

        {/* Initial Group Members */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Add Group Members</label>
              <p className="text-[10px] text-slate-600">
                You are automatically added as Admin. Add friends, flatmates, or colleagues below.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddMemberRow}
              className="text-xs text-slate-900 font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add Member
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {initialMembers.map((m, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Member Name *"
                  value={m.name}
                  onChange={(e) => handleUpdateMember(idx, 'name', e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  value={m.email || ''}
                  onChange={(e) => handleUpdateMember(idx, 'email', e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="UPI ID (Optional)"
                  value={m.upiId || ''}
                  onChange={(e) => handleUpdateMember(idx, 'upiId', e.target.value)}
                  className="w-28 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
                {initialMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMemberRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Create Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};
