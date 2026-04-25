import { Router } from 'express';
import { upload, processAIUpload } from '../controllers/aiUpload.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAnyRole } from '../middleware/rbac.middleware';

const router = Router();

router.post('/', authenticate, isAnyRole, upload.single('document'), processAIUpload);

export default router;
