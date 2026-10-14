/**
 * Group Balance & Settlement Ledger Engine.
 * Calculates net positions and generates optimized settlement suggestions.
 * Source of truth is always the underlying expense and settlement records.
 */

export interface GroupExpenseRecord {
  id: string;
  payerId: string;
  amount: number; // in paise
  status: string;
  participants: {
    memberId: string;
    shareAmount: number; // in paise
  }[];
}

export interface GroupSettlementRecord {
  id: string;
  payerId: string;
  recipientId: string;
  amount: number; // in paise
  status: string;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number; // in paise (as expense payer)
  totalShare: number; // in paise (as expense participant)
  settlementsPaid: number; // in paise (repaid to others)
  settlementsReceived: number; // in paise (received from others)
  netBalance: number; // in paise. >0 means owed money, <0 means owes money
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

/**
 * Calculates net balances for all members across active expenses and non-reversed settlements.
 */
export function calculateGroupBalances(
  members: { id: string; name: string }[],
  expenses: GroupExpenseRecord[],
  settlements: GroupSettlementRecord[]
): {
  balances: Record<string, MemberBalance>;
  totalExpensesPaise: number;
} {
  const balances: Record<string, MemberBalance> = {};

  for (const m of members) {
    balances[m.id] = {
      memberId: m.id,
      memberName: m.name,
      totalPaid: 0,
      totalShare: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      netBalance: 0,
    };
  }

  let totalExpensesPaise = 0;

  // Process active expenses
  for (const exp of expenses) {
    if (exp.status !== 'ACTIVE') continue;

    totalExpensesPaise += exp.amount;

    if (balances[exp.payerId]) {
      balances[exp.payerId].totalPaid += exp.amount;
    }

    for (const part of exp.participants) {
      if (balances[part.memberId]) {
        balances[part.memberId].totalShare += part.shareAmount;
      }
    }
  }

  // Process recorded settlements (ignore REVERSED)
  for (const set of settlements) {
    if (set.status !== 'RECORDED') continue;

    if (balances[set.payerId]) {
      balances[set.payerId].settlementsPaid += set.amount;
    }
    if (balances[set.recipientId]) {
      balances[set.recipientId].settlementsReceived += set.amount;
    }
  }

  // Calculate net balances
  // Net = (totalPaid + settlementsPaid) - (totalShare + settlementsReceived)
  for (const mId of Object.keys(balances)) {
    const b = balances[mId];
    b.netBalance = (b.totalPaid + b.settlementsPaid) - (b.totalShare + b.settlementsReceived);
  }

  return { balances, totalExpensesPaise };
}

/**
 * Greedy settlement optimization algorithm to simplify debts.
 * Transforms an N-member group debt network into a minimal set of transfers (at most N-1).
 * Never asks a debtor to pay more than their debt.
 * Never credits a creditor with more than they are owed.
 * Balances sum to 0.
 */
export function calculateOptimizedSettlements(
  balances: Record<string, MemberBalance>,
  membersMap: Record<string, { id: string; name: string; upiId?: string | null }>
): SuggestedSettlement[] {
  // Separate into debtors (net < 0) and creditors (net > 0)
  interface Party {
    id: string;
    amount: number; // positive paise
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const [memberId, bal] of Object.entries(balances)) {
    if (bal.netBalance < 0) {
      debtors.push({ id: memberId, amount: -bal.netBalance });
    } else if (bal.netBalance > 0) {
      creditors.push({ id: memberId, amount: bal.netBalance });
    }
  }

  // Sort descending by amount
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const suggestions: SuggestedSettlement[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      const payerInfo = membersMap[debtor.id] || { id: debtor.id, name: 'Member' };
      const recipientInfo = membersMap[creditor.id] || { id: creditor.id, name: 'Member' };

      let upiLink: string | null = null;
      if (recipientInfo.upiId) {
        const rupees = (transferAmount / 100).toFixed(2);
        upiLink = `upi://pay?pa=${encodeURIComponent(recipientInfo.upiId)}&pn=${encodeURIComponent(
          recipientInfo.name
        )}&am=${rupees}&cu=INR&tn=Group%20Settlement`;
      }

      suggestions.push({
        payerId: debtor.id,
        payerName: payerInfo.name,
        recipientId: creditor.id,
        recipientName: recipientInfo.name,
        amount: transferAmount,
        upiId: recipientInfo.upiId || null,
        upiPaymentLink: upiLink,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) {
      dIdx++;
    }
    if (creditor.amount === 0) {
      cIdx++;
    }
  }

  return suggestions;
}
