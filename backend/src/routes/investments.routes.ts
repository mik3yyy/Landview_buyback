import { Router } from 'express';
import {
  listInvestments, getInvestment, createInvestment, updateInvestment,
  extendInvestment, markPaymentInitiated, markPaymentCompleted,
  deleteInvestment, getDashboardStats, exportInvestments,
} from '../controllers/investments.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdminOrAbove, isAnyRole } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/dashboard', isAnyRole, getDashboardStats);
router.get('/export', isAdminOrAbove, exportInvestments);
router.get('/', isAnyRole, listInvestments);
router.get('/:id', isAnyRole, getInvestment);
router.post('/', isAnyRole, createInvestment);
router.put('/:id', isAdminOrAbove, updateInvestment);
router.delete('/:id', isAdminOrAbove, deleteInvestment);
router.post('/:id/extend', isAnyRole, extendInvestment);
router.post('/:id/mark-payment-initiated', isAnyRole, markPaymentInitiated);
router.post('/:id/mark-payment-completed', isAdminOrAbove, markPaymentCompleted);

export default router;
