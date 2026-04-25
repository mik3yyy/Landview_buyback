import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export const isSuperAdmin = requireRole('super_admin');
export const isAdminOrAbove = requireRole('super_admin', 'admin');
export const isAnyRole = requireRole('super_admin', 'admin', 'accountant');
