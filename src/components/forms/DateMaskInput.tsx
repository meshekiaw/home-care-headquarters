import { useId } from "react";
import { Input } from "@/components/ui/input";

/**
 * A date box that types itself: the nurse types digits and the slashes appear,
 * producing MM/DD/YYYY. Impossible dates are flagged as she types.
 */
export function maskDateInput(raw: string): string {
  const cleaned = raw.replace(/[^\d/]/g, "");
  if (!cleaned) return "";

  // Respect slashes the nurse types herself: "4/9/2026" becomes "04/09/2026".
  const typedParts = cleaned.split("/");
  let digits: string;
  if (typedParts.length > 1) {
    const [m = "", d = "", y = ""] = typedParts;
    const pad = (v: string) => (v.length === 1 ? `0${v}` : v.slice(0, 2));
    digits =
      typedParts.length > 2
        ? `${pad(m)}${pad(d)}${y.slice(0, 4)}`
        : `${pad(m)}${d.replace(/\D/g, "")}`;
  } else {
    digits = typedParts[0];
    // A first digit of 2..9 can only be a single-digit month.
    if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`;
  }
  digits = digits.replace(/\D/g, "").slice(0, 8);
  if (!digits) return "";

  const mm = digits.slice(0, 2);
  if (digits.length >= 3) {
    let dd = digits.slice(2, 4);
    if (dd.length === 1 && Number(dd) > 3) dd = `0${dd}`;
    const rest = digits.slice(4, 8);
    const head = `${mm}/${dd}`;
    return rest ? `${head}/${rest}` : head;
  }
  return digits.length === 2 && cleaned.endsWith("/") ? `${mm}/` : mm;
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
