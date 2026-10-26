import { get, post } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type {
  WholesalerFieldMappingListParams,
  WholesalerFieldMappingUpsertPayload,
} from "../dto/wholesalerFieldMappingDto";

export type { WholesalerFieldMappingListParams };

/** GET all wholesaler field mappings for a wholesaler (edit modal). */
export const getWholesalerFieldMappingByWholesalerApi = (wholesalerId: string) =>
  get(`/WholesalerFieldMapping/by-wholesaler?wholesalerId=${encodeURIComponent(wholesalerId)}`);

export const getWholesalerFieldMappingListApi = (
  params?: WholesalerFieldMappingListParams
) => {
  const query = new URLSearchParams();
  const { searchText, wholesalerId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (wholesalerId) query.set("wholesalerId", wholesalerId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return get(`/WholesalerFieldMapping${suffix}`);
};

export const uploadWholesalerFieldMappingCsvPreviewApi = (
  file: File,
  wholesalerId: string
) => {
  const formData = new FormData();
  formData.append("File", file);
  formData.append("WholesalerId", wholesalerId);
  return post("/WholesalerFieldMapping/upload-csv-preview", formData);
};

export const bulkUpsertWholesalerFieldMappingApi = (
  mappings: WholesalerFieldMappingUpsertPayload[]
) => post("/WholesalerFieldMapping/bulk-upsert", mappings);
