import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/auditLogger';
import {
  calculateMaturityDate,
  calculateROI,
  calculateMaturityAmount,
  calculateDaysUntilMaturity,
} from '../utils/calculations';
import {
  sendExtensionConfirmation,
  sendPaymentCompletion,
  sendMaturityReminderEmail,
} from '../services/email.service';
import { Prisma, InvestmentStatus } from '@prisma/client';

export async function listInvestments(req: AuthRequest, res: Response) {
  const {
    status,
    search,
    sort_by = 'createdAt',
    order = 'desc',
    page = '1',
    limit = '20',
    start_date,
    end_date,
    maturity_start,
    maturity_end,
    client_email,
    realtor_email,
    has_upfront_payment,
  } = req.query as Record<string, string>;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where: Prisma.InvestmentWhereInput = {};

  if (status) where.status = status as InvestmentStatus;
  if (search) {
    where.OR = [
      { clientName: { contains: search, mode: 'insensitive' } },
      { plotNumber: { contains: search, mode: 'insensitive' } },
      { realtorName: { contains: search, mode: 'insensitive' } },
      { clientEmail: { contains: search, mode: 'insensitive' } },
      { realtorEmail: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (start_date || end_date) {
    where.transactionDate = {};
    if (start_date) (where.transactionDate as any).gte = new Date(start_date);
    if (end_date) {
      const end = new Date(end_date);
      end.setHours(23, 59, 59, 999);
      (where.transactionDate as any).lte = end;
    }
  }
  if (maturity_start || maturity_end) {
    where.maturityDate = {};
    if (maturity_start) (where.maturityDate as any).gte = new Date(maturity_start);
    if (maturity_end) {
      const end = new Date(maturity_end);
      end.setHours(23, 59, 59, 999);
      (where.maturityDate as any).lte = end;
    }
  }
  if (client_email) {
    where.clientEmail = { contains: client_email, mode: 'insensitive' };
  }
  if (realtor_email) {
    where.realtorEmail = { contains: realtor_email, mode: 'insensitive' };
  }
  if (has_upfront_payment === 'true') {
    where.upfrontPayment = { gt: 0 };
  }

  const validSortFields = ['createdAt', 'transactionDate', 'maturityDate', 'principal', 'clientName'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'createdAt';

  const [investments, total] = await Promise.all([
    prisma.investment.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { [sortField]: order === 'asc' ? 'asc' : 'desc' },
      include: {
        createdByUser: { select: { fullName: true, email: true } },
        paymentInitiatedUser: { select: { fullName: true } },
        paymentCompletedUser: { select: { fullName: true } },
      },
    }),
    prisma.investment.count({ where }),
  ]);

  const enriched = investments.map(inv => ({
    ...inv,
    daysUntilMaturity: calculateDaysUntilMaturity(inv.maturityDate),
  }));

  return res.json({
    investments: enriched,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}

export async function getInvestment(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const investment = await prisma.investment.findUnique({
    where: { id },
    include: {
      createdByUser: { select: { fullName: true, email: true } },
      paymentInitiatedUser: { select: { fullName: true } },
      paymentCompletedUser: { select: { fullName: true } },
      extensions: { orderBy: { extendedAt: 'desc' } },
      application: { select: { id: true } },
    },
  });

  if (!investment) return res.status(404).json({ error: 'Investment not found' });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: id, entityType: 'investment' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { fullName: true } } },
  });

  return res.json({
    ...investment,
    auditLogs,
    daysUntilMaturity: calculateDaysUntilMaturity(investment.maturityDate),
  });
}

