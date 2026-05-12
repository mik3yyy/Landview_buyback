-- Add terminated to InvestmentStatus enum
ALTER TYPE "InvestmentStatus" ADD VALUE 'terminated';

-- Add TERMINATE_INVESTMENT to ActionType enum
ALTER TYPE "ActionType" ADD VALUE 'TERMINATE_INVESTMENT';

-- Add termination fields to investments table
ALTER TABLE "investments"
  ADD COLUMN "terminationReason"      TEXT,
  ADD COLUMN "terminationExitAmount"  DECIMAL(15,2),
  ADD COLUMN "terminatedAt"           TIMESTAMP(3),
  ADD COLUMN "terminatedBy"           TEXT;
