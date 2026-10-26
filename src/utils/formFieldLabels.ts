/** Known acronyms when converting camelCase field keys to labels. */
const ACRONYMS = new Set(["dea", "bop", "ndc", "npi", "gln", "bin", "dba", "rx"]);

/**
 * Overrides where auto-format does not match the UI label.
 * Add entries here once — used by all forms via FormValidation.
 */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  businessTradeName: "Business Trade Name (DBA)",
  stateBoardOfPharmacyLicenseNumber: "State Board License Number",
  phoneNumber: "Phone",
  stateId: "State",
  userEmail: "User/Email",
  pharmacyId: "Pharmacy Name",
  wholesalerId: "Wholesaler Name",
  insuranceId: "Primary Insurance",
  softwareName: "Software Name",
  pharmacySoftwareId: "Software Name",
  pharmacyBillingSoftwareName: "Pharmacy Billing Software Name",
  pharmacyBillingSoftwarePhone: "Pharmacy Billing Software Phone",
  pharmacyBillingSoftwareEmail: "Pharmacy Billing Software Email",
};

function titleCaseWord(word: string): string {
  const lower = word.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (lower === "id") return "ID";
  if (lower === "no") return "No";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function splitCamelCase(field: string): string[] {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim()
    .split(/\s+/);
}

/** Converts a form field key (e.g. businessLegalName) to a display label. */
export function formatFieldLabel(field: string): string {
  if (FIELD_LABEL_OVERRIDES[field]) {
    return FIELD_LABEL_OVERRIDES[field];
  }
  return splitCamelCase(field).map(titleCaseWord).join(" ");
}

/** Standard required-field message using the display label. */
export function buildRequiredFieldMessage(field: string): string {
  return `${formatFieldLabel(field)} is required`;
}
