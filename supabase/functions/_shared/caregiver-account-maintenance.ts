export const normalizeMaintenanceEmail = (email: string | null | undefined) => (email ?? "").replace(/\s/g, "").toLowerCase();

export interface MaintenanceCaregiver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  email: string | null;
  auth_user_id: string | null;
}

export function maintenanceSkip(caregiver: MaintenanceCaregiver): string | null {
  if (caregiver.status !== "active") return "Inactive caregiver";
  const email = normalizeMaintenanceEmail(caregiver.email);
  if (!email) return "No email on file";
  if (email === "tisdalelinda64@gmai.com" || `${caregiver.first_name} ${caregiver.last_name}`.trim().toLowerCase() === "linda tisdale") return "Linda Tisdale: email needs correction";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email needs office review";
  return null;
}

export function validateMaintenanceMatch(caregiver: MaintenanceCaregiver, account: { id: string; email?: string | null }, linkedElsewhere: boolean): void {
  if (maintenanceSkip(caregiver) || normalizeMaintenanceEmail(caregiver.email) !== normalizeMaintenanceEmail(account.email)) throw new Error("Email does not match an eligible active caregiver");
  if ((caregiver.auth_user_id && caregiver.auth_user_id !== account.id) || linkedElsewhere) throw new Error("Existing account connection conflict");
}

export const shouldConfirmExistingMaintenanceAccount = (email: string, confirmed: boolean) => !confirmed && normalizeMaintenanceEmail(email) === "johneisepridgeon1981@gmail.com";