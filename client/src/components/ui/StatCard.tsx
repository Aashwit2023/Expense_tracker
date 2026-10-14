import React from 'react';

interface StatCardProps {
  title: string;
  amount: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'income' | 'expense' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  amount,
  subtitle,
  icon,
  trend,
  variant = 'default',
}) => {
  const borderVariants = {
    default: 'border-slate-200/80',
    income: 'border-emerald-200/70',
    expense: 'border-rose-200/70',
    neutral: 'border-slate-200/80',
  };

  const amountColors = {
    default: 'text-slate-900',
    income: 'text-emerald-700',
    expense: 'text-rose-700',
    neutral: 'text-slate-800',
  };

  return (
    <div
      className={`bg-white rounded-xl p-5 border ${borderVariants[variant]} shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
        {icon && <div className="text-slate-400 p-1.5 bg-slate-50 rounded-lg">{icon}</div>}
      </div>

      <div>
        <div className={`text-2xl font-bold tracking-tight ${amountColors[variant]}`}>{amount}</div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {trend && (
              <span
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtitle && <span className="text-xs text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
