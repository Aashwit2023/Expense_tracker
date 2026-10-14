import { Router } from 'express';
import {
  getGroups,
  createGroup,
  getGroupDetails,
  deleteGroup,
  addExpense,
  updateExpense,
  cancelExpense,
  adjustBalance,
  recordSettlement,
  reverseSettlement,
  addMember,
  leaveGroup,
  setBudget,
} from './group.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroupDetails);
router.delete('/:id', deleteGroup);
router.post('/:id/expenses', addExpense);
router.put('/:id/expenses/:expenseId', updateExpense);
router.delete('/:id/expenses/:expenseId', cancelExpense);
router.post('/:id/balances/adjust', adjustBalance);
router.post('/:id/settlements', recordSettlement);
router.post('/:id/settlements/:settlementId/reverse', reverseSettlement);
router.post('/:id/members', addMember);
router.post('/:id/leave', leaveGroup);
router.post('/:id/budget', setBudget);

export default router;

