import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { PurchaseDto, PurchaseListParams } from "../dto/purchaseDto";
import { toUpsertPayload } from "../dto/purchaseDto";

export type { PurchaseListParams };

export const getPurchaseApi = (params?: PurchaseListParams) => {
  const query = new URLSearchParams();
  const { searchText, importErrorFileId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (importErrorFileId) {
    query.set("importErrorFileId", importErrorFileId);
  }
  const qs = query.toString();
  return get(qs ? `/Purchase?${qs}` : "/Purchase");
};

export const getPurchaseColumnsApi = () =>
  get("/Purchase/columns");

export const bulkUpsertPurchaseApi = (
  file: File | null,
  pharmacyId: string,
  wholesalerId: string
) => {
  const formData = new FormData();
  if (file) formData.append("File", file);
  formData.append("PharmacyId", pharmacyId);
  formData.append("WholesalerId", wholesalerId);
  return post("/Purchase/bulk-upsert", formData);
};

export const savePurchaseApi = (data: PurchaseDto) =>
  post("/Purchase/upsert", toUpsertPayload(data));

export const deletePurchaseApi = (id: string) =>
  del(`/Purchase/${id}`);
