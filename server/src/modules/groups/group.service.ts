import { prisma } from '../../db/prisma';
import {
  calculateEqualSplit,
  validateAndCalculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateItemizedSplit,
  ParticipantShare,
} from './group.split';
import {
  calculateGroupBalances,
  calculateOptimizedSettlements,
  MemberBalance,
  SuggestedSettlement,
} from './group.ledger';

export interface CreateGroupInput {
  name: string;
  description?: string;
  type?: string;
  currency?: string;
  imageUrl?: string;
  creatorUpiId?: string;
  initialMembers?: { name: string; email?: string; upiId?: string }[];
}

export interface AddExpenseInput {
  title: string;
  description?: string;
  amount: number; // in paise
  date: string;
  category?: string;
  payerId: string;
  splitMethod: 'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARES' | 'ITEMIZED';
  participantIds: string[];
  allocations?: { memberId: string; amountPaise: number }[];
  percentages?: { memberId: string; percentage: number }[];
  shares?: { memberId: string; share?: number; shares?: number }[];
  items?: { name: string; amountPaise: number; assignedMemberIds: string[] }[];
  notes?: string;
  receiptUrl?: string;
  paymentAccountId?: string;
}

export class GroupService {
  /**
   * Create a new group and add creator as ADMIN member.
   */
  static async createGroup(userId: string, input: CreateGroupInput) {
    const creatorUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!creatorUser) throw new Error('User not found');

