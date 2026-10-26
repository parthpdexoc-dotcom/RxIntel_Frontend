/**
 * Pharmacy — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Pharmacy record (GET list / upsert response / form state). `id: null` = new record. */
export interface PharmacyDto {
  id: string | null;
  dea: string | null;
  deaExpirationDate?: string | null;
  businessLegalName?: string | null;
  businessTradeName: string | null;
  npi?: string | null;
  pharmacyAddress?: string | null;
  streetAddress?: string | null;
  city?: string | null;
  stateId?: string | null;
  stateName?: string | null;
  pharmacySoftwareId?: string | null;
  softwareName?: string | null;
  zipCode?: string | null;
  phoneNumber?: string | null;
  fax?: string | null;
  stateBoardOfPharmacyLicenseNumber?: string | null;
  bopLicenseExpirationDate?: string | null;
  globalLocationNumber?: string | null;
  pharmacyBillingSoftwareName?: string | null;
  pharmacyBillingSoftwarePhone?: string | null;
  pharmacyBillingSoftwareEmail?: string | null;
  email?: string | null;
  isActive: boolean;
  hasDeaFile?: boolean;
  deaFileName?: string | null;
  hasStateBoardFile?: boolean;
  stateBoardFileName?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type PharmacyListParams = ListPageParam & {
  searchText?: string;
  isActive?: boolean;
};

export interface PharmacyPagedResponse {
  totalRecords: number;
  data: PharmacyDto[];
}

export const EMPTY_PHARMACY: PharmacyDto = {
  id: null,
  dea: null,
  deaExpirationDate: null,
  businessLegalName: null,
  businessTradeName: null,
  npi: null,
  pharmacyAddress: null,
  streetAddress: null,
  city: null,
  stateId: null,
  stateName: null,
  pharmacySoftwareId: null,
  zipCode: null,
  phoneNumber: null,
  fax: null,
  stateBoardOfPharmacyLicenseNumber: null,
  bopLicenseExpirationDate: null,
  globalLocationNumber: null,
  pharmacyBillingSoftwareName: null,
  pharmacyBillingSoftwarePhone: null,
  pharmacyBillingSoftwareEmail: null,
  email: null,
  isActive: true,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

/** Display name for pharmacy dropdowns and labels (API field: businessTradeName). */
export function getPharmacyDisplayName(
  pharmacy: Partial<PharmacyDto> | null | undefined
): string {
  if (!pharmacy) return "";
  return (
    pharmacy.businessTradeName?.trim() ||
    pharmacy.businessLegalName?.trim() ||
    ""
  );
}

/** Strip table/UI-only fields before binding form or sending to API. */
export function toPharmacyFormState(
  source: Partial<PharmacyDto> & { status?: unknown }
): PharmacyDto {
  return {
    id: source.id ?? null,
    dea: source.dea ?? null,
    deaExpirationDate: source.deaExpirationDate ?? null,
    businessLegalName: source.businessLegalName ?? null,
    businessTradeName: source.businessTradeName ?? null,
    npi: source.npi ?? null,
    pharmacyAddress: source.pharmacyAddress ?? null,
    streetAddress: source.streetAddress ?? null,
    city: source.city ?? null,
    stateId: source.stateId ?? null,
    stateName: source.stateName ?? null,
    pharmacySoftwareId: source.pharmacySoftwareId ?? null,
    zipCode:
      source.zipCode ??
      (source as { zip?: string | null }).zip ??
      null,
    phoneNumber: source.phoneNumber ?? null,
    fax:
      source.fax ??
      (source as { pharmacyFax?: string | null }).pharmacyFax ??
      null,
    stateBoardOfPharmacyLicenseNumber:
      source.stateBoardOfPharmacyLicenseNumber ?? null,
    bopLicenseExpirationDate: source.bopLicenseExpirationDate ?? null,
    globalLocationNumber: source.globalLocationNumber ?? null,
    pharmacyBillingSoftwareName:
      source.pharmacyBillingSoftwareName ??
      (source as { pharmacySoftwareSystem?: string | null }).pharmacySoftwareSystem ??
      null,
    pharmacyBillingSoftwarePhone:
      source.pharmacyBillingSoftwarePhone ??
      (source as { pharmacySoftwarePhone?: string | null }).pharmacySoftwarePhone ??
      null,
    pharmacyBillingSoftwareEmail:
      source.pharmacyBillingSoftwareEmail ??
      (source as { pharmacySoftwareEmail?: string | null }).pharmacySoftwareEmail ??
      null,
    email: source.email ?? null,
    isActive: source.isActive ?? true,
    hasDeaFile: Boolean(source.hasDeaFile),
    deaFileName: source.deaFileName ?? null,
    hasStateBoardFile: Boolean(source.hasStateBoardFile),
    stateBoardFileName: source.stateBoardFileName ?? null,
  };
}

export function toUpsertPayload(dto: PharmacyDto): Partial<PharmacyDto> {
  const payload = toPharmacyFormState(dto);
  const {
    id,
    softwareName,
    hasDeaFile: _hasDeaFile,
    deaFileName: _deaFileName,
    hasStateBoardFile: _hasStateBoardFile,
    stateBoardFileName: _stateBoardFileName,
    ...fields
  } = payload;
  return id === null ? fields : { id, ...fields };
}
