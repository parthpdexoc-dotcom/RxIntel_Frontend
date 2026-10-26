import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type { InsuranceDto, InsuranceListParams } from "../dto/insuranceDto";
import { toUpsertPayload } from "../dto/insuranceDto";

export const getInsuranceApi = (params?: InsuranceListParams) => {
  const query = new URLSearchParams();
  const { searchText, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (params?.uniqueInsuranceNames) {
    query.set("uniqueInsuranceNames", "true");
  }
  const qs = query.toString();
  return get(qs ? `/Insurance?${qs}` : "/Insurance");
};

export const getInsuranceDropdownApi = (id?: string) =>
  get(`/Insurance/dropdown${id ? `?Id=${id}` : ""}`);

export const saveInsuranceApi = (data: InsuranceDto) =>
  post("/Insurance/upsert", toUpsertPayload(data));

export const deleteInsuranceApi = (id: string) => del(`/Insurance/${id}`);
