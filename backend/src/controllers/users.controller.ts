import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/auditLogger';

export async function listUsers(req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, fullName: true, role: true,
      isActive: true, createdAt: true,
      createdByUser: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users);
}

export async function getUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, fullName: true, role: true,
      isActive: true, createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
}

export async function createUser(req: AuthRequest, res: Response) {
  const { email, password, fullName, role } = req.body;

  // Super Admin can create any role; Admin can only create accountant
  if (req.user!.role === 'admin' && role !== 'accountant') {
    return res.status(403).json({ error: 'Admins can only create accountant users' });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role,
      createdBy: req.user!.id,
    },
    select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'CREATE_USER',
    entityType: 'user',
    entityId: user.id,
    newValues: { email, fullName, role },
    req,
  });

  return res.status(201).json(user);
}

export async function updateUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { fullName, role, isActive, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  // Admin cannot modify super_admin or other admins
  if (req.user!.role === 'admin' && (existing.role === 'super_admin' || existing.role === 'admin')) {
    return res.status(403).json({ error: 'Insufficient permissions to modify this user' });
  }

  const updateData: any = {};
  if (fullName) updateData.fullName = fullName;
  if (role && req.user!.role === 'super_admin') updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) {
    if (password.length < 12) return res.status(400).json({ error: 'Password must be at least 12 characters' });
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'UPDATE_USER',
    entityType: 'user',
    entityId: id,
    oldValues: { fullName: existing.fullName, role: existing.role, isActive: existing.isActive },
    newValues: updateData,
    req,
  });

  return res.json(updated);
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const { id } = req.params;
  if (id === req.user!.id) return res.status(400).json({ error: 'Cannot delete your own account' });

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  // Soft delete — deactivate instead of hard delete
  await prisma.user.update({ where: { id }, data: { isActive: false } });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'DELETE_USER',
    entityType: 'user',
    entityId: id,
    oldValues: { email: existing.email, fullName: existing.fullName, role: existing.role },
    req,
  });

  return res.json({ message: 'User deactivated' });
}
