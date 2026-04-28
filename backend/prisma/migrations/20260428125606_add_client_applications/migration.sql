-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'approved', 'rejected', 'converted');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActionType" ADD VALUE 'APPLICATION_SUBMITTED';
ALTER TYPE "ActionType" ADD VALUE 'APPLICATION_APPROVED';
ALTER TYPE "ActionType" ADD VALUE 'APPLICATION_REJECTED';

-- CreateTable
CREATE TABLE "client_applications" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "surname" TEXT NOT NULL,
    "otherNames" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "sex" TEXT,
    "maritalStatus" TEXT,
    "nationality" TEXT,
    "countryOfResidence" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "alternativePhone" TEXT,
    "clientEmail" TEXT,
    "correspondenceAddress" TEXT,
    "correspondenceCity" TEXT,
    "correspondenceState" TEXT,
    "permanentAddress" TEXT,
    "permanentCity" TEXT,
    "permanentState" TEXT,
    "country" TEXT,
    "isCorporate" BOOLEAN NOT NULL DEFAULT false,
    "corporateName" TEXT,
    "corporateAddress" TEXT,
    "nextOfKinName" TEXT,
    "nextOfKinEmail" TEXT,
    "nextOfKinPhone" TEXT,
    "duration" TEXT NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "wantsUpfront" BOOLEAN NOT NULL DEFAULT false,
    "paymentMode" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "bankName" TEXT,
    "sourceOfFunds" TEXT,
    "realtorName" TEXT,
    "realtorEmail" TEXT,
    "realtorPhone" TEXT,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "clientMessage" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "investmentId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_applications_investmentId_key" ON "client_applications"("investmentId");

-- AddForeignKey
ALTER TABLE "client_applications" ADD CONSTRAINT "client_applications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_applications" ADD CONSTRAINT "client_applications_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
