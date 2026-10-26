import { get, post, del } from "../utils/CommonApi";
import {
  appendListPageQuery,
  appendSearchTextQuery,
} from "../types/listPageParam";
import type {
  PharmacyUserListParams,
} from "../dto/pharmacyUserDto";

export const getPharmacyUserApi = (params?: PharmacyUserListParams) => {
  const query = new URLSearchParams();
  const { searchText, pharmacyId, isActive, ...pageParams } = params ?? {};
  appendListPageQuery(query, pageParams);
  appendSearchTextQuery(query, searchText);
  if (pharmacyId) query.set("pharmacyId", pharmacyId);
  if (typeof isActive === "boolean") {
    query.set("isActive", String(isActive));
  }
  const qs = query.toString();
  return get(qs ? `/PharmacyUser?${qs}` : "/PharmacyUser");
};

export const getPharmacyUserByIdApi = (id: string) => get(`/PharmacyUser/${id}`);

export const savePharmacyUserApi = (data: any) =>
  post("/PharmacyUser/upsert", data);

export const deletePharmacyUserApi = (id: string) =>
  del(`/PharmacyUser/${id}`);

export const uploadPharmacyUserProfileImageApi = (
  file: File,
  userId?: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return post(`/PharmacyUser/upload-profile-image${qs}`, formData);
};
