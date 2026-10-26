import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type {
  MedicineMasterDto,
  MedicineMasterListParams,
} from "../dto/medicineMasterDto";
import { toUpsertPayload } from "../dto/medicineMasterDto";

export type { MedicineMasterListParams };

export const getMedicineMasterApi = (params?: MedicineMasterListParams) => {
  const query = new URLSearchParams();
  const { searchText, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  const qs = query.toString();
  return get(qs ? `/Medicine?${qs}` : "/Medicine");
};

export type MedicineDropdownParams = MedicineMasterListParams & {
  parentMedicineId?: string;
};

export const getMedicineDropdownApi = (params?: MedicineDropdownParams) => {
  const query = new URLSearchParams();
  const { searchText, parentMedicineId, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (parentMedicineId?.trim()) query.set("Id", parentMedicineId.trim());
  const qs = query.toString();
  return get(qs ? `/Medicine/dropdown?${qs}` : "/Medicine/dropdown");
};

export const getMedicineByIdApi = (id: string) => get(`/Medicine/${id}`);

export const saveMedicineMasterApi = (data: MedicineMasterDto) =>
  post("/Medicine/upsert", toUpsertPayload(data));

export const deleteMedicineMasterApi = (id: string) =>
  del(`/Medicine/${id}`);
