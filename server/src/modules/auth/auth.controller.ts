import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { config } from '../../config';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, currency } = req.body;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    res.status(409).json({ success: false, message: 'An account with this email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      name,
      currency: currency || 'INR',
    },
  });

  // Automatically create default primary accounts for new user
  await prisma.account.createMany({
    data: [
      {
        userId: user.id,
        name: 'Primary Bank Account',
        type: 'BANK',
        initialBalance: 0,
        isDefault: true,
        color: '#0F172A',
      },
      {
        userId: user.id,
        name: 'Cash Wallet',
        type: 'CASH',
        initialBalance: 0,
        isDefault: false,
        color: '#15803D',
      },
    ],
  });

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
      },
    },
  });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
    return;
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    res.status(401).json({ success: false, message: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        currency: user.currency,
        createdAt: user.createdAt,
      },
    },
  });
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
      createdAt: true,
      accounts: true,
    },
  });

  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' });
    return;
  }

  res.json({
    success: true,
    data: user,
  });
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { name, currency } = req.body;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name && { name }),
      ...(currency && { currency }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      currency: true,
    },
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: updated,
  });
}
