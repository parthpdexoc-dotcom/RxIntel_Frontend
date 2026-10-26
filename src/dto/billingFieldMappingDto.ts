/**
 * Billing field mapping — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Mapping row (GET list / upsert response / form state). `id: null` = new record. */
export interface BillingFieldMappingDto {
  id: string | null;
  pharmacySoftwareId: string | null;
  /** Empty string clears an existing mapping on save. */
  sourceFieldName: string | null;
  destinationFieldName: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type BillingFieldMappingListParams = ListPageParam & {
  searchText?: string;
  pharmacySoftwareId?: string;
};

export interface BillingFieldMappingPagedResponse {
  totalRecords: number;
  data: BillingFieldMappingDto[];
}

export type BillingFieldMappingUpsertPayload = {
  id?: string;
  pharmacySoftwareId: string;
  sourceFieldName: string;
  destinationFieldName: string;
};

export const EMPTY_BILLING_FIELD_MAPPING: BillingFieldMappingDto = {
  id: null,
  pharmacySoftwareId: null,
  sourceFieldName: null,
  destinationFieldName: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function toUpsertPayload(
  dto: BillingFieldMappingDto
): BillingFieldMappingUpsertPayload {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    id,
    pharmacySoftwareId,
    sourceFieldName,
    destinationFieldName,
  } = dto;

  const payload = {
    pharmacySoftwareId: pharmacySoftwareId ?? "",
    sourceFieldName: sourceFieldName ?? "",
    destinationFieldName: destinationFieldName ?? "",
  };

  return id ? { id, ...payload } : payload;
}
