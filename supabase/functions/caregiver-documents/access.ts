export const CAREGIVER_UPLOAD_STEPS = ["photo_id", "social_security_card", "certificate"];
export const OFFICE_UPLOAD_STEPS = ["tax_payroll_forms", "background_check", "adult_maltreatment_check", "child_maltreatment_check", "tmu"];
export const ACCESS_TICKET_SECONDS = 60;

export function canUseDocuments(roles: string[]): boolean {
  return !roles.includes("nurse") && (roles.includes("admin") || roles.includes("caregiver"));
}

export function canUpload(roles: string[], ownsCaregiver: boolean, step: string, approved: boolean): boolean {
  if (!canUseDocuments(roles)) return false;
  if (roles.includes("admin")) return [...CAREGIVER_UPLOAD_STEPS, ...OFFICE_UPLOAD_STEPS].includes(step);
  return ownsCaregiver && CAREGIVER_UPLOAD_STEPS.includes(step) && !approved;
}

export function canRead(roles: string[], ownsCaregiver: boolean, isUploader: boolean): boolean {
  return canUseDocuments(roles) && (roles.includes("admin") || (ownsCaregiver && isUploader));
}

export function canArchive(roles: string[], ownsCaregiver: boolean, isUploader: boolean, approved: boolean): boolean {
  return canRead(roles, ownsCaregiver, isUploader) && (roles.includes("admin") || !approved);
}