export async function createInvestment(req: AuthRequest, res: Response) {
  const {
    transactionDate,
    clientName,
    plotNumber,
    duration,
    principal,
    interestRate,
    upfrontPayment,
    clientEmail,
    realtorName,
    realtorEmail,
  } = req.body;

  const txDate = new Date(transactionDate);
  const principalNum = parseFloat(principal);
  const interestRateNum = parseFloat(interestRate);
  const upfrontNum = upfrontPayment ? parseFloat(upfrontPayment) : 0;

  const maturityDate = calculateMaturityDate(txDate, duration);
  const roiAmount = calculateROI(principalNum, interestRateNum);
  const maturityAmount = calculateMaturityAmount(principalNum, roiAmount, upfrontNum);

  const isSuperAdmin = req.user!.role === 'super_admin';

  const investment = await prisma.investment.create({
    data: {
      transactionDate: txDate,
      clientName,
      plotNumber,
      duration,
      maturityDate,
      principal: principalNum,
      interestRate: interestRateNum,
      roiAmount,
      upfrontPayment: upfrontNum > 0 ? upfrontNum : null,
      maturityAmount,
      clientEmail,
      realtorName,
      realtorEmail,
      status: isSuperAdmin ? 'active' : 'pending_review',
      createdBy: req.user!.id,
    },
    include: { createdByUser: { select: { fullName: true } } },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'CREATE_INVESTMENT',
    entityType: 'investment',
    entityId: investment.id,
    newValues: { clientName, plotNumber, principal: principalNum, maturityAmount },
    req,
  });

  return res.status(201).json({ ...investment, daysUntilMaturity: calculateDaysUntilMaturity(maturityDate) });
}

// POST /api/investments/:id/approve — super admin approves a pending_review investment
export async function approveInvestment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });
  if (existing.status !== 'pending_review') return res.status(400).json({ error: 'Investment is not pending review' });

  const updated = await prisma.investment.update({
    where: { id },
    data: { status: 'active' },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'UPDATE_INVESTMENT',
    entityType: 'investment',
    entityId: id,
    description: `Approved investment for ${existing.clientName} — now active`,
    req,
  });

  return res.json(updated);
}

export async function updateInvestment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'Cannot edit completed investment' });

  const {
    transactionDate,
    clientName,
    plotNumber,
    duration,
    principal,
    interestRate,
    upfrontPayment,
    clientEmail,
    realtorName,
    realtorEmail,
  } = req.body;

  const txDate = transactionDate ? new Date(transactionDate) : existing.transactionDate;
  const principalNum = principal ? parseFloat(principal) : Number(existing.principal);
  const interestRateNum = interestRate ? parseFloat(interestRate) : Number(existing.interestRate);
  const dur = duration || existing.duration;
  const upfrontNum = upfrontPayment !== undefined ? parseFloat(upfrontPayment) : Number(existing.upfrontPayment || 0);

  const maturityDate = calculateMaturityDate(txDate, dur);
  const roiAmount = calculateROI(principalNum, interestRateNum);
  const maturityAmount = calculateMaturityAmount(principalNum, roiAmount, upfrontNum);

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      transactionDate: txDate,
      clientName: clientName || existing.clientName,
      plotNumber: plotNumber || existing.plotNumber,
      duration: dur,
      maturityDate,
      principal: principalNum,
      interestRate: interestRateNum,
      roiAmount,
      upfrontPayment: upfrontNum > 0 ? upfrontNum : null,
      maturityAmount,
      clientEmail: clientEmail !== undefined ? clientEmail : existing.clientEmail,
      realtorName: realtorName || existing.realtorName,
      realtorEmail: realtorEmail || existing.realtorEmail,
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'UPDATE_INVESTMENT',
    entityType: 'investment',
    entityId: id,
    oldValues: {
      principal: existing.principal,
      interestRate: existing.interestRate,
      duration: existing.duration,
      maturityDate: existing.maturityDate,
    },
    newValues: { principal: principalNum, interestRate: interestRateNum, duration: dur, maturityDate },
    req,
  });

  return res.json({ ...updated, daysUntilMaturity: calculateDaysUntilMaturity(updated.maturityDate) });
}

