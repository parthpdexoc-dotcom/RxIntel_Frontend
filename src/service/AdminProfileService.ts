import { get, post } from "../utils/CommonApi";

// 🔹 GET ADMIN BY ID  
export const getAdminApi = (id: string) =>
  get(`/Admin/${id}`);

// 🔹 POST (add / update)  
export const saveAdminApi = (data: any) =>
  post("/Admin/upsert", data);

export const uploadAdminProfileImageApi = (file: File, userId?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return post(`/Admin/upload-profile-image${qs}`, formData);
};