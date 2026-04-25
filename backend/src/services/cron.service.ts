import cron from 'node-cron';
import prisma from '../config/database';
import {
  sendMaturityNotification,
  sendDailyPaymentDueList,
  sendWeeklyReminder,
} from './email.service';
import { createAuditLog } from '../utils/auditLogger';

export function initCronJobs() {
  // Daily at 8:00 AM — notify clients of maturing investments + send super admin summary
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const maturingToday = await prisma.investment.findMany({
        where: {
          maturityDate: { gte: today, lt: tomorrow },
          status: 'active',
        },
      });

      // Notify each client
      for (const inv of maturingToday) {
        if (inv.clientEmail) {
          try {
            await sendMaturityNotification({
              clientName: inv.clientName,
              clientEmail: inv.clientEmail,
              realtorEmail: inv.realtorEmail,
              plotNumber: inv.plotNumber,
              principal: Number(inv.principal),
              maturityAmount: Number(inv.maturityAmount),
              maturityDate: inv.maturityDate,
              interestRate: Number(inv.interestRate),
              roiAmount: Number(inv.roiAmount),
            });
            await createAuditLog({
              actionType: 'EMAIL_SENT',
              entityType: 'investment',
              entityId: inv.id,
              description: `Maturity notification sent to ${inv.clientEmail}`,
            });
          } catch (err) {
            console.error(`Failed to send maturity email for investment ${inv.id}:`, err);
          }
        }
      }

      // Send daily summary to super admins
      const superAdmins = await prisma.user.findMany({
        where: { role: 'super_admin', isActive: true },
      });
      if (superAdmins.length > 0 && maturingToday.length > 0) {
        await sendDailyPaymentDueList(
          superAdmins.map(u => u.email),
          maturingToday
        );
      }
    } catch (err) {
      console.error('Daily cron job failed:', err);
    }
  });

  // Weekly on Monday at 8:00 AM — summary to admins
  cron.schedule('0 8 * * 1', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const maturingThisWeek = await prisma.investment.findMany({
        where: {
          maturityDate: { gte: today, lt: nextWeek },
          status: 'active',
        },
      });

      const pendingPayments = await prisma.investment.findMany({
        where: { status: 'payment_initiated' },
      });

      const adminUsers = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'super_admin'] },
          isActive: true,
        },
      });

      if (adminUsers.length > 0) {
        await sendWeeklyReminder(
          adminUsers.map(u => u.email),
          maturingThisWeek,
          pendingPayments
        );
      }
    } catch (err) {
      console.error('Weekly cron job failed:', err);
    }
  });

  console.log('Cron jobs initialized');
}
