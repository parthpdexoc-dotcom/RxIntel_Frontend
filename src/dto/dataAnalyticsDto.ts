import type { ListPageParam } from "../types/listPageParam";

export interface DataAnalyticsRowDto {
  ndc: string;
  productName: string;
  packageSize: string | null;
  strength?: string | null;
  strengthUnit?: string | null;
  dosageForm?: string | null;
  brand?: string | null;
  verified: string;
  source: string;
  totalBilledQuantity: number;
  totalQuantityOrdered: number;
  netQuantity: number;
  dollarsBilledTotal: number;
  wholesalerQuantities: Record<string, number>;
  primaryInsurancePackages: Record<string, number>;
  primaryInsuranceNet: Record<string, number>;
  primaryInsuranceDollars: Record<string, number>;
  actualInsurancePackages: Record<string, number>;
  actualInsuranceNet: Record<string, number>;
}

export type { ReportBaseSortField } from "../constants/dataAnalyticsSort";

export type DataAnalyticsQueryParam = ListPageParam & {
  pharmacyId: string;
  startDate: string;
  endDate: string;
  splitDates?: boolean;
  billingStartDate?: string;
  billingEndDate?: string;
  orderedStartDate?: string;
  orderedEndDate?: string;
  searchText?: string;
  selectedColumns?: string[];
  hiddenColumns?: string[];
  filterNdcs?: string[];
  ndcSpecified?: boolean;
  filterProductNames?: string[];
  filterPackageSizes?: string[];
  filterInsuranceNames?: string[];
  advancedView?: boolean;
  netQuantityFilter?: "Surplus" | "Shortage";
};

export interface InsuranceFamilyDto {
  parentName: string;
  memberNames: string[];
}

export interface DataAnalyticsResponseDto {
  totalRecords: number;
  page: number;
  pageSize: number;
  primaryInsuranceColumnNames: string[];
  insuranceFamilies: InsuranceFamilyDto[];
  wholesalerColumnNames: string[];
  filterNdcOptions: string[];
  filterProductNameOptions: string[];
  filterPackageSizeOptions: string[];
  data: DataAnalyticsRowDto[];
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
}

function normalizeDecimalMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const num = Number(value);
    result[key] = Number.isFinite(num) ? num : 0;
  }
  return result;
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item)).filter(Boolean);
}

/** One entry per insurance name (case-insensitive), preserving first display casing. */
export function uniqueInsuranceNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
}

export function normalizeDataAnalyticsRow(item: unknown): DataAnalyticsRowDto | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  return {
    ndc: String(pick(row, "ndc", "Ndc") ?? ""),
    productName: String(pick(row, "productName", "ProductName") ?? ""),
    packageSize: (pick<string | null>(row, "packageSize", "PackageSize") ?? null) as
      | string
      | null,
    strength: (pick<string | null>(row, "strength", "Strength") ?? null) as
      | string
      | null,
    strengthUnit: (pick<string | null>(row, "strengthUnit", "StrengthUnit") ?? null) as
      | string
      | null,
    dosageForm: (pick<string | null>(row, "dosageForm", "DosageForm") ?? null) as
      | string
      | null,
    brand: (pick<string | null>(row, "brand", "Brand") ?? null) as
      | string
      | null,
    verified: String(pick(row, "verified", "Verified") ?? "No"),
    source: String(pick(row, "source", "Source") ?? "GSDD"),
    totalBilledQuantity: Number(
      pick(row, "totalBilledQuantity", "TotalBilledQuantity") ?? 0
    ),
    totalQuantityOrdered: Number(
      pick(row, "totalQuantityOrdered", "TotalQuantityOrdered") ?? 0
    ),
    netQuantity: Number(pick(row, "netQuantity", "NetQuantity") ?? 0),
    dollarsBilledTotal: Number(pick(row, "dollarsBilledTotal", "DollarsBilledTotal") ?? 0),
    wholesalerQuantities: normalizeDecimalMap(
      pick(row, "wholesalerQuantities", "WholesalerQuantities")
    ),
    primaryInsurancePackages: normalizeDecimalMap(
      pick(row, "primaryInsurancePackages", "PrimaryInsurancePackages")
    ),
    primaryInsuranceNet: normalizeDecimalMap(
      pick(row, "primaryInsuranceNet", "PrimaryInsuranceNet")
    ),
    primaryInsuranceDollars: normalizeDecimalMap(
      pick(row, "primaryInsuranceDollars", "PrimaryInsuranceDollars")
    ),
    actualInsurancePackages: normalizeDecimalMap(
      pick(row, "actualInsurancePackages", "ActualInsurancePackages")
    ),
    actualInsuranceNet: normalizeDecimalMap(
      pick(row, "actualInsuranceNet", "ActualInsuranceNet")
    ),
  };
}

export function normalizeDataAnalyticsResponse(data: unknown): DataAnalyticsResponseDto {
  const payload =
    data && typeof data === "object"
      ? ((data as Record<string, unknown>).data !== undefined &&
        Array.isArray((data as Record<string, unknown>).data)
          ? data
          : (data as Record<string, unknown>).data ?? data) as Record<string, unknown>
      : {};

  const rowsRaw = pick<unknown[]>(payload, "data", "Data") ?? [];
  const dataRows = Array.isArray(rowsRaw)
    ? rowsRaw
        .map(normalizeDataAnalyticsRow)
        .filter((row): row is DataAnalyticsRowDto => row != null)
    : [];

  return {
    totalRecords: Number(pick(payload, "totalRecords", "TotalRecords") ?? dataRows.length),
    page: Number(pick(payload, "page", "Page") ?? 1),
    pageSize: Number(pick(payload, "pageSize", "PageSize") ?? 10),
    primaryInsuranceColumnNames: uniqueInsuranceNames(
      normalizeStringList(
        pick(payload, "primaryInsuranceColumnNames", "PrimaryInsuranceColumnNames")
      )
    ),
    insuranceFamilies: normalizeInsuranceFamilies(
      pick(payload, "insuranceFamilies", "InsuranceFamilies")
    ),
    wholesalerColumnNames: normalizeStringList(
      pick(payload, "wholesalerColumnNames", "WholesalerColumnNames")
    ),
    filterNdcOptions: normalizeStringList(
      pick(payload, "filterNdcOptions", "FilterNdcOptions")
    ),
    filterProductNameOptions: normalizeStringList(
      pick(payload, "filterProductNameOptions", "FilterProductNameOptions")
    ),
    filterPackageSizeOptions: normalizeStringList(
      pick(payload, "filterPackageSizeOptions", "FilterPackageSizeOptions")
    ),
    data: dataRows,
  };
}

function normalizeInsuranceFamilies(raw: unknown): InsuranceFamilyDto[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const family = item as Record<string, unknown>;
      const parentName = String(
        pick(family, "parentName", "ParentName") ?? ""
      ).trim();
      const memberNames = normalizeStringList(
        pick(family, "memberNames", "MemberNames")
      );
      if (!parentName || memberNames.length === 0) return null;
      return { parentName, memberNames };
    })
    .filter((family): family is InsuranceFamilyDto => family != null);
}
