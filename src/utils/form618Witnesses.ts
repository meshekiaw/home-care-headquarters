export const FORM618_WITNESS_ERROR = "The two witnesses must be different people.";

export function form618WitnessNamesMatch(first?: string | null, second?: string | null): boolean {
  const normalize = (name?: string | null) => (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const firstName = normalize(first);
  return firstName.length > 0 && firstName === normalize(second);
}