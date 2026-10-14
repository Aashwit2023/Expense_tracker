import { Router } from 'express';
import {
  getObligations,
  createObligation,
  recordRepayment,
  updateObligation,
  deleteObligation,
} from './obligation.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getObligations);
router.post('/', createObligation);
router.post('/:id/repayments', recordRepayment);
router.put('/:id', updateObligation);
router.delete('/:id', deleteObligation);

export default router;
