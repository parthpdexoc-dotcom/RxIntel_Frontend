import { get, post, del } from "../utils/CommonApi";
import { appendListPageQuery, appendSearchTextQuery } from "../types/listPageParam";
import type {
  PharmacySoftwareDto,
  PharmacySoftwareListParams,
} from "../dto/pharmacySoftwareDto";
import { toUpsertPayload } from "../dto/pharmacySoftwareDto";

export const getPharmacySoftwareByIdApi = (id: string) =>
  get(`/PharmacySoftware/${encodeURIComponent(id)}`);

export const getPharmacySoftwareApi = (params?: PharmacySoftwareListParams) => {
  const query = new URLSearchParams();
  const { searchText, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  const qs = query.toString();
  return get(qs ? `/PharmacySoftware?${qs}` : "/PharmacySoftware");
};

export const savePharmacySoftwareApi = (data: PharmacySoftwareDto) =>
  post("/PharmacySoftware/upsert", toUpsertPayload(data));

export const deletePharmacySoftwareApi = (id: string) =>
  del(`/PharmacySoftware/${id}`);
