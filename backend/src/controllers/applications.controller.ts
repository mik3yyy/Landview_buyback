import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { createAuditLog } from '../utils/auditLogger';
import {
  calculateMaturityDate,
  calculateROI,
  calculateMaturityAmount,
} from '../utils/calculations';
import { ApplicationStatus } from '@prisma/client';

// POST /api/applications  — public, no auth
export async function submitApplication(req: Request, res: Response) {
  try {
    const data = req.body;

    const application = await prisma.clientApplication.create({
      data: {
        title: data.title || null,
        surname: data.surname,
        otherNames: data.otherNames,
        dateOfBirth: data.dateOfBirth || null,
        sex: data.sex || null,
        maritalStatus: data.maritalStatus || null,
        nationality: data.nationality || null,
        countryOfResidence: data.countryOfResidence || null,
        phoneNumber: data.phoneNumber,
        alternativePhone: data.alternativePhone || null,
        clientEmail: data.clientEmail || null,
        correspondenceAddress: data.correspondenceAddress || null,
        correspondenceCity: data.correspondenceCity || null,
        correspondenceState: data.correspondenceState || null,
        permanentAddress: data.permanentAddress || null,
        permanentCity: data.permanentCity || null,
        permanentState: data.permanentState || null,
        country: data.country || null,
        isCorporate: data.isCorporate || false,
        corporateName: data.corporateName || null,
        corporateAddress: data.corporateAddress || null,
        nextOfKinName: data.nextOfKinName || null,
        nextOfKinEmail: data.nextOfKinEmail || null,
        nextOfKinPhone: data.nextOfKinPhone || null,
        duration: data.duration,
        principal: data.principal,
        wantsUpfront: data.wantsUpfront || false,
        paymentMode: data.paymentMode || null,
        accountName: data.accountName || null,
        accountNumber: data.accountNumber || null,
        bankName: data.bankName || null,
        sourceOfFunds: data.sourceOfFunds ? JSON.stringify(data.sourceOfFunds) : null,
        realtorName: data.realtorName || null,
        realtorEmail: data.realtorEmail || null,
        realtorPhone: data.realtorPhone || null,
        agreedToTerms: data.agreedToTerms || false,
        clientMessage: data.clientMessage || null,
        status: 'pending',
      },
    });

    return res.status(201).json({ id: application.id, message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to submit application' });
  }
}

// GET /api/applications/:id/status  — public, client status check
export async function getApplicationStatus(req: Request, res: Response) {
  const { id } = req.params;
  const application = await prisma.clientApplication.findUnique({
    where: { id },
    select: {
      id: true, status: true, rejectionReason: true, submittedAt: true, updatedAt: true,
      title: true, surname: true, otherNames: true, dateOfBirth: true, sex: true,
      maritalStatus: true, nationality: true, countryOfResidence: true,
      phoneNumber: true, alternativePhone: true, clientEmail: true,
      correspondenceAddress: true, correspondenceCity: true, correspondenceState: true,
      permanentAddress: true, permanentCity: true, permanentState: true, country: true,
      isCorporate: true, corporateName: true, corporateAddress: true,
      nextOfKinName: true, nextOfKinEmail: true, nextOfKinPhone: true,
      duration: true, principal: true, wantsUpfront: true,
      paymentMode: true, accountName: true, accountNumber: true, bankName: true,
      sourceOfFunds: true, realtorName: true, realtorEmail: true, realtorPhone: true,
      agreedToTerms: true, clientMessage: true,
    },
  });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  return res.json(application);
}

// PUT /api/applications/:id/edit  — public, client edits pending or rejected application
export async function editApplication(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const app = await prisma.clientApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (!['pending', 'rejected'].includes(app.status)) {
      return res.status(400).json({ error: 'Only pending or rejected applications can be edited' });
    }

    const wasRejected = app.status === 'rejected';
    await prisma.clientApplication.update({
      where: { id },
      data: {
        ...buildUpdateData(req.body),
        ...(wasRejected ? { status: 'pending', rejectionReason: null, reviewedBy: null, reviewedAt: null } : {}),
      },
    });
    return res.json({ message: wasRejected ? 'Application updated and resubmitted' : 'Application updated' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update application' });
  }
}

// PUT /api/applications/:id/resubmit  — public, client resubmits after rejection
export async function resubmitApplication(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const app = await prisma.clientApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status !== 'rejected') return res.status(400).json({ error: 'Only rejected applications can be resubmitted' });

    const data = req.body;
    await prisma.clientApplication.update({
      where: { id },
      data: {
        ...buildUpdateData(data),
        status: 'pending',
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });
    return res.json({ message: 'Application resubmitted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to resubmit application' });
  }
}

// GET /api/applications  — admin
export async function listApplications(req: AuthRequest, res: Response) {
  const { status, page = '1', limit = '20', search } = req.query as Record<string, string>;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = status as ApplicationStatus;
  if (search) {
    where.OR = [
      { surname: { contains: search, mode: 'insensitive' } },
      { otherNames: { contains: search, mode: 'insensitive' } },
      { phoneNumber: { contains: search, mode: 'insensitive' } },
      { clientEmail: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [applications, total, pendingCount] = await Promise.all([
    prisma.clientApplication.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true, title: true, surname: true, otherNames: true, phoneNumber: true,
        clientEmail: true, duration: true, principal: true, status: true,
        rejectionReason: true, submittedAt: true, updatedAt: true,
        reviewer: { select: { fullName: true } },
      },
    }),
    prisma.clientApplication.count({ where }),
    prisma.clientApplication.count({ where: { status: 'pending' } }),
  ]);

  return res.json({ applications, total, pendingCount, page: pageNum, totalPages: Math.ceil(total / limitNum) });
}

// GET /api/applications/:id  — admin full detail
export async function getApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const application = await prisma.clientApplication.findUnique({
    where: { id },
    include: {
      reviewer: { select: { fullName: true, email: true } },
      investment: { select: { id: true, plotNumber: true, status: true, maturityDate: true } },
    },
  });
  if (!application) return res.status(404).json({ error: 'Application not found' });
  return res.json(application);
}

// POST /api/applications/:id/review  — admin marks application as reviewed
export async function reviewApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  try {
    const app = await prisma.clientApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status !== 'pending' && app.status !== 'rejected') {
      return res.status(400).json({ error: 'Only pending or resubmitted applications can be marked as reviewed' });
    }

    await prisma.clientApplication.update({
      where: { id },
      data: {
        status: 'reviewed',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      actionType: 'APPLICATION_APPROVED',
      entityType: 'application',
      entityId: id,
      description: `Marked application for ${app.surname} ${app.otherNames} as reviewed — awaiting super admin approval`,
    });

    return res.json({ message: 'Application marked as reviewed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to mark application as reviewed' });
  }
}

