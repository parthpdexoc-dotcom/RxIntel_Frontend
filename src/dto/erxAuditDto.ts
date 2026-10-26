export interface ErxAuditBatchDto {
  id?: string;
  batchId: string;
  pharmacyId?: string | null;
  pharmacyName?: string | null;
  pharmacyNpi?: string | null;
  fileName: string;
  uploadedBy?: string;
  uploadedAt: string;
  totalRows: number;
  totalDiscrepancies: number;
  status: string;
  createdDate: string;
}

export interface ErxAuditDiscrepancyDto {
  discrepancyId: number;
  recordId: number;
  batchId?: string;
  rxNumber: string;
  ruleId: number;
  fieldGroupName: string;
  mmColumnName: string;
  erxColumnName: string;
  mmValue?: string | null;
  erxValue?: string | null;
  status: string; // "Open" | "Reviewed" | "Ignored" | "Corrected"
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  remainingBatchDiscrepancies?: number;
  remainingRecordDiscrepancies?: number;
}

export interface ErxAuditRecordDto {
  id?: number;
  recordId: number;
  batchId: string;
  pharmacyId?: string | null;
  pharmacyName?: string | null;
  pharmacyNpi?: string | null;
  rxNumber: string;
  mmFillNumber?: string | null;
  erxRxNumber?: string | null;

  mmOrderDate?: string | null;
  erxOrderDate?: string | null;
  erxEffectiveDate?: string | null;
  mmDateFilled?: string | null;
  mmTimeFilled?: string | null;
  pickupDate?: string | null;
  erxReceivedDateTime?: string | null;

  paymentMethod?: string | null;
  insCode?: string | null;
  binNo?: string | null;
  totalInsPaid?: number | null;

  mmPatientName?: string | null;
  erxPatientName?: string | null;
  mmPatientDob?: string | null;
  erxPatientDob?: string | null;
  mmPatientPhone?: string | null;
  erxPatientPhone?: string | null;
  mmPatientAddress?: string | null;
  erxPatientAddress?: string | null;

  mmPrescriberName?: string | null;
  erxPrescriberName?: string | null;
  supervisorName?: string | null;
  mmPrescriberNpi?: string | null;
  erxPrescriberNpi?: string | null;
  mmPrescriberDea?: string | null;
  erxPrescriberDea?: string | null;

  mmDispensedDrugName?: string | null;
  erxDrugName?: string | null;
  mmPotencyUnitCode?: string | null;
  erxPotencyUnitCode?: string | null;
  mmDispensedNdc?: string | null;
  erxNdc?: string | null;

  mmQtyOrd?: number | null;
  erxQtyOrd?: number | null;
  mmQtyDispensed?: number | null;
  erxQtyDispensed?: number | null;
  mmDispensedDaysSupply?: number | null;
  erxDaysSupply?: number | null;
  erxBasedDaysSupply?: number | null;

  mmDispensedSig?: string | null;
  erxSig?: string | null;

  telephoneNotes?: string | null;
  telephoneNotesDate?: string | null;
  erxNotes?: string | null;
  erxNotesDate?: string | null;
  erxNotesCreatedBy?: string | null;

  mmDawCode?: string | null;
  erxDawCode?: string | null;
  mmRefillsPharmacistEntered?: number | null;
  erxRefill?: number | null;
  mmRphNotes?: string | null;
  mmSignatureCaptured?: boolean | null;
  followUpTag?: string | null;
  mmDelivery?: string | null;
  mmRxOrigin?: string | null;
  mmCopay?: number | null;
  durReasonCd?: string | null;
  durProfCd?: string | null;
  durResultCode?: string | null;
  message?: string | null;
  createdAt: string;

  discrepancyCount: number;
  hasDiscrepancy: boolean;
  discrepancies: ErxAuditDiscrepancyDto[];

  isInsurancePriority?: boolean;
  isHighValueClaim?: boolean;
  isNonElectronic?: boolean;
}

