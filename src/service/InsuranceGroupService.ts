import { get, post, del } from "../utils/CommonApi";
import type { InsuranceGroupDto } from "../dto/insuranceDto";

export const saveInsuranceGroupMappingsApi = (data: InsuranceGroupDto[]) =>
  post("/InsuranceGroup/save-mappings", data);

export const getSelectedInsuranceGroupMappingsApi = (binNumber: string) =>
  get(`/InsuranceGroup/selected-mappings/${encodeURIComponent(binNumber)}`);

export const deleteInsuranceGroupMappingApi = (id: string) =>
  del(`/InsuranceGroup/${id}`);
