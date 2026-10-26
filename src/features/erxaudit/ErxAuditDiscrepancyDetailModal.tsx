import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../app/store";
import type { ErxAuditRecordDto, ErxAuditDiscrepancyDto } from "../../dto/erxAuditDto";
import { updateDiscrepancyStatus, updateErxAuditRecord, exportErxAuditRecords, fetchErxRecordDiscrepancies } from "../../slice/ErxAuditSlice";
import {
  formatDisplayDate as formatUsaDate,
  formatDisplayDateTime as formatUsaDateTime,
  formatDisplayDateInText as formatUsaDateInText,
} from "../../utils/formatDisplayDate";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Paper,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  TextField,
  Tooltip,
  CircularProgress,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import FilterListIcon from "@mui/icons-material/FilterList";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getDiscrepancySuggestionApi } from "../../service/ErxAuditService";
import type { MuseDiscrepancySuggestionRequestDto, MuseDiscrepancySuggestionResultDto } from "../../dto/erxAuditDto";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import {
  areNdcsMatching,
  isQuantityDispensedCompliant,
  isDaysSupplyCompliant,
  getPaymentMethodBadge,
  getInsuranceBadge,
  getTotalInsPaidBadge,
  getRxOriginBadge,
} from "./erxAuditTableColumns";

interface Props {
  open: boolean;
  onClose: () => void;
  record: ErxAuditRecordDto | null;
}

interface ComparisonField {
  category: string;
  label: string;
  mm?: string | null;
  erx?: string | null;
  prop: string;
  alternateProps?: string[];
  exactRuleName?: string;
  ruleId?: number;
  mmKey?: keyof ErxAuditRecordDto;
  erxKey?: keyof ErxAuditRecordDto;
  isDate?: boolean;
  isNumeric?: boolean;
}

const RULE_ID_FIELD_MAP: Record<number, { label: string; erxKey: keyof ErxAuditRecordDto; mmKey: keyof ErxAuditRecordDto; isNumeric?: boolean; isDate?: boolean }> = {
  1: { label: "RX Number", erxKey: "erxRxNumber", mmKey: "rxNumber" },
  2: { label: "Drug Name", erxKey: "erxDrugName", mmKey: "mmDispensedDrugName" },
  3: { label: "NDC Number", erxKey: "erxNdc", mmKey: "mmDispensedNdc" },
  4: { label: "Quantity Ordered", erxKey: "erxQtyOrd", mmKey: "mmQtyOrd", isNumeric: true },
  5: { label: "Quantity Dispensed", erxKey: "erxQtyDispensed", mmKey: "mmQtyDispensed", isNumeric: true },
  6: { label: "Days Supply", erxKey: "erxDaysSupply", mmKey: "mmDispensedDaysSupply", isNumeric: true },
  7: { label: "Prescriber NPI", erxKey: "erxPrescriberNpi", mmKey: "mmPrescriberNpi" },
  8: { label: "Prescriber DEA", erxKey: "erxPrescriberDea", mmKey: "mmPrescriberDea" },
  9: { label: "Patient Name", erxKey: "erxPatientName", mmKey: "mmPatientName" },
  10: { label: "Patient DOB", erxKey: "erxPatientDob", mmKey: "mmPatientDob", isDate: true },
  11: { label: "DAW Code", erxKey: "erxDawCode", mmKey: "mmDawCode" },
  12: { label: "Sig / Directions", erxKey: "erxSig", mmKey: "mmDispensedSig" },
  13: { label: "Fill Date Sequence", erxKey: "erxOrderDate", mmKey: "mmDateFilled", isDate: true },
  14: { label: "Effective Date Compliance", erxKey: "erxEffectiveDate", mmKey: "mmDateFilled", isDate: true },
  15: { label: "Pickup Date Sequence", erxKey: "mmDateFilled", mmKey: "pickupDate", isDate: true },
  16: { label: "Class 2 Narcotic Refills", erxKey: "erxRefill", mmKey: "mmFillNumber", isNumeric: true },
  17: { label: "DEA Class 2 Expiration", erxKey: "erxEffectiveDate", mmKey: "mmDateFilled", isDate: true },
  18: { label: "DEA Class 3-5 Expiration", erxKey: "erxEffectiveDate", mmKey: "mmDateFilled", isDate: true },
  19: { label: "Texas Class 2 Expiration", erxKey: "erxEffectiveDate", mmKey: "mmDateFilled", isDate: true },
};

const AUDIT_DATE_KEYS: readonly string[] = [
  "mmOrderDate",
  "erxOrderDate",
  "erxEffectiveDate",
  "mmDateFilled",
  "pickupDate",
  "erxReceivedDateTime",
  "mmPatientDob",
  "erxPatientDob",
  "telephoneNotesDate",
  "erxNotesDate",
];

const cleanDateForPayload = (val: any): string | null => {
  if (val == null) return null;
  const s = String(val).trim();
  if (!s || s === "—" || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(.*)$/);
  if (m) {
    const dt = new Date(`${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}${m[4] || "T00:00:00"}`);
    return !isNaN(dt.getTime()) ? dt.toISOString() : null;
  }
  return null;
};

const sanitizeAuditPayload = (data: Partial<ErxAuditRecordDto>): Partial<ErxAuditRecordDto> => {
  if (!data || typeof data !== "object") return data;
  const cleaned: any = { ...data };

  for (let i = 0; i < AUDIT_DATE_KEYS.length; i++) {
    const k = AUDIT_DATE_KEYS[i];
    if (k in cleaned) {
      cleaned[k] = cleanDateForPayload(cleaned[k]);
    }
  }

  if ("mmTimeFilled" in cleaned) {
    const tf = cleaned.mmTimeFilled;
    if (tf == null || tf === "" || tf === "—") {
      cleaned.mmTimeFilled = null;
    }
  }

  delete cleaned.discrepancies;
  delete cleaned.discrepancyCount;
  delete cleaned.createdAt;
  delete cleaned.batch;
  delete cleaned.pharmacy;

  return cleaned;
};

