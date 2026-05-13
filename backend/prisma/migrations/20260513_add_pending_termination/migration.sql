-- Add pending_termination status for the admin → super admin approve workflow
ALTER TYPE "InvestmentStatus" ADD VALUE 'pending_termination';

-- Track the previous status so termination can be cancelled / reverted
ALTER TABLE "investments" ADD COLUMN "previousStatus" TEXT;
