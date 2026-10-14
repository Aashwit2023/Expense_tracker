import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  splitTransaction,
} from './transaction.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validation.middleware';
import { createTransactionSchema, updateTransactionSchema } from './transaction.validation';

const router = Router();

router.use(authenticate);

router.get('/', getTransactions);
router.post('/', validateBody(createTransactionSchema), createTransaction);
router.post('/:id/split', splitTransaction);
router.put('/:id', validateBody(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