export async function extendInvestment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { new_duration, new_interest_rate, new_principal } = req.body;

  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'Cannot extend completed investment' });

  const newInterestRate = new_interest_rate ? parseFloat(new_interest_rate) : Number(existing.interestRate);
  // Support partial withdrawal: new_principal overrides existing principal
  const principalToUse = new_principal ? parseFloat(new_principal) : Number(existing.principal);
  const newMaturityDate = calculateMaturityDate(new Date(), new_duration);
  const newRoi = calculateROI(principalToUse, newInterestRate);
  const newMaturityAmount = calculateMaturityAmount(principalToUse, newRoi, 0);

  const [extension, updated] = await prisma.$transaction([
    prisma.investmentExtension.create({
      data: {
        investmentId: id,
        previousDuration: existing.duration,
        newDuration: new_duration,
        previousMaturityDate: existing.maturityDate,
        newMaturityDate,
        previousInterestRate: existing.interestRate,
        newInterestRate: newInterestRate,
        extendedBy: req.user!.id,
      },
    }),
    prisma.investment.update({
      where: { id },
      data: {
        duration: new_duration,
        principal: principalToUse,
        maturityDate: newMaturityDate,
        interestRate: newInterestRate,
        roiAmount: newRoi,
        maturityAmount: newMaturityAmount,
        upfrontPayment: null,
        clientIntention: null,
        clientIntentionMessage: null,
        clientIntentionAt: null,
        status: 'extended',
      },
    }),
  ]);

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'EXTEND_INVESTMENT',
    entityType: 'investment',
    entityId: id,
    oldValues: { duration: existing.duration, maturityDate: existing.maturityDate },
    newValues: { newDuration: new_duration, newMaturityDate },
    req,
  });

  if (existing.clientEmail) {
    try {
      await sendExtensionConfirmation({
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        plotNumber: existing.plotNumber,
        newMaturityDate,
        newDuration: new_duration,
        newInterestRate,
        newMaturityAmount,
      });
    } catch (err) {
      console.error('Failed to send extension email:', err);
    }
  }

  return res.json({ ...updated, daysUntilMaturity: calculateDaysUntilMaturity(updated.maturityDate) });
}

export async function markPaymentInitiated(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'Already completed' });

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      status: 'payment_initiated',
      paymentInitiatedBy: req.user!.id,
      paymentInitiatedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'PAYMENT_INITIATED',
    entityType: 'investment',
    entityId: id,
    req,
  });

  return res.json(updated);
}

export async function markPaymentCompleted(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });

  const updated = await prisma.investment.update({
    where: { id },
    data: {
      status: 'completed',
      paymentCompletedBy: req.user!.id,
      paymentCompletedAt: new Date(),
    },
  });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'PAYMENT_COMPLETED',
    entityType: 'investment',
    entityId: id,
    req,
  });

  if (existing.clientEmail) {
    try {
      await sendPaymentCompletion({
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        plotNumber: existing.plotNumber,
        amountPaid: Number(existing.maturityAmount),
        completedDate: new Date(),
      });
    } catch (err) {
      console.error('Failed to send payment completion email:', err);
    }
  }

  return res.json(updated);
}

export async function deleteInvestment(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'DELETE_INVESTMENT',
    entityType: 'investment',
    entityId: id,
    oldValues: { clientName: existing.clientName, plotNumber: existing.plotNumber, principal: existing.principal },
    req,
  });

  await prisma.investment.delete({ where: { id } });
  return res.json({ message: 'Investment deleted' });
}

