import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { createAuditLog } from '../utils/auditLogger';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email.service';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || !user.isActive) {
    await createAuditLog({
      actionType: 'FAILED_LOGIN',
      entityType: 'user',
      description: `Failed login attempt for email: ${email}`,
      req,
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await createAuditLog({
      actionType: 'FAILED_LOGIN',
      entityType: 'user',
      entityId: user.id,
      description: `Failed login attempt for user: ${email}`,
      req,
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Invalidate any existing unused OTP sessions for this user
  await prisma.otpCode.deleteMany({ where: { userId: user.id, usedAt: null } });

  // Generate 6-digit OTP using cryptographically secure random
  const code = String(crypto.randomInt(100000, 999999));
  const sessionId = uuidv4();

  await prisma.otpCode.create({
    data: {
      sessionId,
      userId: user.id,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  try {
    await sendOtpEmail({ to: user.email, name: user.fullName, code });
  } catch (err) {
    console.error('OTP email failed:', err);
    return res.status(500).json({ error: 'Failed to send verification code. Try again.' });
  }

  return res.json({ requiresOtp: true, sessionId, maskedEmail: maskEmail(user.email) });
}

export async function verifyOtp(req: Request, res: Response) {
  const { sessionId, code } = req.body;
  if (!sessionId || !code) return res.status(400).json({ error: 'Session and code required' });

  const otp = await prisma.otpCode.findUnique({ where: { sessionId } });

  if (!otp || otp.usedAt || otp.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Code expired or invalid. Please log in again.' });
  }

  if (otp.attempts >= 5) {
    await prisma.otpCode.delete({ where: { id: otp.id } });
    return res.status(401).json({ error: 'Too many incorrect attempts. Please log in again.' });
  }

  if (otp.code !== String(code).trim()) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    const remaining = 4 - otp.attempts;
    return res.status(401).json({
      error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    });
  }

  // Mark OTP used
  await prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

  const user = await prisma.user.findUnique({ where: { id: otp.userId } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Account not found or deactivated' });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '96h' } // 4 days
  );

  await createAuditLog({
    userId: user.id,
    actionType: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    description: 'User logged in (2FA verified)',
    req,
  });

  return res.json({
    token,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  });
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Always return same response to prevent user enumeration
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Invalidate existing reset tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
    try {
      await sendPasswordResetEmail({ to: user.email, name: user.fullName, resetUrl });
    } catch (err) {
      console.error('Password reset email failed:', err);
    }
  }

  return res.json({ message: 'If that email is registered, a reset link has been sent.' });
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (password.length < 12) return res.status(400).json({ error: 'Password must be at least 12 characters' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Reset link is invalid or has expired' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
  await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } });

  // Invalidate any active OTP sessions
  await prisma.otpCode.deleteMany({ where: { userId: resetToken.userId, usedAt: null } });

  return res.json({ message: 'Password reset successfully. You can now log in.' });
}

export async function changePassword(req: AuthRequest, res: Response) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields required' });
  if (newPassword.length < 12) return res.status(400).json({ error: 'New password must be at least 12 characters' });
  if (currentPassword === newPassword) return res.status(400).json({ error: 'New password must differ from current' });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await createAuditLog({
    userId: user.id,
    actionType: 'UPDATE_USER',
    entityType: 'user',
    entityId: user.id,
    description: 'User changed their own password',
    req,
  });

  return res.json({ message: 'Password changed successfully' });
}

// Super admin sends a password reset link to another user
export async function adminSendReset(req: AuthRequest, res: Response) {
  const { userId } = req.params;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: 'User not found' });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  await prisma.passwordResetToken.deleteMany({ where: { userId: target.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: target.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({ to: target.email, name: target.fullName, resetUrl });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'UPDATE_USER',
    entityType: 'user',
    entityId: target.id,
    description: `Admin sent password reset link to ${target.email}`,
    req,
  });

  return res.json({ message: `Reset link sent to ${target.email}` });
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.user) {
    await createAuditLog({
      userId: req.user.id,
      actionType: 'LOGOUT',
      entityType: 'user',
      entityId: req.user.id,
      description: 'User logged out',
      req,
    });
  }
  return res.json({ message: 'Logged out successfully' });
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  });
  return res.json(user);
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}
