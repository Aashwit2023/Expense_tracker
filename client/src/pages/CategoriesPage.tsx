import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Tag, Trash2, Edit2, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { CategoryModal } from '../components/categories/CategoryModal';
import { Category } from '../types';
import api from '../api/client';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data.data);
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/categories/${deletingId}`);
      setDeletingId(null);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not delete category');
    }
  };

  const filtered = categories.filter((c) => c.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Category Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Default taxonomy and custom categories for income and expenses
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Add Custom Category
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('EXPENSE')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'EXPENSE'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Expense Categories ({categories.filter((c) => c.type === 'EXPENSE').length})
        </button>
        <button
          onClick={() => setActiveTab('INCOME')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'INCOME'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Income Categories ({categories.filter((c) => c.type === 'INCOME').length})
        </button>
      </div>

      {/* Category Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading categories...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 truncate pr-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-900 truncate">{cat.name}</p>
                  <span className="text-[10px] text-slate-400">
                    {cat.isCustom ? 'Custom Category' : 'Default Standard'}
                  </span>
                </div>
              </div>

              {cat.isCustom ? (
                <button
                  onClick={() => setDeletingId(cat.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                  title="Delete custom category"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : (
                <Badge variant="neutral">Locked</Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCategories}
        defaultType={activeTab}
      />

      {/* Delete Category Confirmation */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        title="Delete Custom Category"
        subtitle="This action cannot be undone"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to delete this custom category? Existing transactions that used this
          category will become uncategorized.
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
