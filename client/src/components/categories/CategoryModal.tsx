import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import api from '../../api/client';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: 'EXPENSE' | 'INCOME';
}

const COLOR_PRESETS = [
  '#0F172A', '#475569', '#DC2626', '#EA580C', '#D97706',
  '#16A34A', '#0D9488', '#0284C7', '#4F46E5', '#9333EA', '#DB2777'
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'EXPENSE',
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(defaultType);
  const [color, setColor] = useState('#0F172A');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(defaultType);
      setColor('#0F172A');
      setError(null);
    }
  }, [isOpen, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/categories', {
        name: name.trim(),
        type,
        color,
        icon: 'Tag',
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Custom Category"
      subtitle="Organize your income or expense tracking"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category Type</label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'EXPENSE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Expense Category
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                type === 'INCOME' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Income Category
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Category Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Gym & Fitness, Software Tools"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Color Tag</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};
