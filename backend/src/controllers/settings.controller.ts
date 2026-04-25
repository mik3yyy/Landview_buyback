import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export async function getSettings(req: AuthRequest, res: Response) {
  const settings = await prisma.systemSetting.findMany();
  const obj = settings.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  return res.json(obj);
}

export async function updateSettings(req: AuthRequest, res: Response) {
  const { settings } = req.body as { settings: Record<string, string> };

  const updates = await Promise.all(
    Object.entries(settings).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value, updatedBy: req.user!.id },
        create: { key, value, updatedBy: req.user!.id },
      })
    )
  );

  return res.json({ message: 'Settings updated', count: updates.length });
}
