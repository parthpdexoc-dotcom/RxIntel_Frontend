import type { ListPageParam } from "../types/listPageParam";
import type { PharmacyUserRole } from "../enums/PharmacyUserRole";

export interface PharmacyUserDto {
  id: string;
  pharmacyId: string;
  name?: string | null;
  userEmail?: string | null;
  password?: string | null;
  confirmPassword?: string | null;
  role: PharmacyUserRole;
  primaryContactName?: string | null;
  primaryContactTitle?: string | null;
  primaryContactPhone?: string | null;
  profileImage?: string | null;
  primaryWholesalerName?: string | null;
  primaryWholesalerContactName?: string | null;
  primaryWholesalerPhone?: string | null;
  primaryWholesalerEmail?: string | null;
  isActive: boolean;
  createdDate?: string | null;
  modifiedDate?: string | null;
}

export type PharmacyUserListParams = ListPageParam & {
  searchText?: string;
  pharmacyId?: string;
  isActive?: boolean;
};

export interface PharmacyUserPagedResponse {
  totalRecords: number;
  data: PharmacyUserDto[];
}
