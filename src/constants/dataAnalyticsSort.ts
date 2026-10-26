import type { ListSortDirection } from "../types/listPageParam";

/**
 * Sort keys for Data Analytics base grid columns.
 * Keep in sync with DataAnalyticsSortFields.cs on the backend.
 */
export const DATA_ANALYTICS_SORT_FIELDS = {
  ndc: "ndc",
  productName: "productName",
  packageSize: "packageSize",
  verified: "verified",
  source: "source",
  totalQuantityOrdered: "totalQuantityOrdered",
  totalBilledQuantity: "totalBilledQuantity",
  netQuantity: "netQuantity",
  dollarsBilledTotal: "dollarsBilledTotal",
} as const;

export type ReportBaseSortField =
  (typeof DATA_ANALYTICS_SORT_FIELDS)[keyof typeof DATA_ANALYTICS_SORT_FIELDS];

export const DEFAULT_DATA_ANALYTICS_SORT = {
  sortBy: DATA_ANALYTICS_SORT_FIELDS.dollarsBilledTotal,
  sortDirection: "desc" as ListSortDirection,
};

export const REPORT_BASE_SORT_COLUMNS: ReadonlyArray<{
  label: string;
  sortKey: ReportBaseSortField;
}> = [
  { label: "NDC", sortKey: DATA_ANALYTICS_SORT_FIELDS.ndc },
  { label: "Product Name", sortKey: DATA_ANALYTICS_SORT_FIELDS.productName },
  { label: "Package Size", sortKey: DATA_ANALYTICS_SORT_FIELDS.packageSize },
  { label: "Verified", sortKey: DATA_ANALYTICS_SORT_FIELDS.verified },
  { label: "Wholesaler", sortKey: DATA_ANALYTICS_SORT_FIELDS.source },
  {
    label: "Quantity Ordered",
    sortKey: DATA_ANALYTICS_SORT_FIELDS.totalQuantityOrdered,
  },
  {
    label: "Billed Quantity",
    sortKey: DATA_ANALYTICS_SORT_FIELDS.totalBilledQuantity,
  },
  { label: "Net Quantity", sortKey: DATA_ANALYTICS_SORT_FIELDS.netQuantity },
  {
    label: "Dollars Billed",
    sortKey: DATA_ANALYTICS_SORT_FIELDS.dollarsBilledTotal,
  },
];

/** Matches DataAnalyticsSortHelper.NormalizeSortKey on the API. */
export function normalizeDataAnalyticsSortKey(sortBy: string): string {
  return sortBy.trim().replace(/\s+/g, "").toLowerCase();
}

export function isReportBaseSortField(value: string): value is ReportBaseSortField {
  const normalized = normalizeDataAnalyticsSortKey(value);
  return Object.values(DATA_ANALYTICS_SORT_FIELDS).some(
    (field) => normalizeDataAnalyticsSortKey(field) === normalized
  );
}

export function toggleSortDirection(
  currentField: ReportBaseSortField,
  clickedField: ReportBaseSortField,
  currentDirection: ListSortDirection
): ListSortDirection {
  if (currentField !== clickedField) return "asc";
  return currentDirection === "asc" ? "desc" : "asc";
}
