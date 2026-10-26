import { get } from "../utils/CommonApi";
import api from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type {
  DataAnalyticsQueryParam,
  DataAnalyticsResponseDto,
} from "../dto/dataAnalyticsDto";
import { normalizeDataAnalyticsResponse } from "../dto/dataAnalyticsDto";

const appendStringList = (
  query: URLSearchParams,
  key: string,
  values?: string[]
) => {
  if (!values?.length) return;
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) query.append(key, trimmed);
  }
};

const appendSplitDateQuery = (
  query: URLSearchParams,
  params: Pick<
    DataAnalyticsQueryParam,
    | "splitDates"
    | "billingStartDate"
    | "billingEndDate"
    | "orderedStartDate"
    | "orderedEndDate"
    | "advancedView"
    | "netQuantityFilter"
    | "ndcSpecified"
  >
) => {
  if (params.splitDates) {
    query.set("splitDates", "true");
    if (params.billingStartDate) query.set("billingStartDate", params.billingStartDate);
    if (params.billingEndDate) query.set("billingEndDate", params.billingEndDate);
    if (params.orderedStartDate) query.set("orderedStartDate", params.orderedStartDate);
    if (params.orderedEndDate) query.set("orderedEndDate", params.orderedEndDate);
  }
  if (params.advancedView) {
    query.set("advancedView", "true");
  }
  if (params.netQuantityFilter) {
    query.set("netQuantityFilter", params.netQuantityFilter);
  }
  if (params.ndcSpecified) {
    query.set("ndcSpecified", "true");
  }
};

export const getDataAnalyticsApi = async (
  params: DataAnalyticsQueryParam
): Promise<{ data: DataAnalyticsResponseDto }> => {
  const query = new URLSearchParams();
  const {
    searchText,
    pharmacyId,
    startDate,
    endDate,
    splitDates,
    billingStartDate,
    billingEndDate,
    orderedStartDate,
    orderedEndDate,
    advancedView,
    netQuantityFilter,
    ndcSpecified,
    filterNdcs,
    filterProductNames,
    filterPackageSizes,
    filterInsuranceNames,
    ...pageParams
  } = params;

  query.set("pharmacyId", pharmacyId);
  query.set("startDate", startDate);
  query.set("endDate", endDate);
  appendSplitDateQuery(query, {
    splitDates,
    billingStartDate,
    billingEndDate,
    orderedStartDate,
    orderedEndDate,
    advancedView,
    netQuantityFilter,
    ndcSpecified,
  });
  appendStringList(query, "filterNdcs", filterNdcs);
  appendStringList(query, "filterProductNames", filterProductNames);
  appendStringList(query, "filterPackageSizes", filterPackageSizes);
  appendStringList(query, "filterInsuranceNames", filterInsuranceNames);
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);

  const res = await get(`/DataAnalytics?${query.toString()}`);
  return { data: normalizeDataAnalyticsResponse(res.data) };
};

const parseFilenameFromDisposition = (disposition: string | undefined): string | null => {
  if (!disposition) return null;

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i.exec(disposition);
  if (!match?.[1]) return null;

  return match[1].replace(/['"]/g, "").trim();
};

export const exportDataAnalyticsApi = async (
  params: DataAnalyticsQueryParam
): Promise<{ blob: Blob; filename: string }> => {
  const {
    searchText,
    pharmacyId,
    startDate,
    endDate,
    splitDates,
    billingStartDate,
    billingEndDate,
    orderedStartDate,
    orderedEndDate,
    selectedColumns,
    hiddenColumns,
    filterNdcs,
    ndcSpecified,
    filterProductNames,
    filterPackageSizes,
    filterInsuranceNames,
    advancedView,
    netQuantityFilter,
    sortBy,
    sortDirection,
  } = params;

  const payload = {
    pharmacyId,
    startDate,
    endDate,
    splitDates: Boolean(splitDates),
    billingStartDate: splitDates ? billingStartDate : undefined,
    billingEndDate: splitDates ? billingEndDate : undefined,
    orderedStartDate: splitDates ? orderedStartDate : undefined,
    orderedEndDate: splitDates ? orderedEndDate : undefined,
    searchText: searchText || undefined,
    selectedColumns: selectedColumns && selectedColumns.length > 0 ? selectedColumns : undefined,
    hiddenColumns: hiddenColumns && hiddenColumns.length > 0 ? hiddenColumns : undefined,
    filterNdcs: filterNdcs && filterNdcs.length > 0 ? filterNdcs : undefined,
    ndcSpecified: Boolean(ndcSpecified),
    filterProductNames:
      filterProductNames && filterProductNames.length > 0 ? filterProductNames : undefined,
    filterPackageSizes:
      filterPackageSizes && filterPackageSizes.length > 0 ? filterPackageSizes : undefined,
    filterInsuranceNames:
      filterInsuranceNames && filterInsuranceNames.length > 0
        ? filterInsuranceNames
        : undefined,
    advancedView: Boolean(advancedView),
    netQuantityFilter: netQuantityFilter || undefined,
    sortBy: sortBy?.trim() || undefined,
    sortDirection: sortDirection || undefined,
  };

  const res = await api.post("/DataAnalytics/export", payload, {
    responseType: "blob",
  });

  const filename =
    parseFilenameFromDisposition(res.headers["content-disposition"]) ??
    `DataAnalytics_${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}.xlsx`;

  return { blob: res.data as Blob, filename };
};
