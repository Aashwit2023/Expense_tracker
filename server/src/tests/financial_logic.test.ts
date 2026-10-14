describe('Financial Calculation Business Rules', () => {
  describe('Cash Flow Calculation Rules', () => {
    test('transfers between own accounts do not affect net income or expense totals', () => {
      const transactions = [
        { type: 'INCOME', amount: 5000000 }, // +50,000
        { type: 'EXPENSE', amount: 1500000 }, // -15,000
        { type: 'TRANSFER', amount: 1000000 }, // Bank to Cash 10,000
        { type: 'EXPENSE', amount: 500000 },  // -5,000
      ];

      const incomeTotal = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      const expenseTotal = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);

      const netCashFlow = incomeTotal - expenseTotal;

      expect(incomeTotal).toBe(5000000); // Only 50,000
      expect(expenseTotal).toBe(2000000); // 15,000 + 5,000 = 20,000
      expect(netCashFlow).toBe(3000000);  // 30,000 remaining
    });
  });

  describe('Budget Utilization & Warning Rules', () => {
    function computeBudgetStatus(budgetAmount: number, spentAmount: number) {
      const remaining = budgetAmount - spentAmount;
      const percentage = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
      const isExceeded = spentAmount > budgetAmount;
      const isWarning = !isExceeded && percentage >= 80;
      return { remaining, percentage, isWarning, isExceeded };
    }

    test('under 80% is normal status', () => {
      const status = computeBudgetStatus(1000000, 600000); // Budget: 10k, Spent: 6k (60%)
      expect(status.percentage).toBe(60);
      expect(status.isWarning).toBe(false);
      expect(status.isExceeded).toBe(false);
      expect(status.remaining).toBe(400000);
    });

    test('between 80% and 100% triggers warning', () => {
      const status = computeBudgetStatus(1000000, 850000); // Budget: 10k, Spent: 8.5k (85%)
      expect(status.percentage).toBe(85);
      expect(status.isWarning).toBe(true);
      expect(status.isExceeded).toBe(false);
    });

    test('over 100% triggers exceeded flag', () => {
      const status = computeBudgetStatus(1000000, 1100000); // Budget: 10k, Spent: 11k (110%)
      expect(status.percentage).toBe(110);
      expect(status.isWarning).toBe(false);
      expect(status.isExceeded).toBe(true);
      expect(status.remaining).toBe(-100000);
    });
  });

  describe('Obligation Ledger & Repayment Settlement Rules', () => {
    test('partial repayments reduce outstanding balance correctly', () => {
      const obligation = {
        amount: 1000000, // ₹10,000 lent
        repayments: [
          { amount: 300000 }, // ₹3,000 repaid
          { amount: 200000 }, // ₹2,000 repaid
        ],
      };

      const totalRepaid = obligation.repayments.reduce((sum, r) => sum + r.amount, 0);
      const balanceRemaining = Math.max(0, obligation.amount - totalRepaid);
      const isSettled = balanceRemaining === 0;

      expect(totalRepaid).toBe(500000);
      expect(balanceRemaining).toBe(500000);
      expect(isSettled).toBe(false);
    });

    test('full repayments settle obligation without negative balance', () => {
      const obligation = {
        amount: 500000, // ₹5,000 borrowed
        repayments: [
          { amount: 300000 },
          { amount: 250000 }, // Slightly extra or full
        ],
      };

      const totalRepaid = obligation.repayments.reduce((sum, r) => sum + r.amount, 0);
      const balanceRemaining = Math.max(0, obligation.amount - totalRepaid);
      const isSettled = balanceRemaining === 0;

      expect(totalRepaid).toBe(550000);
      expect(balanceRemaining).toBe(0);
      expect(isSettled).toBe(true);
    });
  });

  describe('Bank Account Balance & Debt Integration Rules', () => {
    function computeAccountBalance({
      initialBalance = 0,
      income = 0,
      expense = 0,
      transferIn = 0,
      transferOut = 0,
      lentOut = 0,
      borrowedIn = 0,
      lentRepaidIn = 0,
      borrowedRepaidOut = 0,
    }: {
      initialBalance?: number;
      income?: number;
      expense?: number;
      transferIn?: number;
      transferOut?: number;
      lentOut?: number;
      borrowedIn?: number;
      lentRepaidIn?: number;
      borrowedRepaidOut?: number;
    }) {
      return (
        initialBalance +
        income -
        expense +
        transferIn -
        transferOut -
        lentOut +
        borrowedIn +
        lentRepaidIn -
        borrowedRepaidOut
      );
    }

    test('lending money reduces bank account balance', () => {
      const balance = computeAccountBalance({
        initialBalance: 5000000, // ₹50,000 in bank
        lentOut: 1000000,        // ₹10,000 lent to friend
      });

      expect(balance).toBe(4000000); // ₹40,000 remaining in bank
    });

    test('repayments received for money lent increases bank account balance', () => {
      const balance = computeAccountBalance({
        initialBalance: 5000000, // ₹50,000
        lentOut: 1000000,        // ₹10,000 lent
        lentRepaidIn: 400000,    // ₹4,000 repaid back by friend
      });

      expect(balance).toBe(4400000); // ₹44,000 in bank
    });

    test('borrowing money increases bank account balance', () => {
      const balance = computeAccountBalance({
        initialBalance: 2000000, // ₹20,000
        borrowedIn: 1500000,     // ₹15,000 borrowed from family
      });

      expect(balance).toBe(3500000); // ₹35,000 in bank
    });

    test('repaying borrowed debt decreases bank account balance', () => {
      const balance = computeAccountBalance({
        initialBalance: 2000000,  // ₹20,000
        borrowedIn: 1500000,      // ₹15,000 borrowed
        borrowedRepaidOut: 500000, // ₹5,000 paid back
      });

      expect(balance).toBe(3000000); // ₹30,000 in bank
    });

    test('net worth correctly integrates liquid balance with receivables and payables', () => {
      const liquidBankBalance = 3000000;       // ₹30,000 in bank
      const totalLentOutstanding = 1000000;    // ₹10,000 lent out (receivable)
      const totalBorrowedOutstanding = 500000; // ₹5,000 borrowed (payable)

      const netWorth = liquidBankBalance + totalLentOutstanding - totalBorrowedOutstanding;
      expect(netWorth).toBe(3500000); // ₹35,000 net worth
    });
  });
});
