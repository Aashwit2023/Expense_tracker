import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'income' | 'expense' | 'transfer' | 'neutral' | 'warning' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const styles = {
    income: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    expense: 'bg-rose-50 text-rose-800 border-rose-200/60',
    transfer: 'bg-sky-50 text-sky-800 border-sky-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    info: 'bg-slate-100 text-slate-800 border-slate-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${styles[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
};
