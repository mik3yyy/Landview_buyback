import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { createAuditLog } from '../utils/auditLogger';
import { AuthRequest } from '../middleware/auth.middleware';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user) {
    await createAuditLog({
      actionType: 'FAILED_LOGIN',
      entityType: 'user',
      description: `Failed login attempt for email: ${email}`,
      req,
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.isActive) {
    return res.status(401).json({ error: 'Account is deactivated' });
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

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '24h' }
  );

  await createAuditLog({
    userId: user.id,
    actionType: 'LOGIN',
    entityType: 'user',
    entityId: user.id,
    description: `User logged in`,
    req,
  });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
  });
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
