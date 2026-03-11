export function daysUntilDate(isoDate: string): number {
  const target = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

export function isUrgentDate(isoDate: string, thresholdDays = 14): boolean {
  return daysUntilDate(isoDate) <= thresholdDays;
}
