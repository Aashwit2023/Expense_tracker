import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './modules/auth/auth.routes';
import accountRoutes from './modules/accounts/account.routes';
import categoryRoutes from './modules/categories/category.routes';
import transactionRoutes from './modules/transactions/transaction.routes';
import budgetRoutes from './modules/budgets/budget.routes';
import obligationRoutes from './modules/obligations/obligation.routes';
import tripRoutes from './modules/trips/trip.routes';
import recurringRoutes from './modules/recurring/recurring.routes';
import reportRoutes from './modules/reports/report.routes';
import groupRoutes from './modules/groups/group.routes';

export const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json());

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Personalized Money Tracker API - Phase 1',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/obligations', obligationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/groups', groupRoutes);

// Centralized error handler
app.use(errorHandler);
