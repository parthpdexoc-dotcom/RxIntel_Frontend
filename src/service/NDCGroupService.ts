import { get, post, del } from "../utils/CommonApi";
import type { NdcGroupMappingsDto } from "../dto/medicineMasterDto";

// 🔹 GET
export const getNdcGroupApi = () => get("/NDCGroup");
export const getSelectedNdcGroupMappingsApi = (parentMedicineId: string) =>
  get(`/NDCGroup/selected-mappings/${parentMedicineId}`);

// 🔹 POST (add/update)
export const saveNdcGroupApi = (data: any) =>
  post("/NDCGroup/upsert", data);
export const saveNdcGroupMappingsApi = (data: NdcGroupMappingsDto) =>
  post("/NDCGroup/save-mappings", data);

// 🔹 DELETE
export const deleteNdcGroupApi = (id: string) =>
  del(`/NDCGroup/${id}`);