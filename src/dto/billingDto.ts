/**
 * Billing — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";
import type { InsuranceDto } from "./insuranceDto";
/** Billing record (GET list / upsert response / form state). `id: null` = new record. */

export interface BillingDto {
  id: string | null;
  pharmacyId: string | null;
  insuranceId: string | null;
  ndc: string | null;
  quantityBilled: string | null;
  rxno: string | null;
  billDate: string | null;
  drugName: string | null;
  drugForm: string | null;
  packageSize: string | null;
  drugTherapy: string | null;
  days: string | null;
  primaryInsurancePaidAmount: string | null;
  primaryInsuranceBinNo: string | null;
  secondaryInsurancePaidAmount: string | null;
  secondaryInsuranceId: string | null;
  secondaryInsurance: string | null;
  secondaryInsuranceBinNo: string | null;
  totalInsurancePaidAmount: string | null;
  importErrorFileId?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}
export type BillingListParams = ListPageParam & {
  searchText?: string;
  importErrorFileId?: string;
};
export interface BillingPagedResponse {
  totalRecords: number;
  data: BillingDto[];
}
export const EMPTY_BILLING: BillingDto = {
  id: null,
  pharmacyId: null,
  insuranceId: null,
  ndc: null,
  quantityBilled: null,
  rxno: null,
  billDate: null,
  drugName: null,
  drugForm: null,
  packageSize: null,
  drugTherapy: null,
  days: null,
  primaryInsurancePaidAmount: null,
  primaryInsuranceBinNo: null,
  secondaryInsurancePaidAmount: null,
  secondaryInsuranceId: null,
  secondaryInsurance: null,
  secondaryInsuranceBinNo: null,
  totalInsurancePaidAmount: null,
};
export function toFormInput(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}
export function toUpsertPayload(dto: BillingDto): Partial<BillingDto> {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    totalInsurancePaidAmount: _totalInsurancePaidAmount,
    id,
    ...fields
  } = dto;
  return id === null ? fields : { id, ...fields };
}

export function resolveSecondaryInsuranceId(
  billing: BillingDto,
  insuranceList: InsuranceDto[]
): string | null {
  if (billing.secondaryInsuranceId) return billing.secondaryInsuranceId;
  if (!billing.secondaryInsurance) return null;

  const normalizedName = billing.secondaryInsurance.trim().toLowerCase();
  const match = insuranceList.find(
    (item) => item.insuranceName?.trim().toLowerCase() === normalizedName
  );
  return match?.id != null ? String(match.id) : null;
}

/** Matches backend monthly manual-entry import file name (e.g. OCT2026-SingalEntry.csv). */
export function getBillingSingleEntryFileName(date = new Date()): string {
  const month = date
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${month}${date.getUTCFullYear()}-SingalEntry.csv`;
}

export function resolvePrimaryInsuranceId(
  insuranceName: string,
  insuranceList: { id?: string | null; insuranceName?: string | null; binNumber?: string | null }[]
): { insuranceId: string | null; binNo: string | null } {
  const normalizedName = insuranceName.trim().toLowerCase();
  const match = insuranceList.find(
    (item) => item.insuranceName?.trim().toLowerCase() === normalizedName
  );
  if (!match?.id) return { insuranceId: null, binNo: null };
  return {
    insuranceId: String(match.id),
    binNo: match.binNumber?.trim() || null,
  };
}

export function enrichBillingWithSecondaryInsuranceId(
  billing: BillingDto,
  insuranceList: InsuranceDto[]
): BillingDto {
  return {
    ...billing,
    secondaryInsuranceId: resolveSecondaryInsuranceId(billing, insuranceList),
  };
}


