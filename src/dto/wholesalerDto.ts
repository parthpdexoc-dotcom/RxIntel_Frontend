/**
 * Wholesaler — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Wholesaler record (GET list / upsert response / form state). `id: null` = new record. */
export interface WholesalerDto {
  id: string | null;
  wholesalerName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** `null` = not selected yet (UI shows "Select Vawd"). */
  vawd: boolean | null;
  vawdDate: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type WholesalerListParams = ListPageParam & {
  searchText?: string;
};

export interface WholesalerPagedResponse {
  totalRecords: number;
  data: WholesalerDto[];
}

export const EMPTY_WHOLESALER: WholesalerDto = {
  id: null,
  wholesalerName: null,
  address: null,
  phone: null,
  email: null,
  vawd: null,
  vawdDate: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function toUpsertPayload(dto: WholesalerDto): Partial<WholesalerDto> {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    id,
    ...fields
  } = dto;

  const vawd = dto.vawd === true;
  const payload: Partial<WholesalerDto> = {
    ...fields,
    vawd,
    vawdDate: vawd ? dto.vawdDate : null,
  };

  return id === null ? payload : { id, ...payload };
}
