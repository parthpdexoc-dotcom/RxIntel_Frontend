import type { ListPageParam } from "../types/listPageParam";

export interface PharmacySoftwareDto {
  id: string | null;
  softwareName: string | null;
  isActive?: boolean;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type PharmacySoftwareListParams = ListPageParam & {
  searchText?: string;
};

export interface PharmacySoftwarePagedResponse {
  totalRecords: number;
  data: PharmacySoftwareDto[];
}

export const EMPTY_PHARMACY_SOFTWARE: PharmacySoftwareDto = {
  id: null,
  softwareName: null,
};

export function toFormInput(value: string | null | undefined): string {
  return value ?? "";
}

export function getPharmacySoftwareDisplayName(
  software: Partial<PharmacySoftwareDto> | null | undefined
): string {
  if (!software) return "";
  return software.softwareName?.trim() || "";
}

export function toUpsertPayload(
  dto: PharmacySoftwareDto
): Partial<PharmacySoftwareDto> {
  const { createdDate: _createdDate, modifiedDate: _modifiedDate, id, ...fields } = dto;
  return id === null ? fields : { id, ...fields };
}
