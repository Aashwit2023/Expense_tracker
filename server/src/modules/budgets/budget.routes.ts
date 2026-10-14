import { Router } from 'express';
import { getBudgets, upsertBudget, deleteBudget } from './budget.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getBudgets);
router.post('/', upsertBudget);
router.delete('/:id', deleteBudget);

export default router;
