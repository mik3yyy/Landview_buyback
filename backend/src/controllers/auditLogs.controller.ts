import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { Prisma } from '@prisma/client';

export async function listAuditLogs(req: AuthRequest, res: Response) {
  const {
    user_id,
    action_type,
    entity_type,
    start_date,
    end_date,
    search,
    page = '1',
    limit = '50',
  } = req.query as Record<string, string>;

  const pageNum = parseInt(page);
  const limitNum = Math.min(parseInt(limit), 200);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.AuditLogWhereInput = {};
  if (user_id) where.userId = user_id;
  if (action_type) where.actionType = action_type as any;
  if (entity_type) where.entityType = entity_type;
  if (start_date || end_date) {
    where.createdAt = {};
    if (start_date) where.createdAt.gte = new Date(start_date);
    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // Search by client name/email (investor) OR by the user who performed the action
  if (search) {
    const matchingInvestmentIds = await prisma.investment.findMany({
      where: {
        OR: [
          { clientName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    const investmentIds = matchingInvestmentIds.map(i => i.id);

    where.OR = [
      // Logs tied to a matching investment (shows all who worked on it)
      ...(investmentIds.length > 0
        ? [{ entityId: { in: investmentIds }, entityType: 'investment' } as Prisma.AuditLogWhereInput]
        : []),
      // Logs from a user whose name/email matches (search by staff member)
      {
        user: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.json({
    logs,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function exportAuditLogs(req: AuthRequest, res: Response) {
  const { start_date, end_date, action_type, search } = req.query as Record<string, string>;

  const where: Prisma.AuditLogWhereInput = {};
  if (action_type) where.actionType = action_type as any;
  if (start_date || end_date) {
    where.createdAt = {};
    if (start_date) where.createdAt.gte = new Date(start_date);
    if (end_date) where.createdAt.lte = new Date(end_date);
  }

  if (search) {
    const matchingInvestmentIds = await prisma.investment.findMany({
      where: {
        OR: [
          { clientName: { contains: search, mode: 'insensitive' } },
          { clientEmail: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    const investmentIds = matchingInvestmentIds.map(i => i.id);
    where.OR = [
      ...(investmentIds.length > 0
        ? [{ entityId: { in: investmentIds }, entityType: 'investment' } as Prisma.AuditLogWhereInput]
        : []),
      {
        user: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, email: true } } },
    take: 5000,
  });

  const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Description'];
  const rows = logs.map(log => [
    log.createdAt.toISOString(),
    log.user?.fullName || 'System',
    log.user?.email || '',
    log.actionType,
    log.entityType,
    log.entityId || '',
    log.ipAddress || '',
    log.description || '',
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
  return res.send(csv);
}
