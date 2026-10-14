import React, { useState, useEffect, useCallback } from 'react';
import {
  Luggage,
  Plus,
  MapPin,
  Calendar,
  Trash2,
  Receipt,
  Plane,
  Building,
  Utensils,
  ShoppingBag,
  Bus,
  Sparkles,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TripModal } from '../components/trips/TripModal';
import { TripExpenseModal } from '../components/trips/TripExpenseModal';
import { Trip } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import api from '../api/client';

export const TripsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active selected trip for viewing expense list
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Modal States
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [expenseModalTrip, setExpenseModalTrip] = useState<Trip | null>(null);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<{ tripId: string; expenseId: string } | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/trips');
      const list: Trip[] = res.data.data;
      setTrips(list);
      if (list.length > 0 && !selectedTripId) {
        setSelectedTripId(list[0].id);
      }
    } catch {
      setError('Could not load trips.');
    } finally {
      setLoading(false);
    }
  }, [selectedTripId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDeleteTrip = async () => {
    if (!deletingTripId) return;
    try {
      await api.delete(`/trips/${deletingTripId}`);
      if (selectedTripId === deletingTripId) setSelectedTripId(null);
      setDeletingTripId(null);
      fetchTrips();
    } catch {
      alert('Failed to delete trip');
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;
    try {
      await api.delete(`/trips/${deletingExpense.tripId}/expenses/${deletingExpense.expenseId}`);
      setDeletingExpense(null);
      fetchTrips();
    } catch {
      alert('Failed to remove expense');
    }
  };

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'TRAVEL':
        return <Plane className="h-3.5 w-3.5" />;
      case 'ACCOMMODATION':
        return <Building className="h-3.5 w-3.5" />;
      case 'FOOD':
        return <Utensils className="h-3.5 w-3.5" />;
      case 'SHOPPING':
        return <ShoppingBag className="h-3.5 w-3.5" />;
      case 'TRANSPORT':
        return <Bus className="h-3.5 w-3.5" />;
      case 'ACTIVITIES':
        return <Sparkles className="h-3.5 w-3.5" />;
      default:
        return <MoreHorizontal className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Trip Expense Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated budgets and expense breakdowns for vacations, treks, and travels
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setEditingTrip(null);
            setIsTripModalOpen(true);
          }}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Create New Trip
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading trips...</div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-rose-600">{error}</div>
      ) : trips.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
          <Luggage className="h-8 w-8 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800">No trips planned yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create your next destination and keep track of hotels, travel bookings, and food costs.
          </p>
          <Button
            size="sm"
            onClick={() => {
              setEditingTrip(null);
              setIsTripModalOpen(true);
            }}
          >
            Create Your First Trip
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Trips Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              Your Trips ({trips.length})
            </h3>
            {trips.map((t) => {
              const isSelected = t.id === activeTrip?.id;
              const spent = t.totalSpent || 0;
              const percentage = t.percentage || 0;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTripId(t.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                      <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {t.destination}
                      </span>
                    </div>
                    <Badge variant={t.status === 'COMPLETED' ? 'neutral' : 'info'}>
                      {t.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {formatDate(t.startDate)} – {formatDate(t.endDate)}
                    </span>
                  </div>

                  {/* Spending Bar */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Spent: {formatCurrency(spent)}</span>
                      <span className="font-semibold text-slate-800">
                        Budget: {formatCurrency(t.budget)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percentage > 100 ? 'bg-rose-600' : 'bg-slate-900'
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Trip Details & Expense Ledger */}
          {activeTrip && (
            <div className="lg:col-span-2 space-y-4">
              {/* Trip Overview Banner */}
              <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{activeTrip.name}</h3>
                      <Badge variant="neutral">{activeTrip.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {activeTrip.destination} • {formatDate(activeTrip.startDate)} to{' '}
                      {formatDate(activeTrip.endDate)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeletingTripId(activeTrip.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete trip"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Button
                      size="sm"
                      onClick={() => setExpenseModalTrip(activeTrip)}
                      icon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Add Expense
                    </Button>
                  </div>
                </div>

                {/* Trip Metric Cards */}
                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">
                      Budget Allocated
                    </span>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {formatCurrency(activeTrip.budget)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">
                      Total Spent
                    </span>
                    <p className="text-base font-bold text-rose-700 mt-0.5">
                      {formatCurrency(activeTrip.totalSpent || 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">
                      Remaining
                    </span>
                    <p
                      className={`text-base font-bold mt-0.5 ${
                        (activeTrip.remainingBudget || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatCurrency(activeTrip.remainingBudget || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip Expenses Table */}
              <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                    Trip Expenses Log ({activeTrip.expenses?.length || 0})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Calculated exclusively from trip records
                  </span>
                </div>

                {!activeTrip.expenses || activeTrip.expenses.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No expenses logged for this trip yet. Click "Add Expense" to start recording.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeTrip.expenses.map((exp: any) => (
                      <div
                        key={exp.id}
                        className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                            {getCategoryIcon(exp.category)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{exp.description}</p>
                            <span className="text-[11px] text-slate-400">
                              {formatDate(exp.date)} • {exp.category} • {exp.paymentMethod}
                              {exp.notes && ` • ${exp.notes}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">
                            {formatCurrency(exp.amount)}
                          </span>
                          <button
                            onClick={() =>
                              setDeletingExpense({ tripId: activeTrip.id, expenseId: exp.id })
                            }
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <TripModal
        isOpen={isTripModalOpen}
        onClose={() => {
          setIsTripModalOpen(false);
          setEditingTrip(null);
        }}
        onSuccess={fetchTrips}
        initialTrip={editingTrip}
      />

      <TripExpenseModal
        isOpen={Boolean(expenseModalTrip)}
        onClose={() => setExpenseModalTrip(null)}
        onSuccess={fetchTrips}
        trip={expenseModalTrip}
      />

      {/* Delete Trip Confirmation */}
      <Modal
        isOpen={Boolean(deletingTripId)}
        onClose={() => setDeletingTripId(null)}
        title="Delete Trip"
        subtitle="This will permanently delete this trip and its logged expenses"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to delete this trip record?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeletingTripId(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteTrip}>
            Confirm Delete
          </Button>
        </div>
      </Modal>

      {/* Delete Trip Expense Confirmation */}
      <Modal
        isOpen={Boolean(deletingExpense)}
        onClose={() => setDeletingExpense(null)}
        title="Delete Expense"
        subtitle="Remove this expense from the trip budget"
      >
        <p className="text-xs text-slate-600 mb-4">
          Are you sure you want to remove this trip expense?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setDeletingExpense(null)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDeleteExpense}>
            Remove Expense
          </Button>
        </div>
      </Modal>
    </div>
  );
};
