/**
 * Public-facing origin for links shared with caregivers.
 *
 * Preview/sandbox origins require project access, so any link copied from them
 * shows "Access denied" to caregivers. Always fall back to the public site.
 */
export const PUBLIC_SITE_ORIGIN = "https://homecareheadquarters.org";

export function resolvePublicOrigin(): string {
  if (typeof window === "undefined") return PUBLIC_SITE_ORIGIN;
  const { hostname, origin } = window.location;
  const isPrivate =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("id-preview--") ||
    hostname.includes("sandbox") ||
    hostname.endsWith(".lovableproject.com") ||
    hostname.endsWith(".lovable.dev");
  return isPrivate ? PUBLIC_SITE_ORIGIN : origin;
}

export function caregiverPortalUrl(path = ""): string {
  return `${resolvePublicOrigin()}/caregiver-training${path}`;
}
