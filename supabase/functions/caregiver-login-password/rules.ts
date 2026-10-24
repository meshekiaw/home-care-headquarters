export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "Use at least 8 characters.";
  if (password.length > MAX_PASSWORD_LENGTH) return "Use no more than 128 characters.";
  if (!password.trim()) return "The password cannot contain only spaces.";
  return null;
}

export function isCaregiverOnlyLogin(roles: string[]): boolean {
  return roles.includes("caregiver") && !roles.includes("admin") && !roles.includes("nurse");
}