/**
 * Turns raw database / API errors into plain language a non-technical user can act on.
 * Never show error.message directly in the UI — pass it through friendlyError() first.
 */

type MaybeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null | undefined;

const CONSTRAINT_MESSAGES: Record<string, string> = {
  nurse_assessments_unique_open: "There is already an open assessment of this type for this client.",
  clients_medicaid_id_key: "Another client already uses that Medicaid ID.",
  user_roles_user_id_role_key: "That person already has this role.",
  caregiver_availability_unique: "That availability slot already exists.",
};

function constraintName(raw: string): string | null {
  const match = raw.match(/constraint "([^"]+)"/);
  return match ? match[1] : null;
}

export function friendlyError(error: MaybeError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const raw = error.message ?? "";
  const code = error.code ?? "";
  const lower = raw.toLowerCase();

  if (code === "23505" || lower.includes("duplicate key value")) {
    const name = constraintName(raw);
    if (name && CONSTRAINT_MESSAGES[name]) return CONSTRAINT_MESSAGES[name];
    return "This record already exists. Open the existing one instead of creating a new one.";
  }

  if (code === "23503" || lower.includes("violates foreign key")) {
    return "This is linked to other records, so it can't be changed or removed right now.";
  }

  if (code === "23502" || lower.includes("null value in column")) {
    return "A required field is missing. Please fill in every required field and try again.";
  }

  if (code === "23514" || lower.includes("violates check constraint")) {
    return "One of the values entered isn't allowed here. Please review your entries and try again.";
  }

  if (code === "42501" || lower.includes("row-level security") || lower.includes("permission denied")) {
    return "You don't have permission to do this. Please contact your administrator.";
  }

  if (code === "PGRST116" || lower.includes("results contain 0 rows")) {
    return "That record couldn't be found. It may have been changed or removed.";
  }

  if (lower.includes("jwt") || lower.includes("token is expired") || lower.includes("not authenticated")) {
    return "Your session has expired. Please sign in again.";
  }

  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("load failed")) {
    return "We couldn't reach the server. Check your internet connection and try again.";
  }

  // Anything that still looks like raw database or stack output gets the generic message.
  const looksTechnical =
    /constraint|relation |column |syntax error|pgrst|sqlstate|function .*\(|at 0x|\bselect\b|\binsert\b/i.test(raw);
  if (!raw || looksTechnical) return fallback;

  return raw;
}
