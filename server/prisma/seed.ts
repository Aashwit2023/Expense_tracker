import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const DEFAULT_EXPENSE_CATEGORIES = [
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

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', type: 'INCOME', icon: 'Briefcase', color: '#16A34A' },
  { name: 'Freelancing', type: 'INCOME', icon: 'Laptop', color: '#059669' },
  { name: 'Business Income', type: 'INCOME', icon: 'Building2', color: '#10B981' },
  { name: 'Interest & Returns', type: 'INCOME', icon: 'TrendingUp', color: '#34D399' },
  { name: 'Gifts & Grants', type: 'INCOME', icon: 'Gift', color: '#6EE7B7' },
  { name: 'Other Income', type: 'INCOME', icon: 'Coins', color: '#047857' },
];

export async function seedDefaultCategories(userId?: string) {
  const allCategories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
  for (const cat of allCategories) {
    const existing = await prisma.category.findFirst({
      where: {
        name: cat.name,
        type: cat.type,
        userId: userId || null,
      },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isCustom: false,
          userId: userId || null,
        },
      });
    }
  }
}

async function main() {
  console.log('Seeding default categories...');
  await seedDefaultCategories();

  // Create Demo User
  console.log('Creating demo user...');
  const demoEmail = 'demo@moneytracker.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        passwordHash,
        name: 'Alex Turner',
        currency: 'INR',
      },
    });

    // Create user default accounts
    const checkingAcc = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'HDFC Salary Account',
        type: 'BANK',
        initialBalance: 7500000, // ₹75,000.00
        color: '#0F172A',
        isDefault: true,
      },
    });

    const cashAcc = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Cash Wallet',
        type: 'CASH',
        initialBalance: 500000, // ₹5,000.00
        color: '#15803D',
        isDefault: false,
      },
    });

    const creditAcc = await prisma.account.create({
      data: {
        userId: user.id,
        name: 'Axis Rewards Card',
        type: 'CREDIT_CARD',
        initialBalance: 0,
        color: '#DC2626',
        isDefault: false,
      },
    });

    // Fetch categories
    const categories = await prisma.category.findMany({
      where: { userId: null },
    });
    const salaryCat = categories.find((c) => c.name === 'Salary');
    const foodCat = categories.find((c) => c.name === 'Food & Dining');
    const travelCat = categories.find((c) => c.name === 'Travel & Transport');
    const utilitiesCat = categories.find((c) => c.name === 'Bills & Utilities');
    const shoppingCat = categories.find((c) => c.name === 'Shopping');
    const freelanceCat = categories.find((c) => c.name === 'Freelancing');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Transactions
    if (salaryCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: checkingAcc.id,
          categoryId: salaryCat.id,
          type: 'INCOME',
          amount: 8500000, // ₹85,000.00
          date: new Date(currentYear, currentMonth - 1, 1),
          merchant: 'TechCorp Solutions',
          description: 'Monthly Salary Credit',
          paymentMethod: 'BANK_TRANSFER',
        },
      });
    }

    if (freelanceCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: checkingAcc.id,
          categoryId: freelanceCat.id,
          type: 'INCOME',
          amount: 1500000, // ₹15,000.00
          date: new Date(currentYear, currentMonth - 1, 8),
          merchant: 'DesignStudio LLC',
          description: 'UI Consultation Freelance Project',
          paymentMethod: 'UPI',
        },
      });
    }

    if (foodCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: checkingAcc.id,
          categoryId: foodCat.id,
          type: 'EXPENSE',
          amount: 145000, // ₹1,450.00
          date: new Date(currentYear, currentMonth - 1, 3),
          merchant: 'Blue Tokai Coffee',
          description: 'Weekly team lunch and beans',
          paymentMethod: 'UPI',
        },
      });

      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: cashAcc.id,
          categoryId: foodCat.id,
          type: 'EXPENSE',
          amount: 62000, // ₹620.00
          date: new Date(currentYear, currentMonth - 1, 7),
          merchant: 'Nature Basket',
          description: 'Fresh fruits and organic groceries',
          paymentMethod: 'CASH',
        },
      });
    }

    if (utilitiesCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: checkingAcc.id,
          categoryId: utilitiesCat.id,
          type: 'EXPENSE',
          amount: 285000, // ₹2,850.00
          date: new Date(currentYear, currentMonth - 1, 5),
          merchant: 'Airtel Broadband',
          description: 'Fibre Optic Internet 300 Mbps',
          paymentMethod: 'UPI',
        },
      });
    }

    if (shoppingCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: creditAcc.id,
          categoryId: shoppingCat.id,
          type: 'EXPENSE',
          amount: 499900, // ₹4,999.00
          date: new Date(currentYear, currentMonth - 1, 10),
          merchant: 'Uniqlo India',
          description: 'Winter Merino Wool Sweater',
          paymentMethod: 'CARD',
        },
      });
    }

    if (travelCat) {
      await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: checkingAcc.id,
          categoryId: travelCat.id,
          type: 'EXPENSE',
          amount: 45000, // ₹450.00
          date: new Date(currentYear, currentMonth - 1, 11),
          merchant: 'Uber Rides',
          description: 'Airport transit ride',
          paymentMethod: 'UPI',
        },
      });
    }

    // Transfer between own accounts (Cash withdrawal)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        accountId: checkingAcc.id,
        toAccountId: cashAcc.id,
        type: 'TRANSFER',
        amount: 200000, // ₹2,000.00
        date: new Date(currentYear, currentMonth - 1, 4),
        merchant: 'ATM Withdrawal',
        description: 'ATM Cash withdrawal for petty expenses',
        paymentMethod: 'BANK_TRANSFER',
      },
    });

    // 2. Budgets
    if (foodCat) {
      await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: foodCat.id,
          month: currentMonth,
          year: currentYear,
          amount: 1200000, // ₹12,000 budget
        },
      });
    }

    if (shoppingCat) {
      await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: shoppingCat.id,
          month: currentMonth,
          year: currentYear,
          amount: 1000000, // ₹10,000 budget
        },
      });
    }

    if (utilitiesCat) {
      await prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: utilitiesCat.id,
          month: currentMonth,
          year: currentYear,
          amount: 500000, // ₹5,000 budget
        },
      });
    }

    // 3. Obligations (Lent & Borrowed)
    const lentObligation = await prisma.obligation.create({
      data: {
        userId: user.id,
        type: 'LENT',
        personName: 'Rohan Sharma',
        personContact: '+91 98765 43210',
        amount: 1000000, // ₹10,000 lent
        dueDate: new Date(currentYear, currentMonth - 1, 25),
        description: 'Concert ticket upfront booking',
        status: 'ACTIVE',
      },
    });

    // Repayment on lent
    await prisma.repayment.create({
      data: {
        obligationId: lentObligation.id,
        amount: 300000, // ₹3,000 repaid
        date: new Date(currentYear, currentMonth - 1, 9),
        notes: 'Initial partial payment via UPI',
      },
    });

    await prisma.obligation.create({
      data: {
        userId: user.id,
        type: 'BORROWED',
        personName: 'Vikram Joshi',
        personContact: '+91 98111 22334',
        amount: 450000, // ₹4,500 borrowed
        dueDate: new Date(currentYear, currentMonth - 1, 28),
        description: 'Borrowed for group dinner bill payment',
        status: 'ACTIVE',
      },
    });

    // 4. Trip
    const trip = await prisma.trip.create({
      data: {
        userId: user.id,
        name: 'Himachal Trek & Workation',
        destination: 'Manali, HP',
        startDate: new Date(currentYear, currentMonth - 1, 15),
        endDate: new Date(currentYear, currentMonth - 1, 22),
        budget: 3500000, // ₹35,000.00
        status: 'PLANNED',
      },
    });

    await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        category: 'TRAVEL',
        amount: 720000, // ₹7,200
        date: new Date(currentYear, currentMonth - 1, 12),
        description: 'Volvo Semi-Sleeper Bus Tickets',
        paymentMethod: 'UPI',
      },
    });

    await prisma.tripExpense.create({
      data: {
        tripId: trip.id,
        category: 'ACCOMMODATION',
        amount: 1100000, // ₹11,000
        date: new Date(currentYear, currentMonth - 1, 13),
        description: 'Zostel Manali private cottage deposit',
        paymentMethod: 'CARD',
      },
    });

    // 5. Recurring Transactions
    if (utilitiesCat) {
      await prisma.recurringTransaction.create({
        data: {
          userId: user.id,
          title: 'Airtel Broadband Internet',
          type: 'EXPENSE',
          amount: 285000, // ₹2,850
          categoryId: utilitiesCat.id,
          accountId: checkingAcc.id,
          frequency: 'MONTHLY',
          startDate: new Date(currentYear, 0, 5),
          nextDueDate: new Date(currentYear, currentMonth, 5),
          isActive: true,
          reminderDays: 3,
          notes: 'Bill generated on 3rd of each month',
        },
      });
    }

    const housingCat = categories.find((c) => c.name === 'Housing');
    if (housingCat) {
      await prisma.recurringTransaction.create({
        data: {
          userId: user.id,
          title: 'Apartment Monthly Rent',
          type: 'EXPENSE',
          amount: 2200000, // ₹22,000
          categoryId: housingCat.id,
          accountId: checkingAcc.id,
          frequency: 'MONTHLY',
          startDate: new Date(currentYear, 0, 1),
          nextDueDate: new Date(currentYear, currentMonth, 1),
          isActive: true,
          reminderDays: 2,
          notes: 'Transfer to Landlord account directly',
        },
      });
    }

    // 6. Demo Groups & Split Bills
    const existingGroup = await prisma.group.findFirst({
      where: { createdById: user.id },
    });

    if (!existingGroup) {
      console.log('Seeding demo groups & split expenses...');
      const goaGroup = await prisma.group.create({
        data: {
          name: 'Goa Roadtrip 2026',
          description: 'Weekend vacation to North Goa: Beach cottages, seafood, and bike rentals',
          type: 'TRIP',
          currency: 'INR',
          createdById: user.id,
        },
      });

      const memberA = await prisma.groupMember.create({
        data: {
          groupId: goaGroup.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          role: 'ADMIN',
          status: 'ACTIVE',
          upiId: 'demo@okhdfcbank',
        },
      });

      const memberB = await prisma.groupMember.create({
        data: {
          groupId: goaGroup.id,
          name: 'Rahul Sharma',
          email: 'rahul@example.com',
          role: 'MEMBER',
          status: 'ACTIVE',
          upiId: 'rahul@oksbi',
        },
      });

      const memberC = await prisma.groupMember.create({
        data: {
          groupId: goaGroup.id,
          name: 'Priya Patel',
          email: 'priya@example.com',
          role: 'MEMBER',
          status: 'ACTIVE',
          upiId: 'priya@icici',
        },
      });

      const memberD = await prisma.groupMember.create({
        data: {
          groupId: goaGroup.id,
          name: 'Aman Verma',
          email: 'aman@example.com',
          role: 'MEMBER',
          status: 'ACTIVE',
          upiId: 'aman@paytm',
        },
      });

      // Group Budget: ₹25,000
      await prisma.groupBudget.create({
        data: {
          groupId: goaGroup.id,
          amount: 2500000,
          period: 'TOTAL',
        },
      });

      // Expense 1: Member A (Demo User) pays ₹8,000 for Beachside Resort
      const exp1 = await prisma.groupExpense.create({
        data: {
          groupId: goaGroup.id,
          payerId: memberA.id,
          createdById: user.id,
          title: 'Beachside Villa Cottage Stay (2 Nights)',
          category: 'Hotel',
          amount: 800000,
          date: new Date(currentYear, currentMonth - 1, 12),
          splitMethod: 'EQUAL',
          status: 'ACTIVE',
        },
      });
      for (const m of [memberA, memberB, memberC, memberD]) {
        await prisma.expenseParticipant.create({
          data: {
            expenseId: exp1.id,
            memberId: m.id,
            shareAmount: 200000, // ₹2,000 each
          },
        });
      }

      // Expense 2: Member B (Rahul) pays ₹2,000 for Fisherman's Wharf Dinner
      const exp2 = await prisma.groupExpense.create({
        data: {
          groupId: goaGroup.id,
          payerId: memberB.id,
          createdById: user.id,
          title: "Fisherman's Wharf Seafood Dinner",
          category: 'Food',
          amount: 200000,
          date: new Date(currentYear, currentMonth - 1, 13),
          splitMethod: 'EQUAL',
          status: 'ACTIVE',
        },
      });
      for (const m of [memberA, memberB, memberC, memberD]) {
        await prisma.expenseParticipant.create({
          data: {
            expenseId: exp2.id,
            memberId: m.id,
            shareAmount: 50000, // ₹500 each
          },
        });
      }

      // Expense 3: Member C (Priya) pays ₹2,000 for Airport Cabs & Fuel
      const exp3 = await prisma.groupExpense.create({
        data: {
          groupId: goaGroup.id,
          payerId: memberC.id,
          createdById: user.id,
          title: 'Airport Cabs & Fuel Charges',
          category: 'Transport',
          amount: 200000,
          date: new Date(currentYear, currentMonth - 1, 14),
          splitMethod: 'EQUAL',
          status: 'ACTIVE',
        },
      });
      for (const m of [memberA, memberB, memberC, memberD]) {
        await prisma.expenseParticipant.create({
          data: {
            expenseId: exp3.id,
            memberId: m.id,
            shareAmount: 50000, // ₹500 each
          },
        });
      }

      // Group Activity log
      await prisma.groupActivity.create({
        data: {
          groupId: goaGroup.id,
          actorId: user.id,
          action: 'GROUP_CREATED',
          description: `${user.name} created group "Goa Roadtrip 2026"`,
          entityType: 'GROUP',
          entityId: goaGroup.id,
        },
      });
    }

    console.log('Demo user seeded: demo@moneytracker.com / Password123!');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
