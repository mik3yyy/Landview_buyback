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
    ];
  }
  if (start_date || end_date) {
    where.transactionDate = {};
    if (start_date) where.transactionDate.gte = new Date(start_date);
    if (end_date) where.transactionDate.lte = new Date(end_date);
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
  const { new_duration, new_interest_rate } = req.body;

  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: 'Investment not found' });
  if (existing.status === 'completed') return res.status(400).json({ error: 'Cannot extend completed investment' });

  const newInterestRate = new_interest_rate ? parseFloat(new_interest_rate) : Number(existing.interestRate);
  const newMaturityDate = calculateMaturityDate(existing.maturityDate, new_duration);
  const newRoi = calculateROI(Number(existing.principal), newInterestRate);
  const newMaturityAmount = calculateMaturityAmount(Number(existing.principal), newRoi, Number(existing.upfrontPayment || 0));

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
        duration: `${existing.duration} + ${new_duration}`,
        maturityDate: newMaturityDate,
        interestRate: newInterestRate,
        roiAmount: newRoi,
        maturityAmount: newMaturityAmount,
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

  // Next calendar month
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);

  const activeStatuses = { in: ['active', 'extended'] as any[] };
  const investmentSelect = {
    id: true, clientName: true, plotNumber: true, principal: true,
    maturityAmount: true, maturityDate: true, status: true, realtorName: true,
  } as const;

  const [
    totalActive,
    totalCompleted,
    totalExtended,
    pendingPayment,
    maturingThisWeek,
    overdueInvestments,
    totalActiveValue,
    recentInvestments,
    investmentsToday,
    urgentInvestments,
    maturingIn7Days,
    maturingNextMonth,
  ] = await Promise.all([
    prisma.investment.count({ where: { status: 'active' } }),
    prisma.investment.count({ where: { status: 'completed' } }),
    prisma.investment.count({ where: { status: 'extended' } }),
    prisma.investment.count({ where: { status: 'payment_initiated' } }),
    prisma.investment.count({
      where: { maturityDate: { gte: today, lte: sevenDaysOut }, status: activeStatuses },
    }),
    prisma.investment.count({
      where: { maturityDate: { lt: today }, status: activeStatuses },
    }),
    prisma.investment.aggregate({
      where: { status: activeStatuses },
      _sum: { maturityAmount: true },
    }),
    prisma.investment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: investmentSelect,
    }),
    prisma.investment.findMany({
      where: {
        OR: [
          { transactionDate: { gte: today, lte: todayEnd } },
          { maturityDate: { gte: today, lte: todayEnd } },
        ],
      },
      orderBy: { maturityDate: 'asc' },
      select: { ...investmentSelect, transactionDate: true },
    }),
    // Urgent: overdue OR maturing within 3 days OR payment initiated
    prisma.investment.findMany({
      where: {
        OR: [
          { maturityDate: { lt: today }, status: activeStatuses },
          { maturityDate: { gte: today, lt: urgentCutoff }, status: activeStatuses },
          { status: 'payment_initiated' },
        ],
      },
      orderBy: { maturityDate: 'asc' },
      select: investmentSelect,
    }),
    // Maturing within next 7 days
    prisma.investment.findMany({
      where: { maturityDate: { gte: today, lte: sevenDaysOut }, status: activeStatuses },
      orderBy: { maturityDate: 'asc' },
      select: investmentSelect,
    }),
    // Maturing in the next calendar month
    prisma.investment.findMany({
      where: { maturityDate: { gte: nextMonthStart, lte: nextMonthEnd }, status: activeStatuses },
      orderBy: { maturityDate: 'asc' },
      select: investmentSelect,
    }),
  ]);

  return res.json({
    totalActive,
    totalCompleted,
    totalExtended,
    pendingPayment,
    maturingThisWeek,
    overdueInvestments,
    totalActiveValue: totalActiveValue._sum.maturityAmount || 0,
    recentInvestments,
    investmentsToday,
    urgentInvestments,
    maturingIn7Days,
    maturingNextMonth,
  });
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