export async function getDashboardStats(req: AuthRequest, res: Response) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const urgentCutoff = new Date(today);
  urgentCutoff.setDate(urgentCutoff.getDate() + 3);

  const sevenDaysOut = new Date(today);
  sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
  sevenDaysOut.setHours(23, 59, 59, 999);

  const fourWeeksOut = new Date(today);
  fourWeeksOut.setDate(fourWeeksOut.getDate() + 28);
  fourWeeksOut.setHours(23, 59, 59, 999);

  // Next calendar month
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);

  // Upfront is due 42 days (6 weeks) after transaction date
  // "Due today" → transactionDate was exactly 42 days ago
  const upfrontDueTodayTxStart = new Date(today); upfrontDueTodayTxStart.setDate(today.getDate() - 42);
  const upfrontDueTodayTxEnd = new Date(todayEnd); upfrontDueTodayTxEnd.setDate(todayEnd.getDate() - 42);
  // "Due this week" → transactionDate between 42 and 35 days ago (upfront due 0-7 days from now)
  const upfrontDueWeekTxStart = new Date(today); upfrontDueWeekTxStart.setDate(today.getDate() - 42);
  const upfrontDueWeekTxEnd = new Date(todayEnd); upfrontDueWeekTxEnd.setDate(todayEnd.getDate() - 35);

  const activeStatuses = { in: ['active', 'extended'] as any[] };
  const investmentSelect = {
    id: true, clientName: true, plotNumber: true, principal: true,
    maturityAmount: true, maturityDate: true, status: true, realtorName: true,
  } as const;
  const upfrontSelect = {
    id: true, clientName: true, plotNumber: true, principal: true, upfrontPayment: true,
    maturityAmount: true, transactionDate: true, maturityDate: true, status: true,
    upfrontPaidAt: true, clientEmail: true,
  } as const;

  const [
    totalActive, totalCompleted, totalExtended, pendingPayment,
    maturingThisWeek, overdueInvestments, totalActiveValue,
    recentInvestments, investmentsToday, urgentInvestments,
    maturingIn7Days, maturingNextMonth,
    maturingToday, upfrontDueToday, upfrontDueThisWeek,
    clientIntentions, maturingIn4WeeksCount, maturingIn4Weeks,
  ] = await Promise.all([
    prisma.investment.count({ where: { status: 'active' } }),
    prisma.investment.count({ where: { status: 'completed' } }),
    prisma.investment.count({ where: { status: 'extended' } }),
    prisma.investment.count({ where: { status: 'payment_initiated' } }),
    prisma.investment.count({ where: { maturityDate: { gte: today, lte: sevenDaysOut }, status: activeStatuses } }),
    prisma.investment.count({ where: { maturityDate: { lt: today }, status: activeStatuses } }),
    prisma.investment.aggregate({ where: { status: activeStatuses }, _sum: { maturityAmount: true } }),
    prisma.investment.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: investmentSelect }),
    prisma.investment.findMany({
      where: { OR: [{ transactionDate: { gte: today, lte: todayEnd } }, { maturityDate: { gte: today, lte: todayEnd } }] },
      orderBy: { maturityDate: 'asc' },
      select: { ...investmentSelect, transactionDate: true },
    }),
    prisma.investment.findMany({
      where: {
        OR: [
          { maturityDate: { lt: today }, status: activeStatuses },
          { maturityDate: { gte: today, lt: urgentCutoff }, status: activeStatuses },
          { status: 'payment_initiated' },
        ],
      },
      orderBy: { maturityDate: 'asc' }, select: investmentSelect,
    }),
    prisma.investment.findMany({
      where: { maturityDate: { gte: today, lte: sevenDaysOut }, status: activeStatuses },
      orderBy: { maturityDate: 'asc' }, select: investmentSelect,
    }),
    prisma.investment.findMany({
      where: { maturityDate: { gte: nextMonthStart, lte: nextMonthEnd }, status: activeStatuses },
      orderBy: { maturityDate: 'asc' }, select: investmentSelect,
    }),
    // Maturing exactly today
    prisma.investment.findMany({
      where: { maturityDate: { gte: today, lte: todayEnd }, status: activeStatuses },
      orderBy: { maturityDate: 'asc' }, select: investmentSelect,
    }),
    // Upfront due today (transaction was 42 days ago)
    prisma.investment.findMany({
      where: {
        upfrontPayment: { gt: 0 },
        upfrontPaidAt: null,
        transactionDate: { gte: upfrontDueTodayTxStart, lte: upfrontDueTodayTxEnd },
        status: activeStatuses,
      },
      orderBy: { transactionDate: 'asc' }, select: upfrontSelect,
    }),
    // Upfront due this week (transaction 35–42 days ago)
    prisma.investment.findMany({
      where: {
        upfrontPayment: { gt: 0 },
        upfrontPaidAt: null,
        transactionDate: { gte: upfrontDueWeekTxStart, lte: upfrontDueWeekTxEnd },
        status: activeStatuses,
      },
      orderBy: { transactionDate: 'asc' }, select: upfrontSelect,
    }),
    // Clients who responded to maturity reminder
    prisma.investment.findMany({
      where: { clientIntention: { not: null }, status: activeStatuses },
      orderBy: { clientIntentionAt: 'desc' },
      select: {
        id: true, clientName: true, plotNumber: true, principal: true, maturityAmount: true,
        maturityDate: true, status: true, clientIntention: true, clientIntentionMessage: true,
        clientIntentionAt: true,
      },
    }),
    // Count investments maturing in < 4 weeks with email (for send-reminders button)
    prisma.investment.count({
      where: {
        maturityDate: { gte: today, lte: fourWeeksOut },
        status: activeStatuses,
        clientEmail: { not: null },
      },
    }),
    // List of investments maturing in < 4 weeks with email (preview before sending)
    prisma.investment.findMany({
      where: {
        maturityDate: { gte: today, lte: fourWeeksOut },
        status: activeStatuses,
        clientEmail: { not: null },
      },
      orderBy: { maturityDate: 'asc' },
      select: investmentSelect,
    }),
  ]);

  return res.json({
    totalActive, totalCompleted, totalExtended, pendingPayment,
    maturingThisWeek, overdueInvestments,
    totalActiveValue: totalActiveValue._sum.maturityAmount || 0,
    recentInvestments, investmentsToday, urgentInvestments,
    maturingIn7Days, maturingNextMonth,
    maturingToday, upfrontDueToday, upfrontDueThisWeek,
    clientIntentions, maturingIn4WeeksCount, maturingIn4Weeks,
  });
}

