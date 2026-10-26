export interface TermsAndConditionsDto {
  id: string;
  content: string;
  createdDate?: string;
  modifiedDate?: string | null;
  updatedByAdminId?: string | null;
  updatedByAdminName?: string | null;
}

export interface TermsAndConditionsUpdateDto {
  content: string;
}
