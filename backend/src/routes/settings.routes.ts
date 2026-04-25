import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isSuperAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', authenticate, isSuperAdmin, getSettings);
router.put('/', authenticate, isSuperAdmin, updateSettings);

export default router;
