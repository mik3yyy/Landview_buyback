import { Request } from 'express';
import prisma from '../config/database';
import { ActionType } from '@prisma/client';

interface AuditLogParams {
  userId?: string;
  actionType: ActionType;
  entityType: string;
  entityId?: string;
  oldValues?: object;
  newValues?: object;
  description?: string;
  req?: Request;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const ipAddress = params.req
      ? (params.req.ip || params.req.connection.remoteAddress || 'unknown')
      : undefined;
    const userAgent = params.req ? params.req.get('user-agent') : undefined;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: params.oldValues ? params.oldValues as any : undefined,
        newValues: params.newValues ? params.newValues as any : undefined,
        ipAddress,
        userAgent,
        description: params.description,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
