import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { BillingDto, BillingListParams } from "../dto/billingDto";
import { toUpsertPayload } from "../dto/billingDto";

export type { BillingListParams };

export const getBillingApi = (params?: BillingListParams) => {
  const query = new URLSearchParams();
  const { searchText, importErrorFileId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (importErrorFileId) {
    query.set("importErrorFileId", importErrorFileId);
  }
  const qs = query.toString();
  return get(qs ? `/Billing?${qs}` : "/Billing");
};

export const getBillingColumnsApi = () =>
  get("/Billing/columns");

export const bulkUpsertBillingApi = (
  file: File | null,
  pharmacyId: string,
  pharmacySoftwareId?: string | null
) => {
  const formData = new FormData();
  if (file) formData.append("File", file);
  formData.append("PharmacyId", pharmacyId);
  if (pharmacySoftwareId) {
    formData.append("PharmacySoftwareId", pharmacySoftwareId);
  }
  return post("/Billing/bulk-upsert", formData);
};

export const saveBillingApi = (data: BillingDto) =>
  post("/Billing/upsert", toUpsertPayload(data));

export const deleteBillingApi = (id: string) =>
  del(`/Billing/${id}`);