// GET /api/investments/reminder-candidates
export async function getReminderCandidates(req: AuthRequest, res: Response) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fourWeeksOut = new Date(today); fourWeeksOut.setDate(today.getDate() + 28); fourWeeksOut.setHours(23, 59, 59, 999);

  const [candidates, responses] = await Promise.all([
    prisma.investment.findMany({
      where: {
        maturityDate: { gte: today, lte: fourWeeksOut },
        status: { in: ['active', 'extended'] as any[] },
        clientEmail: { not: null },
      },
      orderBy: { maturityDate: 'asc' },
      select: {
        id: true, clientName: true, clientEmail: true, plotNumber: true,
        principal: true, maturityAmount: true, maturityDate: true, status: true, realtorName: true,
      },
    }),
    prisma.investment.findMany({
      where: { clientIntention: { not: null }, status: { in: ['active', 'extended'] as any[] } },
      orderBy: { clientIntentionAt: 'desc' },
      select: {
        id: true, clientName: true, plotNumber: true, principal: true, maturityAmount: true,
        maturityDate: true, status: true, clientIntention: true, clientIntentionMessage: true,
        clientIntentionAt: true,
      },
    }),
  ]);

  return res.json({ candidates, responses });
}

// POST /api/investments/send-maturity-reminders
export async function sendMaturityReminders(req: AuthRequest, res: Response) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fourWeeksOut = new Date(today); fourWeeksOut.setDate(today.getDate() + 28); fourWeeksOut.setHours(23, 59, 59, 999);

  const { investmentIds } = req.body as { investmentIds?: string[] };

  const whereClause: any = investmentIds?.length
    ? { id: { in: investmentIds }, clientEmail: { not: null } }
    : {
        maturityDate: { gte: today, lte: fourWeeksOut },
        status: { in: ['active', 'extended'] as any[] },
        clientEmail: { not: null },
      };

  const investments = await prisma.investment.findMany({ where: whereClause });

  console.log(`[Reminders] Found ${investments.length} investment(s) to email`);

  let sent = 0;
  const errors: string[] = [];
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  for (const inv of investments) {
    try {
      const token = require('crypto').randomUUID();
      await prisma.investment.update({ where: { id: inv.id }, data: { responseToken: token } });
      const responseUrl = `${frontendUrl}/investment-response/${token}`;
      await sendMaturityReminderEmail({
        clientName: inv.clientName,
        clientEmail: inv.clientEmail!,
        realtorEmail: inv.realtorEmail || undefined,
        plotNumber: inv.plotNumber,
        principal: Number(inv.principal),
        maturityAmount: Number(inv.maturityAmount),
        maturityDate: inv.maturityDate,
        interestRate: Number(inv.interestRate),
        responseUrl,
      });
      sent++;
    } catch (err: any) {
      const msg = err?.message || String(err);
      errors.push(`${inv.clientEmail}: ${msg}`);
      console.error(`[Email] Failed for investment ${inv.id} (${inv.clientEmail}):`, msg);
    }
  }

  await createAuditLog({
    userId: req.user!.id,
    actionType: 'SEND_MATURITY_REMINDERS',
    entityType: 'investment',
    description: `Sent maturity reminder emails: ${sent} sent, ${errors.length} failed`,
    req,
  });

  return res.json({ sent, failed: errors.length, total: investments.length, errors });
}

