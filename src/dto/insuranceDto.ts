/**
 * Insurance — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Insurance record (GET list / upsert response / form state). `id: null` = new record. */
export interface InsuranceDto {
  id: string | null;
  insuranceName: string | null;
  binNumber: string | null;
  phone: string | null;
  email: string | null;
  isActive?: boolean;
  /** Dropdown / mapping helpers from API */
  isSelected?: boolean;
  isMapped?: boolean;
  selected?: boolean;
  createdDate?: string | null;
  modifiedDate?: string | null;
  /** Existing group bookings from dropdown API (across all parents). */
  insuranceGroups?: InsuranceGroupDto[];
}

export type InsuranceListParams = ListPageParam & {
  searchText?: string;
  /** When true, GET /Insurance returns one row per insurance name (for dropdowns). */
  uniqueInsuranceNames?: boolean;
};

export interface InsurancePagedResponse {
  totalRecords: number;
  data: InsuranceDto[];
}

export interface InsuranceGroupDto {
  id?: string | null;
  binNumber: string;
  childInsuranceId: string;
  startDate?: string | null;
  endDate?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export const EMPTY_INSURANCE: InsuranceDto = {
  id: null,
  insuranceName: null,
  binNumber: null,
  phone: null,
  email: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function toUpsertPayload(dto: InsuranceDto): Partial<InsuranceDto> {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    isSelected: _isSelected,
    isMapped: _isMapped,
    selected: _selected,
    insuranceGroups: _insuranceGroups,
    id,
    ...fields
  } = dto;

  return id === null ? fields : { id, ...fields };
}
