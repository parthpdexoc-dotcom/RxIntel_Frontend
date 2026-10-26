import { get, post } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type {
  BillingFieldMappingListParams,
  BillingFieldMappingUpsertPayload,
} from "../dto/billingFieldMappingDto";

export type { BillingFieldMappingListParams };

/** GET list — optional pharmacySoftwareId returns all billing fields + saved mappings for that software. */
/** GET all billing field mappings for a pharmacy software (edit modal). */
export const getBillingFieldMappingByPharmacySoftwareApi = (pharmacySoftwareId: string) =>
  get(
    `/BillingFieldMapping/by-pharmacy-software?pharmacySoftwareId=${encodeURIComponent(
      pharmacySoftwareId
    )}`
  );

export const getBillingFieldMappingListApi = (params?: BillingFieldMappingListParams) => {
  const query = new URLSearchParams();
  const { searchText, pharmacySoftwareId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (pharmacySoftwareId) query.set("pharmacySoftwareId", pharmacySoftwareId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return get(`/BillingFieldMapping${suffix}`);
};

export const uploadBillingFieldMappingCsvPreviewApi = (
  file: File,
  pharmacySoftwareId: string
) => {
  const formData = new FormData();
  formData.append("File", file);
  formData.append("PharmacySoftwareId", pharmacySoftwareId);
  return post("/BillingFieldMapping/upload-csv-preview", formData);
};

export const bulkUpsertBillingFieldMappingApi = (
  mappings: BillingFieldMappingUpsertPayload[]
) => post("/BillingFieldMapping/bulk-upsert", mappings);
