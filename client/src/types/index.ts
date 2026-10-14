export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
export type AccountType = 'BANK' | 'CASH' | 'CREDIT_CARD' | 'INVESTMENT' | 'WALLET' | 'OTHER';
export type ObligationType = 'LENT' | 'BORROWED' | 'ADVANCE';
export type ObligationStatus = 'ACTIVE' | 'SETTLED';
export type TripStatus = 'PLANNED' | 'ONGOING' | 'COMPLETED';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance?: number;
  color?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  userId?: string | null;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
  color: string;
  isCustom: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  toAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: number; // in paise
  date: string;
  merchant?: string | null;
  description: string;
  notes?: string | null;
  paymentMethod: PaymentMethod;
  splitGroupId?: string | null;
  splitExpenseId?: string | null;
  originalAmount?: number | null;
  userShareAmount?: number | null;
  createdAt: string;
  account?: Account;
  toAccount?: Account | null;
  category?: Category | null;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  month: number;
  year: number;
  amount: number; // in paise
  spent?: number;
  remaining?: number;
  percentage?: number;
  isExceeded?: boolean;
  isWarning?: boolean;
  category?: Category;
}

export interface Repayment {
  id: string;
  obligationId: string;
  accountId?: string | null;
  amount: number; // in paise
  date: string;
  notes?: string | null;
  createdAt: string;
  account?: Account | null;
}

export interface Obligation {
  id: string;
  userId: string;
  accountId?: string | null;
  type: ObligationType;
  personName: string;
  personContact?: string | null;
  amount: number; // in paise
  dueDate?: string | null;
  description: string;
  notes?: string | null;
  status: ObligationStatus;
  createdAt: string;
  repayments: Repayment[];
  account?: Account | null;
  totalRepaid?: number;
  balanceRemaining?: number;
  isOverdue?: boolean;
}

export interface TripExpense {
  id: string;
  tripId: string;
  amount: number; // in paise
  category: string;
  date: string;
  description: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  createdAt: string;
}

export interface Trip {
  id: string;
  userId: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number; // in paise
  status: TripStatus;
  createdAt: string;
  expenses: TripExpense[];
  totalSpent?: number;
  remainingBudget?: number;
  percentage?: number;
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  title: string;
  type: TransactionType;
  amount: number; // in paise
  categoryId?: string | null;
  accountId?: string | null;
  frequency: Frequency;
  startDate: string;
  endDate?: string | null;
  nextDueDate: string;
  isActive: boolean;
  reminderDays: number;
  notes?: string | null;
  category?: Category | null;
}

export type GroupType = 'TRIP' | 'HOME' | 'FAMILY' | 'FRIENDS' | 'COUPLE' | 'OTHER';
export type SplitMethod = 'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARES' | 'ITEMIZED';

export interface GroupMember {
  id: string;
  groupId: string;
  userId?: string | null;
  name: string;
  email?: string | null;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'INVITED' | 'LEFT';
  upiId?: string | null;
  joinedAt: string;
  totalPaid?: number;
  totalShare?: number;
  settlementsPaid?: number;
  settlementsReceived?: number;
  netBalance?: number;
}

export interface ExpenseParticipant {
  id: string;
  expenseId: string;
  memberId: string;
  shareAmount: number; // in paise
  splitValue?: number | null;
  member?: GroupMember;
}

export interface ExpenseItem {
  id: string;
  expenseId: string;
  name: string;
  amount: number; // in paise
  assignedMemberIds: string; // JSON array of IDs
}

export interface GroupExpense {
  id: string;
  groupId: string;
  payerId: string;
  createdById: string;
  title: string;
  description?: string | null;
  amount: number; // in paise
  date: string;
  category: string;
  splitMethod: SplitMethod;
  receiptUrl?: string | null;
  notes?: string | null;
  status: 'ACTIVE' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  payer?: GroupMember;
  participants: ExpenseParticipant[];
  items?: ExpenseItem[];
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  payerId: string;
  recipientId: string;
  amount: number; // in paise
  date: string;
  notes?: string | null;
  reference?: string | null;
  status: 'RECORDED' | 'REVERSED';
  createdById: string;
  createdAt: string;
  payer?: GroupMember;
  recipient?: GroupMember;
}

export interface GroupBudget {
  id: string;
  groupId: string;
  amount: number; // in paise
  period?: string | null;
  categoryLimits?: string | null;
  totalSpent?: number;
  remaining?: number;
  percentage?: number;
  isExceeded?: boolean;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  actorId?: string | null;
  action: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  actor?: { id: string; name: string } | null;
}

export interface SuggestedSettlement {
  payerId: string;
  payerName: string;
  recipientId: string;
  recipientName: string;
  amount: number; // in paise
  upiId?: string | null;
  upiPaymentLink?: string | null;
}

export interface GroupSummary {
  totalExpenses: number;
  userTotalPaid: number;
  userTotalShare: number;
  userNetBalance: number;
  youAreOwed: number;
  youOwe: number;
}

export interface GroupListItem {
  id: string;
  name: string;
  description?: string | null;
  type: GroupType;
  currency: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  totalExpenses: number;
  userNetBalance: number;
  userPaid: number;
  userShare: number;
  hasBudget: boolean;
  budgetAmount: number;
}

export interface GroupDetailsData {
  group: {
    id: string;
    name: string;
    description?: string | null;
    type: GroupType;
    currency: string;
    imageUrl?: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
  };
  currentMember: GroupMember | null;
  members: GroupMember[];
  balances: Record<string, {
    memberId: string;
    memberName: string;
    totalPaid: number;
    totalShare: number;
    settlementsPaid: number;
    settlementsReceived: number;
    netBalance: number;
  }>;
  summary: GroupSummary;
  settlementSuggestions: SuggestedSettlement[];
  expenses: GroupExpense[];
  settlements: GroupSettlement[];
  activities: GroupActivity[];
  budget: GroupBudget | null;
  categoryBreakdown: Record<string, number>;
}

