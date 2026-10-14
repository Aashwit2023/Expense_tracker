import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  WalletCards,
  ArrowRight,
  ShieldCheck,
  PieChart,
  Scale,
  Luggage,
  CalendarCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { loginDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = async () => {
    try {
      await loginDemo();
      navigate('/dashboard');
    } catch {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 selection:bg-slate-200">
      {/* Navigation */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs">
              <WalletCards className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-900 tracking-tight text-base">
              Personalized Money Tracker
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDemoLogin}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors hidden sm:inline-block cursor-pointer"
            >
              Explore Live Demo
            </button>
            <Link to="/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium mb-6 border border-slate-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Phase 1 Core Engine • Zero Bank Credentials Required</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.15]">
          A classic, disciplined tool for your personal finances.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
          Track expenses, maintain strict category budgets, keep a ledger of money lent or borrowed, and budget your upcoming trips—with zero clutter and mathematically exact ledger arithmetic.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="w-full sm:w-auto" icon={<ArrowRight className="h-4 w-4" />}>
              Create Free Account
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleDemoLogin}
          >
            Instant Demo Account (1-Click)
          </Button>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-14 p-2 sm:p-4 rounded-2xl bg-slate-100/80 border border-slate-200 shadow-xl max-w-4xl mx-auto">
          <div className="rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs text-left p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <p className="text-xs uppercase font-semibold text-slate-600 tracking-wider">
                  OCTOBER 2026 OVERVIEW
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">₹1,00,000.00 Total Inflow</h3>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-xs font-medium">
                  + ₹75,131.00 Net Surplus
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                  Budget on Track (24.8% Used)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-xs text-slate-500 font-medium">Recorded Income</span>
                <p className="text-lg font-bold text-emerald-700 mt-1">₹1,00,000.00</p>
                <span className="text-[11px] text-slate-400">Salary & consulting</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-xs text-slate-500 font-medium">Monthly Spending</span>
                <p className="text-lg font-bold text-rose-700 mt-1">₹24,869.00</p>
                <span className="text-[11px] text-slate-400">7 categories debited</span>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <span className="text-xs text-slate-500 font-medium">Money Lent (Receivable)</span>
                <p className="text-lg font-bold text-slate-900 mt-1">₹7,000.00</p>
                <span className="text-[11px] text-slate-400">1 active obligation</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50/70 rounded-lg text-xs text-slate-600 flex items-center justify-between">
              <span>Next upcoming bill: <strong>Apartment Rent (₹22,000)</strong></span>
              <span className="text-slate-400">Due Nov 1, 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-20 bg-white border-t border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Purpose-built for daily clarity
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              No machine learning guesswork. Every rupee is accounted for directly through clean human entries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <PieChart className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Category Budgets</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Set monthly targets for Dining, Utilities, Shopping, and Travel. Get proactive warnings at 80% and visual indicators before overspending.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Lent, Borrowed & Advances</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Separate debts from routine spending. Keep linked partial repayment logs so historical accounting stays untangled and accurate.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <Luggage className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Trip Expense Tracker</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Create dedicated trips with isolated budgets. Record flights, stays, food, and local transit without polluting your domestic monthly budget.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Recurring Bills & EMIs</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Track broadband, rent, and subscriptions. Convert scheduled bills into actual transactions with one click when payment completes.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Zero Floating-Point Drift</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Built on integer paise precision arithmetic. Avoids standard JavaScript floating point calculation errors across all reports.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200/80 bg-[#FBFBFA]">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Privacy & Data Ownership</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                We never ask for UPI PINs, bank passwords, or OTPs. Export your full transaction ledger as clean standard CSV anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 py-8 px-4 sm:px-6 text-center text-xs text-slate-500">
        <p>© 2026 Personalized Money Tracker. Crafted for clarity, security, and financial peace of mind.</p>
      </footer>
    </div>
  );
};
