/**
 * Purchase — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";

/** Purchase record (GET list / upsert response / form state). `id: null` = new record. */
export interface PurchaseDto {
  id: string | null;
  pharmacyId: string | null;
  wholesalerId: string | null;
  ndc: string | null;
  quantityPurchased: string | null;
  packageSize: string | null;
  /** Computed by backend: quantityPurchased × packageSize */
  totalQuantityOrdered: string | null;
  description: string | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  importErrorFileId?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type PurchaseListParams = ListPageParam & {
  searchText?: string;
  importErrorFileId?: string;
};

export interface PurchasePagedResponse {
  totalRecords: number;
  data: PurchaseDto[];
}

export const EMPTY_PURCHASE: PurchaseDto = {
  id: null,
  pharmacyId: null,
  wholesalerId: null,
  ndc: null,
  quantityPurchased: null,
  packageSize: null,
  totalQuantityOrdered: null,
  description: null,
  invoiceDate: null,
  invoiceNumber: null,
};

export function toFormInput(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}

export function toUpsertPayload(dto: PurchaseDto): Partial<PurchaseDto> {
  const {
    createdDate: _createdDate,
    modifiedDate: _modifiedDate,
    totalQuantityOrdered: _totalQuantityOrdered,
    id,
    ...fields
  } = dto;

  return id === null ? fields : { id, ...fields };
}

/** Matches backend monthly manual-entry import file name (e.g. OCT2026-SingalEntry.csv). */
export function getPurchaseSingleEntryFileName(date = new Date()): string {
  const month = date
    .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  return `${month}${date.getUTCFullYear()}-SingalEntry.csv`;
}