// GET /api/investments/response/:token  — public
export async function getInvestmentByToken(req: AuthRequest, res: Response) {
  const { token } = req.params;
  const inv = await prisma.investment.findUnique({
    where: { responseToken: token },
    select: {
      id: true, clientName: true, plotNumber: true, principal: true,
      maturityAmount: true, maturityDate: true, duration: true,
      interestRate: true, roiAmount: true, upfrontPayment: true,
      clientIntention: true, clientIntentionAt: true,
    },
  });
  if (!inv) return res.status(404).json({ error: 'Invalid or expired link' });
  return res.json(inv);
}

// POST /api/investments/response/:token  — public
export async function submitClientIntention(req: AuthRequest, res: Response) {
  const { token } = req.params;
  const { intention, message } = req.body;
  if (!['extend', 'withdraw', 'partial'].includes(intention)) {
    return res.status(400).json({ error: 'Invalid intention' });
  }
  const inv = await prisma.investment.findUnique({ where: { responseToken: token } });
  if (!inv) return res.status(404).json({ error: 'Invalid or expired link' });

  await prisma.investment.update({
    where: { id: inv.id },
    data: { clientIntention: intention, clientIntentionMessage: message || null, clientIntentionAt: new Date() },
  });
  return res.json({ message: 'Response recorded. Thank you!' });
}

// POST /api/investments/:id/mark-upfront-paid
export async function markUpfrontPaid(req: AuthRequest, res: Response) {
  const { id } = req.params;
  await prisma.investment.update({ where: { id }, data: { upfrontPaidAt: new Date() } });
  await createAuditLog({
    userId: req.user!.id, actionType: 'MARK_UPFRONT_PAID',
    entityType: 'investment', entityId: id,
    description: 'Upfront payment marked as paid', req,
  });
  return res.json({ message: 'Upfront marked as paid' });
}

export async function bulkCreateInvestments(req: AuthRequest, res: Response) {
  const { investments } = req.body;
  if (!Array.isArray(investments) || investments.length === 0) {
    return res.status(400).json({ error: 'No investments provided' });
  }

  const created: any[] = [];
  const errors: { row: number; clientName: string; message: string }[] = [];

  for (let i = 0; i < investments.length; i++) {
    const row = investments[i];
    try {
      const txDate = new Date(row.transactionDate);
      if (isNaN(txDate.getTime())) throw new Error('Invalid transaction date');
      const principalNum = parseFloat(row.principal);
      if (isNaN(principalNum) || principalNum <= 0) throw new Error('Invalid principal');
      const interestRateNum = parseFloat(row.interestRate);
      if (isNaN(interestRateNum) || interestRateNum <= 0) throw new Error('Invalid interest rate');
      const upfrontNum = row.upfrontPayment ? parseFloat(row.upfrontPayment) : 0;

      const maturityDate = calculateMaturityDate(txDate, row.duration);
      const roiAmount = calculateROI(principalNum, interestRateNum);
      const maturityAmount = calculateMaturityAmount(principalNum, roiAmount, upfrontNum);

      const investment = await prisma.investment.create({
        data: {
          transactionDate: txDate,
          clientName: row.clientName,
          plotNumber: String(row.plotNumber),
          duration: row.duration,
          maturityDate,
          principal: principalNum,
          interestRate: interestRateNum,
          roiAmount,
          upfrontPayment: upfrontNum > 0 ? upfrontNum : null,
          maturityAmount,
          clientEmail: row.clientEmail || null,
          realtorName: row.realtorName,
          realtorEmail: row.realtorEmail,
          createdBy: req.user!.id,
        },
      });
      created.push(investment);
    } catch (err: any) {
      errors.push({ row: i + 1, clientName: row.clientName || `Row ${i + 1}`, message: err.message || 'Unknown error' });
    }
  }

  if (created.length > 0) {
    await createAuditLog({
      userId: req.user!.id,
      actionType: 'CREATE_INVESTMENT',
      entityType: 'investment',
      entityId: 'bulk',
      newValues: { bulkImport: true, count: created.length },
      description: `Bulk imported ${created.length} investment(s) from Excel`,
      req,
    });
  }

  return res.status(201).json({ created: created.length, errors });
}

