import {
  calculateEqualSplit,
  validateAndCalculateUnequalSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  calculateItemizedSplit,
} from '../modules/groups/group.split';
import {
  calculateGroupBalances,
  calculateOptimizedSettlements,
} from '../modules/groups/group.ledger';

describe('Group Expense Split Arithmetic & Precision Reconciliation', () => {
  describe('Equal Split', () => {
    it('splits evenly with exact paise reconciliation for uneven amounts', () => {
      // ₹100.00 = 10000 paise among 3 people: 3334, 3333, 3333
      const shares = calculateEqualSplit(10000, ['A', 'B', 'C']);
      expect(shares).toHaveLength(3);
      expect(shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(10000);
      expect(shares[0].shareAmount).toBe(3334);
      expect(shares[1].shareAmount).toBe(3333);
      expect(shares[2].shareAmount).toBe(3333);
    });

    it('works when payer is included or excluded from participants', () => {
      // Expense paid by Payer P, but shared only among B and C (Payer excluded)
      const shares = calculateEqualSplit(5000, ['B', 'C']);
      expect(shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(5000);
      expect(shares[0].shareAmount).toBe(2500);
      expect(shares[1].shareAmount).toBe(2500);
    });

    it('throws error when no participants or non-positive amount provided', () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
      expect(() => calculateEqualSplit(0, ['A'])).toThrow();
    });
  });

  describe('Unequal Split', () => {
    it('validates and allocates exact unequal shares', () => {
      const shares = validateAndCalculateUnequalSplit(15000, [
        { memberId: 'A', amountPaise: 7000 },
        { memberId: 'B', amountPaise: 5000 },
        { memberId: 'C', amountPaise: 3000 },
      ]);
      expect(shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(15000);
    });

    it('throws when unequal split does not sum to total expense', () => {
      expect(() =>
        validateAndCalculateUnequalSplit(15000, [
          { memberId: 'A', amountPaise: 7000 },
          { memberId: 'B', amountPaise: 5000 },
          // Missing 3000
        ])
      ).toThrow('Allocated total');
    });
  });

  describe('Percentage Split', () => {
    it('reconciles rounding so total paise exactly matches total expense', () => {
      // ₹1000.00 (100000 paise) split 33.33%, 33.33%, 33.34%
      const shares = calculatePercentageSplit(100000, [
        { memberId: 'A', percentage: 33.33 },
        { memberId: 'B', percentage: 33.33 },
        { memberId: 'C', percentage: 33.34 },
      ]);
      expect(shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(100000);
    });

    it('throws if percentages do not sum to 100%', () => {
      expect(() =>
        calculatePercentageSplit(10000, [
          { memberId: 'A', percentage: 50 },
          { memberId: 'B', percentage: 40 },
        ])
      ).toThrow('100%');
    });
  });

  describe('Shares-Based Split', () => {
    it('calculates weighted ratio shares with exact reconciliation', () => {
      // ₹1000.00 (100000 paise) with ratio 1:1:2 (total 4 shares: 25000, 25000, 50000)
      const shares = calculateSharesSplit(100000, [
        { memberId: 'A', share: 1 },
        { memberId: 'B', share: 1 },
        { memberId: 'C', share: 2 },
      ]);
      expect(shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(100000);
      expect(shares[0].shareAmount).toBe(25000);
      expect(shares[1].shareAmount).toBe(25000);
      expect(shares[2].shareAmount).toBe(50000);
    });
  });

  describe('Itemized Split', () => {
    it('allocates items to specific members and reconciles taxes/fees proportionally', () => {
      // Item 1: Burger ₹300 (30000 paise) -> A & B
      // Item 2: Pizza ₹500 (50000 paise) -> B & C
      // Total with delivery & tax = ₹1000 (100000 paise)
      const res = calculateItemizedSplit(100000, [
        { name: 'Burger', amountPaise: 30000, assignedMemberIds: ['A', 'B'] },
        { name: 'Pizza', amountPaise: 50000, assignedMemberIds: ['B', 'C'] },
      ]);

      expect(res.shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(100000);
      expect(res.shares).toHaveLength(3);
    });
  });
});

describe('Group Ledger & Settlement Optimization Engine', () => {
  it('verifies the 4-member test scenario required by specification', () => {
    /**
     * Scenario:
     * A four-member group (A, B, C, D) has three expenses:
     * - Member A pays ₹8,000 (800,000 paise) for a hotel shared equally by A, B, C, and D.
     * - Member B pays ₹2,000 (200,000 paise) for dinner shared equally by A, B, C, and D.
     * - Member C pays ₹2,000 (200,000 paise) for transport shared equally by A, B, C, and D.
     * Total group expenses: ₹12,000 (1,200,000 paise).
     * Each member's share: ₹3,000 (300,000 paise).
     * Expected net balances:
     * - A: +₹5,000 (+500,000 paise)
     * - B: -₹1,000 (-100,000 paise)
     * - C: -₹1,000 (-100,000 paise)
     * - D: -₹3,000 (-300,000 paise)
     * Balances sum to 0.
     */
    const members = [
      { id: 'A', name: 'Member A', upiId: 'memberA@upi' },
      { id: 'B', name: 'Member B' },
      { id: 'C', name: 'Member C' },
      { id: 'D', name: 'Member D' },
    ];

    const expenses = [
      {
        id: 'exp1',
        payerId: 'A',
        amount: 800000,
        status: 'ACTIVE',
        participants: [
          { memberId: 'A', shareAmount: 200000 },
          { memberId: 'B', shareAmount: 200000 },
          { memberId: 'C', shareAmount: 200000 },
          { memberId: 'D', shareAmount: 200000 },
        ],
      },
      {
        id: 'exp2',
        payerId: 'B',
        amount: 200000,
        status: 'ACTIVE',
        participants: [
          { memberId: 'A', shareAmount: 50000 },
          { memberId: 'B', shareAmount: 50000 },
          { memberId: 'C', shareAmount: 50000 },
          { memberId: 'D', shareAmount: 50000 },
        ],
      },
      {
        id: 'exp3',
        payerId: 'C',
        amount: 200000,
        status: 'ACTIVE',
        participants: [
          { memberId: 'A', shareAmount: 50000 },
          { memberId: 'B', shareAmount: 50000 },
          { memberId: 'C', shareAmount: 50000 },
          { memberId: 'D', shareAmount: 50000 },
        ],
      },
    ];

    const settlements: any[] = [];

    const { balances, totalExpensesPaise } = calculateGroupBalances(members, expenses, settlements);

    expect(totalExpensesPaise).toBe(1200000); // ₹12,000

    expect(balances['A'].totalPaid).toBe(800000);
    expect(balances['A'].totalShare).toBe(300000);
    expect(balances['A'].netBalance).toBe(500000); // +₹5,000

    expect(balances['B'].totalPaid).toBe(200000);
    expect(balances['B'].totalShare).toBe(300000);
    expect(balances['B'].netBalance).toBe(-100000); // -₹1,000

    expect(balances['C'].totalPaid).toBe(200000);
    expect(balances['C'].totalShare).toBe(300000);
    expect(balances['C'].netBalance).toBe(-100000); // -₹1,000

    expect(balances['D'].totalPaid).toBe(0);
    expect(balances['D'].totalShare).toBe(300000);
    expect(balances['D'].netBalance).toBe(-300000); // -₹3,000

    // Net balances must sum to exactly zero
    const sum = Object.values(balances).reduce((acc, b) => acc + b.netBalance, 0);
    expect(sum).toBe(0);

    // Optimized settlement suggestions
    const membersMap = {
      A: { id: 'A', name: 'Member A', upiId: 'memberA@upi' },
      B: { id: 'B', name: 'Member B' },
      C: { id: 'C', name: 'Member C' },
      D: { id: 'D', name: 'Member D' },
    };
    const suggestions = calculateOptimizedSettlements(balances, membersMap);

    // Debts are cleared in 3 payments to A:
    // D pays A ₹3,000 (300000)
    // B pays A ₹1,000 (100000)
    // C pays A ₹1,000 (100000)
    expect(suggestions).toHaveLength(3);
    const totalSuggested = suggestions.reduce((s, sg) => s + sg.amount, 0);
    expect(totalSuggested).toBe(500000); // Total ₹5,000 to clear

    for (const sg of suggestions) {
      expect(sg.recipientId).toBe('A');
      expect(sg.upiPaymentLink).toContain('upi://pay');
    }
  });

  it('correctly incorporates recorded repayments and reversals', () => {
    const members = [
      { id: 'A', name: 'Member A' },
      { id: 'B', name: 'Member B' },
    ];

    // A paid ₹1000 (100000 paise) split equally: B owes A ₹500 (50000 paise)
    const expenses = [
      {
        id: 'exp1',
        payerId: 'A',
        amount: 100000,
        status: 'ACTIVE',
        participants: [
          { memberId: 'A', shareAmount: 50000 },
          { memberId: 'B', shareAmount: 50000 },
        ],
      },
    ];

    // B partially repays A ₹300 (30000 paise)
    const settlements = [
      {
        id: 'set1',
        payerId: 'B',
        recipientId: 'A',
        amount: 30000,
        status: 'RECORDED',
      },
    ];

    const { balances } = calculateGroupBalances(members, expenses, settlements);

    // Remaining: B owes ₹200 (20000), A is owed ₹200 (20000)
    expect(balances['A'].netBalance).toBe(20000);
    expect(balances['B'].netBalance).toBe(-20000);

    // If settlement is reversed
    settlements[0].status = 'REVERSED';
    const recalculated = calculateGroupBalances(members, expenses, settlements);
    expect(recalculated.balances['A'].netBalance).toBe(50000);
    expect(recalculated.balances['B'].netBalance).toBe(-50000);
  });
});
