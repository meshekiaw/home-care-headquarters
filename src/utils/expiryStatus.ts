export type ExpiryStatus = "expired" | "expiring" | "ok";

/** Parse a date-only string (YYYY-MM-DD) as local midnight to avoid timezone drift. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateOnly(value: string | null | undefined): string {
  const d = parseDateOnly(value);
  if (!d) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Returns "expired" if past, "expiring" if within `days`, otherwise "ok". */
export function getExpiryStatus(value: string | null | undefined, days = 30): ExpiryStatus {
  const d = parseDateOnly(value);
  if (!d) return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "expired";
  if (diffDays <= days) return "expiring";
  return "ok";
}
