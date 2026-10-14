import { Router } from 'express';
import { getDashboardData, getAnalyticsReport, exportTransactionsCSV } from './report.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardData);
router.get('/analytics', getAnalyticsReport);
router.get('/export-csv', exportTransactionsCSV);

export default router;
