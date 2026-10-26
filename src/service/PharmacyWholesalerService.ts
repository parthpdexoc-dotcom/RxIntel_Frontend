import { del, get, post } from "../utils/CommonApi";
import { appendListPageQuery } from "../types/listPageParam";
import type {
  PharmacyWholesalerListParams,
  PharmacyWholesalerUpsertPayload,
} from "../dto/pharmacyWholesalerDto";

export type { PharmacyWholesalerListParams };

export const getPharmacyWholesalerApi = (params?: PharmacyWholesalerListParams) => {
  const query = new URLSearchParams();
  const { pharmacyId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  if (pharmacyId) query.set("pharmacyId", pharmacyId);
  const qs = query.toString();
  return get(qs ? `/PharmacyWholesaler?${qs}` : "/PharmacyWholesaler");
};

export const savePharmacyWholesalerApi = (data: PharmacyWholesalerUpsertPayload) =>
  post("/PharmacyWholesaler/upsert", data);

export const deletePharmacyWholesalerApi = (id: string) =>
  del(`/PharmacyWholesaler/${id}`);