    const group = await prisma.$transaction(async (tx) => {
      const grp = await tx.group.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type || 'OTHER',
          currency: input.currency || 'INR',
          imageUrl: input.imageUrl,
          createdById: userId,
        },
      });

      // Creator is always added as the first ADMIN member
      await tx.groupMember.create({
        data: {
          groupId: grp.id,
          userId,
          name: creatorUser.name,
          email: creatorUser.email,
          role: 'ADMIN',
          status: 'ACTIVE',
          upiId: input.creatorUpiId || null,
        },
      });

      // Add any additional initial members provided
      if (input.initialMembers && input.initialMembers.length > 0) {
        for (const m of input.initialMembers) {
          if (!m.name) continue;
          let matchedUserId: string | null = null;
          if (m.email) {
            const registered = await tx.user.findUnique({ where: { email: m.email } });
            if (registered) matchedUserId = registered.id;
          }

          // Avoid duplicating creator
          if (matchedUserId === userId) continue;

          await tx.groupMember.create({
            data: {
              groupId: grp.id,
              userId: matchedUserId,
              name: m.name,
              email: m.email || null,
              role: 'MEMBER',
              status: 'ACTIVE',
              upiId: m.upiId || null,
            },
          });
        }
      }

      // Record activity
      await tx.groupActivity.create({
        data: {
          groupId: grp.id,
          actorId: userId,
          action: 'GROUP_CREATED',
          description: `${creatorUser.name} created group "${input.name}"`,
          entityType: 'GROUP',
          entityId: grp.id,
        },
      });

      return grp;
    });

    return this.getGroupById(userId, group.id);
  }

  /**
   * List all groups the user is a member of or created.
   */
  static async getUserGroups(userId: string) {
    const memberships = await prisma.groupMember.findMany({
      where: {
        OR: [
          { userId },
          { email: (await prisma.user.findUnique({ where: { id: userId } }))?.email },
        ],
      },
      select: { groupId: true },
    });

    const groupIds = Array.from(new Set(memberships.map((m) => m.groupId)));

    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { id: { in: groupIds } },
          { createdById: userId },
        ],
      },
      include: {
        members: true,
        expenses: {
          where: { status: 'ACTIVE' },
          include: { participants: true },
        },
        settlements: {
          where: { status: 'RECORDED' },
        },
        budget: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return groups.map((g) => {
      const { balances, totalExpensesPaise } = calculateGroupBalances(
        g.members,
        g.expenses,
        g.settlements
      );

      // Find current user's membership
      const userMember = g.members.find((m) => m.userId === userId);
      const userBalance = userMember ? balances[userMember.id]?.netBalance || 0 : 0;
      const userPaid = userMember ? balances[userMember.id]?.totalPaid || 0 : 0;
      const userShare = userMember ? balances[userMember.id]?.totalShare || 0 : 0;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        type: g.type,
        currency: g.currency,
        imageUrl: g.imageUrl,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        memberCount: g.members.length,
        totalExpenses: totalExpensesPaise,
        userNetBalance: userBalance,
        userPaid,
        userShare,
        hasBudget: !!g.budget,
        budgetAmount: g.budget?.amount || 0,
      };
    });
  }

  /**
   * Get single group details with balances, settlement suggestions, and user perspective.
   */
  static async getGroupById(
    userId: string,
    groupId: string,
    filters?: {
      category?: string;
      payerId?: string;
      participantId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        expenses: {
          where: { status: 'ACTIVE' },
          include: {
            payer: true,
            participants: { include: { member: true } },
            items: true,
          },
          orderBy: { date: 'desc' },
        },
        settlements: {
          include: { payer: true, recipient: true },
          orderBy: { date: 'desc' },
        },
        activities: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        budget: true,
        invitations: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!group) throw new Error('Group not found');

    // Authorization check: User must be creator or group member
    const userMember = group.members.find(
      (m) => m.userId === userId || m.email === (group.members.find((gm) => gm.userId === userId)?.email)
    );
    const isCreator = group.createdById === userId;

    if (!userMember && !isCreator) {
      throw new Error('Access denied: You are not a member of this group');
    }

    // Calculate complete ledger
    const { balances, totalExpensesPaise } = calculateGroupBalances(
      group.members,
      group.expenses,
      group.settlements
    );

    const membersMap: Record<string, { id: string; name: string; upiId?: string | null }> = {};
    for (const m of group.members) {
      membersMap[m.id] = { id: m.id, name: m.name, upiId: m.upiId };
    }

    const optimizedSettlements = calculateOptimizedSettlements(balances, membersMap);

    // Apply any query filters to returned expense list for UI view
    let filteredExpenses = [...group.expenses];
    if (filters) {
      if (filters.category) {
        filteredExpenses = filteredExpenses.filter((e) => e.category === filters.category);
      }
      if (filters.payerId) {
        filteredExpenses = filteredExpenses.filter((e) => e.payerId === filters.payerId);
      }
      if (filters.participantId) {
        filteredExpenses = filteredExpenses.filter((e) =>
          e.participants.some((p) => p.memberId === filters.participantId)
        );
      }
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        filteredExpenses = filteredExpenses.filter((e) => new Date(e.date) >= start);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        filteredExpenses = filteredExpenses.filter((e) => new Date(e.date) <= end);
      }
    }

    // Category breakdown
    const categoryTotals: Record<string, number> = {};
    for (const exp of group.expenses) {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
    }

    // User's specific balances
    const currentUserMemberId = userMember?.id;
    const userBalanceData = currentUserMemberId ? balances[currentUserMemberId] : null;

    // You are owed vs You owe
    let youAreOwed = 0;
    let youOwe = 0;
    if (userBalanceData) {
      if (userBalanceData.netBalance > 0) {
        youAreOwed = userBalanceData.netBalance;
      } else if (userBalanceData.netBalance < 0) {
        youOwe = Math.abs(userBalanceData.netBalance);
      }
    }

    // Enrich members with their calculated balance
    const enrichedMembers = group.members.map((m) => {
      const b = balances[m.id];
      return {
        id: m.id,
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        status: m.status,
        upiId: m.upiId,
        joinedAt: m.joinedAt,
        totalPaid: b?.totalPaid || 0,
        totalShare: b?.totalShare || 0,
        settlementsPaid: b?.settlementsPaid || 0,
        settlementsReceived: b?.settlementsReceived || 0,
        netBalance: b?.netBalance || 0,
      };
    });

    return {
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        currency: group.currency,
        imageUrl: group.imageUrl,
        createdById: group.createdById,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
      currentMember: userMember || null,
      members: enrichedMembers,
      balances,
      summary: {
        totalExpenses: totalExpensesPaise,
        userTotalPaid: userBalanceData?.totalPaid || 0,
        userTotalShare: userBalanceData?.totalShare || 0,
        userNetBalance: userBalanceData?.netBalance || 0,
        youAreOwed,
        youOwe,
      },
      settlementSuggestions: optimizedSettlements,
      expenses: filteredExpenses,
      settlements: group.settlements,
      activities: group.activities,
      budget: group.budget
        ? {
            ...group.budget,
            totalSpent: totalExpensesPaise,
            remaining: Math.max(0, group.budget.amount - totalExpensesPaise),
            percentage:
              group.budget.amount > 0
                ? Math.round((totalExpensesPaise / group.budget.amount) * 100)
                : 0,
            isExceeded: totalExpensesPaise > group.budget.amount,
          }
        : null,
      categoryBreakdown: categoryTotals,
      invitations: group.invitations,
    };
  }

  /**
   * Add a shared group expense with selected split method.
   */
  static async addExpense(userId: string, groupId: string, input: AddExpenseInput) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new Error('Group not found');

    // Verify payer is a valid member of this group
    const payer = group.members.find((m) => m.id === input.payerId);
    if (!payer) throw new Error('Selected payer is not a member of this group');

    // Verify user has membership to add expense
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember && group.createdById !== userId) {
      throw new Error('You do not have permission to add expenses to this group');
    }

    if (input.participantIds.length === 0) {
      throw new Error('At least one participant must be selected');
    }

    // Verify all participants belong to the group
    for (const pId of input.participantIds) {
      if (!group.members.some((m) => m.id === pId)) {
        throw new Error(`Participant ${pId} is not a member of this group`);
      }
    }

    // Calculate splits
    let shares: ParticipantShare[] = [];
    let normalizedItems: { name: string; amount: number; assignedMemberIds: string[] }[] = [];

    switch (input.splitMethod) {
      case 'EQUAL':
        shares = calculateEqualSplit(input.amount, input.participantIds);
        break;
      case 'UNEQUAL':
        if (!input.allocations) throw new Error('Allocations required for unequal split');
        shares = validateAndCalculateUnequalSplit(input.amount, input.allocations);
        break;
      case 'PERCENTAGE':
        if (!input.percentages) throw new Error('Percentages required for percentage split');
        shares = calculatePercentageSplit(input.amount, input.percentages);
        break;
      case 'SHARES': {
        if (!input.shares) throw new Error('Shares required for shares split');
        const normalized = input.shares.map((s) => ({
          memberId: s.memberId,
          share: Number(s.share ?? s.shares ?? 1),
        }));
        shares = calculateSharesSplit(input.amount, normalized);
        break;
      }
      case 'ITEMIZED': {
        if (!input.items || input.items.length === 0) {
          throw new Error('Items required for itemized split');
        }
        const res = calculateItemizedSplit(input.amount, input.items);
        shares = res.shares;
        normalizedItems = res.itemsNormalized;
        break;
      }
      default:
        shares = calculateEqualSplit(input.amount, input.participantIds);
    }

    // Execute in database transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.groupExpense.create({
        data: {
          groupId,
          payerId: input.payerId,
          createdById: userId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          date: new Date(input.date),
          category: input.category || 'OTHER',
          splitMethod: input.splitMethod,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
          status: 'ACTIVE',
        },
      });

      // Create participants
      for (const s of shares) {
        await tx.expenseParticipant.create({
          data: {
            expenseId: exp.id,
            memberId: s.memberId,
            shareAmount: s.shareAmount,
            splitValue: s.splitValue,
          },
        });
      }

      // Create itemized items if provided
      if (normalizedItems.length > 0) {
        for (const it of normalizedItems) {
          await tx.expenseItem.create({
            data: {
              expenseId: exp.id,
              name: it.name,
              amount: it.amount,
              assignedMemberIds: JSON.stringify(it.assignedMemberIds),
            },
          });
        }
      }

      // If user paid from their personal bank account, record as personal purchase & group receivable!
      if (input.paymentAccountId && payer.userId === userId) {
        const userShare = shares.find((s) => s.memberId === payer.id)?.shareAmount || 0;
        const othersShare = input.amount - userShare;

        await tx.transaction.create({
          data: {
            userId,
            accountId: input.paymentAccountId,
            type: 'EXPENSE',
            amount: userShare,
            originalAmount: input.amount,
            userShareAmount: userShare,
            splitGroupId: groupId,
            splitExpenseId: exp.id,
            date: new Date(input.date),
            merchant: input.title,
            description: `${input.title} (${group.name})`,
            notes: (input.notes ? input.notes + ' • ' : '') +
              `Group purchase for ${group.name} (Your share: ₹${(userShare / 100).toFixed(2)}, Others owe: ₹${(othersShare / 100).toFixed(2)})`,
            paymentMethod: 'UPI',
          },
        });

        if (othersShare > 0) {
          await tx.obligation.create({
            data: {
              userId,
              accountId: input.paymentAccountId,
              type: 'LENT',
              personName: group.name,
              amount: othersShare,
              description: `Group purchase receivable for ${input.title}`,
              notes: `Linked to group "${group.name}" expense "${exp.title}" (ID: ${exp.id})`,
              status: 'ACTIVE',
            },
          });
        }
      }

      // Activity log
      const actor = await tx.user.findUnique({ where: { id: userId } });
      const amountRupees = (input.amount / 100).toFixed(2);
      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'EXPENSE_ADDED',
          description: `${actor?.name || 'A member'} added expense "${input.title}" for ₹${amountRupees} (paid by ${payer.name})`,
          entityType: 'EXPENSE',
          entityId: exp.id,
        },
      });

      // Touch group's updatedAt
      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });

      return exp;
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Cancel or delete an expense with full audit preservation.
   */
  static async cancelExpense(userId: string, groupId: string, expenseId: string) {
    const expense = await prisma.groupExpense.findFirst({
      where: { id: expenseId, groupId },
      include: { group: { include: { members: true } } },
    });
    if (!expense) throw new Error('Expense not found');

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction(async (tx) => {
      await tx.groupExpense.update({
        where: { id: expenseId },
        data: { status: 'CANCELLED' },
      });

      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'EXPENSE_DELETED',
          description: `${actor?.name || 'A member'} cancelled expense "${expense.title}" (₹${(
            expense.amount / 100
          ).toFixed(2)})`,
          entityType: 'EXPENSE',
          entityId: expenseId,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Record a settlement repayment between two group members.
   */
  static async recordSettlement(
    userId: string,
    groupId: string,
    input: {
      payerId: string;
      recipientId: string;
      amount: number; // in paise
      date?: string;
      notes?: string;
      reference?: string;
      depositAccountId?: string;
      paymentAccountId?: string;
    }
  ) {
    if (input.payerId === input.recipientId) {
      throw new Error('Payer and recipient cannot be the same member');
    }
    if (input.amount <= 0) {
      throw new Error('Settlement amount must be positive');
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new Error('Group not found');

    const payer = group.members.find((m) => m.id === input.payerId);
    const recipient = group.members.find((m) => m.id === input.recipientId);

    if (!payer || !recipient) {
      throw new Error('Payer or recipient is not a valid member of this group');
    }

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    const settlement = await prisma.$transaction(async (tx) => {
      let createdTxId: string | null = null;

      // If user pays settlement from personal bank account:
      // Record outgoing EXPENSE transaction so bank balance deducts immediately
      if (input.paymentAccountId && payer.userId) {
        const outgoingTx = await tx.transaction.create({
          data: {
            userId: payer.userId,
            accountId: input.paymentAccountId,
            type: 'EXPENSE',
            amount: input.amount,
            date: input.date ? new Date(input.date) : new Date(),
            merchant: recipient.name,
            description: `Group settlement to ${recipient.name} (${group.name})`,
            notes: input.notes || `Settlement payment for ${group.name}`,
            paymentMethod: 'UPI',
          },
        });
        createdTxId = outgoingTx.id;
      }

      // If a bank deposit account is chosen and recipient has a registered user account:
      // Post the repayment to the bank account so bank balance increments immediately upon payment!
      if (input.depositAccountId && recipient.userId) {
        // Check for active group split obligation
        const linkedObligation = await tx.obligation.findFirst({
          where: {
            userId: recipient.userId,
            personName: group.name,
            status: 'ACTIVE',
          },
        });

        if (linkedObligation) {
          await tx.repayment.create({
            data: {
              obligationId: linkedObligation.id,
              accountId: input.depositAccountId,
              amount: input.amount,
              date: input.date ? new Date(input.date) : new Date(),
              notes: input.notes || `Settlement from ${payer.name} for group ${group.name}`,
            },
          });

          // Check if obligation is fully settled
          const totalRepaid = await tx.repayment.aggregate({
            where: { obligationId: linkedObligation.id },
            _sum: { amount: true },
          });
          if ((totalRepaid._sum.amount || 0) >= linkedObligation.amount) {
            await tx.obligation.update({
              where: { id: linkedObligation.id },
              data: { status: 'SETTLED' },
            });
          }
        } else {
          // Post incoming transaction to increment bank balance
          const incomingTx = await tx.transaction.create({
            data: {
              userId: recipient.userId,
              accountId: input.depositAccountId,
              type: 'INCOME',
              amount: input.amount,
              date: input.date ? new Date(input.date) : new Date(),
              merchant: payer.name,
              description: `Group settlement from ${payer.name} (${group.name})`,
              notes: input.notes || `Repayment for ${group.name}`,
              paymentMethod: 'UPI',
            },
          });
          createdTxId = incomingTx.id;
        }
      }

      const set = await tx.groupSettlement.create({
        data: {
          groupId,
          payerId: input.payerId,
          recipientId: input.recipientId,
          amount: input.amount,
          date: input.date ? new Date(input.date) : new Date(),
          notes: input.notes,
          reference: input.reference,
          status: 'RECORDED',
          createdById: userId,
          depositAccountId: input.depositAccountId || null,
          transactionId: createdTxId,
        },
      });

      const amountRupees = (input.amount / 100).toFixed(2);
      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'SETTLEMENT_RECORDED',
          description: `${actor?.name || 'A member'} recorded repayment: ${payer.name} paid ₹${amountRupees} to ${recipient.name}${
            input.depositAccountId ? ' (deposited to bank account)' : ''
          }`,
          entityType: 'SETTLEMENT',
          entityId: set.id,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });

      return set;
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Revert an existing settlement with auditable correction.
   */
  static async reverseSettlement(userId: string, groupId: string, settlementId: string) {
    const settlement = await prisma.groupSettlement.findFirst({
      where: { id: settlementId, groupId },
      include: { payer: true, recipient: true },
    });
    if (!settlement) throw new Error('Settlement not found');
    if (settlement.status === 'REVERSED') throw new Error('Settlement is already reversed');

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction(async (tx) => {
      // If a linked transaction was created, delete it to revert bank balance
      if (settlement.transactionId) {
        await tx.transaction.deleteMany({
          where: { id: settlement.transactionId },
        });
      }

      await tx.groupSettlement.update({
        where: { id: settlementId },
        data: { status: 'REVERSED' },
      });

      const amountRupees = (settlement.amount / 100).toFixed(2);
      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'SETTLEMENT_REVERSED',
          description: `${actor?.name || 'A member'} reversed settlement of ₹${amountRupees} (${settlement.payer.name} -> ${settlement.recipient.name})`,
          entityType: 'SETTLEMENT',
          entityId: settlementId,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Add a member to a group (by name, email, or linking registered user).
   */
  static async addMember(
    userId: string,
    groupId: string,
    input: { name: string; email?: string; upiId?: string; role?: 'ADMIN' | 'MEMBER' }
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new Error('Group not found');

    // Check permissions
    const userMember = group.members.find((m) => m.userId === userId);
    if (!userMember && group.createdById !== userId) {
      throw new Error('Not authorized to add members');
    }

    let matchedUserId: string | null = null;
    if (input.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
      if (existingUser) {
        matchedUserId = existingUser.id;
        // Check if user is already a member
        if (group.members.some((m) => m.userId === matchedUserId)) {
          throw new Error('User is already a member of this group');
        }
      }
    }

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.groupMember.create({
        data: {
          groupId,
          userId: matchedUserId,
          name: input.name,
          email: input.email || null,
          role: input.role || 'MEMBER',
          status: 'ACTIVE',
          upiId: input.upiId || null,
        },
      });

      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'MEMBER_JOINED',
          description: `${actor?.name || 'A member'} added ${input.name} to the group`,
          entityType: 'MEMBER',
          entityId: m.id,
        },
      });

      return m;
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Set or update group budget (for trips or living expenses).
   */
  static async setBudget(
    userId: string,
    groupId: string,
    input: { amount: number; period?: string; categoryLimits?: Record<string, number> }
  ) {
    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');

    await prisma.groupBudget.upsert({
      where: { groupId },
      create: {
        groupId,
        amount: input.amount,
        period: input.period || 'TOTAL',
        categoryLimits: input.categoryLimits ? JSON.stringify(input.categoryLimits) : null,
      },
      update: {
        amount: input.amount,
        period: input.period || 'TOTAL',
        categoryLimits: input.categoryLimits ? JSON.stringify(input.categoryLimits) : null,
      },
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Leave a group (only allowed if net balance is 0 or user settled).
   */
  static async leaveGroup(userId: string, groupId: string) {
    const details = await this.getGroupById(userId, groupId);
    const member = details.currentMember;
    if (!member) throw new Error('Not a member of this group');

    const net = details.summary.userNetBalance;
    if (net !== 0) {
      const netRupees = (Math.abs(net) / 100).toFixed(2);
      const direction = net > 0 ? 'are owed' : 'owe';
      throw new Error(`Cannot leave group with an active balance. You ${direction} ₹${netRupees}. Please settle first.`);
    }

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction(async (tx) => {
      await tx.groupMember.update({
        where: { id: member.id },
        data: { status: 'LEFT' },
      });

      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'MEMBER_LEFT',
          description: `${actor?.name || member.name} left the group`,
          entityType: 'MEMBER',
          entityId: member.id,
        },
      });
    });

    return { success: true, message: 'Successfully left group' };
  }

  /**
   * Delete an entire group and clean up personal split linkages.
   */
  static async deleteGroup(userId: string, groupId: string) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });
    if (!group) throw new Error('Group not found');

    const userMember = group.members.find((m) => m.userId === userId);
    const isCreator = group.createdById === userId;
    const isAdmin = userMember?.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      throw new Error('Only the group creator or admin can delete this group');
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink any personal transactions that were split with this group
      await tx.transaction.updateMany({
        where: { splitGroupId: groupId },
        data: { splitGroupId: null, splitExpenseId: null },
      });

      // 2. Mark any linked group obligations as settled
      await tx.obligation.updateMany({
        where: { userId, personName: group.name, status: 'ACTIVE' },
        data: { status: 'SETTLED' },
      });

      // 3. Delete group (Prisma cascades delete all members, expenses, settlements, etc.)
      await tx.group.delete({
        where: { id: groupId },
      });
    });

    return { success: true, message: 'Group deleted successfully' };
  }

  /**
   * Adjust / edit a member's net balance in the group.
   */
  static async adjustBalance(
    userId: string,
    groupId: string,
    input: {
      memberId: string;
      targetBalancePaise: number;
      balancingMemberId?: string;
      notes?: string;
    }
  ) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        expenses: { where: { status: 'ACTIVE' }, include: { participants: true } },
        settlements: true,
      },
    });
    if (!group) throw new Error('Group not found');

    const targetMember = group.members.find((m) => m.id === input.memberId);
    if (!targetMember) throw new Error('Member not found');

    // Get current balances
    const { balances } = calculateGroupBalances(group.members, group.expenses, group.settlements);
    const currentNet = balances[targetMember.id]?.netBalance || 0;
    const delta = input.targetBalancePaise - currentNet;

    if (delta === 0) {
      return this.getGroupById(userId, groupId);
    }

    // Determine balancing counterpart
    let counterpartId = input.balancingMemberId;
    if (!counterpartId || counterpartId === targetMember.id) {
      const userMember = group.members.find((m) => m.userId === userId);
      if (userMember && userMember.id !== targetMember.id) {
        counterpartId = userMember.id;
      } else {
        const other = group.members.find((m) => m.id !== targetMember.id);
        if (!other) throw new Error('At least two members required to adjust balance');
        counterpartId = other.id;
      }
    }

    const counterpart = group.members.find((m) => m.id === counterpartId);
    if (!counterpart) throw new Error('Counterpart member not found');

    // delta > 0: target balance needs to increase -> counterpart pays target
    // delta < 0: target balance needs to decrease -> target pays counterpart
    const payerId = delta > 0 ? counterpart.id : targetMember.id;
    const recipientId = delta > 0 ? targetMember.id : counterpart.id;
    const amount = Math.abs(delta);

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction(async (tx) => {
      const set = await tx.groupSettlement.create({
        data: {
          groupId,
          payerId,
          recipientId,
          amount,
          date: new Date(),
          notes: input.notes || `Balance adjustment for ${targetMember.name}`,
          reference: 'BALANCE_ADJUSTMENT',
          status: 'RECORDED',
          createdById: userId,
        },
      });

      const oldRupees = (currentNet / 100).toFixed(2);
      const newRupees = (input.targetBalancePaise / 100).toFixed(2);
      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'BALANCE_ADJUSTED',
          description: `${actor?.name || 'A member'} adjusted ${targetMember.name}'s balance from ₹${oldRupees} to ₹${newRupees}`,
          entityType: 'SETTLEMENT',
          entityId: set.id,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getGroupById(userId, groupId);
  }

  /**
   * Update / edit an existing group expense.
   */
  static async updateExpense(
    userId: string,
    groupId: string,
    expenseId: string,
    input: AddExpenseInput
  ) {
    const existing = await prisma.groupExpense.findFirst({
      where: { id: expenseId, groupId },
      include: { group: { include: { members: true } } },
    });
    if (!existing) throw new Error('Expense not found');

    const group = existing.group;
    const payer = group.members.find((m) => m.id === input.payerId);
    if (!payer) throw new Error('Selected payer is not a member of this group');

    // Calculate splits
    let shares: ParticipantShare[] = [];
    switch (input.splitMethod) {
      case 'EQUAL':
        shares = calculateEqualSplit(input.amount, input.participantIds);
        break;
      case 'UNEQUAL':
        if (!input.allocations) throw new Error('Allocations required for unequal split');
        shares = validateAndCalculateUnequalSplit(input.amount, input.allocations);
        break;
      case 'PERCENTAGE':
        if (!input.percentages) throw new Error('Percentages required for percentage split');
        shares = calculatePercentageSplit(input.amount, input.percentages);
        break;
      case 'SHARES': {
        if (!input.shares) throw new Error('Shares required for shares split');
        const normalized = input.shares.map((s) => ({
          memberId: s.memberId,
          share: Number(s.share ?? s.shares ?? 1),
        }));
        shares = calculateSharesSplit(input.amount, normalized);
        break;
      }
      default:
        shares = calculateEqualSplit(input.amount, input.participantIds);
    }

    const actor = await prisma.user.findUnique({ where: { id: userId } });

    await prisma.$transaction(async (tx) => {
      await tx.groupExpense.update({
        where: { id: expenseId },
        data: {
          payerId: input.payerId,
          title: input.title,
          description: input.description,
          amount: input.amount,
          date: new Date(input.date),
          category: input.category || 'OTHER',
          splitMethod: input.splitMethod,
          receiptUrl: input.receiptUrl,
          notes: input.notes,
        },
      });

      await tx.expenseParticipant.deleteMany({ where: { expenseId } });
      for (const s of shares) {
        await tx.expenseParticipant.create({
          data: {
            expenseId,
            memberId: s.memberId,
            shareAmount: s.shareAmount,
            splitValue: s.splitValue,
          },
        });
      }

      // Update linked personal transaction if exists
      const userMember = group.members.find((m) => m.userId === userId);
      const userShare = userMember
        ? shares.find((s) => s.memberId === userMember.id)?.shareAmount || 0
        : 0;

      await tx.transaction.updateMany({
        where: { splitExpenseId: expenseId, userId },
        data: {
          merchant: input.title,
          description: `${input.title} (${group.name})`,
          amount: userShare,
          originalAmount: input.amount,
          userShareAmount: userShare,
          date: new Date(input.date),
        },
      });

      const amountRupees = (input.amount / 100).toFixed(2);
      await tx.groupActivity.create({
        data: {
          groupId,
          actorId: userId,
          action: 'EXPENSE_UPDATED',
          description: `${actor?.name || 'A member'} updated expense "${input.title}" (₹${amountRupees})`,
          entityType: 'EXPENSE',
          entityId: expenseId,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { updatedAt: new Date() },
      });
    });

    return this.getGroupById(userId, groupId);
  }
}
