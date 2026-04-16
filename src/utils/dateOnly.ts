const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

function parseDateOnlyParts(value: string | null | undefined): DateOnlyParts | null {
  if (!value) return null;

  const trimmed = value.trim();
  const match = trimmed.match(DATE_ONLY_REGEX);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() + 1 !== month ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isDateOnlyString(value: string | null | undefined): value is string {
  return parseDateOnlyParts(value) !== null;
}

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  },
  locale = "en-US",
): string | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function getDateOnlyYearMonth(value: string | null | undefined): string | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;

  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

export function formatDateOnlyYearMonth(value: string, locale = "en-US"): string | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function calculateAgeFromDateOnly(
  value: string | null | undefined,
  referenceDate = new Date(),
): number | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;

  let age = referenceDate.getFullYear() - parts.year;
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();

  if (currentMonth < parts.month || (currentMonth === parts.month && currentDay < parts.day)) {
    age -= 1;
  }

  return age;
}

export function compareDateOnly(a: string | null | undefined, b: string | null | undefined): number {
  const aYearMonthDay = parseDateOnlyParts(a)
    ? `${a!.slice(0, 4)}-${a!.slice(5, 7)}-${a!.slice(8, 10)}`
    : null;
  const bYearMonthDay = parseDateOnlyParts(b)
    ? `${b!.slice(0, 4)}-${b!.slice(5, 7)}-${b!.slice(8, 10)}`
    : null;

  if (!aYearMonthDay && !bYearMonthDay) return 0;
  if (!aYearMonthDay) return 1;
  if (!bYearMonthDay) return -1;

  return aYearMonthDay.localeCompare(bYearMonthDay);
}