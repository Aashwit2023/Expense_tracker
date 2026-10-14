import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Button } from '../components/ui/Button';
import { formatCurrency, formatChartAxisTick } from '../utils/formatters';
import api from '../api/client';

export const ReportsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'ALL' | 'ROUTINE'>('ALL');

  // CSV Export Filter
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/reports/analytics');
      setAnalytics(res.data.data);
    } catch {
      setError('Could not load financial analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (exportStartDate) params.append('startDate', exportStartDate);
      if (exportEndDate) params.append('endDate', exportEndDate);

      const res = await api.get(`/reports/export-csv?${params.toString()}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Could not download CSV export');
    }
  };

  if (loading && !analytics) {
    return (
      <div className="p-12 text-center text-xs text-slate-500">
        Compiling analytics and historical records...
      </div>
    );
  }

  const { mom = {}, monthlyBreakdown = [] } = analytics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Month-over-month trajectory, net savings rate, and certified data export
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleExportCSV}
          icon={<Download className="h-3.5 w-3.5" />}
        >
          Download All CSV
        </Button>
      </div>

      {/* MoM Performance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Current Month Income
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            {formatCurrency(mom.currentMonthIncome || 0)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {mom.incomeMoMGrowth >= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                +{mom.incomeMoMGrowth}% MoM
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                {mom.incomeMoMGrowth}% MoM
              </span>
            )}
            <span className="text-slate-400">vs prev month</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Current Month Expense
          </span>
          <p className="text-2xl font-bold text-rose-700 mt-1">
            {formatCurrency(mom.currentMonthExpense || 0)}
          </p>
          <div className="flex items-center gap-1 mt-2 text-xs">
            {mom.expenseMoMGrowth <= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center">
                {mom.expenseMoMGrowth}% MoM (Spending down)
              </span>
            ) : (
              <span className="text-rose-600 font-semibold flex items-center">
                +{mom.expenseMoMGrowth}% MoM (Spending up)
              </span>
            )}
            <span className="text-slate-400">vs prev month</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Prev Month Income
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatCurrency(mom.prevMonthIncome || 0)}
          </p>
          <span className="text-xs text-slate-400 mt-2 block">Prior period baseline</span>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Prev Month Expense
          </span>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {formatCurrency(mom.prevMonthExpense || 0)}
          </p>
          <span className="text-xs text-slate-400 mt-2 block">Prior period baseline</span>
        </div>
      </div>

      {/* 6-Month Performance Bar Chart */}
      <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              6-Month Financial Flow & Debt Historical Performance
            </h3>
            <p className="text-xs text-slate-500">
              Multi-month cash flow and debt obligations comparison based on verified ledger records
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                chartMode === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Flows (Cash + Debt)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('ROUTINE')}
              className={`px-2.5 py-1 rounded font-medium transition-all cursor-pointer ${
                chartMode === 'ROUTINE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Routine Only
            </button>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tick={{ fontSize: 11, fill: '#64748B' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={formatChartAxisTick}
              />
              <Tooltip
                formatter={(val: any, name: any) => [formatCurrency(Number(val)), name]}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="income" name="Income (+)" fill="#15803D" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expense (-)" fill="#DC2626" radius={[4, 4, 0, 0]} />
              {chartMode === 'ALL' && (
                <>
                  <Bar
                    dataKey="debtInflow"
                    name="Debt Inflow (+)"
                    fill="#0284C7"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="debtOutflow"
                    name="Debt Outflow (-)"
                    fill="#D97706"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              )}
              <Bar
                dataKey={chartMode === 'ALL' ? 'netCashFlow' : 'savings'}
                name={chartMode === 'ALL' ? 'Net Flow' : 'Net Savings'}
                fill="#0F172A"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Custom Range CSV Export Box */}
      <div className="p-6 rounded-xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Download className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-semibold text-slate-900">Export Ledger Records</h3>
        </div>
        <p className="text-xs text-slate-500 max-w-xl mb-4 leading-relaxed">
          Download your complete financial records into standard CSV format suitable for Excel,
          Google Sheets, tax filings, or local spreadsheet archives.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">From:</span>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">To:</span>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <Button size="sm" onClick={handleExportCSV}>
            Generate CSV File
          </Button>
        </div>
      </div>
    </div>
  );
};