// POST /api/applications/:id/reject  — super admin only
export async function rejectApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const app = await prisma.clientApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status === 'converted') return res.status(400).json({ error: 'Cannot reject a converted application' });

    await prisma.clientApplication.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason || null,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      actionType: 'APPLICATION_REJECTED',
      entityType: 'application',
      entityId: id,
      description: `Rejected application for ${app.surname} ${app.otherNames}. Reason: ${reason || 'none'}`,
    });

    return res.json({ message: 'Application rejected' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to reject application' });
  }
}

// POST /api/applications/:id/approve  — admin, converts to investment
export async function approveApplication(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const {
    plotNumber,
    transactionDate,
    clientName,
    realtorName,
    realtorEmail,
    duration,
    principal,
    interestRate,
    upfrontPayment,
  } = req.body;

  try {
    const app = await prisma.clientApplication.findUnique({ where: { id } });
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status === 'converted') return res.status(400).json({ error: 'Already converted to investment' });

    const txDate = new Date(transactionDate);
    const maturityDate = calculateMaturityDate(txDate, duration);
    const rate = parseFloat(interestRate);
    const principalNum = parseFloat(principal);
    const roiAmount = calculateROI(principalNum, rate);
    const upfront = upfrontPayment ? parseFloat(upfrontPayment) : null;
    const maturityAmount = calculateMaturityAmount(principalNum, roiAmount, upfront || 0);

    const [investment] = await prisma.$transaction([
      prisma.investment.create({
        data: {
          transactionDate: txDate,
          clientName,
          plotNumber: plotNumber || '',
          duration,
          maturityDate,
          principal: principalNum,
          interestRate: rate,
          roiAmount,
          upfrontPayment: upfront,
          maturityAmount,
          clientEmail: app.clientEmail,
          realtorName: realtorName || app.realtorName || '',
          realtorEmail: realtorEmail || app.realtorEmail || '',
          status: 'active',
          createdBy: req.user!.id,
        },
      }),
    ]);

    await prisma.clientApplication.update({
      where: { id },
      data: {
        status: 'converted',
        investmentId: investment.id,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await createAuditLog({
      userId: req.user!.id,
      actionType: 'APPLICATION_APPROVED',
      entityType: 'application',
      entityId: id,
      description: `Approved application for ${app.surname} ${app.otherNames} → Investment ${investment.id}`,
    });

    return res.json({ message: 'Application approved and investment created', investmentId: investment.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to approve application' });
  }
}

function buildUpdateData(data: any) {
  return {
    title: data.title || null,
    surname: data.surname,
    otherNames: data.otherNames,
    dateOfBirth: data.dateOfBirth || null,
    sex: data.sex || null,
    maritalStatus: data.maritalStatus || null,
    nationality: data.nationality || null,
    countryOfResidence: data.countryOfResidence || null,
    phoneNumber: data.phoneNumber,
    alternativePhone: data.alternativePhone || null,
    clientEmail: data.clientEmail || null,
    correspondenceAddress: data.correspondenceAddress || null,
    correspondenceCity: data.correspondenceCity || null,
    correspondenceState: data.correspondenceState || null,
    permanentAddress: data.permanentAddress || null,
    permanentCity: data.permanentCity || null,
    permanentState: data.permanentState || null,
    country: data.country || null,
    isCorporate: data.isCorporate || false,
    corporateName: data.corporateName || null,
    corporateAddress: data.corporateAddress || null,
    nextOfKinName: data.nextOfKinName || null,
    nextOfKinEmail: data.nextOfKinEmail || null,
    nextOfKinPhone: data.nextOfKinPhone || null,
    duration: data.duration,
    principal: data.principal,
    wantsUpfront: data.wantsUpfront || false,
    paymentMode: data.paymentMode || null,
    accountName: data.accountName || null,
    accountNumber: data.accountNumber || null,
    bankName: data.bankName || null,
    sourceOfFunds: data.sourceOfFunds ? JSON.stringify(data.sourceOfFunds) : null,
    realtorName: data.realtorName || null,
    realtorEmail: data.realtorEmail || null,
    realtorPhone: data.realtorPhone || null,
    agreedToTerms: data.agreedToTerms || false,
    clientMessage: data.clientMessage || null,
  };
}
