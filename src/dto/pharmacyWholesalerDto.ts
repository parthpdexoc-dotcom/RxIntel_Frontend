/**
 * PharmacyWholesaler — single DTO for list, form, create, and update.
 * Empty values use `null` (not empty string). API uses camelCase.
 */
import type { ListPageParam } from "../types/listPageParam";
import type { WholesalerDto } from "./wholesalerDto";

/** Pharmacy–wholesaler link (GET list / upsert response / form state). `id: null` = new record. */
export interface PharmacyWholesalerDto {
  id: string | null;
  pharmacyId: string | null;
  wholesalerId: string | null;
  wholesalerName?: string | null;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type PharmacyWholesalerListParams = ListPageParam & {
  pharmacyId?: string;
};

export interface PharmacyWholesalerPagedResponse {
  totalRecords: number;
  data: PharmacyWholesalerDto[];
}

export type PharmacyWholesalerUpsertPayload = {
  pharmacyId: string;
  wholesalerId: string;
};

export const EMPTY_PHARMACY_WHOLESALER: PharmacyWholesalerDto = {
  id: null,
  pharmacyId: null,
  wholesalerId: null,
  wholesalerName: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function toUpsertPayload(
  dto: PharmacyWholesalerDto
): PharmacyWholesalerUpsertPayload {
  return {
    pharmacyId: String(dto.pharmacyId),
    wholesalerId: String(dto.wholesalerId),
  };
}

function readDtoField(
  record: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (value != null && value !== "") return String(value);
  }
  return null;
}

export function normalizePharmacyWholesalerDto(
  raw: unknown
): PharmacyWholesalerDto {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY_PHARMACY_WHOLESALER };
  }

  const record = raw as Record<string, unknown>;
  return {
    id: readDtoField(record, "id", "Id"),
    pharmacyId: readDtoField(record, "pharmacyId", "PharmacyId"),
    wholesalerId: readDtoField(record, "wholesalerId", "WholesalerId"),
    wholesalerName: readDtoField(record, "wholesalerName", "WholesalerName"),
    createdDate: readDtoField(record, "createdDate", "CreatedDate"),
    modifiedDate: readDtoField(record, "modifiedDate", "ModifiedDate"),
  };
}

export function pharmacyWholesalerListFromPayload(
  payload: unknown
): PharmacyWholesalerDto[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizePharmacyWholesalerDto);
  }
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const data = obj.data ?? obj.Data;
  if (!Array.isArray(data)) return [];

  return data.map(normalizePharmacyWholesalerDto);
}

export function parsePharmacyWholesalerPagedResponse(
  payload: unknown
): PharmacyWholesalerPagedResponse {
  const data = pharmacyWholesalerListFromPayload(payload);

  if (!payload || typeof payload !== "object") {
    return { totalRecords: 0, data };
  }

  const obj = payload as Record<string, unknown>;
  const totalRecords =
    typeof obj.totalRecords === "number"
      ? obj.totalRecords
      : typeof obj.TotalRecords === "number"
        ? obj.TotalRecords
        : data.length;

  return { totalRecords, data };
}

export function mapPharmacyWholesalerLinksToWholesalerOptions(
  links: PharmacyWholesalerDto[],
  masterList: WholesalerDto[]
): WholesalerDto[] {
  const seen = new Set<string>();
  const options: WholesalerDto[] = [];

  for (const link of links) {
    const wholesalerId = link.wholesalerId;
    if (!wholesalerId || seen.has(wholesalerId)) continue;
    seen.add(wholesalerId);

    const master = masterList.find((w) => String(w.id) === wholesalerId);
    options.push({
      id: wholesalerId,
      wholesalerName: link.wholesalerName ?? master?.wholesalerName ?? null,
      address: master?.address ?? null,
      phone: master?.phone ?? null,
      email: master?.email ?? null,
      vawd: master?.vawd ?? false,
      vawdDate: master?.vawdDate ?? null,
    });
  }

  return options;
}

export function withPharmacyWholesalerDisplayName(
  link: PharmacyWholesalerDto,
  masterList: WholesalerDto[]
): PharmacyWholesalerDto {
  const wholesalerId = link.wholesalerId;
  const fromMaster = wholesalerId
    ? masterList.find((w) => String(w.id) === wholesalerId)
    : undefined;

  return {
    ...link,
    wholesalerName:
      link.wholesalerName ??
      fromMaster?.wholesalerName ??
      (wholesalerId != null ? wholesalerId : null),
  };
}