export async function findDuplicates(req: AuthRequest, res: Response) {
  const investments = await prisma.investment.findMany({
    select: {
      id: true, clientName: true, plotNumber: true, clientEmail: true,
      principal: true, transactionDate: true, maturityDate: true,
      status: true, createdAt: true, maturityAmount: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  type Inv = typeof investments[0];
  const groups: { reason: string; investments: Inv[] }[] = [];
  const usedIds = new Set<string>();

  // Group by normalized clientName + plotNumber
  const byNamePlot = new Map<string, Inv[]>();
  for (const inv of investments) {
    const key = `${inv.clientName.toLowerCase().trim()}::${inv.plotNumber.toLowerCase().trim()}`;
    if (!byNamePlot.has(key)) byNamePlot.set(key, []);
    byNamePlot.get(key)!.push(inv);
  }
  for (const [, invs] of byNamePlot) {
    if (invs.length > 1) {
      groups.push({ reason: 'Same client name + plot number', investments: invs });
      invs.forEach(i => usedIds.add(i.id));
    }
  }

  // Group by clientEmail (non-null)
  const byEmail = new Map<string, Inv[]>();
  for (const inv of investments) {
    if (!inv.clientEmail) continue;
    const email = inv.clientEmail.toLowerCase().trim();
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email)!.push(inv);
  }
  for (const [email, invs] of byEmail) {
    if (invs.length > 1 && !invs.every(i => usedIds.has(i.id))) {
      groups.push({ reason: `Same client email (${email})`, investments: invs });
      invs.forEach(i => usedIds.add(i.id));
    }
  }

  return res.json({ groups, totalInvestments: investments.length, duplicatesFound: usedIds.size });
}

export async function exportInvestments(req: AuthRequest, res: Response) {
  const { status } = req.query as Record<string, string>;
  const where: any = {};
  if (status) where.status = status;

  const investments = await prisma.investment.findMany({
    where,
    include: { createdByUser: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const headers = [
    'ID', 'Client Name', 'Plot Number', 'Transaction Date', 'Duration',
    'Maturity Date', 'Principal', 'Interest Rate', 'ROI', 'Upfront Payment',
    'Maturity Amount', 'Status', 'Client Email', 'Realtor Name', 'Realtor Email',
    'Created By', 'Created At',
  ];

  const rows = investments.map(inv => [
    inv.id,
    inv.clientName,
    inv.plotNumber,
    inv.transactionDate.toISOString().split('T')[0],
    inv.duration,
    inv.maturityDate.toISOString().split('T')[0],
    Number(inv.principal),
    Number(inv.interestRate),
    Number(inv.roiAmount),
    Number(inv.upfrontPayment || 0),
    Number(inv.maturityAmount),
    inv.status,
    inv.clientEmail || '',
    inv.realtorName,
    inv.realtorEmail,
    inv.createdByUser.fullName,
    inv.createdAt.toISOString(),
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=investments.csv');
  return res.send(csvContent);
}
