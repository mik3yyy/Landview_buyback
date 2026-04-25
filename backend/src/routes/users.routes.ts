import { Router } from 'express';
import { listUsers, getUser, createUser, updateUser, deleteUser } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isAdminOrAbove, isSuperAdmin } from '../middleware/rbac.middleware';

const router = Router();

router.use(authenticate);

router.get('/', isAdminOrAbove, listUsers);
router.get('/:id', isAdminOrAbove, getUser);
router.post('/', isAdminOrAbove, createUser);
router.put('/:id', isAdminOrAbove, updateUser);
router.delete('/:id', isSuperAdmin, deleteUser);

export default router;
