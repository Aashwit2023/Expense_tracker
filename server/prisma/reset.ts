import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', type: 'EXPENSE', icon: 'Utensils', color: '#F97316' },
  { name: 'Travel & Transport', type: 'EXPENSE', icon: 'Plane', color: '#0EA5E9' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'ShoppingBag', color: '#EC4899' },
  { name: 'Bills & Utilities', type: 'EXPENSE', icon: 'Zap', color: '#EAB308' },
  { name: 'Education', type: 'EXPENSE', icon: 'GraduationCap', color: '#8B5CF6' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'HeartPulse', color: '#EF4444' },
  { name: 'Entertainment', type: 'EXPENSE', icon: 'Film', color: '#A855F7' },
  { name: 'Housing', type: 'EXPENSE', icon: 'Home', color: '#14B8A6' },
  { name: 'Personal Care', type: 'EXPENSE', icon: 'Smile', color: '#F43F5E' },
  { name: 'Other Expenses', type: 'EXPENSE', icon: 'MoreHorizontal', color: '#64748B' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', type: 'INCOME', icon: 'Briefcase', color: '#16A34A' },
  { name: 'Freelancing', type: 'INCOME', icon: 'Laptop', color: '#059669' },
  { name: 'Business Income', type: 'INCOME', icon: 'Building2', color: '#10B981' },
  { name: 'Interest & Returns', type: 'INCOME', icon: 'TrendingUp', color: '#34D399' },
  { name: 'Gifts & Grants', type: 'INCOME', icon: 'Gift', color: '#6EE7B7' },
  { name: 'Other Income', type: 'INCOME', icon: 'Coins', color: '#047857' },
];

async function resetDatabase() {
  console.log('Clearing all database records...');

  await prisma.repayment.deleteMany({});
  await prisma.obligation.deleteMany({});
  await prisma.tripExpense.deleteMany({});
  await prisma.trip.deleteMany({});
  await prisma.recurringTransaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.category.deleteMany({});

  console.log('All user accounts, transactions, and debts deleted.');

  // Restore standard categories
  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  for (const cat of allCategories) {
    await prisma.category.create({
      data: {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isCustom: false,
        userId: null,
      },
    });
  }

  const userCount = await prisma.user.count();
  const txCount = await prisma.transaction.count();
  console.log(`Database reset complete. Total users: ${userCount}, Total transactions: ${txCount}.`);
}

resetDatabase()
  .catch((e) => {
    console.error('Reset failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
