import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { WholesalerDto, WholesalerListParams } from "../dto/wholesalerDto";
import { toUpsertPayload } from "../dto/wholesalerDto";

export type { WholesalerListParams };

export const getWholesalerByIdApi = (id: string) =>
  get(`/Wholesaler/${encodeURIComponent(id)}`);

export const getWholesalerApi = (params?: WholesalerListParams) => {
  const query = new URLSearchParams();
  const { searchText, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  const qs = query.toString();
  return get(qs ? `/Wholesaler?${qs}` : "/Wholesaler");
};

export const saveWholesalerApi = (data: WholesalerDto) =>
  post("/Wholesaler/upsert", toUpsertPayload(data));

export const deleteWholesalerApi = (id: string) =>
  del(`/Wholesaler/${id}`);
