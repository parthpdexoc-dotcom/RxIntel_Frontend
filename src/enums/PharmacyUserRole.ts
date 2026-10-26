/** Matches backend Rxintel.Generic.Enums.PharmacyUserRole (integer values). */
export enum PharmacyUserRole {
  Manager = 1,
  PharmacyAdmin = 2,
  Pharmacist = 3,
  PharmacyTech = 4,
}

/** Display labels (matches backend [Description] attributes). */
export const PharmacyUserRoleDescription: Record<PharmacyUserRole, string> = {
  [PharmacyUserRole.Manager]: "Manager",
  [PharmacyUserRole.Pharmacist]: "Pharmacist",
  [PharmacyUserRole.PharmacyTech]: "Pharmacy Tech",
  [PharmacyUserRole.PharmacyAdmin]: "Pharmacy Admin",
};

export const PHARMACY_USER_ROLE_OPTIONS = (
  [
    PharmacyUserRole.PharmacyAdmin,
    PharmacyUserRole.Manager,
    PharmacyUserRole.Pharmacist,
    PharmacyUserRole.PharmacyTech,
  ] as const
).map((value) => ({
  label: PharmacyUserRoleDescription[value],
  value,
}));

export function getPharmacyUserRoleLabel(
  role: PharmacyUserRole | number | null | undefined
): string {
  if (role == null) return "";
  return PharmacyUserRoleDescription[role as PharmacyUserRole] ?? String(role);
}

/** Default pharmacy signup admin — edit/delete are not allowed in the UI. */
export function isPharmacyAdminRole(
  role: PharmacyUserRole | number | string | null | undefined
): boolean {
  if (role == null || role === "") return false;

  if (typeof role === "number") {
    return role === PharmacyUserRole.PharmacyAdmin;
  }

  if (typeof role === "string") {
    const normalized = role.trim().toLowerCase().replace(/\s+/g, "");
    return (
      normalized === String(PharmacyUserRole.PharmacyAdmin) ||
      normalized === "pharmacyadmin"
    );
  }

  return role === PharmacyUserRole.PharmacyAdmin;
}
