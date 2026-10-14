/**
 * Client-side Split calculations for live UI preview.
 * Exact integer paise arithmetic, identical to server rules.
 */

export interface ParticipantShare {
  memberId: string;
  shareAmount: number; // in paise
  splitValue?: number;
}

export function calculateEqualSplit(
  totalPaise: number,
  participantIds: string[]
): ParticipantShare[] {
  if (participantIds.length === 0 || totalPaise <= 0) return [];

  const count = participantIds.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  return participantIds.map((memberId, index) => ({
    memberId,
    shareAmount: index < remainder ? baseShare + 1 : baseShare,
    splitValue: 1,
  }));
}

export function validateAndCalculateUnequalSplit(
  totalPaise: number,
  allocations: { memberId: string; amountPaise: number }[]
): ParticipantShare[] {
  if (allocations.length === 0 || totalPaise <= 0) return [];

  return allocations.map((a) => ({
    memberId: a.memberId,
    shareAmount: a.amountPaise,
    splitValue: a.amountPaise,
  }));
}

export function calculatePercentageSplit(
  totalPaise: number,
  percentages: { memberId: string; percentage: number }[]
): ParticipantShare[] {
  if (percentages.length === 0 || totalPaise <= 0) return [];

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
    splitValue: c.percentage,
  }));
}

export function calculateSharesSplit(
  totalPaise: number,
  shares: { memberId: string; share: number }[]
): ParticipantShare[] {
  if (shares.length === 0 || totalPaise <= 0) return [];

  const totalShares = shares.reduce((sum, s) => sum + s.share, 0);
  if (totalShares <= 0) return [];

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

export function calculateItemizedSplit(
  totalPaise: number,
  items: { name: string; amountPaise: number; assignedMemberIds: string[] }[]
): { shares: ParticipantShare[] } {
  if (items.length === 0 || totalPaise <= 0) return { shares: [] };

  const memberSums: Record<string, number> = {};

  for (const item of items) {
    if (item.assignedMemberIds.length === 0) continue;
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
    };
  }

  const sharesInput = participantIds.map((mId) => ({
    memberId: mId,
    share: memberSums[mId],
  }));

  return {
    shares: calculateSharesSplit(totalPaise, sharesInput),
  };
}
