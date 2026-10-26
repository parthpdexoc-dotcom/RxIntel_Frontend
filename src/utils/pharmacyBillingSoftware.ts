import type { PharmacyDto } from "../dto/pharmacyDto";

/** Sentinel value for the "Other" option in pharmacy software dropdowns. */
export const OTHER_PHARMACY_SOFTWARE_ID = "__other__";

export function isOtherPharmacySoftwareSelection(
  softwareId: string | null | undefined
): boolean {
  return softwareId === OTHER_PHARMACY_SOFTWARE_ID;
}

export function buildPharmacySoftwareDropdownOptions(
  softwareList: Array<{ id: string | null; softwareName: string | null }>
) {
  const options = softwareList
    .filter((software) => software.id)
    .map((software) => ({
      id: String(software.id),
      softwareName: software.softwareName ?? "",
    }));

  return [
    ...options,
    { id: OTHER_PHARMACY_SOFTWARE_ID, softwareName: "Other" },
  ];
}

export function resolvePharmacySoftwareFormId(
  pharmacy: Partial<PharmacyDto>,
  knownSoftwareIds?: Set<string>
): string | null {
  const softwareId = pharmacy.pharmacySoftwareId;

  if (softwareId) {
    const normalizedId = softwareId.toLowerCase();
    if (knownSoftwareIds && !knownSoftwareIds.has(normalizedId)) {
      if (pharmacy.pharmacyBillingSoftwareName?.trim()) {
        return OTHER_PHARMACY_SOFTWARE_ID;
      }
    }
    return softwareId;
  }

  if (pharmacy.pharmacyBillingSoftwareName?.trim()) {
    return OTHER_PHARMACY_SOFTWARE_ID;
  }

  return null;
}

export function preparePharmacySoftwareForSave(form: PharmacyDto): PharmacyDto {
  if (isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) {
    return {
      ...form,
      pharmacySoftwareId: null,
    };
  }

  return {
    ...form,
    pharmacySoftwareId: form.pharmacySoftwareId || null,
    pharmacyBillingSoftwareName: null,
    pharmacyBillingSoftwarePhone: null,
    pharmacyBillingSoftwareEmail: null,
  };
}
