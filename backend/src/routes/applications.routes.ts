import { Router } from 'express';
import {
  submitApplication,
  getApplicationStatus,
  resubmitApplication,
  listApplications,
  getApplication,
  rejectApplication,
  approveApplication,
} from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdminOrAbove } from '../middleware/rbac.middleware';

const router = Router();

// Public routes — no auth
router.post('/', submitApplication);
router.get('/:id/status', getApplicationStatus);
router.put('/:id/resubmit', resubmitApplication);

// Admin routes
router.get('/', authenticate, isAdminOrAbove, listApplications);
router.get('/:id', authenticate, isAdminOrAbove, getApplication);
router.post('/:id/reject', authenticate, isAdminOrAbove, rejectApplication);
router.post('/:id/approve', authenticate, isAdminOrAbove, approveApplication);

export default router;
