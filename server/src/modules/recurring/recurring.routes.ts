import { Router } from 'express';
import {
  getRecurring,
  createRecurring,
  postRecurringAsTransaction,
  updateRecurring,
  deleteRecurring,
} from './recurring.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getRecurring);
router.post('/', createRecurring);
router.post('/:id/post-transaction', postRecurringAsTransaction);
router.put('/:id', updateRecurring);
router.delete('/:id', deleteRecurring);

export default router;
