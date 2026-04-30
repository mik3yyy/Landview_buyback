-- Add 'reviewed' to ApplicationStatus enum
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'reviewed';

-- Add 'pending_review' to InvestmentStatus enum
ALTER TYPE "InvestmentStatus" ADD VALUE IF NOT EXISTS 'pending_review';
