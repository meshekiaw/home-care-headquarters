import { authorizationStep, type AuthorizationProgress } from "@/utils/clientAuthorization";
import { clientPayerLabel, type ClientPlanningRecord } from "@/utils/clientPlanning";
import { isDateOnlyString } from "@/utils/dateOnly";

export const CLIENT_SORT_OPTIONS = [
  { key: "name", label: "Name" },
  { key: "contact", label: "Contact" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
  { key: "payer_type", label: "Payer Type" },
  { key: "authorization_progress", label: "Authorization progress" },
  { key: "authorization_due_date", label: "Current 618 Date" },
  { key: "form_618_expiration_date", label: "618 Expiration Date" },
  { key: "authorization_begin_date", label: "Authorization Begin Date" },
  { key: "authorization_expiration_date", label: "Auth Expiration Date" },
  { key: "created_at", label: "Date Added" },
] as const;

export type ClientSortKey = typeof CLIENT_SORT_OPTIONS[number]["key"];
export type ClientSort = { key: ClientSortKey; direction: "asc" | "desc" } | null;
export interface SortableClient extends ClientPlanningRecord {
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  created_at?: string | null;
  authorization_due_date?: string | null;
  form_618_date?: string | null;
  form_618_expiration_date?: string | null;
  authorization_begin_date?: string | null;
  authorization_expiration_date?: string | null;
  client_authorization_progress?: AuthorizationProgress | null;
}

const STATUS_ORDER = ["new_client", "current_needs_staffing", "current_staffed", "hospitalized", "on_hold", "discharged", "not_set", "test"];
const PROGRESS_ORDER = ["not_started", "assessment_scheduled", "assessment_completed", "submitted", "approved", "denied"];
const collator = new Intl.Collator("en-US", { sensitivity: "base", numeric: true });

export function nextClientSort(current: ClientSort, key: ClientSortKey): ClientSort {
  if (current?.key !== key) return { key, direction: "asc" };
  return current.direction === "asc" ? { key, direction: "desc" } : null;
}

export function clientSortFromDropdown(value: string): ClientSort {
  const option = CLIENT_SORT_OPTIONS.find(option => option.key === value);
  // Date Added keeps the dropdown's existing newest-first behavior.
  return option ? { key: option.key, direction: option.key === "created_at" ? "desc" : "asc" } : null;
}

function text(value?: string | null): string | null {
  return value?.trim() || null;
}

function dateValue(value?: string | null): number | null {
  if (!text(value)) return null;
  const timestamp = Date.parse(isDateOnlyString(value) ? `${value}T00:00:00Z` : value ?? "");
  return Number.isFinite(timestamp) ? timestamp : null;
}

function compareValue(a: string | number | null, b: string | number | null, direction: "asc" | "desc"): number {
  // Missing values stay last independently of direction.
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const comparison = typeof a === "number" && typeof b === "number" ? a - b : collator.compare(String(a), String(b));
  return direction === "asc" ? comparison : -comparison;
}

function sortValue(client: SortableClient, key: ClientSortKey): string | number | null {
  switch (key) {
    case "name": return text(client.last_name) ?? text(client.first_name);
    case "contact": return text(client.phone) ?? text(client.email);
    case "city": return text(client.city);
    case "payer_type": return text(client.payer_type) ? clientPayerLabel(client) : null;
    case "status": {
      const rank = STATUS_ORDER.indexOf(client.status ?? "");
      return rank < 0 ? null : rank;
    }
    case "authorization_progress": return client.status === "test" ? null : PROGRESS_ORDER.indexOf(authorizationStep(client.client_authorization_progress).value);
    case "authorization_due_date": return dateValue(client.form_618_date ?? client.authorization_due_date);
    default: return dateValue(client[key]);
  }
}

export function sortClientList<T extends SortableClient>(clients: readonly T[], sort: ClientSort): T[] {
  if (!sort) {
    // Preserve the existing default: last name, then first name, ascending.
    return [...clients].sort((a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name));
  }
  return [...clients].sort((a, b) => {
    const result = compareValue(sortValue(a, sort.key), sortValue(b, sort.key), sort.direction);
    if (result) return result;
    if (sort.key === "name") return compareValue(text(a.first_name), text(b.first_name), sort.direction);
    if (sort.key === "contact") return compareValue(text(a.email), text(b.email), sort.direction);
    if (sort.key === "authorization_progress" && a.status !== "test" && b.status !== "test") {
      // Dates within a step stay oldest-first even when step order is reversed.
      return compareValue(dateValue(authorizationStep(a.client_authorization_progress).date), dateValue(authorizationStep(b.client_authorization_progress).date), "asc");
    }
    return 0;
  });
}