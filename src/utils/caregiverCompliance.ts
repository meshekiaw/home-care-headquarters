/** Mirrors PostgreSQL's date + interval '2 years': leap day clamps to February 28. */
export function maltreatmentExpiration(checkDate: string | null | undefined): string | null {
  if (!checkDate) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(checkDate);
  if (!parts) return null;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const targetYear = year + 2;
  const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
  return `${targetYear}-${String(month).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}