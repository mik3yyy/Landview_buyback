-- Add custom investment terms and receipt image to client_applications
ALTER TABLE "client_applications"
  ADD COLUMN "hasCustomTerms"     BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "customDuration"     TEXT,
  ADD COLUMN "customInterestRate" DECIMAL(5,2),
  ADD COLUMN "receiptImageUrl"    TEXT;
