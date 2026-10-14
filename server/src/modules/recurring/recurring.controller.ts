import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

function calculateNextDueDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export async function getRecurring(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const recurring = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: true,
    },
    orderBy: { nextDueDate: 'asc' },
  });

  const now = new Date();
  const upcomingBills = recurring.filter((r) => r.isActive && r.type === 'EXPENSE');

  res.json({
    success: true,
    data: {
      items: recurring,
      upcomingBills,
    },
  });
}

export async function createRecurring(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const {
    title,
    type,
    amount,
    categoryId,
    accountId,
    frequency,
    startDate,
    endDate,
    nextDueDate,
    reminderDays,
    notes,
  } = req.body;

  if (!title || !type || amount === undefined || !frequency || !startDate) {
    res.status(400).json({ success: false, message: 'Title, type, amount, frequency, and startDate are required' });
    return;
  }

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId,
      title,
      type,
      amount: parseInt(amount, 10),
      categoryId: categoryId || null,
      accountId: accountId || null,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      nextDueDate: nextDueDate ? new Date(nextDueDate) : new Date(startDate),
      reminderDays: reminderDays ? parseInt(reminderDays, 10) : 1,
      notes: notes || null,
      isActive: true,
    },
    include: { category: true },
  });

  res.status(201).json({ success: true, data: recurring });
}

export async function postRecurringAsTransaction(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { accountId, date } = req.body;

  const recurring = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });

  if (!recurring) {
    res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    return;
  }

  // Get user account
  const targetAccountId = accountId || recurring.accountId;
  let finalAccount = null;
  if (targetAccountId) {
    finalAccount = await prisma.account.findFirst({
      where: { id: targetAccountId, userId },
    });
  }

  if (!finalAccount) {
    finalAccount = await prisma.account.findFirst({
      where: { userId, isDefault: true },
    }) || await prisma.account.findFirst({
      where: { userId },
    });
  }

  if (!finalAccount) {
    res.status(400).json({ success: false, message: 'No valid account found to post transaction' });
    return;
  }

  // Create real transaction
  const tx = await prisma.transaction.create({
    data: {
      userId,
      accountId: finalAccount.id,
      categoryId: recurring.categoryId,
      type: recurring.type,
      amount: recurring.amount,
      date: date ? new Date(date) : new Date(),
      merchant: recurring.title,
      description: `Recurring: ${recurring.title}`,
      paymentMethod: 'UPI',
    },
  });

  // Advance nextDueDate
  const nextDueDate = calculateNextDueDate(recurring.nextDueDate, recurring.frequency);
  const updatedRecurring = await prisma.recurringTransaction.update({
    where: { id },
    data: { nextDueDate },
  });

  res.status(201).json({
    success: true,
    message: 'Recorded as completed transaction and updated next due date',
    data: {
      transaction: tx,
      recurring: updatedRecurring,
    },
  });
}

export async function updateRecurring(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const {
    title,
    type,
    amount,
    categoryId,
    accountId,
    frequency,
    nextDueDate,
    isActive,
    notes,
  } = req.body;

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    return;
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(type && { type }),
      ...(amount !== undefined && { amount: parseInt(amount, 10) }),
      ...(categoryId !== undefined && { categoryId }),
      ...(accountId !== undefined && { accountId }),
      ...(frequency && { frequency }),
      ...(nextDueDate && { nextDueDate: new Date(nextDueDate) }),
      ...(isActive !== undefined && { isActive }),
      ...(notes !== undefined && { notes }),
    },
    include: { category: true },
  });

  res.json({ success: true, data: updated });
}

export async function deleteRecurring(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Recurring transaction not found' });
    return;
  }

  await prisma.recurringTransaction.delete({ where: { id } });

  res.json({ success: true, message: 'Recurring schedule removed successfully' });
}
