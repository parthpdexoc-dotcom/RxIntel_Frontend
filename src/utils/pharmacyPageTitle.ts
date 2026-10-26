export function getPharmacyPossessivePageTitle(
  pharmacyName: string | undefined,
  suffix: string,
  fallback: string
): string {
  const trimmed = pharmacyName?.trim();
  if (!trimmed) return fallback;
  return `${trimmed}'s ${suffix}`;
}
