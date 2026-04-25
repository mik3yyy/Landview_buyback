-- CreateEnum
CREATE TYPE "Role" AS ENUM ('super_admin', 'admin', 'accountant');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('active', 'completed', 'extended', 'payment_initiated');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('LOGIN', 'LOGOUT', 'FAILED_LOGIN', 'CREATE_INVESTMENT', 'UPDATE_INVESTMENT', 'DELETE_INVESTMENT', 'EXTEND_INVESTMENT', 'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER', 'AI_UPLOAD', 'EMAIL_SENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'accountant',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "clientName" TEXT NOT NULL,
    "plotNumber" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "interestRate" DECIMAL(5,2) NOT NULL,
    "roiAmount" DECIMAL(15,2) NOT NULL,
    "upfrontPayment" DECIMAL(15,2),
    "maturityAmount" DECIMAL(15,2) NOT NULL,
    "clientEmail" TEXT,
    "realtorName" TEXT NOT NULL,
    "realtorEmail" TEXT NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'active',
    "documentUrl" TEXT,
    "paymentInitiatedAt" TIMESTAMP(3),
    "paymentCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "paymentInitiatedBy" TEXT,
    "paymentCompletedBy" TEXT,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_extensions" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "previousDuration" TEXT NOT NULL,
    "newDuration" TEXT NOT NULL,
    "previousMaturityDate" TIMESTAMP(3) NOT NULL,
    "newMaturityDate" TIMESTAMP(3) NOT NULL,
    "previousInterestRate" DECIMAL(5,2) NOT NULL,
    "newInterestRate" DECIMAL(5,2) NOT NULL,
    "extendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extendedBy" TEXT NOT NULL,

    CONSTRAINT "investment_extensions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_paymentInitiatedBy_fkey" FOREIGN KEY ("paymentInitiatedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_paymentCompletedBy_fkey" FOREIGN KEY ("paymentCompletedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_extensions" ADD CONSTRAINT "investment_extensions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
