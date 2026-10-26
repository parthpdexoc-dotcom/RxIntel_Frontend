import { get, post, put, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { ListPageParam } from "../types/listPageParam";

// ==========================================
// SIG & ABBREVIATIONS MAPPING APIS
// Dedicated service calling ErxSigMappingController (/api/sig-mapping)
// ==========================================

export type SigMappingListParams = ListPageParam & {
  searchTerm?: string;
  category?: string;
};

export const getSigMappingsApi = (params?: SigMappingListParams) => {
  const query = new URLSearchParams();
  const { searchTerm, category, ...pageParams } = params ?? {};
  appendListPageQuery(query, {
    page: pageParams.page ?? 1,
    pageSize: pageParams.pageSize ?? 10,
    sortBy: pageParams.sortBy,
    sortDirection: pageParams.sortDirection,
  });
  if (searchTerm?.trim()) {
    query.set("searchTerm", searchTerm.trim());
    appendSearchTextQuery(query, searchTerm);
  }
  if (category && category !== "All") query.set("category", category);
  return get(`/sig-mapping?${query.toString()}`);
};

export const getSigMappingByIdApi = (id: number) =>
  get(`/sig-mapping/${id}`);

export const createSigMappingApi = (data: any) =>
  post("/sig-mapping", data);

export const updateSigMappingApi = (id: number, data: any) =>
  put(`/sig-mapping/${id}`, data);

export const deleteSigMappingApi = (id: number) =>
  del(`/sig-mapping/${id}`);

export const toggleSigMappingActiveApi = (id: number) =>
  put(`/sig-mapping/${id}/toggle`, {});

export const testSigComparisonApi = (data: { erxSig: string; mmSig: string }) =>
  post("/sig-mapping/test-comparison", data);