export interface ErxAuditFilterOptionsDto {
  paymentMethods: string[];
  insCodes: string[];
  insuranceCodes?: string[];
  binNos: string[];
  binNumbers?: string[];
  rxOrigins: string[];
  totalRecords: number;
  insurancePriorityCount: number;
  insuranceRecordCount?: number;
  highValueClaimCount: number;
  highValueRecordCount?: number;
  nonElectronicCount: number;
  nonElectronicRecordCount?: number;
}

export interface ErxColumnMatchRuleDto {
  id?: number;
  ruleId: number;
  fieldGroupName: string;
  mmColumnName: string;
  erxColumnName: string;
  matchType: string;
  toleranceValue?: number | null;
  insuranceCompanyId?: number | null;
  insuranceCompanyName?: string | null;
  insuranceCompanyIds?: number[];
  insuranceCompanyNames?: string[];
  isActive: boolean;
  createdDate?: string;
}

export interface InsuranceCompanyDto {
  insuranceCompanyId: number;
  name: string;
  isActive: boolean;
  binNumber?: string | null;
  insuranceId?: string | null;
}

export interface ErxAuditBatchUploadResponseDto {
  batchId: string;
  pharmacyId?: string | null;
  pharmacyName?: string | null;
  fileName: string;
  totalRows: number;
  totalDiscrepancies: number;
  discrepantRecordCount: number;
  message: string;
}

export interface ErxDiscrepancyColumnSummaryDto {
  ruleId: number;
  fieldGroupName: string;
  mmColumnName: string;
  erxColumnName: string;
  discrepancyCount: number;
  recordCount: number;
}

export interface BulkUpdateDiscrepancyStatusDto {
  discrepancyIds?: number[];
  recordIds?: number[];
  batchId?: string;
  discrepancyColumn?: string;
  ruleId?: number;
  status: string;
  reviewedBy?: string;
}

export interface BulkUpdateDiscrepancyResponseDto {
  updatedCount: number;
  remainingBatchDiscrepancies: number;
  message: string;
  affectedRecordIds: number[];
}

export interface ErxSigMappingDto {
  id: number;
  abbreviation: string;
  simpleEnglish: string;
  normalizedToken: string;
  category: string;
  clinicalContext?: string | null;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string | null;
}

export interface CreateErxSigMappingDto {
  abbreviation: string;
  simpleEnglish: string;
  normalizedToken?: string;
  category?: string;
  clinicalContext?: string | null;
}

export interface UpdateErxSigMappingDto {
  abbreviation: string;
  simpleEnglish: string;
  normalizedToken?: string;
  category?: string;
  clinicalContext?: string | null;
  isActive: boolean;
}

export interface TestSigComparisonRequestDto {
  erxSig: string;
  mmSig: string;
}

export interface TestSigComparisonResponseDto {
  erxSigRaw: string;
  mmSigRaw: string;
  erxNormalized: string;
  mmNormalized: string;
  erxSimpleEnglish: string;
  mmSimpleEnglish: string;
  isEquivalent: boolean;
  matchReason: string;
  confidenceScore?: number;
  evaluator?: string;
  latencyMs?: number;
}

export interface MuseDiscrepancySuggestionRequestDto {
  fieldName: string;
  mmValue?: string | null;
  erxValue?: string | null;
  discrepancyType?: string | null;
  rxNumber?: string | null;
  patientName?: string | null;
  patientDob?: string | null;
  prescriberName?: string | null;
  prescriberNpi?: string | null;
  prescriberDea?: string | null;
  supervisorName?: string | null;
  drugName?: string | null;
  ndc?: string | null;
  sig?: string | null;
  state?: string | null;
  ruleId?: number | null;
}

export interface MuseDiscrepancySuggestionResultDto {
  title: string;
  badges: string[];
  explanation: string;
  suggestedFix: string;
  regulatoryRisk?: string | null;
  detailedInfo?: string | null;
  confidence: number;
  source: string;
  fromCache: boolean;
}


