import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TransactionModal } from '../transactions/TransactionModal';
import { SplitTransactionModal } from '../transactions/SplitTransactionModal';
import { Transaction } from '../../types';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [splittingTransaction, setSplittingTransaction] = useState<Transaction | null>(null);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    switch (pathname) {
      case '/dashboard':
        return 'Financial Dashboard';
      case '/transactions':
        return 'Transactions Ledger';
      case '/budgets':
        return 'Monthly Budgets';
      case '/obligations':
        return 'Money Lent, Borrowed & Advances';
      case '/trips':
        return 'Trip Expense Tracker';
      case '/groups':
        return 'Groups & Shared Bills';
      case '/recurring':
        return 'Recurring Transactions & Bills';
      case '/categories':
        return 'Category Management';
      case '/reports':
        return 'Reports & Data Export';
      default:
        return 'Personalized Money Tracker';
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA]">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col md:pl-64 min-h-screen">
        <Topbar
          title={getPageTitle(location.pathname)}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenQuickTransaction={() => setTransactionModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onSuccess={() => {
          // Trigger a window event so active pages refresh their data
          window.dispatchEvent(new CustomEvent('transaction-updated'));
        }}
        onSplitRequested={(tx) => setSplittingTransaction(tx)}
      />

      <SplitTransactionModal
        isOpen={Boolean(splittingTransaction)}
        onClose={() => setSplittingTransaction(null)}
        onSuccess={() => {
          setSplittingTransaction(null);
          window.dispatchEvent(new CustomEvent('transaction-updated'));
        }}
        transaction={splittingTransaction}
      />
    </div>
  );
};