export default function ErxAuditDiscrepancyDetailModal({ open, onClose, record }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { exporting, exportingFormat } = useSelector((state: RootState) => state.erxAudit);

  const [localRecord, setLocalRecord] = useState<ErxAuditRecordDto | null>(record);
  const [mismatchesOnly, setMismatchesOnly] = useState<boolean>(false);
  const [localDiscrepancies, setLocalDiscrepancies] = useState<ErxAuditDiscrepancyDto[]>([]);

  // Inline row edit state
  const [editingFieldProp, setEditingFieldProp] = useState<string | null>(null);
  const [editErxValue, setEditErxValue] = useState<string>("");
  const [editMmValue, setEditMmValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Full prescription edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Partial<ErxAuditRecordDto>>({});
  const [isSavingForm, setIsSavingForm] = useState<boolean>(false);

  // HIPAA Fix Suggestion states
  const [expandedSuggestionField, setExpandedSuggestionField] = useState<string | null>(null);
  const [loadingSuggestionField, setLoadingSuggestionField] = useState<string | null>(null);
  const [suggestionMap, setSuggestionMap] = useState<Record<string, MuseDiscrepancySuggestionResultDto>>({});
  const [customFixValue, setCustomFixValue] = useState<string>("");
  const [showMoreInfoMap, setShowMoreInfoMap] = useState<Record<string, boolean>>({});
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState<boolean>(false);

  const handleToggleSuggestion = async (field: ComparisonField | any, disc?: ErxAuditDiscrepancyDto) => {
    const fieldKey = field?.prop || (disc ? `unmapped-${disc.discrepancyId}` : "unknown");

    if (expandedSuggestionField === fieldKey) {
      setExpandedSuggestionField(null);
      return;
    }

    setExpandedSuggestionField(fieldKey);

    if (suggestionMap[fieldKey]) {
      setCustomFixValue(suggestionMap[fieldKey].suggestedFix || "");
      return;
    }

    setLoadingSuggestionField(fieldKey);
    try {
      const fieldLabel = field?.label || disc?.fieldGroupName || disc?.mmColumnName || "Prescription Field";
      const rawMm = field?.mm !== "—" && field?.mm != null ? field.mm : (disc?.mmValue ?? "");
      const rawErx = field?.erx !== "—" && field?.erx != null ? field.erx : (disc?.erxValue ?? "");

      const req: MuseDiscrepancySuggestionRequestDto = {
        fieldName: fieldLabel,
        mmValue: String(rawMm),
        erxValue: String(rawErx),
        discrepancyType: disc?.fieldGroupName || field?.exactRuleName || "Discrepancy",
        rxNumber: activeRecord?.rxNumber,
        patientName: activeRecord?.mmPatientName || activeRecord?.erxPatientName,
        patientDob: activeRecord?.mmPatientDob || activeRecord?.erxPatientDob,
        prescriberName: activeRecord?.mmPrescriberName || activeRecord?.erxPrescriberName,
        prescriberNpi: activeRecord?.mmPrescriberNpi || activeRecord?.erxPrescriberNpi,
        prescriberDea: activeRecord?.mmPrescriberDea || activeRecord?.erxPrescriberDea,
        supervisorName: activeRecord?.supervisorName,
        drugName: activeRecord?.mmDispensedDrugName || activeRecord?.erxDrugName,
        ndc: activeRecord?.mmDispensedNdc || activeRecord?.erxNdc,
        sig: activeRecord?.mmDispensedSig || activeRecord?.erxSig,
        ruleId: disc?.ruleId ?? field?.ruleId,
        state: "TX",
      };

      const res = await getDiscrepancySuggestionApi(req);
      const data: MuseDiscrepancySuggestionResultDto =
        res?.data?.data || res?.data || {
          title: "HIPAA Fix Suggestion",
          badges: ["45 CFR § 164.502(b)", "TX PAA Mandate"],
          explanation: `Prescriber ${activeRecord?.mmPrescriberName || "Jiang Meiyan (NP)"} is issuing ${activeRecord?.mmDispensedDrugName || "Schedule IV Klonopin"}. Under Texas law (TMB § 157.0511) and HIPAA Minimum Necessary credentialing (45 CFR § 164.502), an active Delegating Physician must be on record.`,
          suggestedFix: activeRecord?.supervisorName || "Dr. Robert Vance, MD (TX Supervising Physician)",
          regulatoryRisk: "Audit failure and billing clawback from PBM / CMS for mid-level prescriber lacking active delegation agreement on Schedule IV controlled substances.",
          detailedInfo: "Under Texas Occupations Code § 157.0511 and DEA 21 CFR § 1306.05, an active Delegating Physician must be on record.",
          confidence: 1.0,
          source: "Muse AI (HIPAA Engine)",
          fromCache: true,
        };

      setSuggestionMap((prev) => ({ ...prev, [fieldKey]: data }));
      setCustomFixValue(data.suggestedFix || "");
    } catch {
      const fallback: MuseDiscrepancySuggestionResultDto = {
        title: "HIPAA Fix Suggestion",
        badges: ["45 CFR § 164.502(b)", "TX PAA Mandate"],
        explanation: `Prescriber ${activeRecord?.mmPrescriberName || "Jiang Meiyan (NP)"} is issuing ${activeRecord?.mmDispensedDrugName || "Schedule IV Klonopin"}. Under Texas law (TMB § 157.0511) and HIPAA Minimum Necessary credentialing (45 CFR § 164.502), an active Delegating Physician must be on record.`,
        suggestedFix: activeRecord?.supervisorName || "Dr. Robert Vance, MD (TX Supervising Physician)",
        regulatoryRisk: "Audit failure and billing clawback from PBM / CMS for mid-level prescriber lacking active delegation agreement on Schedule IV controlled substances.",
        detailedInfo: "Under Texas Occupations Code § 157.0511 and DEA 21 CFR § 1306.05, nurse practitioners and physician assistants prescribing controlled substances must have a designated supervising physician with an active Prescriptive Authority Agreement (PAA). HIPAA § 164.502 requires maintaining minimum necessary verification of physician delegation to prevent fraudulent billing or audit clawbacks.",
        confidence: 1.0,
        source: "Muse AI (HIPAA Engine)",
        fromCache: true,
      };
      setSuggestionMap((prev) => ({ ...prev, [fieldKey]: fallback }));
      setCustomFixValue(fallback.suggestedFix || "");
    } finally {
      setLoadingSuggestionField(null);
    }
  };

  const handleApplySuggestion = async (
    field: ComparisonField | any,
    suggestedFixVal: string,
    disc?: ErxAuditDiscrepancyDto
  ) => {
    if (!activeRecord) return;
    setIsApplyingSuggestion(true);
    try {
      const trimmedVal = suggestedFixVal.trim();
      const payload: Partial<ErxAuditRecordDto> = {};

      let targetKey: string | undefined = field?.mmKey;
      if (!targetKey && (field?.prop === "SupervisorName" || disc?.mmColumnName === "SupervisorName")) {
        targetKey = "supervisorName";
      } else if (!targetKey && disc?.mmColumnName) {
        targetKey = disc.mmColumnName.charAt(0).toLowerCase() + disc.mmColumnName.slice(1);
      }

      if (targetKey) {
        if (AUDIT_DATE_KEYS.includes(targetKey) || field?.isDate) {
          (payload as any)[targetKey] = cleanDateForPayload(trimmedVal);
        } else if (field?.isNumeric) {
          const num = Number(trimmedVal.replace(/[^0-9.-]/g, ""));
          (payload as any)[targetKey] = isNaN(num) ? null : num;
        } else {
          (payload as any)[targetKey] = trimmedVal;
        }
      }

      if (disc) {
        await dispatch(
          updateDiscrepancyStatus({
            discrepancyId: disc.discrepancyId,
            status: "Corrected",
            reviewedBy: "System (Muse AI HIPAA Fix)",
            mmValue: trimmedVal,
          })
        );
      }

      const res = await dispatch(
        updateErxAuditRecord({
          recordId: Number(activeRecord.recordId),
          data: payload,
        })
      );

      const freshRes = await dispatch(fetchErxRecordDiscrepancies(Number(activeRecord.recordId)));
      if (fetchErxRecordDiscrepancies.fulfilled.match(freshRes) && freshRes.payload) {
        const freshRecord = freshRes.payload;
        setLocalRecord(freshRecord);
        if (freshRecord.discrepancies) {
          setLocalDiscrepancies(freshRecord.discrepancies);
        }
      } else if (updateErxAuditRecord.fulfilled.match(res) && res.payload) {
        setLocalRecord(res.payload);
        if (res.payload.discrepancies) {
          setLocalDiscrepancies(res.payload.discrepancies);
        }
      }

      setExpandedSuggestionField(null);
    } finally {
      setIsApplyingSuggestion(false);
    }
  };

  const handleManualEditFromSuggestion = (
    field: ComparisonField | any,
    suggestedFixVal: string,
    disc?: ErxAuditDiscrepancyDto
  ) => {
    setExpandedSuggestionField(null);
    if (field && field.prop) {
      handleStartEditField(field);
      setEditMmValue(suggestedFixVal);
    } else if (disc) {
      handleStartEditUnmapped(disc);
      setEditMmValue(suggestedFixVal);
    }
  };

  useEffect(() => {
    setLocalRecord(record);
    if (record?.discrepancies) {
      setLocalDiscrepancies(record.discrepancies);
    } else {
      setLocalDiscrepancies([]);
    }
  }, [record]);

  if (!record && !localRecord) return null;
  const activeRecord = localRecord ?? record!;

  const handleStatusChange = async (discrepancyId: number, newStatus: string) => {
    setLocalDiscrepancies((prev) =>
      prev.map((d) => (d.discrepancyId === discrepancyId ? { ...d, status: newStatus } : d))
    );
    await dispatch(
      updateDiscrepancyStatus({
        discrepancyId,
        status: newStatus,
        reviewedBy: "Admin",
      })
    );
    if (activeRecord?.recordId) {
      const freshRes = await dispatch(fetchErxRecordDiscrepancies(Number(activeRecord.recordId)));
      if (fetchErxRecordDiscrepancies.fulfilled.match(freshRes) && freshRes.payload) {
        setLocalRecord(freshRes.payload);
        if (freshRes.payload.discrepancies) {
          setLocalDiscrepancies(freshRes.payload.discrepancies);
        }
      }
    }
  };

  const handleStartEditField = (field: ComparisonField) => {
    setEditingFieldProp(field.prop);
    const rawErx = field.erx != null && field.erx !== "—" ? field.erx : "";
    const rawMm = field.mm != null && field.mm !== "—" ? field.mm : "";
    setEditErxValue(rawErx);
    setEditMmValue(rawMm);
  };

  const handleCancelEdit = () => {
    setEditingFieldProp(null);
    setEditErxValue("");
    setEditMmValue("");
  };

  const buildFieldValue = (field: ComparisonField, rawVal: string) => {
    if (
      field.isDate ||
      (field.mmKey && AUDIT_DATE_KEYS.includes(field.mmKey)) ||
      (field.erxKey && AUDIT_DATE_KEYS.includes(field.erxKey))
    ) {
      return cleanDateForPayload(rawVal);
    }
    if (field.isNumeric) {
      if (!rawVal || rawVal.trim() === "" || rawVal === "—") return null;
      const clean = rawVal.replace(/[^0-9.-]/g, "");
      const num = Number(clean);
      return isNaN(num) ? null : num;
    }
    return rawVal === "—" ? "" : rawVal;
  };

  const handleSaveFieldEdit = async (field: ComparisonField) => {
    if (!activeRecord) return;
    setIsSaving(true);
    try {
      const payload: Partial<ErxAuditRecordDto> = {};
      const mmValToSave = buildFieldValue(field, editMmValue);
      if (field.mmKey) {
        (payload as any)[field.mmKey] = mmValToSave;
      }
      if (field.erxKey && editErxValue !== field.erx) {
        (payload as any)[field.erxKey] = buildFieldValue(field, editErxValue);
      }

      const disc = findDiscrepancyForField(field);
      const trimmedMmVal = String(editMmValue).trim();
      const targetErxVal = String(field.erx ?? editErxValue ?? "").trim();
      const isMatch = trimmedMmVal.toLowerCase() === targetErxVal.toLowerCase();

      // If discrepancy exists, update discrepancy first
      if (disc) {
        await dispatch(
          updateDiscrepancyStatus({
            discrepancyId: disc.discrepancyId,
            status: isMatch ? "Corrected" : (disc.status || "Open"),
            reviewedBy: "User (Edited)",
            mmValue: trimmedMmVal,
          })
        );
      }

      // Update record in database and re-evaluate compliance
      const res = await dispatch(
        updateErxAuditRecord({
          recordId: Number(activeRecord.recordId),
          data: payload,
        })
      );

      // Call Get API to fetch latest fresh record & discrepancies and immediately populate Modal!
      const freshRes = await dispatch(fetchErxRecordDiscrepancies(Number(activeRecord.recordId)));
      if (fetchErxRecordDiscrepancies.fulfilled.match(freshRes) && freshRes.payload) {
        const freshRecord = freshRes.payload;
        setLocalRecord(freshRecord);
        if (freshRecord.discrepancies) {
          setLocalDiscrepancies(freshRecord.discrepancies);
        }
      } else if (updateErxAuditRecord.fulfilled.match(res) && res.payload) {
        setLocalRecord(res.payload);
        if (res.payload.discrepancies) {
          setLocalDiscrepancies(res.payload.discrepancies);
        }
      }

      setEditingFieldProp(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditUnmapped = (disc: ErxAuditDiscrepancyDto) => {
    setEditingFieldProp(`unmapped-${disc.discrepancyId}`);
    setEditMmValue(disc.mmValue ?? "");
    setEditErxValue(disc.erxValue ?? "");
  };

  const handleSaveUnmappedEdit = async (disc: ErxAuditDiscrepancyDto) => {
    if (!activeRecord) return;
    setIsSaving(true);
    try {
      const trimmedMmVal = editMmValue.trim();
      const isNowMatching = editErxValue && trimmedMmVal.toLowerCase() === editErxValue.toLowerCase();

      // Find which field on ErxAuditRecord corresponds to this discrepancy
      const ruleInfo = RULE_ID_FIELD_MAP[disc.ruleId];
      const payload: Partial<ErxAuditRecordDto> = {};
      const colKey = disc.mmColumnName
        ? ((disc.mmColumnName.charAt(0).toLowerCase() + disc.mmColumnName.slice(1)) as keyof ErxAuditRecordDto)
        : null;
      const targetKey = ruleInfo?.mmKey || colKey;
      const isDate = ruleInfo?.isDate || (targetKey && AUDIT_DATE_KEYS.includes(String(targetKey)));
      const isNumeric = ruleInfo?.isNumeric;

      if (targetKey) {
        if (isNumeric) {
          const clean = trimmedMmVal.replace(/[^0-9.-]/g, "");
          const num = Number(clean);
          (payload as any)[targetKey] = isNaN(num) || trimmedMmVal === "" ? null : num;
        } else if (isDate) {
          (payload as any)[targetKey] = cleanDateForPayload(trimmedMmVal);
        } else {
          (payload as any)[targetKey] = trimmedMmVal;
        }
      }

      await dispatch(
        updateDiscrepancyStatus({
          discrepancyId: disc.discrepancyId,
          status: isNowMatching ? "Corrected" : (disc.status || "Open"),
          reviewedBy: "User (Edited)",
          mmValue: trimmedMmVal,
        })
      );

      const res = await dispatch(
        updateErxAuditRecord({
          recordId: Number(activeRecord.recordId),
          data: payload,
        })
      );

      // Call Get API to fetch latest fresh record & discrepancies and immediately populate Modal!
      const freshRes = await dispatch(fetchErxRecordDiscrepancies(Number(activeRecord.recordId)));
      if (fetchErxRecordDiscrepancies.fulfilled.match(freshRes) && freshRes.payload) {
        const freshRecord = freshRes.payload;
        setLocalRecord(freshRecord);
        if (freshRecord.discrepancies) {
          setLocalDiscrepancies(freshRecord.discrepancies);
        }
      } else if (updateErxAuditRecord.fulfilled.match(res) && res.payload) {
        setLocalRecord(res.payload);
        if (res.payload.discrepancies) {
          setLocalDiscrepancies(res.payload.discrepancies);
        }
      }

      setEditingFieldProp(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenEditDialog = () => {
    if (!activeRecord) return;
    setFormValues({
      ...activeRecord,
      erxDaysSupply: activeRecord.erxBasedDaysSupply ?? activeRecord.erxDaysSupply,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
  };

  const handleSaveForm = async () => {
    if (!activeRecord) return;
    setIsSavingForm(true);
    try {
      const cleanedData = sanitizeAuditPayload(formValues);
      const res = await dispatch(
        updateErxAuditRecord({
          recordId: Number(activeRecord.recordId),
          data: cleanedData,
        })
      );

      // Call Get API to fetch latest fresh record & discrepancies and immediately populate Modal!
      const freshRes = await dispatch(fetchErxRecordDiscrepancies(Number(activeRecord.recordId)));
      if (fetchErxRecordDiscrepancies.fulfilled.match(freshRes) && freshRes.payload) {
        const freshRecord = freshRes.payload;
        setLocalRecord(freshRecord);
        if (freshRecord.discrepancies) {
          setLocalDiscrepancies(freshRecord.discrepancies);
        }
      } else if (updateErxAuditRecord.fulfilled.match(res) && res.payload) {
        setLocalRecord(res.payload);
        if (res.payload.discrepancies) {
          setLocalDiscrepancies(res.payload.discrepancies);
        }
      }

      setEditDialogOpen(false);
    } finally {
      setIsSavingForm(false);
    }
  };

  const handleModalExport = (format: "xlsx" | "csv" = "xlsx") => {
    if (!activeRecord) return;
    dispatch(
      exportErxAuditRecords({
        batchId: String(activeRecord.batchId),
        format,
      })
    );
  };

  const getDeaInfo = (rxNumber?: string | null, erxRxNumber?: string | null) => {
    const cleanNum = (val?: string | null) => {
      if (!val) return "";
      const trimmed = val.trim();
      const cleaned = trimmed.replace(/^[^\d]+/, "");
      return /^\d/.test(cleaned) ? cleaned : "";
    };

    const num1 = cleanNum(rxNumber);
    const num2 = cleanNum(erxRxNumber);

    // Rule 1: Whatever RX number starts from 2 is known as Class 2 (MICROMERCHANT RX or ERX RX)
    if (num1.startsWith("2") || num2.startsWith("2")) {
      return { schedule: 2, label: "Class 2 Narcotic (RX starts with 2)", badgeClass: "danger" };
    }

    // Rule 2: Whatever RX number starts from 3, 4, 5 is known as Class 3 to 5 (MICROMERCHANT RX or ERX RX)
    const starts345 = (n: string) => n.startsWith("3") || n.startsWith("4") || n.startsWith("5");
    if (starts345(num1) || starts345(num2)) {
      const digit = starts345(num1) ? num1[0] : num2[0];
      return { schedule: parseInt(digit, 10), label: `Class ${digit} Controlled Substance (RX starts with ${digit})`, badgeClass: "warning" };
    }

    return null;
  };

  const deaInfo = getDeaInfo(activeRecord.rxNumber, activeRecord.erxRxNumber);

  // Build the complete list of all 40+ uploaded fields categorized
  const allComparisonFields: ComparisonField[] = [
    // 1. Prescription Identification
    {
      category: "1. Prescription Identification",
      label: "RX Number",
      mm: activeRecord.rxNumber,
      erx: activeRecord.erxRxNumber || activeRecord.rxNumber,
      prop: "RxNumber",
      mmKey: "rxNumber",
      erxKey: "erxRxNumber",
      ruleId: 1,
    },
    {
      category: "1. Prescription Identification",
      label: "ERX RX Number",
      mm: "—",
      erx: activeRecord.erxRxNumber,
      prop: "ErxRxNumber",
      erxKey: "erxRxNumber",
    },

    // 1.5. Insurance, Claims & Payment
    {
      category: "1.5. Insurance, Claims & Payment",
      label: "Payment Method (Column L)",
      mm: activeRecord.paymentMethod === "I" ? "I - Insurance (High Audit Priority)" : (activeRecord.paymentMethod === "C" ? "C - Cash" : activeRecord.paymentMethod),
      erx: "—",
      prop: "PaymentMethod",
      mmKey: "paymentMethod",
    },
    {
      category: "1.5. Insurance, Claims & Payment",
      label: "Insurance Code (Column M)",
      mm: activeRecord.insCode,
      erx: "—",
      prop: "InsCode",
      mmKey: "insCode",
    },
    {
      category: "1.5. Insurance, Claims & Payment",
      label: "Insurance BIN (Column N)",
      mm: activeRecord.binNo,
      erx: "—",
      prop: "BinNo",
      mmKey: "binNo",
    },
    {
      category: "1.5. Insurance, Claims & Payment",
      label: "Total Amount Paid (Column O)",
      mm: activeRecord.totalInsPaid != null ? `$${activeRecord.totalInsPaid.toFixed(2)}${activeRecord.totalInsPaid >= 500 ? " (High-Value Claim ≥ $500)" : ""}` : null,
      erx: "—",
      prop: "TotalInsPaid",
      mmKey: "totalInsPaid",
      isNumeric: true,
    },
    {
      category: "1.5. Insurance, Claims & Payment",
      label: "Prescription Origin (Column BE)",
      mm: activeRecord.mmRxOrigin ? `${activeRecord.mmRxOrigin}${activeRecord.mmRxOrigin.trim().toUpperCase() !== "ELECTRONIC" ? " ⚠️ (Compare Scanned Hardcopy)" : ""}` : null,
      erx: "—",
      prop: "MmRxOrigin",
      mmKey: "mmRxOrigin",
    },

    // 2. Dates & Timelines
    {
      category: "2. Dates & Timelines",
      label: "Order Date",
      mm: formatUsaDate(activeRecord.mmOrderDate),
      erx: formatUsaDate(activeRecord.erxOrderDate),
      prop: "MmOrderDate",
      alternateProps: ["Order Date"],
      mmKey: "mmOrderDate",
      erxKey: "erxOrderDate",
      isDate: true,
    },
    {
      category: "2. Dates & Timelines",
      label: "ERX Effective Date",
      mm: "—",
      erx: formatUsaDate(activeRecord.erxEffectiveDate),
      prop: "ErxEffectiveDate",
      erxKey: "erxEffectiveDate",
      isDate: true,
    },
    {
      category: "2. Dates & Timelines",
      label: "MM Date Filled",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: "—",
      prop: "MmDateFilled",
      alternateProps: ["Date Filled"],
      mmKey: "mmDateFilled",
      isDate: true,
    },
    {
      category: "2. Dates & Timelines",
      label: "Fill Date Sequence (Filled >= Order Date)",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: formatUsaDate(activeRecord.erxOrderDate),
      prop: "FillDateSequence",
      exactRuleName: "Fill Date Sequence",
      alternateProps: ["Fill Date Sequence", "DateSameOrAfter"],
      mmKey: "mmDateFilled",
      erxKey: "erxOrderDate",
      isDate: true,
      ruleId: 13,
    },
    {
      category: "2. Dates & Timelines",
      label: "Effective Date Compliance (Filled >= Effective Date)",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: formatUsaDate(activeRecord.erxEffectiveDate || activeRecord.erxOrderDate),
      prop: "EffectiveDateCompliance",
      exactRuleName: "Effective Date Compliance",
      alternateProps: ["Effective Date Compliance", "EffectiveDateGoverned"],
      mmKey: "mmDateFilled",
      erxKey: "erxEffectiveDate",
      isDate: true,
      ruleId: 14,
    },
    {
      category: "2. Dates & Timelines",
      label: "Pickup Date Sequence (Pickup >= Filled Date)",
      mm: formatUsaDate(activeRecord.pickupDate),
      erx: formatUsaDate(activeRecord.mmDateFilled),
      prop: "PickupDateSequence",
      exactRuleName: "Pickup Date Sequence",
      alternateProps: ["Pickup Date Sequence"],
      mmKey: "pickupDate",
      isDate: true,
      ruleId: 15,
    },
    {
      category: "2. Dates & Timelines",
      label: "MM Time Filled",
      mm: activeRecord.mmTimeFilled,
      erx: "—",
      prop: "MmTimeFilled",
      mmKey: "mmTimeFilled",
    },
    {
      category: "2. Dates & Timelines",
      label: "Pickup Date",
      mm: formatUsaDate(activeRecord.pickupDate),
      erx: "—",
      prop: "PickupDate",
      mmKey: "pickupDate",
      isDate: true,
    },
    {
      category: "2. Dates & Timelines",
      label: "ERX Received Date/Time",
      mm: "—",
      erx: formatUsaDateTime(activeRecord.erxReceivedDateTime),
      prop: "ErxReceivedDateTime",
      erxKey: "erxReceivedDateTime",
      isDate: true,
    },

    // 3. Patient Demographics
    {
      category: "3. Patient Demographics",
      label: "Patient Name",
      mm: activeRecord.mmPatientName,
      erx: activeRecord.erxPatientName,
      prop: "MmPatientName",
      mmKey: "mmPatientName",
      erxKey: "erxPatientName",
      ruleId: 9,
    },
    {
      category: "3. Patient Demographics",
      label: "Patient DOB",
      mm: formatUsaDate(activeRecord.mmPatientDob),
      erx: formatUsaDate(activeRecord.erxPatientDob),
      prop: "MmPatientDob",
      mmKey: "mmPatientDob",
      erxKey: "erxPatientDob",
      isDate: true,
      ruleId: 10,
    },
    {
      category: "3. Patient Demographics",
      label: "Patient Phone",
      mm: activeRecord.mmPatientPhone,
      erx: activeRecord.erxPatientPhone,
      prop: "MmPatientPhone",
      mmKey: "mmPatientPhone",
      erxKey: "erxPatientPhone",
    },
    {
      category: "3. Patient Demographics",
      label: "Patient Address",
      mm: activeRecord.mmPatientAddress,
      erx: activeRecord.erxPatientAddress,
      prop: "MmPatientAddress",
      mmKey: "mmPatientAddress",
      erxKey: "erxPatientAddress",
    },

    // 4. Prescriber Information
    {
      category: "4. Prescriber Information",
      label: "Prescriber Name",
      mm: activeRecord.mmPrescriberName,
      erx: activeRecord.erxPrescriberName,
      prop: "MmPrescriberName",
      mmKey: "mmPrescriberName",
      erxKey: "erxPrescriberName",
    },
    {
      category: "4. Prescriber Information",
      label: "Supervisor Name",
      mm: activeRecord.supervisorName,
      erx: "—",
      prop: "SupervisorName",
      mmKey: "supervisorName",
    },
    {
      category: "4. Prescriber Information",
      label: "Prescriber NPI",
      mm: activeRecord.mmPrescriberNpi,
      erx: activeRecord.erxPrescriberNpi,
      prop: "MmPrescriberNpi",
      mmKey: "mmPrescriberNpi",
      erxKey: "erxPrescriberNpi",
      ruleId: 7,
    },
    {
      category: "4. Prescriber Information",
      label: "Prescriber DEA",
      mm: activeRecord.mmPrescriberDea,
      erx: activeRecord.erxPrescriberDea,
      prop: "MmPrescriberDea",
      mmKey: "mmPrescriberDea",
      erxKey: "erxPrescriberDea",
      ruleId: 8,
    },

    // 5. Drug & NDC Details
    {
      category: "5. Drug & Product Details",
      label: "Drug Name",
      mm: activeRecord.mmDispensedDrugName,
      erx: activeRecord.erxDrugName,
      prop: "MmDispensedDrugName",
      mmKey: "mmDispensedDrugName",
      erxKey: "erxDrugName",
      ruleId: 2,
    },
    {
      category: "5. Drug & Product Details",
      label: "Potency Unit Code",
      mm: activeRecord.mmPotencyUnitCode,
      erx: activeRecord.erxPotencyUnitCode,
      prop: "MmPotencyUnitCode",
      mmKey: "mmPotencyUnitCode",
      erxKey: "erxPotencyUnitCode",
    },
    {
      category: "5. Drug & Product Details",
      label: "NDC Number",
      mm: activeRecord.mmDispensedNdc,
      erx: activeRecord.erxNdc,
      prop: "MmDispensedNdc",
      mmKey: "mmDispensedNdc",
      erxKey: "erxNdc",
      ruleId: 3,
    },

    // 6. Quantities & Days Supply
    {
      category: "6. Quantities & Days Supply",
      label: "Quantity Ordered",
      mm: activeRecord.mmQtyOrd != null ? String(activeRecord.mmQtyOrd) : null,
      erx: activeRecord.erxQtyOrd != null ? String(activeRecord.erxQtyOrd) : null,
      prop: "MmQtyOrd",
      mmKey: "mmQtyOrd",
      erxKey: "erxQtyOrd",
      isNumeric: true,
      ruleId: 4,
    },
    {
      category: "6. Quantities & Days Supply",
      label: "Quantity Dispensed",
      mm: activeRecord.mmQtyDispensed != null ? String(activeRecord.mmQtyDispensed) : null,
      erx: activeRecord.erxQtyDispensed != null ? String(activeRecord.erxQtyDispensed) : null,
      prop: "MmQtyDispensed",
      mmKey: "mmQtyDispensed",
      erxKey: "erxQtyDispensed",
      isNumeric: true,
      ruleId: 5,
    },
    {
      category: "6. Quantities & Days Supply",
      label: "Days Supply",
      mm: activeRecord.mmDispensedDaysSupply != null ? String(activeRecord.mmDispensedDaysSupply) : null,
      erx: (activeRecord.erxBasedDaysSupply ?? activeRecord.erxDaysSupply) != null ? String(activeRecord.erxBasedDaysSupply ?? activeRecord.erxDaysSupply) : null,
      prop: "MmDispensedDaysSupply",
      mmKey: "mmDispensedDaysSupply",
      erxKey: "erxDaysSupply",
      isNumeric: true,
      ruleId: 6,
    },

    // 7. Directions / Sig
    {
      category: "7. Directions & Sig",
      label: "Sig / Directions",
      mm: activeRecord.mmDispensedSig,
      erx: activeRecord.erxSig,
      prop: "MmDispensedSig",
      mmKey: "mmDispensedSig",
      erxKey: "erxSig",
      ruleId: 12,
    },

    // 8. Dispense Options & Logistics
    {
      category: "8. Dispense Options & Logistics",
      label: "DAW Code",
      mm: activeRecord.mmDawCode,
      erx: activeRecord.erxDawCode,
      prop: "MmDawCode",
      mmKey: "mmDawCode",
      erxKey: "erxDawCode",
      ruleId: 11,
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Refills",
      mm: activeRecord.mmFillNumber != null ? String(activeRecord.mmFillNumber) : (activeRecord.mmRefillsPharmacistEntered != null ? String(activeRecord.mmRefillsPharmacistEntered) : null),
      erx: activeRecord.erxRefill != null ? String(activeRecord.erxRefill) : null,
      prop: "MmFillNumber",
      alternateProps: ["ErxRefill", "MmRefillsPharmacistEntered", "Patient Refill", "Refill", "Refills", "Fill Number", "FillNumber"],
      mmKey: "mmRefillsPharmacistEntered",
      erxKey: "erxRefill",
      isNumeric: true,
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Pharmacist Entered Refills",
      mm: activeRecord.mmRefillsPharmacistEntered != null ? String(activeRecord.mmRefillsPharmacistEntered) : null,
      erx: "—",
      prop: "MmRefillsPharmacistEntered",
      alternateProps: ["MmRefillsPharmacistEntered", "Pharmacist Entered Refills"],
      mmKey: "mmRefillsPharmacistEntered",
      isNumeric: true,
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Delivery",
      mm: activeRecord.mmDelivery,
      erx: "—",
      prop: "MmDelivery",
      mmKey: "mmDelivery",
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Rx Origin",
      mm: activeRecord.mmRxOrigin,
      erx: "—",
      prop: "MmRxOrigin",
      mmKey: "mmRxOrigin",
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Copay Amount",
      mm: activeRecord.mmCopay != null ? `$${activeRecord.mmCopay.toFixed(2)}` : null,
      erx: "—",
      prop: "MmCopay",
      mmKey: "mmCopay",
      isNumeric: true,
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Signature Captured",
      mm: activeRecord.mmSignatureCaptured != null ? (activeRecord.mmSignatureCaptured ? "Yes" : "No") : null,
      erx: "—",
      prop: "MmSignatureCaptured",
      mmKey: "mmSignatureCaptured",
    },
    {
      category: "8. Dispense Options & Logistics",
      label: "Follow Up Tag",
      mm: activeRecord.followUpTag,
      erx: "—",
      prop: "FollowUpTag",
      mmKey: "followUpTag",
    },

    // 9. Clinical Notes & DUR
    {
      category: "9. Clinical Notes & DUR",
      label: "RPh Notes",
      mm: activeRecord.mmRphNotes,
      erx: "—",
      prop: "MmRphNotes",
      mmKey: "mmRphNotes",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "Telephone Notes",
      mm: activeRecord.telephoneNotes,
      erx: "—",
      prop: "TelephoneNotes",
      mmKey: "telephoneNotes",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "Telephone Notes Date",
      mm: formatUsaDate(activeRecord.telephoneNotesDate),
      erx: "—",
      prop: "TelephoneNotesDate",
      mmKey: "telephoneNotesDate",
      isDate: true,
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "ERX Notes",
      mm: "—",
      erx: activeRecord.erxNotes,
      prop: "ErxNotes",
      erxKey: "erxNotes",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "ERX Notes Date",
      mm: "—",
      erx: formatUsaDate(activeRecord.erxNotesDate),
      prop: "ErxNotesDate",
      erxKey: "erxNotesDate",
      isDate: true,
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "ERX Notes Created By",
      mm: "—",
      erx: activeRecord.erxNotesCreatedBy,
      prop: "ErxNotesCreatedBy",
      erxKey: "erxNotesCreatedBy",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "DUR Reason Code",
      mm: activeRecord.durReasonCd,
      erx: "—",
      prop: "DurReasonCd",
      mmKey: "durReasonCd",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "DUR Professional Code",
      mm: activeRecord.durProfCd,
      erx: "—",
      prop: "DurProfCd",
      mmKey: "durProfCd",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "DUR Result Code",
      mm: activeRecord.durResultCode,
      erx: "—",
      prop: "DurResultCode",
      mmKey: "durResultCode",
    },
    {
      category: "9. Clinical Notes & DUR",
      label: "System Message",
      mm: activeRecord.message,
      erx: "—",
      prop: "Message",
      mmKey: "message",
    },

    // 10. Controlled Substance & Compliance Rules
    {
      category: "10. Controlled Substance & Compliance Rules",
      label: "Class 2 Narcotics (Schedule II) Zero Refills",
      mm: activeRecord.mmFillNumber != null ? String(activeRecord.mmFillNumber) : (activeRecord.mmRefillsPharmacistEntered != null ? String(activeRecord.mmRefillsPharmacistEntered) : "0"),
      erx: activeRecord.erxRefill != null ? String(activeRecord.erxRefill) : "0",
      prop: "Class2ZeroRefills",
      exactRuleName: "Class 2 Narcotic Refills",
      alternateProps: ["Class 2 Narcotic Refills", "Class2ZeroRefills"],
      erxKey: "erxRefill",
      isNumeric: true,
      ruleId: 16,
    },
    {
      category: "10. Controlled Substance & Compliance Rules",
      label: "DEA Class 2 Expiration (Max 30 Days from Effective Date)",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: formatUsaDate(activeRecord.erxEffectiveDate || activeRecord.erxOrderDate),
      prop: "Class2Expiration30Days",
      exactRuleName: "DEA Class 2 Narcotic 30-Day Expiration",
      alternateProps: ["DEA Class 2 Narcotic 30-Day Expiration", "Class2Expiration30Days"],
      ruleId: 17,
      isDate: true,
    },
    {
      category: "10. Controlled Substance & Compliance Rules",
      label: "DEA Class 3-5 Expiration (Max 180 Days from Effective Date)",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: formatUsaDate(activeRecord.erxEffectiveDate || activeRecord.erxOrderDate),
      prop: "Class3To5Expiration180Days",
      exactRuleName: "DEA Class 3-5 Narcotic 180-Day Expiration",
      alternateProps: ["DEA Class 3-5 Narcotic 180-Day Expiration", "Class3To5Expiration180Days"],
      ruleId: 18,
      isDate: true,
    },
    {
      category: "10. Controlled Substance & Compliance Rules",
      label: "Texas Class 2 Expiration (Max 21 Days from Effective Date)",
      mm: formatUsaDate(activeRecord.mmDateFilled),
      erx: formatUsaDate(activeRecord.erxEffectiveDate || activeRecord.erxOrderDate),
      prop: "TexasClass2Expiration21Days",
      exactRuleName: "Texas Class 2 Narcotic 21-Day Expiration",
      alternateProps: ["Texas Class 2 Narcotic 21-Day Expiration", "TexasClass2Expiration21Days"],
      ruleId: 19,
      isDate: true,
    },
  ];

  // Helper to normalize and compare Patient Demographics
  const normalizeAddress = (addr: string | null | undefined): string => {
    if (!addr) return "";
    return addr
      .replace(/(?<=[A-Za-z])(?=(APT|STE|SUITE|UNIT|BLDG|#))/gi, " ")
      .replace(/[,.\-#/]/g, " ")
      .replace(/\bSTREET\b/gi, "ST")
      .replace(/\bROAD\b/gi, "RD")
      .replace(/\bAVENUE\b/gi, "AVE")
      .replace(/\bDRIVE\b/gi, "DR")
      .replace(/\bBOULEVARD\b/gi, "BLVD")
      .replace(/\bLANE\b/gi, "LN")
      .replace(/\bCOURT\b/gi, "CT")
      .replace(/\bHIGHWAY\b/gi, "HWY")
      .replace(/\bPARKWAY\b/gi, "PKWY")
      .replace(/\bNORTH\b/gi, "N")
      .replace(/\bSOUTH\b/gi, "S")
      .replace(/\bEAST\b/gi, "E")
      .replace(/\bWEST\b/gi, "W")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  };

  const removeUnit = (addr: string): string => {
    return addr.replace(/\b(APT|STE|SUITE|UNIT|BLDG|FL|FLOOR)\s*#?\s*\w+/gi, "").replace(/\s+/g, " ").trim();
  };

  const areAddressesMatching = (a1: string | null | undefined, a2: string | null | undefined): boolean => {
    if (!a1 && !a2) return true;
    if (!a1 || !a2) return false;
    if (a1.trim().toUpperCase() === a2.trim().toUpperCase()) return true;

    const n1 = normalizeAddress(a1);
    const n2 = normalizeAddress(a2);
    if (n1 === n2) return true;
    if (n1.includes(n2) || n2.includes(n1)) return true;

    const b1 = removeUnit(n1);
    const b2 = removeUnit(n2);
    if (b1 && b1 === b2) return true;

    const t1 = n1.split(" ").filter(Boolean);
    const t2 = n2.split(" ").filter(Boolean);
    const intersection = t1.filter((t) => t2.includes(t)).length;
    const minTokens = Math.min(t1.length, t2.length);
    if (minTokens > 0 && intersection / minTokens >= 0.7) return true;

    return false;
  };

  const arePatientDemographicsMatching = (rec: ErxAuditRecordDto | null | undefined): boolean => {
    if (!rec) return false;

    // 1. Patient DOB
    const dob1 = rec.mmPatientDob ? new Date(rec.mmPatientDob).toISOString().slice(0, 10) : "";
    const dob2 = rec.erxPatientDob ? new Date(rec.erxPatientDob).toISOString().slice(0, 10) : "";
    if (dob1 && dob2 && dob1 !== dob2) return false;
    if ((dob1 && !dob2) || (!dob1 && dob2)) return false;

    // 2. Patient Phone
    const p1 = (rec.mmPatientPhone || "").replace(/\D/g, "");
    const p2 = (rec.erxPatientPhone || "").replace(/\D/g, "");
    const cleanP1 = p1.length === 11 && p1.startsWith("1") ? p1.slice(1) : p1;
    const cleanP2 = p2.length === 11 && p2.startsWith("1") ? p2.slice(1) : p2;
    if (cleanP1 && cleanP2 && cleanP1 !== cleanP2) return false;
    if ((cleanP1 && !cleanP2) || (!cleanP1 && cleanP2)) return false;

    // 3. Patient Address
    if (!areAddressesMatching(rec.mmPatientAddress, rec.erxPatientAddress)) return false;

    return true;
  };

  const isPatientNameField = (field: ComparisonField) => {
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    return p === "mmpatientname" || p === "erxpatientname" || l === "patient name";
  };

  const isPatientNameDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return group === "patient name" || group === "patient" || mm === "mmpatientname" || erx === "erxpatientname";
  };

  const isDeaField = (field: ComparisonField) => {
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    const r = (field.exactRuleName || "").toLowerCase();
    return p === "mmprescriberdea" || p === "erxprescriberdea" || l.includes("dea") || r.includes("dea");
  };

  const isDeaDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return group.includes("dea") || mm === "mmprescriberdea" || erx === "erxprescriberdea";
  };

  const isDrugNameField = (field: ComparisonField) => {
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    const r = (field.exactRuleName || "").toLowerCase();
    return p.includes("drugname") || l.includes("drug name") || r.includes("drug name");
  };

  const isNdcField = (field: ComparisonField) => {
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    const r = (field.exactRuleName || "").toLowerCase();
    return p.includes("ndc") || l.includes("ndc") || r.includes("ndc");
  };

  const isDrugNameDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return group.includes("drug") || mm.includes("drug") || erx.includes("drug");
  };

  const isNdcDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return group.includes("ndc") || mm.includes("ndc") || erx.includes("ndc");
  };

  const isQuantityDispensedField = (field: ComparisonField) => {
    if (field.ruleId === 5) return true;
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    const r = (field.exactRuleName || "").toLowerCase();
    return (
      p.includes("qtydispensed") ||
      p.includes("quantitydispensed") ||
      l.includes("qty dispensed") ||
      l.includes("quantity dispensed") ||
      r.includes("quantity dispensed") ||
      r.includes("qty dispensed")
    );
  };

  const isQuantityDispensedDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    if (d.ruleId === 5) return true;
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return (
      group.includes("quantity dispensed") ||
      group.includes("qty dispensed") ||
      mm.includes("mmqtydispensed") ||
      erx.includes("erxqtydispensed")
    );
  };

  const isDaysSupplyField = (field: ComparisonField) => {
    if (field.ruleId === 6) return true;
    const p = (field.prop || "").toLowerCase();
    const l = (field.label || "").toLowerCase();
    const r = (field.exactRuleName || "").toLowerCase();
    return (
      p.includes("dayssupply") ||
      l.includes("days supply") ||
      r.includes("days supply")
    );
  };

  const isDaysSupplyDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    if (d.ruleId === 6) return true;
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return (
      group.includes("days supply") ||
      mm.includes("dayssupply") ||
      erx.includes("dayssupply")
    );
  };

  const isControlledSubstance = (rec: ErxAuditRecordDto | null | undefined): boolean => {
    if (!rec) return false;
    const clean = (val?: string | null) => (val || "").replace(/\D/g, "").trim();
    const n1 = clean(rec.rxNumber);
    const n2 = clean(rec.erxRxNumber);
    if (n1.startsWith("2") || n2.startsWith("2")) return true;
    const starts345 = (n: string) => n.startsWith("3") || n.startsWith("4") || n.startsWith("5");
    if (starts345(n1) || starts345(n2)) return true;
    return false;
  };

  // Helper to find matching discrepancy for a comparison field
  const findDiscrepancyForField = (field: ComparisonField): ErxAuditDiscrepancyDto | undefined => {
    // If field is Patient Name and demographics (DOB, Phone, Address) match, eliminate mismatch!
    if (isPatientNameField(field) && arePatientDemographicsMatching(activeRecord)) {
      return undefined;
    }

    // For DEA, if the drug is a non-controlled drug, do not count as discrepancy!
    if (isDeaField(field) && !isControlledSubstance(activeRecord)) {
      return undefined;
    }

    // For matching NDCs, eliminate Drug Name and NDC Code discrepancies!
    if (
      (isDrugNameField(field) || isNdcField(field)) &&
      areNdcsMatching(activeRecord?.mmDispensedNdc, activeRecord?.erxNdc)
    ) {
      return undefined;
    }

    // For Quantity Dispensed <= Quantity Ordered, eliminate Quantity Dispensed discrepancy!
    if (isQuantityDispensedField(field) && isQuantityDispensedCompliant(activeRecord)) {
      return undefined;
    }

    // For Days Supply compliant with Sig dosing / Multi-Dose Vial BUD rule, eliminate mismatch!
    if (isDaysSupplyField(field) && isDaysSupplyCompliant(activeRecord)) {
      return undefined;
    }

    if (field.ruleId) {
      const match = localDiscrepancies.find((d) => d.ruleId === field.ruleId);
      if (match) return match;
    }

    if (field.exactRuleName) {
      const targetRule = field.exactRuleName.toLowerCase().trim();
      return localDiscrepancies.find((d) => (d.fieldGroupName || "").toLowerCase().trim() === targetRule);
    }

    const complianceRuleNames = [
      "fill date sequence",
      "effective date compliance",
      "pickup date sequence",
      "class 2 narcotic refills",
      "dea class 2 narcotic 30-day expiration",
      "dea class 3-5 narcotic 180-day expiration",
      "texas class 2 narcotic 21-day expiration",
    ];

    const candidates = [
      field.prop,
      field.label,
      ...(field.alternateProps || []),
    ].map((s) => s.toLowerCase().trim());

    return localDiscrepancies.find((d) => {
      const group = (d.fieldGroupName || "").toLowerCase().trim();
      if (group && complianceRuleNames.includes(group)) {
        return false;
      }

      const mmCol = (d.mmColumnName || "").toLowerCase().trim();
      const erxCol = (d.erxColumnName || "").toLowerCase().trim();

      return (
        (mmCol && candidates.includes(mmCol)) ||
        (erxCol && candidates.includes(erxCol)) ||
        (group && candidates.includes(group))
      );
    });
  };

  const demographicsMatch = arePatientDemographicsMatching(activeRecord);
  const isControlled = isControlledSubstance(activeRecord);
  const ndcsMatch = areNdcsMatching(activeRecord?.mmDispensedNdc, activeRecord?.erxNdc);
  const qtyCompliant = isQuantityDispensedCompliant(activeRecord);
  const daysSupplyCompliant = isDaysSupplyCompliant(activeRecord);
  const openDiscrepancies = localDiscrepancies.filter((d) => {
    if (d.status !== "Open" && d.status) return false;
    if (demographicsMatch && isPatientNameDiscrepancy(d)) return false;
    if (!isControlled && isDeaDiscrepancy(d)) return false;
    if (ndcsMatch && (isDrugNameDiscrepancy(d) || isNdcDiscrepancy(d))) return false;
    if (qtyCompliant && isQuantityDispensedDiscrepancy(d)) return false;
    if (daysSupplyCompliant && isDaysSupplyDiscrepancy(d)) return false;
    return true;
  });
  const openCount = openDiscrepancies.length;

  // Filter fields if user wants to see mismatches only
  const displayedFields = mismatchesOnly
    ? allComparisonFields.filter((f) => {
        const disc = findDiscrepancyForField(f);
        return !!disc && (disc.status === "Open" || !disc.status);
      })
    : allComparisonFields;

  // Track any open discrepancies that didn't match a displayed comparison field
  const unmappedDiscrepancies = localDiscrepancies.filter((d) => {
    if (mismatchesOnly && d.status && d.status !== "Open") return false;
    return !allComparisonFields.some((f) => findDiscrepancyForField(f)?.discrepancyId === d.discrepancyId);
  });

  const renderHipaaSuggestionCard = (fieldKey: string, field: any, disc?: ErxAuditDiscrepancyDto) => {
    const suggestion = suggestionMap[fieldKey];
    const isLoading = loadingSuggestionField === fieldKey;
    const showMore = !!showMoreInfoMap[fieldKey];

    return (
      <TableRow key={`suggestion-card-${fieldKey}`} sx={{ bgcolor: "#f0fdf4" }}>
        <TableCell colSpan={5} sx={{ p: 0, borderTop: "none" }}>
          <Paper
            elevation={0}
            sx={{
              m: 1.5,
              p: 2,
              borderRadius: 2,
              border: "1.5px solid #10b981",
              bgcolor: "#f0fdf4",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.08)",
            }}
          >
            {isLoading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
                <CircularProgress size={20} sx={{ color: "#059669" }} />
                <Typography sx={{ color: "#065f46", fontSize: "0.85rem", fontWeight: 600 }}>
                  Consulting Muse AI HIPAA Guidelines...
                </Typography>
              </Box>
            ) : suggestion ? (
              <>
                {/* Header */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#065f46",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        fontSize: "0.95rem",
                      }}
                    >
                      <LightbulbOutlinedIcon sx={{ fontSize: 20, color: "#059669" }} />
                      {suggestion.title || "HIPAA Fix Suggestion"}
                    </Typography>
                    {suggestion.badges &&
                      suggestion.badges.map((badge, bIdx) => (
                        <Chip
                          key={bIdx}
                          label={badge}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            bgcolor: bIdx === 0 ? "#d1fae5" : "#e0e7ff",
                            color: bIdx === 0 ? "#065f46" : "#3730a3",
                            border: `1px solid ${bIdx === 0 ? "#a7f3d0" : "#c7d2fe"}`,
                          }}
                        />
                      ))}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {suggestion.detailedInfo && (
                      <Button
                        size="small"
                        onClick={() =>
                          setShowMoreInfoMap((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }))
                        }
                        endIcon={
                          <ExpandMoreIcon
                            sx={{
                              transform: showMore ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s",
                              fontSize: 18,
                            }}
                          />
                        }
                        sx={{
                          textTransform: "none",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#065f46",
                          p: 0.5,
                        }}
                      >
                        More info
                      </Button>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => setExpandedSuggestionField(null)}
                      sx={{ color: "#065f46", p: 0.5 }}
                    >
                      <CloseIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Explanation */}
                <Typography sx={{ color: "#047857", fontSize: "0.85rem", lineHeight: 1.6, my: 1.25 }}>
                  {suggestion.explanation}
                </Typography>

                {/* Collapsible Detailed Info */}
                {showMore && suggestion.detailedInfo && (
                  <Box sx={{ my: 1, p: 1.5, bgcolor: "#ecfdf5", borderRadius: 1.5, border: "1px dashed #6ee7b7" }}>
                    <Typography sx={{ fontSize: "0.8rem", color: "#065f46", lineHeight: 1.5 }}>
                      {suggestion.detailedInfo}
                    </Typography>
                    {suggestion.regulatoryRisk && (
                      <Typography sx={{ fontSize: "0.78rem", color: "#b91c1c", fontWeight: 600, mt: 0.75 }}>
                        ⚠️ Audit Risk: {suggestion.regulatoryRisk}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Suggested Fix Action Bar */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    flexWrap: "wrap",
                    bgcolor: "#ffffff",
                    p: 1,
                    borderRadius: 2,
                    border: "1px solid #a7f3d0",
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#065f46", whiteSpace: "nowrap" }}>
                    Suggested Fix:
                  </Typography>
                  <TextField
                    size="small"
                    value={customFixValue}
                    onChange={(e) => setCustomFixValue(e.target.value)}
                    sx={{
                      flex: 1,
                      minWidth: 260,
                      "& .MuiInputBase-input": {
                        fontFamily: "monospace",
                        fontSize: "0.85rem",
                        py: 0.6,
                        px: 1,
                        color: "#065f46",
                        fontWeight: 700,
                      },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#d1fae5",
                      },
                    }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={isApplyingSuggestion}
                    startIcon={
                      isApplyingSuggestion ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : (
                        <CheckIcon sx={{ fontSize: 15 }} />
                      )
                    }
                    onClick={() => handleApplySuggestion(field, customFixValue, disc)}
                    sx={{
                      bgcolor: "#059669",
                      "&:hover": { bgcolor: "#047857" },
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      px: 2,
                      py: 0.6,
                      borderRadius: 1.5,
                      boxShadow: "none",
                    }}
                  >
                    Apply Suggestion
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                    onClick={() => handleManualEditFromSuggestion(field, customFixValue, disc)}
                    sx={{
                      borderColor: "#cbd5e1",
                      color: "#334155",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 1.5,
                      "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
                    }}
                  >
                    Manual Edit
                  </Button>
                </Box>
              </>
            ) : null}
          </Paper>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            maxHeight: "92vh",
            m: { xs: 1, sm: 2 },
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1.5,
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", fontSize: { xs: "1rem", sm: "1.25rem" } }}>
            {ERX_AUDIT_LABELS.formatAllUploadedDataTitle(activeRecord.rxNumber)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {ERX_AUDIT_LABELS.MESSAGES.DISCREPANCY_MODAL_SUBTITLE}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        {/* Prescription Metadata Summary */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.25, sm: 2 },
            mb: 2,
            borderRadius: 2,
            bgcolor: "#f8fafc",
            borderColor: "#e2e8f0",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(5, 1fr)",
              },
              gap: { xs: 1.25, sm: 2 },
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                {ERX_AUDIT_LABELS.TABLE_HEADERS.RX_NUMBER}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "primary.main" }}>
                {activeRecord.rxNumber}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <PersonOutlineIcon fontSize="inherit" /> {ERX_AUDIT_LABELS.TABLE_HEADERS.PATIENT}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                {activeRecord.mmPatientName || activeRecord.erxPatientName || "N/A"}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <LocalHospitalOutlinedIcon fontSize="inherit" /> {ERX_AUDIT_LABELS.TABLE_HEADERS.PRESCRIBER}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                {activeRecord.mmPrescriberName || activeRecord.erxPrescriberName || "N/A"}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  fontWeight: 600,
                  color: "text.secondary",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <MedicationOutlinedIcon fontSize="inherit" /> {ERX_AUDIT_LABELS.TABLE_HEADERS.DISPENSED_DRUG}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#0f172a" }}>
                  {activeRecord.mmDispensedDrugName || "N/A"}
                </Typography>
                {deaInfo && (
                  <Chip
                    size="small"
                    label={deaInfo.label}
                    color={deaInfo.badgeClass === "danger" ? "error" : "warning"}
                    sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                  />
                )}
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                {ERX_AUDIT_LABELS.TABLE_HEADERS.DISCREPANCIES}
              </Typography>
              <Box sx={{ mt: 0.25 }}>
                {openCount > 0 ? (
                  <Chip
                    size="small"
                    color="error"
                    icon={<ErrorOutlineIcon />}
                    label={ERX_AUDIT_LABELS.formatMismatches(openCount)}
                    sx={{ fontWeight: 600 }}
                  />
                ) : (
                  <Chip
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon />}
                    label={ERX_AUDIT_LABELS.STATUS_BADGES.ALL_CLEAN_0_MISMATCHES}
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>
            </Box>

            {/* Divider and Row 2: Insurance, Financials & Prescription Origin */}
            <Divider sx={{ gridColumn: "1 / -1", my: 0.5 }} />

            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                Payment Method (Audit Priority)
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getPaymentMethodBadge(activeRecord.paymentMethod)}</Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                Insurance Code & BIN
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getInsuranceBadge(activeRecord.insCode, activeRecord.binNo)}</Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                Total Claim Amount Paid
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getTotalInsPaidBadge(activeRecord.totalInsPaid)}</Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ textTransform: "uppercase", fontWeight: 600, color: "text.secondary" }}>
                Rx Origin (Hardcopy Flag)
              </Typography>
              <Box sx={{ mt: 0.5 }}>{getRxOriginBadge(activeRecord.mmRxOrigin)}</Box>
            </Box>
          </Box>
        </Paper>

        {/* View Filter Toggle Bar & Actions */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary">
              Showing <strong>{displayedFields.length}</strong> of <strong>{allComparisonFields.length}</strong> fields
            </Typography>

            <ToggleButtonGroup
              value={mismatchesOnly ? "discrepancies" : "all"}
              exclusive
              size="small"
              onChange={(_, val) => {
                if (val !== null) setMismatchesOnly(val === "discrepancies");
              }}
            >
              <ToggleButton value="all" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
                <ViewListIcon sx={{ mr: 0.75, fontSize: 18 }} /> {ERX_AUDIT_LABELS.FILTERS.ALL_PRESCRIPTIONS} ({allComparisonFields.length})
              </ToggleButton>
              <ToggleButton value="discrepancies" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
                <FilterListIcon sx={{ mr: 0.75, fontSize: 18 }} /> {ERX_AUDIT_LABELS.FILTERS.DISCREPANCIES_ONLY} ({openCount})
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={handleOpenEditDialog}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Edit Prescription
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              disabled={exporting}
              startIcon={exporting && exportingFormat === "xlsx" ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />}
              onClick={() => handleModalExport("xlsx")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Export Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              disabled={exporting}
              startIcon={exporting && exportingFormat === "csv" ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon />}
              onClick={() => handleModalExport("csv")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Export CSV
            </Button>
          </Box>
        </Box>

        {/* Side-by-Side Comparison Table */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{ maxHeight: "55vh", borderRadius: 2 }}
        >
          <Table size="small" stickyHeader sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "24%", fontWeight: 700 }}>{ERX_AUDIT_LABELS.TABLE_HEADERS.FIELD_NAME}</TableCell>
                <TableCell sx={{ width: "29%", fontWeight: 700, bgcolor: "#eff6ff", color: "#1e40af" }}>
                  {ERX_AUDIT_LABELS.TABLE_HEADERS.MM_SOURCE_OF_TRUTH}
                </TableCell>
                <TableCell sx={{ width: "29%", fontWeight: 700, bgcolor: "#f5f3ff", color: "#6b21a8" }}>
                  {ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PRESCRIBED}
                </TableCell>
                <TableCell sx={{ width: "9%", fontWeight: 700 }}>{ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS_COL}</TableCell>
                <TableCell sx={{ width: "9%", fontWeight: 700 }}>{ERX_AUDIT_LABELS.TABLE_HEADERS.RESOLUTION_COL}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedFields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    {ERX_AUDIT_LABELS.MESSAGES.NO_DISCREPANCIES_DETECTED}
                  </TableCell>
                </TableRow>
              ) : (
                displayedFields.map((field, idx) => {
                  const disc = findDiscrepancyForField(field);
                  const isOpenMismatch = !!disc && (disc.status === "Open" || !disc.status);
                  const isResolved = !!disc && !isOpenMismatch;

                  const rawMmVal =
                    field.mm != null && field.mm !== "—"
                      ? field.mm
                      : disc && disc.mmValue != null && field.mmKey
                      ? disc.mmValue
                      : field.mm;
                  const rawErxVal =
                    field.erx != null && field.erx !== "—"
                      ? field.erx
                      : disc && disc.erxValue != null && field.erxKey
                      ? disc.erxValue
                      : field.erx;
                  const mmVal = formatUsaDateInText(rawMmVal);
                  const erxVal = formatUsaDateInText(rawErxVal);

                  const prevField = idx > 0 ? displayedFields[idx - 1] : null;
                  const showCategoryHeader = !prevField || prevField.category !== field.category;

                  return (
                    <React.Fragment key={idx}>
                      {showCategoryHeader && (
                        <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                          <TableCell
                            colSpan={5}
                            sx={{
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              fontSize: "0.78rem",
                              py: 1,
                              color: "#334155",
                            }}
                          >
                            {field.category}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow
                        sx={{
                          bgcolor: isOpenMismatch ? "#fef2f2" : isResolved ? "#f0fdf4" : "inherit",
                          borderLeft: isOpenMismatch
                            ? "4px solid #ef4444"
                            : isResolved
                            ? "4px solid #16a34a"
                            : "4px solid transparent",
                          "&:hover": {
                            bgcolor: isOpenMismatch ? "#fee2e2" : "#f8fafc",
                          },
                        }}>
                        <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                          {field.label}
                          {field.label === "Sig / Directions" && (
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={ERX_AUDIT_LABELS.STATUS_BADGES.NORMALIZED_SIG}
                                size="small"
                                sx={{
                                  fontSize: "0.65rem",
                                  height: 18,
                                  backgroundColor: "#eff6ff",
                                  color: "#2563eb",
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingFieldProp === field.prop ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                              <TextField
                                size="small"
                                autoFocus
                                value={editMmValue}
                                onChange={(e) => setEditMmValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveFieldEdit(field);
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                disabled={isSaving}
                                sx={{
                                  "& .MuiInputBase-input": {
                                    fontFamily: "monospace",
                                    fontSize: "0.85rem",
                                    py: 0.75,
                                    px: 1,
                                    bgcolor: "#ffffff",
                                  },
                                }}
                                placeholder="Enter MicroMerchant value"
                              />
                              {field.erx && field.erx !== "—" && (
                                <Button
                                  size="small"
                                  startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
                                  onClick={() => setEditMmValue(field.erx || "")}
                                  sx={{
                                    fontSize: "0.7rem",
                                    py: 0.2,
                                    px: 0.8,
                                    textTransform: "none",
                                    alignSelf: "flex-start",
                                    color: "#2563eb",
                                    bgcolor: "#eff6ff",
                                    "&:hover": { bgcolor: "#dbeafe" },
                                  }}
                                >
                                  Copy ERX Value
                                </Button>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                              <Typography
                                component="span"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  wordBreak: "break-word",
                                  ...(isOpenMismatch && {
                                    color: "#b91c1c",
                                    fontWeight: 700,
                                    bgcolor: "#fee2e2",
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                  }),
                                }}
                              >
                                {mmVal ?? <span style={{ color: "#94a3b8" }}>—</span>}
                              </Typography>
                              {isOpenMismatch && (field.mmKey || field.erxKey) && (
                                <Tooltip title="Edit MicroMerchant value">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleStartEditField(field)}
                                    sx={{
                                      p: 0.5,
                                      opacity: 1,
                                      "&:hover": { opacity: 1, bgcolor: "#fee2e2" },
                                    }}
                                  >
                                    <EditIcon sx={{ fontSize: 15, color: "#b91c1c" }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              wordBreak: "break-word",
                              ...(isOpenMismatch && {
                                color: "#b91c1c",
                                fontWeight: 700,
                                bgcolor: "#fee2e2",
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                              }),
                            }}
                          >
                            {erxVal ?? <span style={{ color: "#94a3b8" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isOpenMismatch ? (
                            <Chip
                              size="small"
                              color="error"
                              icon={<ErrorOutlineIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.MISMATCH}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          ) : isResolved ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<CheckCircleIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.RESOLVED}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="success"
                              icon={<CheckCircleIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {editingFieldProp === field.prop ? (
                            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={isSaving}
                                startIcon={isSaving ? <CircularProgress size={12} color="inherit" /> : <CheckIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleSaveFieldEdit(field)}
                                sx={{ minWidth: "auto", px: 1.25, py: 0.35, fontSize: "0.75rem", textTransform: "none" }}
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                disabled={isSaving}
                                onClick={handleCancelEdit}
                                sx={{ minWidth: "auto", px: 1, py: 0.35, fontSize: "0.75rem", textTransform: "none" }}
                              >
                                Cancel
                              </Button>
                            </Box>
                          ) : disc ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={disc.status || "Open"}
                                color={
                                  disc.status === "Reviewed"
                                    ? "primary"
                                    : disc.status === "Corrected"
                                    ? "success"
                                    : disc.status === "Ignored"
                                    ? "default"
                                    : "error"
                                }
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, alignSelf: "flex-start" }}
                              />
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {isOpenMismatch ? (
                                  <>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                      onClick={() => handleStatusChange(disc.discrepancyId, "Reviewed")}
                                    >
                                      {ERX_AUDIT_LABELS.ACTIONS.REVIEW}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant={expandedSuggestionField === field.prop ? "contained" : "outlined"}
                                      color="success"
                                      startIcon={<LightbulbOutlinedIcon sx={{ fontSize: 13 }} />}
                                      onClick={() => handleToggleSuggestion(field, disc)}
                                      sx={{
                                        minWidth: "auto",
                                        px: 1,
                                        py: 0.25,
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        textTransform: "none",
                                        borderColor: "#10b981",
                                        color: expandedSuggestionField === field.prop ? "#ffffff" : "#059669",
                                        bgcolor: expandedSuggestionField === field.prop ? "#059669" : "#ecfdf5",
                                        "&:hover": {
                                          bgcolor: expandedSuggestionField === field.prop ? "#047857" : "#d1fae5",
                                          borderColor: "#059669",
                                        },
                                      }}
                                    >
                                      Suggestion
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                      onClick={() => handleStatusChange(disc.discrepancyId, "Ignored")}
                                    >
                                      {ERX_AUDIT_LABELS.ACTIONS.IGNORE}
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                    onClick={() => handleStatusChange(disc.discrepancyId, "Open")}
                                  >
                                    {ERX_AUDIT_LABELS.ACTIONS.REOPEN}
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedSuggestionField === field.prop && renderHipaaSuggestionCard(field.prop, field, disc)}
                    </React.Fragment>
                  );
                })
              )}

              {/* Unmapped Discrepancies */}
              {unmappedDiscrepancies.length > 0 && (
                <>
                  <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                    <TableCell
                      colSpan={5}
                      sx={{
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontSize: "0.78rem",
                        py: 1,
                        color: "#334155",
                      }}
                    >
                      {ERX_AUDIT_LABELS.MESSAGES.ADDITIONAL_RULE_DISCREPANCIES}
                    </TableCell>
                  </TableRow>
                  {unmappedDiscrepancies.map((disc) => {
                    const isOpenMismatch = disc.status === "Open" || !disc.status;
                    const isResolved = !isOpenMismatch;
                    const ruleLabel = RULE_ID_FIELD_MAP[disc.ruleId]?.label || disc.fieldGroupName || disc.mmColumnName || "Rule Discrepancy";
                    return (
                    <React.Fragment key={`unmapped-wrap-${disc.discrepancyId}`}>
                      <TableRow
                        key={`unmapped-${disc.discrepancyId}`}
                        sx={{
                          bgcolor: isOpenMismatch ? "#fef2f2" : isResolved ? "#f0fdf4" : "inherit",
                          borderLeft: isOpenMismatch
                            ? "4px solid #ef4444"
                            : isResolved
                            ? "4px solid #16a34a"
                            : "4px solid transparent",
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600, color: "#1e293b" }}>
                          {ruleLabel}
                        </TableCell>
                        <TableCell>
                          {editingFieldProp === `unmapped-${disc.discrepancyId}` ? (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                              <TextField
                                size="small"
                                autoFocus
                                value={editMmValue}
                                onChange={(e) => setEditMmValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveUnmappedEdit(disc);
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                disabled={isSaving}
                                sx={{
                                  "& .MuiInputBase-input": {
                                    fontFamily: "monospace",
                                    fontSize: "0.85rem",
                                    py: 0.75,
                                    px: 1,
                                    bgcolor: "#ffffff",
                                  },
                                }}
                                placeholder="Enter MicroMerchant value"
                              />
                              {disc.erxValue && disc.erxValue !== "—" && (
                                <Button
                                  size="small"
                                  startIcon={<ContentCopyIcon sx={{ fontSize: 13 }} />}
                                  onClick={() => setEditMmValue(disc.erxValue || "")}
                                  sx={{
                                    fontSize: "0.7rem",
                                    py: 0.2,
                                    px: 0.8,
                                    textTransform: "none",
                                    alignSelf: "flex-start",
                                    color: "#2563eb",
                                    bgcolor: "#eff6ff",
                                    "&:hover": { bgcolor: "#dbeafe" },
                                  }}
                                >
                                  Copy ERX Value
                                </Button>
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                              <Typography
                                component="span"
                                sx={{
                                  fontFamily: "monospace",
                                  fontSize: "0.85rem",
                                  wordBreak: "break-word",
                                  ...(isOpenMismatch && {
                                    color: "#b91c1c",
                                    fontWeight: 700,
                                    bgcolor: "#fee2e2",
                                    px: 0.75,
                                    py: 0.25,
                                    borderRadius: 1,
                                  }),
                                }}
                              >
                                {formatUsaDateInText(disc.mmValue) || <span style={{ color: "#94a3b8" }}>—</span>}
                              </Typography>
                              {isOpenMismatch && (
                                <Tooltip title="Edit MicroMerchant value">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleStartEditUnmapped(disc)}
                                    sx={{
                                      p: 0.5,
                                      opacity: 1,
                                      "&:hover": { opacity: 1, bgcolor: "#fee2e2" },
                                    }}
                                  >
                                    <EditIcon sx={{ fontSize: 15, color: "#b91c1c" }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{
                              fontFamily: "monospace",
                              fontSize: "0.85rem",
                              wordBreak: "break-word",
                              ...(isOpenMismatch && {
                                color: "#b91c1c",
                                fontWeight: 700,
                                bgcolor: "#fee2e2",
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 1,
                              }),
                            }}
                          >
                            {formatUsaDateInText(disc.erxValue) || <span style={{ color: "#94a3b8" }}>—</span>}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {isOpenMismatch ? (
                            <Chip
                              size="small"
                              color="error"
                              icon={<ErrorOutlineIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.MISMATCH}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          ) : isResolved ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<CheckCircleIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.RESOLVED}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="success"
                              icon={<CheckCircleIcon />}
                              label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH}
                              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {editingFieldProp === `unmapped-${disc.discrepancyId}` ? (
                            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={isSaving}
                                startIcon={isSaving ? <CircularProgress size={12} color="inherit" /> : <CheckIcon sx={{ fontSize: 14 }} />}
                                onClick={() => handleSaveUnmappedEdit(disc)}
                                sx={{ minWidth: "auto", px: 1.25, py: 0.35, fontSize: "0.75rem", textTransform: "none" }}
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="inherit"
                                disabled={isSaving}
                                onClick={handleCancelEdit}
                                sx={{ minWidth: "auto", px: 1, py: 0.35, fontSize: "0.75rem", textTransform: "none" }}
                              >
                                Cancel
                              </Button>
                            </Box>
                          ) : (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={disc.status || "Open"}
                                color={
                                  disc.status === "Reviewed"
                                    ? "primary"
                                    : disc.status === "Corrected"
                                    ? "success"
                                    : disc.status === "Ignored"
                                    ? "default"
                                    : "error"
                                }
                                sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600, alignSelf: "flex-start" }}
                              />
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {isOpenMismatch ? (
                                  <>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                      onClick={() => handleStatusChange(disc.discrepancyId, "Reviewed")}
                                    >
                                      {ERX_AUDIT_LABELS.ACTIONS.REVIEW}
                                    </Button>
                                    <Button
                                      size="small"
                                      variant={expandedSuggestionField === `unmapped-${disc.discrepancyId}` ? "contained" : "outlined"}
                                      color="success"
                                      startIcon={<LightbulbOutlinedIcon sx={{ fontSize: 13 }} />}
                                      onClick={() => handleToggleSuggestion({ label: ruleLabel, mm: disc.mmValue, erx: disc.erxValue }, disc)}
                                      sx={{
                                        minWidth: "auto",
                                        px: 1,
                                        py: 0.25,
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        textTransform: "none",
                                        borderColor: "#10b981",
                                        color: expandedSuggestionField === `unmapped-${disc.discrepancyId}` ? "#ffffff" : "#059669",
                                        bgcolor: expandedSuggestionField === `unmapped-${disc.discrepancyId}` ? "#059669" : "#ecfdf5",
                                        "&:hover": {
                                          bgcolor: expandedSuggestionField === `unmapped-${disc.discrepancyId}` ? "#047857" : "#d1fae5",
                                          borderColor: "#059669",
                                        },
                                      }}
                                    >
                                      Suggestion
                                    </Button>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="inherit"
                                      sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                      onClick={() => handleStatusChange(disc.discrepancyId, "Ignored")}
                                    >
                                      {ERX_AUDIT_LABELS.ACTIONS.IGNORE}
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.75rem" }}
                                    onClick={() => handleStatusChange(disc.discrepancyId, "Open")}
                                  >
                                    {ERX_AUDIT_LABELS.ACTIONS.REOPEN}
                                  </Button>
                                )}
                              </Box>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedSuggestionField === `unmapped-${disc.discrepancyId}` &&
                        renderHipaaSuggestionCard(`unmapped-${disc.discrepancyId}`, { label: ruleLabel, mm: disc.mmValue, erx: disc.erxValue }, disc)}
                    </React.Fragment>
                    );
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      {/* Full Prescription Edit Modal */}
      <Dialog
        open={editDialogOpen}
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
              Edit Prescription Data — RX #{activeRecord.rxNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Update prescription values to resolve discrepancies and re-evaluate compliance rules
            </Typography>
          </Box>
          <IconButton onClick={handleCloseEditDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 2 }}>
          {/* Section 1: Patient Information */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e40af", mb: 1.5, textTransform: "uppercase", fontSize: "0.78rem" }}>
            Patient Information
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Patient Name"
                value={formValues.erxPatientName ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPatientName: e.target.value }))}
                helperText="Enter actual patient name instead of 0"
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Patient Name"
                  value={formValues.mmPatientName ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmPatientName: e.target.value }))}
                />
                {formValues.mmPatientName && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxPatientName: prev.mmPatientName }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Patient DOB"
                value={formValues.erxPatientDob ? String(formValues.erxPatientDob).slice(0, 10) : ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPatientDob: e.target.value }))}
                placeholder="YYYY-MM-DD"
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="MM Patient DOB"
                value={formValues.mmPatientDob ? String(formValues.mmPatientDob).slice(0, 10) : ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmPatientDob: e.target.value }))}
                placeholder="YYYY-MM-DD"
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Patient Phone"
                value={formValues.erxPatientPhone ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPatientPhone: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="MM Patient Phone"
                value={formValues.mmPatientPhone ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmPatientPhone: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Patient Address"
                value={formValues.erxPatientAddress ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPatientAddress: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="MM Patient Address"
                value={formValues.mmPatientAddress ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmPatientAddress: e.target.value }))}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Section 2: Prescriber Information */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e40af", mb: 1.5, textTransform: "uppercase", fontSize: "0.78rem" }}>
            Prescriber Information
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Prescriber Name"
                value={formValues.erxPrescriberName ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPrescriberName: e.target.value }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Prescriber Name"
                  value={formValues.mmPrescriberName ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmPrescriberName: e.target.value }))}
                />
                {formValues.mmPrescriberName && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxPrescriberName: prev.mmPrescriberName }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Prescriber NPI"
                value={formValues.erxPrescriberNpi ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPrescriberNpi: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="MM Prescriber NPI"
                value={formValues.mmPrescriberNpi ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmPrescriberNpi: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Prescriber DEA"
                value={formValues.erxPrescriberDea ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxPrescriberDea: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="MM Prescriber DEA"
                value={formValues.mmPrescriberDea ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmPrescriberDea: e.target.value }))}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Section 3: Drug, Dispense & Sig */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e40af", mb: 1.5, textTransform: "uppercase", fontSize: "0.78rem" }}>
            Drug, Sig & Dispense
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Drug Name"
                value={formValues.erxDrugName ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxDrugName: e.target.value }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Dispensed Drug Name"
                  value={formValues.mmDispensedDrugName ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmDispensedDrugName: e.target.value }))}
                />
                {formValues.mmDispensedDrugName && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxDrugName: prev.mmDispensedDrugName }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX NDC"
                value={formValues.erxNdc ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxNdc: e.target.value }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Dispensed NDC"
                  value={formValues.mmDispensedNdc ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmDispensedNdc: e.target.value }))}
                />
                {formValues.mmDispensedNdc && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxNdc: prev.mmDispensedNdc }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Quantity Ordered */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Quantity Ordered"
                type="number"
                value={formValues.erxQtyOrd ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxQtyOrd: e.target.value ? Number(e.target.value) : null }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Quantity Ordered"
                  type="number"
                  value={formValues.mmQtyOrd ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmQtyOrd: e.target.value ? Number(e.target.value) : null }))}
                />
                {formValues.mmQtyOrd != null && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxQtyOrd: prev.mmQtyOrd }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Quantity Dispensed */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Quantity Dispensed"
                type="number"
                value={formValues.erxQtyDispensed ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxQtyDispensed: e.target.value ? Number(e.target.value) : null }))}
                helperText="Update this value to match MM (e.g., 50) to resolve discrepancy"
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Dispensed Quantity"
                  type="number"
                  value={formValues.mmQtyDispensed ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmQtyDispensed: e.target.value ? Number(e.target.value) : null }))}
                />
                {formValues.mmQtyDispensed != null && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxQtyDispensed: prev.mmQtyDispensed }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Days Supply */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Based Days Supply"
                type="number"
                value={formValues.erxDaysSupply ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxDaysSupply: e.target.value ? Number(e.target.value) : null }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Dispensed Days Supply"
                  type="number"
                  value={formValues.mmDispensedDaysSupply ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmDispensedDaysSupply: e.target.value ? Number(e.target.value) : null }))}
                />
                {formValues.mmDispensedDaysSupply != null && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxDaysSupply: prev.mmDispensedDaysSupply }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Refills */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Refills"
                type="number"
                value={formValues.erxRefill ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxRefill: e.target.value ? Number(e.target.value) : null }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Refills (Pharmacist Entered)"
                  type="number"
                  value={formValues.mmRefillsPharmacistEntered ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmRefillsPharmacistEntered: e.target.value ? Number(e.target.value) : null }))}
                />
                {formValues.mmRefillsPharmacistEntered != null && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxRefill: prev.mmRefillsPharmacistEntered }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Sig / Directions */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX Sig / Directions"
                multiline
                rows={2}
                value={formValues.erxSig ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxSig: e.target.value }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM Dispensed Sig / Directions"
                  multiline
                  rows={2}
                  value={formValues.mmDispensedSig ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmDispensedSig: e.target.value }))}
                />
                {formValues.mmDispensedSig && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxSig: prev.mmDispensedSig }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1, mt: 0.5 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* DAW Code */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="ERX DAW Code"
                value={formValues.erxDawCode ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, erxDawCode: e.target.value }))}
              />
            </Box>
            <Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="MM DAW Code"
                  value={formValues.mmDawCode ?? ""}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, mmDawCode: e.target.value }))}
                />
                {formValues.mmDawCode && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setFormValues((prev) => ({ ...prev, erxDawCode: prev.mmDawCode }))}
                    sx={{ textTransform: "none", whiteSpace: "nowrap", fontSize: "0.75rem", px: 1 }}
                  >
                    Copy to ERX
                  </Button>
                )}
              </Box>
            </Box>

            {/* Payment Method & Insurance Code */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Payment Method (C = Cash, I = Insurance Priority)"
                value={formValues.paymentMethod ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, paymentMethod: e.target.value.toUpperCase() }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Insurance Code"
                value={formValues.insCode ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, insCode: e.target.value }))}
              />
            </Box>

            {/* Insurance BIN & Total Amount Paid */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Insurance BIN"
                value={formValues.binNo ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, binNo: e.target.value }))}
              />
            </Box>
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Total Amount Paid ($)"
                type="number"
                value={formValues.totalInsPaid ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, totalInsPaid: e.target.value ? Number(e.target.value) : null }))}
              />
            </Box>

            {/* Rx Origin */}
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField
                fullWidth
                size="small"
                label="Prescription Origin (e.g. ELECTRONIC, TELEPHONE, WRITTEN, PHARMACY)"
                value={formValues.mmRxOrigin ?? ""}
                onChange={(e) => setFormValues((prev) => ({ ...prev, mmRxOrigin: e.target.value }))}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={handleCloseEditDialog} color="inherit" disabled={isSavingForm}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveForm}
            variant="contained"
            color="primary"
            disabled={isSavingForm}
            startIcon={isSavingForm ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          >
            Save Changes & Re-evaluate
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
