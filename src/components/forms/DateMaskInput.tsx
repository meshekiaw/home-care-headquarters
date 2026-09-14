import { useId } from "react";
import { Input } from "@/components/ui/input";

/**
 * A date box that types itself: the nurse types digits and the slashes appear,
 * producing MM/DD/YYYY. Impossible dates are flagged as she types.
 */
export function maskDateInput(raw: string): string {
  let digits = raw.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";

  // Month: 2..9 typed first means a single-digit month (e.g. "4" -> "04/").
  if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  const mm = digits.slice(0, 2);
  if (digits.length >= 3) {
    let dd = digits.slice(2, 4);
    if (dd.length === 1 && Number(dd) > 3) dd = `0${dd}`;
    const rest = digits.slice(4, 8);
    const head = `${mm}/${dd}`;
    return rest ? `${head}/${rest}` : dd.length === 2 && digits.length > 4 ? `${head}/` : head;
  }
  return digits.length === 2 && Number(mm) >= 1 && Number(mm) <= 12 && raw.endsWith("/")
    ? `${mm}/`
    : mm;
}

/** True when the value is a complete, real MM/DD/YYYY date. */
export function isValidMaskedDate(value: string): boolean {
  const m = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return false;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1900 || year > 2100) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}

interface DateMaskInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function DateMaskInput({
  id,
  value,
  onChange,
  disabled,
  className,
  ...rest
}: DateMaskInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const invalid = value.trim().length > 0 && !isValidMaskedDate(value);

  return (
    <div className="space-y-1">
      <Input
        id={inputId}
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM/DD/YYYY"
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        aria-label={rest["aria-label"]}
        className={`${invalid ? "border-destructive" : ""} ${className ?? ""}`}
        onChange={(e) => onChange(maskDateInput(e.target.value))}
      />
      {invalid && (
        <p className="text-xs text-destructive">Enter a real date as MM/DD/YYYY.</p>
      )}
    </div>
  );
}
