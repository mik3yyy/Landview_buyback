-- Pending states for admin-initiated extension and deletion (super admin must confirm)
ALTER TYPE "InvestmentStatus" ADD VALUE 'pending_extension';
ALTER TYPE "InvestmentStatus" ADD VALUE 'pending_deletion';

-- Store the proposed extension details while awaiting super admin approval
ALTER TABLE "investments" ADD COLUMN "pendingExtensionData" JSONB;

-- Passport photo for client applications
ALTER TABLE "client_applications" ADD COLUMN "passportPhotoUrl" TEXT;
