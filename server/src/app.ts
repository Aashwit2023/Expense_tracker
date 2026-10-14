import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

// Configurable CORS for separate frontend/backend deployments
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
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

// Unified single-service deployment: serve built frontend client when present
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Centralized error handler
app.use(errorHandler);

