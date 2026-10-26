const API_BASE_URL = process.env.REACT_APP_BASE_URL ?? "";

function isDataUrl(value: string): boolean {
  return value.startsWith("data:");
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith("blob:");
}

/** Stored value may be a server filename or a legacy data URL. */
export function resolvePharmacyUserProfileImageSrc(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isDataUrl(trimmed) || isAbsoluteUrl(trimmed)) return trimmed;
  return getPharmacyUserProfileImageUrl(trimmed);
}

export function getPharmacyUserProfileImageUrl(fileName: string): string {
  const trimmed = fileName.trim();
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/PharmacyUser/profile-image/${encodeURIComponent(trimmed)}`;
}

export function getAdminProfileImageUrl(fileName: string): string {
  const trimmed = fileName.trim();
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/Admin/profile-image/${encodeURIComponent(trimmed)}`;
}

export function resolveAdminProfileImageSrc(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isDataUrl(trimmed) || isAbsoluteUrl(trimmed)) return trimmed;
  return getAdminProfileImageUrl(trimmed);
}
