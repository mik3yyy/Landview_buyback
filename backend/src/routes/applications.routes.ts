import { Router } from 'express';
import {
  submitApplication,
  getApplicationStatus,
  resubmitApplication,
  editApplication,
  listApplications,
  getApplication,
  reviewApplication,
  rejectApplication,
  approveApplication,
} from '../controllers/applications.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdminOrAbove, isSuperAdmin } from '../middleware/rbac.middleware';

const router = Router();

// Public routes — no auth
router.post('/', submitApplication);
router.get('/:id/status', getApplicationStatus);
router.put('/:id/resubmit', resubmitApplication);
router.put('/:id/edit', editApplication);

// Admin routes
router.get('/', authenticate, isAdminOrAbove, listApplications);
router.get('/:id', authenticate, isAdminOrAbove, getApplication);
router.post('/:id/review', authenticate, isAdminOrAbove, reviewApplication);

// Super admin only
router.post('/:id/reject', authenticate, isSuperAdmin, rejectApplication);
router.post('/:id/approve', authenticate, isSuperAdmin, approveApplication);

export default router;
