import React from 'react';
import { Menu, Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface TopbarProps {
  onOpenSidebar: () => void;
  onOpenQuickTransaction: () => void;
  title: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenSidebar,
  onOpenQuickTransaction,
  title,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>INR (₹)</span>
        </div>

        <Button
          size="sm"
          onClick={onOpenQuickTransaction}
          icon={<Plus className="h-4 w-4" />}
          className="shadow-xs"
        >
          <span>Add Transaction</span>
        </Button>
      </div>
    </header>
  );
};
