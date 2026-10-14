/**
 * Exact integer paise split calculation engine.
 * Ensures allocated participant shares ALWAYS sum up to the total expense amount exactly.
 * Zero floating-point rounding errors.
 */

export interface ParticipantShare {
  memberId: string;
  shareAmount: number; // in paise
  splitValue?: number; // percentage, share count, or custom value
}

/**
 * Equal Split:
 * Total paise divided equally among selected participants.
 * Any remainder (mod) is distributed 1 paise at a time to ensure exact sum reconciliation.
 */
export function calculateEqualSplit(
  totalPaise: number,
  participantIds: string[]
): ParticipantShare[] {
  if (participantIds.length === 0) {
    throw new Error('At least one participant must be selected');
  }
  if (totalPaise <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const count = participantIds.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  return participantIds.map((memberId, index) => {
    // First 'remainder' participants get +1 paise
    const share = index < remainder ? baseShare + 1 : baseShare;
    return {
      memberId,
      shareAmount: share,
      splitValue: 1,
    };
  });
}

/**
 * Unequal Split:
 * Each participant is assigned a specific amount in paise.
 * Validates that sum(allocations) === totalPaise exactly.
 */
export function validateAndCalculateUnequalSplit(
  totalPaise: number,
  allocations: { memberId: string; amountPaise: number }[]
): ParticipantShare[] {
  if (allocations.length === 0) {
    throw new Error('At least one participant allocation required');
  }
  if (totalPaise <= 0) {
    throw new Error('Expense amount must be positive');
  }

  let totalAllocated = 0;
  for (const alloc of allocations) {
    if (alloc.amountPaise < 0) {
      throw new Error(`Negative allocation not permitted for participant ${alloc.memberId}`);
    }
    totalAllocated += alloc.amountPaise;
  }

  if (totalAllocated !== totalPaise) {
    const diff = totalPaise - totalAllocated;
    throw new Error(
      `Allocated total (₹${(totalAllocated / 100).toFixed(2)}) does not match expense total (₹${(
        totalPaise / 100
      ).toFixed(2)}). Difference: ₹${(Math.abs(diff) / 100).toFixed(2)}`
    );
  }

  return allocations.map((a) => ({
    memberId: a.memberId,
    shareAmount: a.amountPaise,
    splitValue: a.amountPaise,
  }));
}

/**
 * Percentage Split:
 * Each participant has a percentage.
 * Validates percentages sum to 100.
 * Reconciles paise rounding discrepancies to members with highest fractional parts.
 */
export function calculatePercentageSplit(
  totalPaise: number,
  percentages: { memberId: string; percentage: number }[]
): ParticipantShare[] {
  if (percentages.length === 0) {
    throw new Error('At least one participant percentage required');
  }
  if (totalPaise <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const totalPct = percentages.reduce((sum, p) => sum + p.percentage, 0);
  if (Math.abs(totalPct - 100) > 0.05) {
    throw new Error(`Total percentage must equal 100%. Current sum: ${totalPct.toFixed(2)}%`);
  }

  // Calculate raw paise and keep track of fractional remainder
  const computed = percentages.map((p) => {
    const exactPaise = (totalPaise * p.percentage) / 100;
    const floorPaise = Math.floor(exactPaise);
    const fraction = exactPaise - floorPaise;
    return {
      memberId: p.memberId,
      percentage: p.percentage,
      shareAmount: floorPaise,
      fraction,
    };
  });

  let currentSum = computed.reduce((sum, c) => sum + c.shareAmount, 0);
  let discrepancy = totalPaise - currentSum;

  // Sort by fraction descending to distribute remaining paise fairly
  const sortedIndices = computed
    .map((c, i) => ({ index: i, fraction: c.fraction }))
    .sort((a, b) => b.fraction - a.fraction);

  let i = 0;
  while (discrepancy > 0 && i < sortedIndices.length) {
    computed[sortedIndices[i].index].shareAmount += 1;
    discrepancy--;
    i++;
  }

  // If over-allocated (due to rounding up), decrease lowest fractions
  i = sortedIndices.length - 1;
  while (discrepancy < 0 && i >= 0) {
    computed[sortedIndices[i].index].shareAmount -= 1;
    discrepancy++;
    i--;
  }

  return computed.map((c) => ({
    memberId: c.memberId,
    shareAmount: c.shareAmount,
    splitValue: c.percentage,
  }));
}

/**
 * Shares-Based Split:
 * Each participant has a weight / share ratio (e.g. 1:1:2).
 * Reconciles exact paise to participants with largest fractional parts.
 */
export function calculateSharesSplit(
  totalPaise: number,
  shares: { memberId: string; share: number }[]
): ParticipantShare[] {
  if (shares.length === 0) {
    throw new Error('At least one participant share required');
  }
  if (totalPaise <= 0) {
    throw new Error('Expense amount must be positive');
  }

  const totalShares = shares.reduce((sum, s) => sum + s.share, 0);
  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than zero');
  }

  const computed = shares.map((s) => {
    const exactPaise = (totalPaise * s.share) / totalShares;
    const floorPaise = Math.floor(exactPaise);
    const fraction = exactPaise - floorPaise;
    return {
      memberId: s.memberId,
      share: s.share,
      shareAmount: floorPaise,
      fraction,
    };
  });

  let currentSum = computed.reduce((sum, c) => sum + c.shareAmount, 0);
  let discrepancy = totalPaise - currentSum;

  const sortedIndices = computed
    .map((c, i) => ({ index: i, fraction: c.fraction }))
    .sort((a, b) => b.fraction - a.fraction);

  let i = 0;
  while (discrepancy > 0 && i < sortedIndices.length) {
    computed[sortedIndices[i].index].shareAmount += 1;
    discrepancy--;
    i++;
  }

  i = sortedIndices.length - 1;
  while (discrepancy < 0 && i >= 0) {
    computed[sortedIndices[i].index].shareAmount -= 1;
    discrepancy++;
    i--;
  }

  return computed.map((c) => ({
    memberId: c.memberId,
    shareAmount: c.shareAmount,
    splitValue: c.share,
  }));
}

/**
 * Itemized Split:
 * Items with item costs assigned to one or more members.
 * Any difference between item sum and total amount (such as taxes, service charge or discount)
 * is distributed proportionally among participants.
 */
export function calculateItemizedSplit(
  totalPaise: number,
  items: { name: string; amountPaise: number; assignedMemberIds: string[] }[]
): { shares: ParticipantShare[]; itemsNormalized: { name: string; amount: number; assignedMemberIds: string[] }[] } {
  if (items.length === 0) {
    throw new Error('At least one item required for itemized split');
  }
  if (totalPaise <= 0) {
    throw new Error('Expense amount must be positive');
  }

  // Aggregate member base amounts from items
  const memberSums: Record<string, number> = {};

  for (const item of items) {
    if (item.assignedMemberIds.length === 0) {
      throw new Error(`Item "${item.name}" has no assigned participants`);
    }
    if (item.amountPaise < 0) {
      throw new Error(`Item "${item.name}" cannot have negative cost`);
    }

    const itemShares = calculateEqualSplit(item.amountPaise, item.assignedMemberIds);
    for (const is of itemShares) {
      memberSums[is.memberId] = (memberSums[is.memberId] || 0) + is.shareAmount;
    }
  }

  const itemTotal = Object.values(memberSums).reduce((sum, v) => sum + v, 0);
  const participantIds = Object.keys(memberSums);

  if (itemTotal === totalPaise) {
    return {
      shares: participantIds.map((mId) => ({
        memberId: mId,
        shareAmount: memberSums[mId],
        splitValue: memberSums[mId],
      })),
      itemsNormalized: items.map((it) => ({
        name: it.name,
        amount: it.amountPaise,
        assignedMemberIds: it.assignedMemberIds,
      })),
    };
  }

  // If item subtotal differs from total expense (e.g., taxes/discounts), distribute proportionally
  const delta = totalPaise - itemTotal;
  const sharesWithDelta: ParticipantShare[] = [];

  if (itemTotal === 0) {
    // Edge case: all items 0, fallback to equal split of delta
    return {
      shares: calculateEqualSplit(totalPaise, participantIds),
      itemsNormalized: items.map((it) => ({
        name: it.name,
        amount: it.amountPaise,
        assignedMemberIds: it.assignedMemberIds,
      })),
    };
  }

  // Calculate proportional shares based on item proportions
  const sharesInput = participantIds.map((mId) => ({
    memberId: mId,
    share: memberSums[mId],
  }));

  const proportional = calculateSharesSplit(totalPaise, sharesInput);

  return {
    shares: proportional,
    itemsNormalized: items.map((it) => ({
      name: it.name,
      amount: it.amountPaise,
      assignedMemberIds: it.assignedMemberIds,
    })),
  };
}
