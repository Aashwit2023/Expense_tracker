import { Response } from 'express';
import { prisma } from '../../db/prisma';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function getTrips(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;

  const trips = await prisma.trip.findMany({
    where: { userId },
    include: {
      expenses: {
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  const enriched = trips.map((t) => {
    const totalSpent = t.expenses.reduce((acc, e) => acc + e.amount, 0);
    const remainingBudget = t.budget - totalSpent;
    const percentage = t.budget > 0 ? Math.round((totalSpent / t.budget) * 100) : 0;

    return {
      ...t,
      totalSpent,
      remainingBudget,
      percentage,
    };
  });

  res.json({ success: true, data: enriched });
}

export async function createTrip(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, destination, startDate, endDate, budget, status } = req.body;

  if (!name || !destination || !startDate || !endDate || budget === undefined) {
    res.status(400).json({ success: false, message: 'Name, destination, dates, and budget are required' });
    return;
  }

  const trip = await prisma.trip.create({
    data: {
      userId,
      name,
      destination,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      budget: parseInt(budget, 10),
      status: status || 'PLANNED',
    },
    include: { expenses: true },
  });

  res.status(201).json({
    success: true,
    data: { ...trip, totalSpent: 0, remainingBudget: trip.budget, percentage: 0 },
  });
}

export async function updateTrip(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { name, destination, startDate, endDate, budget, status } = req.body;

  const existing = await prisma.trip.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return;
  }

  const updated = await prisma.trip.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(destination && { destination }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(budget !== undefined && { budget: parseInt(budget, 10) }),
      ...(status && { status }),
    },
    include: { expenses: true },
  });

  res.json({ success: true, data: updated });
}

export async function deleteTrip(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;

  const existing = await prisma.trip.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return;
  }

  await prisma.trip.delete({ where: { id } });

  res.json({ success: true, message: 'Trip deleted successfully' });
}

export async function addTripExpense(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params; // tripId
  const { amount, category, date, description, paymentMethod, notes } = req.body;

  const trip = await prisma.trip.findFirst({
    where: { id, userId },
  });

  if (!trip) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return;
  }

  if (!amount || !category || !description) {
    res.status(400).json({ success: false, message: 'Amount, category, and description are required' });
    return;
  }

  const expense = await prisma.tripExpense.create({
    data: {
      tripId: id,
      amount: parseInt(amount, 10),
      category,
      date: date ? new Date(date) : new Date(),
      description,
      paymentMethod: paymentMethod || 'UPI',
      notes: notes || null,
    },
  });

  res.status(201).json({ success: true, data: expense });
}

export async function deleteTripExpense(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { tripId, expenseId } = req.params;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId },
  });

  if (!trip) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return;
  }

  await prisma.tripExpense.delete({
    where: { id: expenseId },
  });

  res.json({ success: true, message: 'Trip expense deleted successfully' });
}
