import { Router } from 'express';
import { listAuditLogs, exportAuditLogs } from '../controllers/auditLogs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isSuperAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate, isSuperAdmin);

router.get('/', listAuditLogs);
router.get('/export', exportAuditLogs);

export default router;
