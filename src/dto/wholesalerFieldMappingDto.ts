/**
 * Wholesaler field mapping — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Mapping row (GET list / upsert response / form state). `id: null` = new record. */
export interface WholesalerFieldMappingDto {
  id: string | null;
  wholesalerId: string | null;
  /** Empty string clears an existing mapping on save. */
  sourceColumnName: string | null;
  destinationColumnName: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type WholesalerFieldMappingListParams = ListPageParam & {
  searchText?: string;
  wholesalerId?: string;
};

export interface WholesalerFieldMappingPagedResponse {
  totalRecords: number;
  data: WholesalerFieldMappingDto[];
}

export type WholesalerFieldMappingUpsertPayload = {
  id?: string;
  wholesalerId: string;
  sourceColumnName: string;
  destinationColumnName: string;
};

export const EMPTY_WHOLESALER_FIELD_MAPPING: WholesalerFieldMappingDto = {
  id: null,
  wholesalerId: null,
  sourceColumnName: null,
  destinationColumnName: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function toUpsertPayload(
  dto: WholesalerFieldMappingDto
): WholesalerFieldMappingUpsertPayload {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    id,
    wholesalerId,
    sourceColumnName,
    destinationColumnName,
  } = dto;

  const payload = {
    wholesalerId: wholesalerId ?? "",
    sourceColumnName: sourceColumnName ?? "",
    destinationColumnName: destinationColumnName ?? "",
  };

  return id ? { id, ...payload } : payload;
}
