-- Track principal changes across extensions
ALTER TABLE "investment_extensions"
  ADD COLUMN "previousPrincipal" DECIMAL(15,2),
  ADD COLUMN "newPrincipal"      DECIMAL(15,2);
