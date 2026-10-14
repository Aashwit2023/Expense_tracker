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

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const configured = process.env.CORS_ORIGIN;
    if (!configured || configured.trim() === '*' || configured.trim() === '') {
      return callback(null, true);
    }

    const cleanOrigin = origin.trim().replace(/\/$/, '').toLowerCase();
    const allowed = configured.split(',').map((o) => o.trim().replace(/\/$/, '').toLowerCase());

    if (
      allowed.includes(cleanOrigin) ||
      allowed.includes('*') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.includes('localhost')
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

// Apply CORS to all requests & handle preflight OPTIONS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

