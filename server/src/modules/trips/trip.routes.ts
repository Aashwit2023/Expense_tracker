import { Router } from 'express';
import {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  addTripExpense,
  deleteTripExpense,
} from './trip.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getTrips);
router.post('/', createTrip);
router.put('/:id', updateTrip);
router.delete('/:id', deleteTrip);
router.post('/:id/expenses', addTripExpense);
router.delete('/:tripId/expenses/:expenseId', deleteTripExpense);

export default router;
