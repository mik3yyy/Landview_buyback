export function parseDurationToMonths(duration: string): number {
  const lower = duration.toLowerCase().trim();
  const match = lower.match(/(\d+)\s*(month|months|year|years|week|weeks|day|days)/);
  if (!match) return 0;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit.startsWith('year')) return value * 12;
  if (unit.startsWith('month')) return value;
  if (unit.startsWith('week')) return Math.round((value * 7) / 30);
  if (unit.startsWith('day')) return Math.round(value / 30);
  return 0;
}

export function calculateMaturityDate(transactionDate: Date, duration: string): Date {
  const months = parseDurationToMonths(duration);
  const d = new Date(transactionDate);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function calculateROI(principal: number, interestRate: number): number {
  return principal * (interestRate / 100);
}

export function calculateMaturityAmount(
  principal: number,
  roiAmount: number,
  upfrontPayment: number = 0
): number {
  return principal + roiAmount - upfrontPayment;
}

export function calculateDaysUntilMaturity(maturityDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maturity = new Date(maturityDate);
  maturity.setHours(0, 0, 0, 0);
  const diff = maturity.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
