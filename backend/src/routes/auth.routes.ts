import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login, verifyOtp, forgotPassword, resetPassword,
  changePassword, adminSendReset, logout, getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { isSuperAdmin } from '../middleware/rbac.middleware';

const router = Router();

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimit, login);
router.post('/verify-otp', authLimit, verifyOtp);
router.post('/forgot-password', authLimit, forgotPassword);
router.post('/reset-password', authLimit, resetPassword);
router.post('/change-password', authenticate, changePassword);
router.post('/admin-send-reset/:userId', authenticate, isSuperAdmin, adminSendReset);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
