import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchErxAllRecords,
  fetchErxBatches,
  exportErxAuditRecords,
  fetchErxDiscrepancySummary,
  bulkUpdateDiscrepancyStatus,
  fetchErxFilterOptions,
} from "../../slice/ErxAuditSlice";
import type { ErxAuditRecordDto, ErxAuditDiscrepancyDto } from "../../dto/erxAuditDto";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import ErxAuditDiscrepancyDetailModal from "./ErxAuditDiscrepancyDetailModal";
import {
  Box,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Button as MuiButton,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Checkbox,
  Tooltip,
  Popover,
  Autocomplete,
  TextField,
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import FolderSpecialOutlinedIcon from "@mui/icons-material/FolderSpecialOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import StarsOutlinedIcon from "@mui/icons-material/StarsOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import { getPharmacyApi } from "../../service/PharmacyService";
import { isAdminUser, getPharmacyId } from "../../component/auth/authUtils";
import {
  buildFocusedDiscrepancyColumns,
  formatDiscrepancyRuleName,
  getDeaBadge,
  areNdcsMatching,
  isQuantityDispensedCompliant,
  isDaysSupplyCompliant,
  getPaymentMethodBadge,
  getInsuranceBadge,
  getTotalInsPaidBadge,
  getRxOriginBadge,
} from "./erxAuditTableColumns";
import {
  formatDisplayDate as formatUsaDate,
  formatDisplayDateTime as formatUsaDateTime,
} from "../../utils/formatDisplayDate";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

export default function ErxAuditUploadedDataTab() {
  const dispatch = useDispatch<AppDispatch>();

  const {
    records,
    totalRecords,
    loadingRecords,
    batches,
    exporting,
    exportingFormat,
    discrepancySummaries,
    bulkUpdatingDiscrepancies,
    filterOptions,
  } = useSelector((state: RootState) => state.erxAudit);

  const isSuperAdmin = isAdminUser();
  const tokenPharmacyId = getPharmacyId();

  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string; npi?: string }>>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>(
    !isSuperAdmin && tokenPharmacyId ? tokenPharmacyId : ""
  );
  const [selectedDiscrepancyColumns, setSelectedDiscrepancyColumns] = useState<string[]>([]);
  const selectedDiscrepancyColumn = useMemo(
    () => selectedDiscrepancyColumns.join(","),
    [selectedDiscrepancyColumns]
  );

  const setSelectedDiscrepancyColumn = useCallback((val: string) => {
    if (!val) {
      setSelectedDiscrepancyColumns([]);
    } else {
      setSelectedDiscrepancyColumns(val.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }, []);

  const toggleDiscrepancyColumn = useCallback((columnName: string) => {
    setSelectedDiscrepancyColumns((prev) => {
      const exists = prev.some((c) => c.toLowerCase() === columnName.toLowerCase());
      if (exists) {
        return prev.filter((c) => c.toLowerCase() !== columnName.toLowerCase());
      } else {
        return [...prev, columnName];
      }
    });
    setPageParam((prev) => ({ ...prev, page: 1 }));
    setSelectedRecordIds([]);
  }, []);

  const clearAllDiscrepancyFilters = useCallback(() => {
    setSelectedDiscrepancyColumns([]);
    setPageParam((prev) => ({ ...prev, page: 1 }));
    setSelectedRecordIds([]);
  }, []);

  // Column L, M, N, O, BE filter states
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("");
  const [insCodeFilter, setInsCodeFilter] = useState<string[]>([]);
  const [binNoFilter, setBinNoFilter] = useState<string[]>([]);
  const [minPriceFilter, setMinPriceFilter] = useState<string>("");
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>("");
  const [nonElectronicOnly, setNonElectronicOnly] = useState<boolean>(false);
  const [rxOriginFilter, setRxOriginFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [searchText, setSearchText] = useState("");
  const [discrepanciesOnly, setDiscrepanciesOnly] = useState<boolean>(false);
  const [viewMode] = useState<"full" | "summary">("full");
  const [selectedRecord, setSelectedRecord] = useState<ErxAuditRecordDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  const activeClaimFiltersCount = useMemo(() => {
    let count = 0;
    count += insCodeFilter.length;
    count += binNoFilter.length;
    count += rxOriginFilter.length;
    if (minPriceFilter !== "" || maxPriceFilter !== "") count++;
    if (nonElectronicOnly) count++;
    return count;
  }, [insCodeFilter, binNoFilter, rxOriginFilter, minPriceFilter, maxPriceFilter, nonElectronicOnly]);

  const validDiscrepancySummaries = useMemo(() => {
    if (!discrepancySummaries) return [];
    return discrepancySummaries.filter(
      (s) =>
        s.discrepancyCount > 0 &&
        !s.fieldGroupName.toLowerCase().includes("testing") &&
        !s.fieldGroupName.toLowerCase().includes("comparision")
    );
  }, [discrepancySummaries]);

  const totalDiscrepanciesCount = useMemo(() => {
    return validDiscrepancySummaries.reduce((acc, curr) => acc + curr.discrepancyCount, 0);
  }, [validDiscrepancySummaries]);

  const hasAnyActiveFilters = Boolean(
    searchText ||
    selectedPharmacyId ||
    selectedDiscrepancyColumns.length > 0 ||
    paymentMethodFilter ||
    insCodeFilter.length > 0 ||
    binNoFilter.length > 0 ||
    minPriceFilter !== "" ||
    maxPriceFilter !== "" ||
    nonElectronicOnly ||
    rxOriginFilter.length > 0 ||
    sortBy
  );

  const clearAllFilters = useCallback(() => {
    setSearchText("");
    setSelectedPharmacyId(!isSuperAdmin && tokenPharmacyId ? tokenPharmacyId : "");
    setSelectedBatchId("");
    setSelectedDiscrepancyColumns([]);
    setPaymentMethodFilter("");
    setInsCodeFilter([]);
    setBinNoFilter([]);
    setMinPriceFilter("");
    setMaxPriceFilter("");
    setNonElectronicOnly(false);
    setRxOriginFilter([]);
    setSortBy("");
    setSortOrder("asc");
    setPageParam((prev) => ({ ...prev, page: 1 }));
    setSelectedRecordIds([]);
  }, []);

  const clearAllInsuranceFilters = useCallback(() => {
    setInsCodeFilter([]);
    setBinNoFilter([]);
    setMinPriceFilter("");
    setMaxPriceFilter("");
    setNonElectronicOnly(false);
    setRxOriginFilter([]);
    setPageParam((prev) => ({ ...prev, page: 1 }));
  }, []);

  const availableInsCodes = useMemo(
    () => filterOptions?.insCodes || filterOptions?.insuranceCodes || [],
    [filterOptions]
  );
  const availableBinNos = useMemo(
    () => filterOptions?.binNos || filterOptions?.binNumbers || [],
    [filterOptions]
  );
  const availableRxOrigins = useMemo(
    () => filterOptions?.rxOrigins || [],
    [filterOptions]
  );
  const highValueClaimCount =
    filterOptions?.highValueClaimCount ?? filterOptions?.highValueRecordCount ?? null;
  const nonElectronicCount =
    filterOptions?.nonElectronicCount ?? filterOptions?.nonElectronicRecordCount ?? null;
  const batchLookup = useMemo(() => {
    const map: Record<string, string> = {};
    batches.forEach((b) => {
      const pLabel = b.pharmacyName ? `[${b.pharmacyName}] ` : "";
      map[b.batchId] = `${pLabel}${b.fileName}`;
    });
    return map;
  }, [batches]);

  // Load pharmacies on mount
  useEffect(() => {
    if (!isSuperAdmin && tokenPharmacyId) {
      setSelectedPharmacyId(tokenPharmacyId);
    }
  }, [isSuperAdmin, tokenPharmacyId]);

  useEffect(() => {
    let mounted = true;
    getPharmacyApi({ page: 1, pageSize: 200, isActive: true })
      .then((res: any) => {
        if (!mounted) return;
        const rawList = res?.data?.data || res?.data || [];
        const mapped = Array.isArray(rawList)
          ? rawList.map((p: any) => ({
              id: p.id,
              name: p.businessTradeName || p.businessLegalName || "Pharmacy",
              npi: p.npi,
            }))
          : [];
        setPharmacies(mapped);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Load batches on mount or pharmacy change
  useEffect(() => {
    dispatch(fetchErxBatches({ pharmacyId: selectedPharmacyId || undefined }));
  }, [dispatch, selectedPharmacyId]);

  // Load discrepancy summary whenever batch or pharmacy selection changes
  useEffect(() => {
    dispatch(
      fetchErxDiscrepancySummary({
        batchId: selectedBatchId || undefined,
        pharmacyId: selectedPharmacyId || undefined,
      })
    );
  }, [selectedBatchId, selectedPharmacyId, dispatch]);

  // Load filter options whenever batch or pharmacy selection changes
  useEffect(() => {
    dispatch(
      fetchErxFilterOptions({
        batchId: selectedBatchId || undefined,
        pharmacyId: selectedPharmacyId || undefined,
      })
    );
  }, [selectedBatchId, selectedPharmacyId, dispatch]);

  const loadData = useCallback(() => {
    dispatch(
      fetchErxAllRecords({
        batchId: selectedBatchId || undefined,
        params: {
          pharmacyId: selectedPharmacyId || undefined,
          page: pageParam.page,
          pageSize: pageParam.pageSize,
          searchText,
          discrepanciesOnly: discrepanciesOnly ? true : undefined,
          discrepancyColumn: selectedDiscrepancyColumn || undefined,
          paymentMethod: paymentMethodFilter || undefined,
          insCode: insCodeFilter.length > 0 ? insCodeFilter.join(",") : undefined,
          binNo: binNoFilter.length > 0 ? binNoFilter.join(",") : undefined,
          minTotalPaid: minPriceFilter !== "" && !isNaN(Number(minPriceFilter)) ? Number(minPriceFilter) : undefined,
          maxTotalPaid: maxPriceFilter !== "" && !isNaN(Number(maxPriceFilter)) ? Number(maxPriceFilter) : undefined,
          nonElectronicOnly: nonElectronicOnly ? true : undefined,
          rxOrigin: rxOriginFilter.length > 0 ? rxOriginFilter.join(",") : undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortBy ? sortOrder : undefined,
        },
      })
    );
  }, [
    selectedBatchId,
    selectedPharmacyId,
    selectedDiscrepancyColumn,
    pageParam.page,
    pageParam.pageSize,
    searchText,
    discrepanciesOnly,
    paymentMethodFilter,
    insCodeFilter,
    binNoFilter,
    minPriceFilter,
    maxPriceFilter,
    nonElectronicOnly,
    rxOriginFilter,
    sortBy,
    sortOrder,
    dispatch,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = (record: ErxAuditRecordDto) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleReloadData = () => {
    setSelectedRecordIds([]);
    dispatch(fetchErxBatches({ pharmacyId: selectedPharmacyId || undefined }));
    dispatch(
      fetchErxDiscrepancySummary({
        batchId: selectedBatchId || undefined,
        pharmacyId: selectedPharmacyId || undefined,
      })
    );
    dispatch(
      fetchErxFilterOptions({
        batchId: selectedBatchId || undefined,
        pharmacyId: selectedPharmacyId || undefined,
      })
    );
    loadData();
  };

  const handleExport = (format: "xlsx" | "csv" = "xlsx") => {
    dispatch(
      exportErxAuditRecords({
        batchId: selectedBatchId || undefined,
        pharmacyId: selectedPharmacyId || undefined,
        discrepanciesOnly: discrepanciesOnly ? true : undefined,
        format,
        paymentMethod: paymentMethodFilter || undefined,
        insCode: insCodeFilter.length > 0 ? insCodeFilter.join(",") : undefined,
        binNo: binNoFilter.length > 0 ? binNoFilter.join(",") : undefined,
        minTotalPaid: minPriceFilter !== "" && !isNaN(Number(minPriceFilter)) ? Number(minPriceFilter) : undefined,
        maxTotalPaid: maxPriceFilter !== "" && !isNaN(Number(maxPriceFilter)) ? Number(maxPriceFilter) : undefined,
        nonElectronicOnly: nonElectronicOnly ? true : undefined,
        rxOrigin: rxOriginFilter.length > 0 ? rxOriginFilter.join(",") : undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
      })
    );
  };

  // Multi-selection helpers
  const isAllSelected = records.length > 0 && records.every((r) => selectedRecordIds.includes(r.recordId));
  const isSomeSelected = selectedRecordIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map((r) => r.recordId));
    }
  };

  const handleToggleRow = (recordId: number) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  // Discrepancy ignore actions
  const handleIgnoreRecord = async (record: ErxAuditRecordDto, colName?: string) => {
    const column = colName || selectedDiscrepancyColumn;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        recordIds: [record.recordId],
        discrepancyColumn: column || undefined,
        batchId: record.batchId,
        status: "Ignored",
      })
    );
    dispatch(fetchErxDiscrepancySummary(selectedBatchId || undefined));
    loadData();
  };

  const handleBulkIgnoreSelected = async () => {
    if (selectedRecordIds.length === 0) return;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        recordIds: selectedRecordIds,
        discrepancyColumn: selectedDiscrepancyColumn || undefined,
        batchId: selectedBatchId || undefined,
        status: "Ignored",
      })
    );
    setSelectedRecordIds([]);
    dispatch(fetchErxDiscrepancySummary(selectedBatchId || undefined));
    loadData();
  };

  const handleIgnoreAllForColumn = async () => {
    if (!selectedDiscrepancyColumn) return;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        discrepancyColumn: selectedDiscrepancyColumn,
        batchId: selectedBatchId || undefined,
        status: "Ignored",
      })
    );
    setSelectedRecordIds([]);
    dispatch(fetchErxDiscrepancySummary(selectedBatchId || undefined));
    loadData();
  };

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

  const isPatientNameDiscrepancy = (d: ErxAuditDiscrepancyDto) => {
    const group = (d.fieldGroupName || "").toLowerCase().trim();
    const mm = (d.mmColumnName || "").toLowerCase().trim();
    const erx = (d.erxColumnName || "").toLowerCase().trim();
    return group === "patient name" || group === "patient" || mm === "mmpatientname" || erx === "erxpatientname";
  };

  const getRecordDiscrepancyCount = (row: ErxAuditRecordDto): number => {
    if (!row.discrepancies) return row.discrepancyCount ?? 0;
    const demoMatch = arePatientDemographicsMatching(row);
    const ndcsMatch = areNdcsMatching(row.mmDispensedNdc, row.erxNdc);
    const qtyCompliant = isQuantityDispensedCompliant(row);
    const daysSupplyCompliant = isDaysSupplyCompliant(row);
    return row.discrepancies.filter((d) => {
      if (d.status !== "Open" && d.status) return false;
      if (demoMatch && isPatientNameDiscrepancy(d)) return false;
      if (ndcsMatch) {
        const fg = (d.fieldGroupName || "").toLowerCase();
        const mm = (d.mmColumnName || "").toLowerCase();
        const erx = (d.erxColumnName || "").toLowerCase();
        if (
          fg.includes("drug") ||
          fg.includes("ndc") ||
          mm.includes("drug") ||
          mm.includes("ndc") ||
          erx.includes("drug") ||
          erx.includes("ndc")
        ) {
          return false;
        }
      }
      if (qtyCompliant) {
        const fg = (d.fieldGroupName || "").toLowerCase();
        const mm = (d.mmColumnName || "").toLowerCase();
        const erx = (d.erxColumnName || "").toLowerCase();
        if (
          d.ruleId === 5 ||
          fg.includes("quantity dispensed") ||
          fg.includes("qty dispensed") ||
          mm.includes("mmqtydispensed") ||
          erx.includes("erxqtydispensed")
        ) {
          return false;
        }
      }
      if (daysSupplyCompliant) {
        const fg = (d.fieldGroupName || "").toLowerCase();
        const mm = (d.mmColumnName || "").toLowerCase();
        const erx = (d.erxColumnName || "").toLowerCase();
        if (
          d.ruleId === 6 ||
          fg.includes("days supply") ||
          mm.includes("dayssupply") ||
          erx.includes("dayssupply")
        ) {
          return false;
        }
      }
      return true;
    }).length;
  };

  // Helpers to check discrepancy status on a row
  const hasOpenDiscrepancyForColumn = (record: ErxAuditRecordDto, colName: string) => {
    if (!record.discrepancies) return false;
    const target = colName.toLowerCase().replace(/[\s_-]/g, "");
    if ((target === "patientname" || target === "mmpatientname" || target === "erxpatientname") && arePatientDemographicsMatching(record)) {
      return false;
    }
    if ((target.includes("drug") || target.includes("medication") || target.includes("ndc")) && areNdcsMatching(record.mmDispensedNdc, record.erxNdc)) {
      return false;
    }
    if (
      (target.includes("quantitydispensed") || target.includes("qtydispensed") || target === "quantity" || target === "qty") &&
      isQuantityDispensedCompliant(record)
    ) {
      return false;
    }
    if (
      (target.includes("dayssupply") || target.includes("days")) &&
      isDaysSupplyCompliant(record)
    ) {
      return false;
    }
    return record.discrepancies.some((d) => {
      if (d.status !== "Open" && d.status) return false;
      if (isQuantityDispensedCompliant(record)) {
        const fg = (d.fieldGroupName || "").toLowerCase();
        const mm = (d.mmColumnName || "").toLowerCase();
        const erx = (d.erxColumnName || "").toLowerCase();
        if (
          d.ruleId === 5 ||
          fg.includes("quantity dispensed") ||
          fg.includes("qty dispensed") ||
          mm.includes("mmqtydispensed") ||
          erx.includes("erxqtydispensed")
        ) {
          return false;
        }
      }
      if (isDaysSupplyCompliant(record)) {
        const fg = (d.fieldGroupName || "").toLowerCase();
        const mm = (d.mmColumnName || "").toLowerCase();
        const erx = (d.erxColumnName || "").toLowerCase();
        if (
          d.ruleId === 6 ||
          fg.includes("days supply") ||
          mm.includes("dayssupply") ||
          erx.includes("dayssupply")
        ) {
          return false;
        }
      }
      const isMatch =
        (d.fieldGroupName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
        (d.mmColumnName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
        (d.erxColumnName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
        (d.fieldGroupName || "").toLowerCase().includes(target) ||
        target.includes((d.fieldGroupName || "").toLowerCase());
      return isMatch;
    });
  };

  const isDiscrepancyIgnoredForColumn = (record: ErxAuditRecordDto, colName: string) => {
    if (!record.discrepancies) return false;
    const target = colName.toLowerCase().replace(/[\s_-]/g, "");
    return record.discrepancies.some((d) => {
      return (
        d.status === "Ignored" &&
        ((d.fieldGroupName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
          (d.mmColumnName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
          (d.erxColumnName || "").toLowerCase().replace(/[\s_-]/g, "") === target ||
          (d.fieldGroupName || "").toLowerCase().includes(target) ||
          target.includes((d.fieldGroupName || "").toLowerCase()))
      );
    });
  };

  // Field discrepancy helpers for column headers
  const isFieldFiltered = (fieldNames: string[]) => {
    if (selectedDiscrepancyColumns.length === 0) return false;
    return selectedDiscrepancyColumns.some((col) => {
      const target = col.toLowerCase().replace(/[\s_-]/g, "");
      return fieldNames.some((f) => {
        const clean = f.toLowerCase().replace(/[\s_-]/g, "");
        return clean === target || clean.includes(target) || target.includes(clean);
      });
    });
  };

  const getDiscrepancyCountForFields = (fieldNames: string[]) => {
    if (!discrepancySummaries || discrepancySummaries.length === 0) return 0;
    return discrepancySummaries
      .filter((s) => {
        const g = (s.fieldGroupName || "").toLowerCase().replace(/[\s_-]/g, "");
        const mm = (s.mmColumnName || "").toLowerCase().replace(/[\s_-]/g, "");
        const erx = (s.erxColumnName || "").toLowerCase().replace(/[\s_-]/g, "");
        return fieldNames.some((f) => {
          const c = f.toLowerCase().replace(/[\s_-]/g, "");
          return g === c || mm === c || erx === c || g.includes(c) || c.includes(g);
        });
      })
      .reduce((acc, curr) => acc + curr.discrepancyCount, 0);
  };

  const handleHeaderColumnClick = (preferredFieldName: string) => {
    toggleDiscrepancyColumn(preferredFieldName);
  };

  const renderTh = (title: string, fieldNames: string[], baseClassName: string) => {
    const count = getDiscrepancyCountForFields(fieldNames);
    const isFiltered = isFieldFiltered(fieldNames);
    const primary = fieldNames[0];

    const tooltipMsg =
      count > 0
        ? `⚠️ ${count} open discrepancies detected between MM and ERX for "${title}". Click header or badge to toggle filter.`
        : title;

    return (
      <th
        key={title}
        className={`${baseClassName} ${count > 0 ? "erx-th-clickable" : ""} ${isFiltered ? "erx-col-filtered" : ""}`}
        onClick={() => count > 0 && handleHeaderColumnClick(primary)}
        title={tooltipMsg}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
          <span>{title}</span>
          {count > 0 && (
            <Tooltip
              title={`⚠️ ${count} open discrepancies in ${title}. Click to ${isFiltered ? "remove" : "apply"} filter.`}
              arrow
              placement="top"
            >
              <Chip
                size="small"
                color="error"
                label={`⚠️ ${count}`}
                sx={{
                  height: 18,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  ...(isFiltered
                    ? { bgcolor: "#b91c1c", color: "#ffffff", boxShadow: "0 0 0 2px #fecaca" }
                    : { "&:hover": { bgcolor: "#dc2626" } }),
                }}
              />
            </Tooltip>
          )}
        </Box>
      </th>
    );
  };

  const summaryColumns = [
    {
      header: (
        <Checkbox
          size="small"
          checked={isAllSelected}
          indeterminate={isSomeSelected}
          onChange={handleToggleSelectAll}
          disabled={records.length === 0}
          sx={{ p: 0.5 }}
        />
      ),
      accessor: "recordId" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <Checkbox
          size="small"
          checked={selectedRecordIds.includes(row.recordId)}
          onChange={() => handleToggleRow(row.recordId)}
          sx={{ p: 0.5 }}
        />
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.RX_NUMBER,
      accessor: "rxNumber" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.875rem" }}>
            {row.rxNumber}
          </span>
          {getDeaBadge(row.rxNumber, row.erxRxNumber)}
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.DISPENSED_DRUG_MM,
      accessor: "mmDispensedDrugName" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0369a1" }}>{row.mmDispensedDrugName || "—"}</div>
          {row.mmDispensedNdc && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>NDC: {row.mmDispensedNdc}</div>
          )}
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.PRESCRIBED_DRUG_ERX,
      accessor: "erxDrugName" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.erxDrugName || "—"}</div>
          {row.erxNdc && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>NDC: {row.erxNdc}</div>
          )}
        </div>
      ),
    },
    {
      header: "Pharmacy",
      accessor: "pharmacyName" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#1e293b" }}>
            {row.pharmacyName || "—"}
          </div>
          {row.pharmacyNpi && (
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              NPI: {row.pharmacyNpi}
            </div>
          )}
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.PATIENT,
      accessor: "mmPatientName" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a" }}>{row.mmPatientName || row.erxPatientName || "—"}</div>
          {(row.mmPatientDob || row.erxPatientDob) && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              DOB: {formatUsaDate(row.mmPatientDob || row.erxPatientDob)}
            </div>
          )}
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.PRESCRIBER,
      accessor: "mmPrescriberName" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div>
          <div style={{ fontWeight: 500, color: "#0f172a" }}>{row.mmPrescriberName || row.erxPrescriberName || "—"}</div>
          {(row.mmPrescriberNpi || row.erxPrescriberNpi) && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              NPI: {row.mmPrescriberNpi || row.erxPrescriberNpi}
            </div>
          )}
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.PAYMENT_INSURANCE,
      accessor: "paymentMethod" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <div>{getPaymentMethodBadge(row.paymentMethod)}</div>
          {getInsuranceBadge(row.insCode, row.binNo)}
        </Box>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.TOTAL_INS_PAID,
      accessor: "totalInsPaid" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => getTotalInsPaidBadge(row.totalInsPaid),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.RX_ORIGIN,
      accessor: "mmRxOrigin" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => getRxOriginBadge(row.mmRxOrigin),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.QTY_MM_ERX,
      accessor: "mmQtyDispensed" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <span style={{ fontWeight: 600 }}>{`${row.mmQtyDispensed ?? "-"} / ${row.erxQtyOrd ?? "-"}`}</span>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.AUDIT_RESULT,
      accessor: "hasDiscrepancy" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => {
        const count = getRecordDiscrepancyCount(row);
        return count > 0 ? (
          <Chip
            size="small"
            icon={<WarningAmberIcon sx={{ fontSize: "15px !important", color: "#be123c !important" }} />}
            label={ERX_AUDIT_LABELS.formatMismatches(count)}
            sx={{
              fontWeight: 600,
              height: 24,
              fontSize: "0.75rem",
              bgcolor: "#fff1f2",
              color: "#be123c",
              border: "1px solid #fecdd3",
            }}
          />
        ) : (
          <Chip
            size="small"
            icon={<CheckCircleOutlinedIcon sx={{ fontSize: "15px !important", color: "#059669 !important" }} />}
            label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH_CLEAN}
            sx={{
              fontWeight: 600,
              height: 24,
              fontSize: "0.75rem",
              bgcolor: "#f0fdf4",
              color: "#059669",
              border: "1px solid #bbf7d0",
            }}
          />
        );
      },
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.ACTION,
      accessor: "recordId" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<CompareArrowsOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => handleOpenDetail(row)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              py: 0.4,
              px: 1.2,
              fontSize: "0.78rem",
              color: "#0369a1",
              borderColor: "#bae6fd",
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff" },
            }}
            title={ERX_AUDIT_LABELS.ACTIONS.COMPARE_TOOLTIP}
          >
            {ERX_AUDIT_LABELS.ACTIONS.COMPARE}
          </MuiButton>
          {selectedDiscrepancyColumn && (
            hasOpenDiscrepancyForColumn(row, selectedDiscrepancyColumn) ? (
              <MuiButton
                size="small"
                variant="outlined"
                startIcon={<BlockOutlinedIcon sx={{ fontSize: 13 }} />}
                onClick={() => handleIgnoreRecord(row, selectedDiscrepancyColumn)}
                disabled={bulkUpdatingDiscrepancies}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  py: 0.4,
                  px: 1.2,
                  fontSize: "0.75rem",
                  color: "#64748b",
                  borderColor: "#cbd5e1",
                  "&:hover": { borderColor: "#f87171", color: "#dc2626", bgcolor: "#fef2f2" },
                }}
                title={ERX_AUDIT_LABELS.formatIgnoreColumnTooltip(formatDiscrepancyRuleName(selectedDiscrepancyColumn), row.rxNumber)}
              >
                {ERX_AUDIT_LABELS.ACTIONS.IGNORE}
              </MuiButton>
            ) : isDiscrepancyIgnoredForColumn(row, selectedDiscrepancyColumn) ? (
              <Chip
                size="small"
                label={ERX_AUDIT_LABELS.STATUS_BADGES.IGNORED}
                sx={{
                  bgcolor: "#f8fafc",
                  color: "#94a3b8",
                  fontSize: "0.72rem",
                  height: 22,
                  border: "1px solid #e2e8f0",
                }}
              />
            ) : null
          )}
        </Box>
      ),
    },
  ];

  const selectedSummary = discrepancySummaries.find(
    (s) => s.fieldGroupName.toLowerCase() === selectedDiscrepancyColumn.toLowerCase()
  );
  const selectedRuleId = selectedSummary?.ruleId;

  const activeSummaryColumns = useMemo(() => {
    if (selectedDiscrepancyColumn && !showAllColumns) {
      return buildFocusedDiscrepancyColumns({
        selectedDiscrepancyColumn,
        selectedRuleId,
        selectedRecordIds,
        isAllSelected,
        isSomeSelected,
        onToggleSelectAll: handleToggleSelectAll,
        onToggleRow: handleToggleRow,
        onOpenDetail: handleOpenDetail,
        onIgnoreRecord: handleIgnoreRecord,
        bulkUpdating: bulkUpdatingDiscrepancies,
        totalRecordCount: records.length,
        batchLookup: !selectedBatchId ? batchLookup : undefined,
      });
    }
    return summaryColumns;
  }, [
    selectedDiscrepancyColumn,
    showAllColumns,
    selectedRuleId,
    selectedRecordIds,
    isAllSelected,
    isSomeSelected,
    records.length,
    bulkUpdatingDiscrepancies,
    selectedBatchId,
    batchLookup,
    summaryColumns,
  ]);

  // Discrepancy & record stats
  const selectedBatch = batches.find((b) => b.batchId === selectedBatchId);
  const totalAuditedRecords =
    selectedBatch && typeof selectedBatch.totalRows === "number" && selectedBatch.totalRows > 0
      ? selectedBatch.totalRows
      : !selectedBatchId && batches.length > 0
      ? batches.reduce((acc, b) => acc + (b.totalRows ?? 0), 0)
      : totalRecords || records.length || 0;
  const totalDiscrepancies =
    discrepancySummaries && discrepancySummaries.length > 0
      ? discrepancySummaries.reduce((acc, s) => acc + s.discrepancyCount, 0)
      : selectedBatch
      ? (selectedBatch.totalDiscrepancies ?? 0)
      : batches.length > 0
      ? batches.reduce((acc, b) => acc + (b.totalDiscrepancies ?? 0), 0)
      : records.reduce(
          (acc, r) =>
            acc +
            (r.discrepancies
              ? r.discrepancies.filter((d) => d.status === "Open" || !d.status).length
              : (r.discrepancyCount ?? 0)),
          0
        );

  return (
    <div className="erx-uploaded-data-container">
      {/* Bar 1: Executive KPI Metrics & Batch Control Strip */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "stretch", md: "center" },
          justifyContent: "space-between",
          gap: { xs: 1, md: 1.25 },
          p: { xs: "6px 8px", sm: "6px 12px" },
          mb: 1,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        }}
      >
        {/* Left: Compact Interactive Metric Pills */}
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1 }, flexWrap: "wrap", width: { xs: "100%", md: "auto" } }}>
          {/* Prescriptions Audited Pill */}
          <Tooltip title="View all audited prescriptions" arrow>
            <Box
              onClick={() => {
                setDiscrepanciesOnly(false);
                clearAllDiscrepancyFilters();
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: "6px",
                bgcolor: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? "#f1f5f9" : "#ffffff",
                border: "1px solid",
                borderColor: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? "#94a3b8" : "#e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 16, color: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? "#1e293b" : "#64748b" }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? 700 : 600,
                  color: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? "#0f172a" : "#475569",
                  fontSize: "0.76rem",
                }}
              >
                {ERX_AUDIT_LABELS.KPIS.PRESCRIPTIONS_AUDITED}:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: !discrepanciesOnly && selectedDiscrepancyColumns.length === 0 ? "#0f172a" : "#1e293b",
                  fontSize: "0.84rem",
                }}
              >
                {totalAuditedRecords}
              </Typography>
            </Box>
          </Tooltip>

          {/* Discrepancies To Review Pill */}
          <Tooltip title="Click to filter by prescriptions needing review" arrow>
            <Box
              onClick={() => {
                setDiscrepanciesOnly(true);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: "6px",
                bgcolor: discrepanciesOnly ? "#f1f5f9" : "#ffffff",
                border: "1px solid",
                borderColor: discrepanciesOnly ? "#94a3b8" : "#e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              <WarningAmberIcon sx={{ fontSize: 16, color: discrepanciesOnly ? "#1e293b" : "#64748b" }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: discrepanciesOnly ? 700 : 600,
                  color: discrepanciesOnly ? "#0f172a" : "#475569",
                  fontSize: "0.76rem",
                }}
              >
                {ERX_AUDIT_LABELS.KPIS.DISCREPANCIES_TO_REVIEW}:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: discrepanciesOnly ? "#0f172a" : "#1e293b",
                  fontSize: "0.84rem",
                }}
              >
                {totalDiscrepancies}
              </Typography>
            </Box>
          </Tooltip>

          {/* Batches Count Pill */}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.4,
              borderRadius: "6px",
              bgcolor: "#ffffff",
              border: "1px solid #e2e8f0",
            }}
          >
            <FolderSpecialOutlinedIcon sx={{ fontSize: 16, color: "#64748b" }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", fontSize: "0.76rem" }}>
              {ERX_AUDIT_LABELS.KPIS.TOTAL_BATCHES}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.84rem" }}>
              {batches.length}
            </Typography>
          </Box>
        </Box>

        {/* Right: Inline Pharmacy & Batch Selector & Reload Seed */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            width: { xs: "100%", md: "auto" },
            justifyContent: { xs: "space-between", md: "flex-end" },
            flexWrap: "wrap",
          }}
        >
          {/* Pharmacy Filter Dropdown or Badge */}
          {isSuperAdmin ? (
            <FormControl
              size="small"
              sx={{
                minWidth: { xs: 150, sm: 190, md: 210 },
                maxWidth: { xs: "100%", md: 260 },
              }}
            >
              <Select
                value={selectedPharmacyId}
                displayEmpty
                onChange={(e) => {
                  setSelectedPharmacyId(e.target.value);
                  setSelectedBatchId("");
                  setPageParam((prev) => ({ ...prev, page: 1 }));
                  setSelectedRecordIds([]);
                }}
                sx={{
                  height: 30,
                  fontSize: "0.8rem",
                  fontWeight: selectedPharmacyId ? 600 : 500,
                  bgcolor: selectedPharmacyId ? "#f0fdf4" : "#f8fafc",
                  borderColor: selectedPharmacyId ? "#86efac" : undefined,
                  "& .MuiSelect-select": { py: "3px 10px", display: "flex", alignItems: "center", gap: 0.5 },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.8rem" }}>
                  <LocalPharmacyOutlinedIcon sx={{ fontSize: 16, mr: 0.75, color: "#64748b" }} />
                  All Pharmacies ({pharmacies.length || "All"})
                </MenuItem>
                {pharmacies.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.8rem" }}>
                    <LocalPharmacyOutlinedIcon sx={{ fontSize: 16, mr: 0.75, color: "#16a34a" }} />
                    {p.name} {p.npi ? `(${p.npi})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: "6px",
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <LocalPharmacyOutlinedIcon sx={{ fontSize: 16, color: "#16a34a" }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.76rem" }}>
                Pharmacy:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#14532d", fontSize: "0.84rem" }}>
                {pharmacies.find((p) => p.id === tokenPharmacyId)?.name || "My Pharmacy"}
              </Typography>
            </Box>
          )}

          {/* Batch Selector */}
          <FormControl size="small" sx={{ flex: { xs: 1, sm: 1, md: "initial" }, minWidth: { xs: 130, sm: 180, md: 220 }, maxWidth: { xs: "100%", md: 320 } }}>
            <Select
              value={selectedBatchId}
              displayEmpty
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setPageParam((prev) => ({ ...prev, page: 1 }));
                setSelectedRecordIds([]);
              }}
              sx={{
                height: 30,
                fontSize: "0.8rem",
                fontWeight: 500,
                bgcolor: "#f8fafc",
                "& .MuiSelect-select": { py: "3px 10px" },
              }}
            >
              <MenuItem value="" sx={{ fontSize: "0.8rem" }}>
                {ERX_AUDIT_LABELS.FILTERS.ALL_UPLOADED_BATCHES} ({batches.length})
              </MenuItem>
              {batches.map((b) => (
                <MenuItem key={b.batchId} value={b.batchId} sx={{ fontSize: "0.8rem" }}>
                  {b.pharmacyName ? `[${b.pharmacyName}] ` : ""}{b.fileName} — {formatUsaDate(b.uploadedAt)} ({b.totalRows} rx)
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title={ERX_AUDIT_LABELS.ACTIONS.RELOAD_DATA_TOOLTIP} arrow>
            <MuiButton
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<RefreshOutlinedIcon sx={{ fontSize: 15 }} />}
              onClick={handleReloadData}
              disabled={loadingRecords}
              sx={{
                height: 30,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.76rem",
                borderColor: "#cbd5e1",
                color: "#475569",
                bgcolor: "#ffffff",
                px: 1.25,
                flexShrink: 0,
                whiteSpace: "nowrap",
                "&:hover": { borderColor: "#94a3b8", bgcolor: "#f8fafc" },
              }}
            >
              {ERX_AUDIT_LABELS.ACTIONS.RELOAD_DATA}
            </MuiButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Unified Filter & Action Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
          p: { xs: "6px 8px", sm: "6px 12px" },
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Left Filter Controls */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          {/* Search Prescriptions */}
          <Box sx={{ width: { xs: "100%", sm: 220, md: 250 }, minWidth: 0 }}>
            <SearchInput
              placeholder={ERX_AUDIT_LABELS.FILTERS.SEARCH_PRESCRIPTIONS_PLACEHOLDER}
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchText(e.target.value);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </Box>

          {/* Discrepancy Type Dropdown */}
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200, md: 230 } }}>
            <Select
              multiple
              value={selectedDiscrepancyColumns}
              displayEmpty
              onChange={(e) => {
                const val = typeof e.target.value === "string" ? e.target.value.split(",") : (e.target.value as string[]);
                if (val.includes("__ALL__")) {
                  setSelectedDiscrepancyColumns([]);
                } else {
                  setSelectedDiscrepancyColumns(val);
                }
                setPageParam((prev) => ({ ...prev, page: 1 }));
                setSelectedRecordIds([]);
              }}
              renderValue={(selected) => {
                const arr = (selected as string[]) || [];
                if (arr.length === 0) {
                  return <span style={{ color: "#475569" }}>All Discrepancy Types ({totalDiscrepanciesCount})</span>;
                }
                if (arr.length === 1) {
                  return <span>{formatDiscrepancyRuleName(arr[0])}</span>;
                }
                return <span>{arr.length} Discrepancy Types</span>;
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      maxHeight: 340,
                      "& .MuiMenuItem-root": { py: 0.5, px: 1.25, minHeight: 32 },
                    },
                  },
                },
              } as any}
              sx={{
                height: 32,
                fontSize: "0.75rem",
                fontWeight: selectedDiscrepancyColumns.length > 0 ? 600 : 500,
                bgcolor: selectedDiscrepancyColumns.length > 0 ? "#f0f9ff" : "#ffffff",
                color: selectedDiscrepancyColumns.length > 0 ? "#0284c7" : "#334155",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: selectedDiscrepancyColumns.length > 0 ? "#38bdf8" : "#cbd5e1",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#0284c7",
                },
                "& .MuiSelect-select": { py: "4px 10px" },
              }}
            >
              <MenuItem
                value="__ALL__"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  borderBottom: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                <Checkbox
                  size="small"
                  checked={selectedDiscrepancyColumns.length === 0}
                  sx={{ p: 0.25, mr: 0.75, color: "#0284c7", "&.Mui-checked": { color: "#0284c7" } }}
                />
                <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 700, flex: 1 }}>
                  All Discrepancy Types
                </Typography>
                <Chip
                  size="small"
                  label={totalDiscrepanciesCount}
                  sx={{ height: 18, fontSize: "0.68rem", fontWeight: 700, bgcolor: "#e2e8f0", color: "#334155" }}
                />
              </MenuItem>
              {validDiscrepancySummaries.map((s) => {
                const isChecked = selectedDiscrepancyColumns.some(
                  (c) => c.toLowerCase() === s.fieldGroupName.toLowerCase()
                );
                return (
                  <MenuItem key={s.ruleId || s.fieldGroupName} value={s.fieldGroupName} sx={{ fontSize: "0.75rem" }}>
                    <Checkbox
                      size="small"
                      checked={isChecked}
                      sx={{ p: 0.25, mr: 0.75, color: "#0284c7", "&.Mui-checked": { color: "#0284c7" } }}
                    />
                    <Typography component="span" sx={{ fontSize: "0.75rem", flex: 1, fontWeight: isChecked ? 600 : 400 }}>
                      {formatDiscrepancyRuleName(s.fieldGroupName)}
                    </Typography>
                    <Chip
                      size="small"
                      label={s.discrepancyCount}
                      sx={{
                        height: 18,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        bgcolor: isChecked ? "#e0f2fe" : "#f1f5f9",
                        color: isChecked ? "#0284c7" : "#64748b",
                        ml: 1,
                      }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          {/* Payment Method Toggle */}
          <ToggleButtonGroup
            size="small"
            value={paymentMethodFilter}
            exclusive
            onChange={(_, val) => {
              setPaymentMethodFilter(val ?? "");
              setPageParam((prev) => ({ ...prev, page: 1 }));
            }}
            sx={{
              height: 32,
              "& .MuiToggleButton-root": {
                px: 1,
                py: 0,
                fontSize: "0.72rem",
                fontWeight: 600,
                textTransform: "none",
                borderColor: "#cbd5e1",
                color: "#475569",
                bgcolor: "#ffffff",
                "&.Mui-selected": {
                  bgcolor: "#0284c7",
                  color: "#ffffff",
                  "&:hover": { bgcolor: "#0369a1" },
                },
              },
            }}
          >
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="I">Insurance</ToggleButton>
            <ToggleButton value="C">Cash</ToggleButton>
          </ToggleButtonGroup>

          {/* Claim Filters Popover Button */}
          <MuiButton
            variant={activeClaimFiltersCount > 0 ? "contained" : "outlined"}
            size="small"
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            startIcon={<FilterListIcon sx={{ fontSize: 16 }} />}
            sx={{
              height: 32,
              textTransform: "none",
              fontSize: "0.75rem",
              fontWeight: 600,
              px: 1.25,
              ...(activeClaimFiltersCount > 0
                ? {
                    bgcolor: "#0284c7",
                    color: "#ffffff",
                    borderColor: "#0284c7",
                    "&:hover": { bgcolor: "#0369a1" },
                  }
                : {
                    bgcolor: "#ffffff",
                    color: "#334155",
                    borderColor: "#cbd5e1",
                    "&:hover": { bgcolor: "#f8fafc", borderColor: "#94a3b8" },
                  }),
            }}
          >
            Claim Filters {activeClaimFiltersCount > 0 && `(${activeClaimFiltersCount})`}
          </MuiButton>

          {/* Sort Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={sortBy}
                displayEmpty
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPageParam((prev) => ({ ...prev, page: 1 }));
                }}
                sx={{
                  height: 32,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  bgcolor: "#ffffff",
                  "& .MuiSelect-select": { py: "4px 8px" },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.75rem" }}>Sort: Default</MenuItem>
                <MenuItem value="binNo" sx={{ fontSize: "0.75rem" }}>Insurance BIN</MenuItem>
                <MenuItem value="totalPaid" sx={{ fontSize: "0.75rem" }}>Total Paid</MenuItem>
                <MenuItem value="inscode" sx={{ fontSize: "0.75rem" }}>Insurance Code</MenuItem>
                <MenuItem value="paymentMethod" sx={{ fontSize: "0.75rem" }}>Payment Method</MenuItem>
                <MenuItem value="rxOrigin" sx={{ fontSize: "0.75rem" }}>Rx Origin</MenuItem>
              </Select>
            </FormControl>
            {sortBy && (
              <Tooltip title={sortOrder === "asc" ? "Ascending order" : "Descending order"} arrow>
                <MuiButton
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                    setPageParam((prev) => ({ ...prev, page: 1 }));
                  }}
                  sx={{
                    minWidth: 32,
                    height: 32,
                    p: 0,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    bgcolor: "#ffffff",
                    borderColor: "#cbd5e1",
                  }}
                >
                  {sortOrder === "asc" ? "▲" : "▼"}
                </MuiButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Right Export Actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            justifyContent: { xs: "stretch", sm: "flex-end" },
            width: { xs: "100%", sm: "auto" },
          }}
        >
          <MuiButton
            variant="outlined"
            size="small"
            startIcon={
              exporting && exportingFormat === "xlsx" ? (
                <CircularProgress size={13} />
              ) : (
                <FileDownloadOutlinedIcon sx={{ fontSize: 14 }} />
              )
            }
            disabled={exporting || !records || records.length === 0}
            onClick={() => handleExport("xlsx")}
            sx={{
              height: 32,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              color: "#0f172a",
              borderColor: "#cbd5e1",
              bgcolor: "#ffffff",
              px: 1.25,
              flex: { xs: 1, sm: "initial" },
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff", color: "#0284c7" },
            }}
            title={ERX_AUDIT_LABELS.ACTIONS.EXPORT_EXCEL_TOOLTIP}
          >
            {exporting && exportingFormat === "xlsx"
              ? ERX_AUDIT_LABELS.ACTIONS.EXPORTING
              : ERX_AUDIT_LABELS.ACTIONS.EXPORT_EXCEL}
          </MuiButton>

          <MuiButton
            variant="outlined"
            size="small"
            startIcon={
              exporting && exportingFormat === "csv" ? (
                <CircularProgress size={13} />
              ) : (
                <FileDownloadOutlinedIcon sx={{ fontSize: 14 }} />
              )
            }
            disabled={exporting || !records || records.length === 0}
            onClick={() => handleExport("csv")}
            sx={{
              height: 32,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              color: "#0f172a",
              borderColor: "#cbd5e1",
              bgcolor: "#ffffff",
              px: 1.25,
              flex: { xs: 1, sm: "initial" },
              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff", color: "#0284c7" },
            }}
            title={ERX_AUDIT_LABELS.ACTIONS.EXPORT_CSV_TOOLTIP}
          >
            {exporting && exportingFormat === "csv"
              ? ERX_AUDIT_LABELS.ACTIONS.EXPORTING
              : ERX_AUDIT_LABELS.ACTIONS.EXPORT_CSV}
          </MuiButton>
        </Box>
      </Box>

      {/* Claim Filters Popover */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              p: 2,
              mt: 0.75,
              borderRadius: "10px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e2e8f0",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <ShieldOutlinedIcon sx={{ fontSize: 18, color: "#0284c7" }} />
            <Typography sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
              Claim & Insurance Filters
            </Typography>
          </Box>
          {activeClaimFiltersCount > 0 && (
            <MuiButton
              size="small"
              onClick={clearAllInsuranceFilters}
              sx={{ fontSize: "0.72rem", color: "#dc2626", textTransform: "none", p: 0, minWidth: 0, fontWeight: 600 }}
            >
              Reset
            </MuiButton>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Insurance Codes Multi-Select */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                Insurance Codes ({availableInsCodes.length} available)
              </Typography>
              {availableInsCodes.length > 0 && (
                <Typography
                  component="span"
                  onClick={() => {
                    if (insCodeFilter.length === availableInsCodes.length) {
                      setInsCodeFilter([]);
                    } else {
                      setInsCodeFilter([...availableInsCodes]);
                    }
                    setPageParam((prev) => ({ ...prev, page: 1 }));
                  }}
                  sx={{
                    fontSize: "0.7rem",
                    color: "#0284c7",
                    cursor: "pointer",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {insCodeFilter.length === availableInsCodes.length ? "Deselect All" : "Select All"}
                </Typography>
              )}
            </Box>
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              disableCloseOnSelect
              options={availableInsCodes}
              value={insCodeFilter}
              onChange={(_event, newValue: string[]) => {
                setInsCodeFilter(newValue);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={insCodeFilter.length === 0 ? "All Insurance Codes" : "Search codes..."}
                />
              )}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props as any;
                return (
                  <li key={key || option} {...otherProps} style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                    {selected ? (
                      <CheckIcon sx={{ fontSize: 18, color: "#2f9f6e", marginRight: "8px" }} />
                    ) : (
                      <span style={{ width: 18, marginRight: "8px" }} />
                    )}
                    <span>{option}</span>
                  </li>
                );
              }}
              sx={{
                "& .MuiAutocomplete-listbox": { maxHeight: 220, fontSize: "0.8rem" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  bgcolor: insCodeFilter.length > 0 ? "#f0fdf4" : "#ffffff",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#66c285",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2c8a9b",
                  },
                },
                "& .MuiAutocomplete-tag": {
                  height: 24,
                  background: "#e8f8ef",
                  color: "#0f5132",
                  "& .MuiChip-label": {
                    fontSize: "0.72rem",
                    px: 1,
                  },
                },
              }}
            />
          </Box>

          {/* Insurance BINs Multi-Select */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                Insurance BINs ({availableBinNos.length} available)
              </Typography>
              {availableBinNos.length > 0 && (
                <Typography
                  component="span"
                  onClick={() => {
                    if (binNoFilter.length === availableBinNos.length) {
                      setBinNoFilter([]);
                    } else {
                      setBinNoFilter([...availableBinNos]);
                    }
                    setPageParam((prev) => ({ ...prev, page: 1 }));
                  }}
                  sx={{
                    fontSize: "0.7rem",
                    color: "#0284c7",
                    cursor: "pointer",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {binNoFilter.length === availableBinNos.length ? "Deselect All" : "Select All"}
                </Typography>
              )}
            </Box>
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              disableCloseOnSelect
              options={availableBinNos}
              value={binNoFilter}
              onChange={(_event, newValue: string[]) => {
                setBinNoFilter(newValue);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={binNoFilter.length === 0 ? "All Insurance BINs" : "Search BINs..."}
                />
              )}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props as any;
                return (
                  <li key={key || option} {...otherProps} style={{ fontSize: "0.8rem", padding: "4px 8px", fontFamily: "monospace" }}>
                    {selected ? (
                      <CheckIcon sx={{ fontSize: 18, color: "#2f9f6e", marginRight: "8px" }} />
                    ) : (
                      <span style={{ width: 18, marginRight: "8px" }} />
                    )}
                    <span>BIN: {option}</span>
                  </li>
                );
              }}
              sx={{
                "& .MuiAutocomplete-listbox": { maxHeight: 220, fontSize: "0.8rem" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  bgcolor: binNoFilter.length > 0 ? "#f0fdf4" : "#ffffff",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#66c285",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2c8a9b",
                  },
                },
                "& .MuiAutocomplete-tag": {
                  height: 24,
                  background: "#e8f8ef",
                  color: "#0f5132",
                  "& .MuiChip-label": {
                    fontSize: "0.72rem",
                    px: 1,
                    fontFamily: "monospace",
                  },
                },
              }}
            />
          </Box>

          {/* Rx Origins Multi-Select */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                Rx Origins ({availableRxOrigins.length} available)
              </Typography>
              {availableRxOrigins.length > 0 && (
                <Typography
                  component="span"
                  onClick={() => {
                    if (rxOriginFilter.length === availableRxOrigins.length) {
                      setRxOriginFilter([]);
                    } else {
                      setRxOriginFilter([...availableRxOrigins]);
                    }
                    setPageParam((prev) => ({ ...prev, page: 1 }));
                  }}
                  sx={{
                    fontSize: "0.7rem",
                    color: "#0284c7",
                    cursor: "pointer",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {rxOriginFilter.length === availableRxOrigins.length ? "Deselect All" : "Select All"}
                </Typography>
              )}
            </Box>
            <Autocomplete
              multiple
              size="small"
              limitTags={2}
              disableCloseOnSelect
              options={availableRxOrigins}
              value={rxOriginFilter}
              onChange={(_event, newValue: string[]) => {
                setRxOriginFilter(newValue);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  size="small"
                  placeholder={rxOriginFilter.length === 0 ? "All Rx Origins" : "Search origins..."}
                />
              )}
              renderOption={(props, option, { selected }) => {
                const { key, ...otherProps } = props as any;
                return (
                  <li key={key || option} {...otherProps} style={{ fontSize: "0.8rem", padding: "4px 8px" }}>
                    {selected ? (
                      <CheckIcon sx={{ fontSize: 18, color: "#2f9f6e", marginRight: "8px" }} />
                    ) : (
                      <span style={{ width: 18, marginRight: "8px" }} />
                    )}
                    <span>{option}</span>
                  </li>
                );
              }}
              sx={{
                "& .MuiAutocomplete-listbox": { maxHeight: 220, fontSize: "0.8rem" },
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: "0.78rem",
                  bgcolor: rxOriginFilter.length > 0 ? "#f0fdf4" : "#ffffff",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#66c285",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#2c8a9b",
                  },
                },
                "& .MuiAutocomplete-tag": {
                  height: 24,
                  background: "#e8f8ef",
                  color: "#0f5132",
                  "& .MuiChip-label": {
                    fontSize: "0.72rem",
                    px: 1,
                  },
                },
              }}
            />
          </Box>

          {/* User-Defined Total Amount Paid Price Range */}
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569" }}>
                Total Amount Paid ($)
              </Typography>
              {(minPriceFilter !== "" || maxPriceFilter !== "") && (
                <Typography
                  component="span"
                  onClick={() => {
                    setMinPriceFilter("");
                    setMaxPriceFilter("");
                    setPageParam((prev) => ({ ...prev, page: 1 }));
                  }}
                  sx={{
                    fontSize: "0.7rem",
                    color: "#dc2626",
                    cursor: "pointer",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Clear
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <OutlinedInput
                size="small"
                type="number"
                placeholder="Min"
                value={minPriceFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (Number(val) < 0) return;
                  setMinPriceFilter(val);
                  setPageParam((prev) => ({ ...prev, page: 1 }));
                }}
                inputProps={{ min: 0, step: "any" }}
                startAdornment={
                  <InputAdornment position="start" sx={{ mr: 0.25 }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>$</Typography>
                  </InputAdornment>
                }
                sx={{
                  flex: 1,
                  height: 32,
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  bgcolor: minPriceFilter !== "" ? "#f0f9ff" : "#ffffff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: minPriceFilter !== "" ? "#0284c7" : "#cbd5e1",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#0284c7",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#0284c7",
                  },
                  "& input": {
                    py: "4px 6px",
                    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                      WebkitAppearance: "none",
                      margin: 0,
                    },
                    "&[type=number]": {
                      MozAppearance: "textfield",
                    },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, flexShrink: 0 }}>
                to
              </Typography>
              <OutlinedInput
                size="small"
                type="number"
                placeholder="Max"
                value={maxPriceFilter}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  if (Number(val) < 0) return;
                  setMaxPriceFilter(val);
                  setPageParam((prev) => ({ ...prev, page: 1 }));
                }}
                inputProps={{ min: 0, step: "any" }}
                startAdornment={
                  <InputAdornment position="start" sx={{ mr: 0.25 }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>$</Typography>
                  </InputAdornment>
                }
                sx={{
                  flex: 1,
                  height: 32,
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  bgcolor: maxPriceFilter !== "" ? "#f0f9ff" : "#ffffff",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: maxPriceFilter !== "" ? "#0284c7" : "#cbd5e1",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#0284c7",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#0284c7",
                  },
                  "& input": {
                    py: "4px 6px",
                    "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
                      WebkitAppearance: "none",
                      margin: 0,
                    },
                    "&[type=number]": {
                      MozAppearance: "textfield",
                    },
                  },
                }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 0.5, mt: 0.75, flexWrap: "wrap" }}>
              {[
                { label: "< $25", min: "", max: "25" },
                { label: "$25–$100", min: "25", max: "100" },
                { label: "$100–$500", min: "100", max: "500" },
                { label: "≥ $500", min: "500", max: "" },
              ].map((preset) => {
                const isSelected = minPriceFilter === preset.min && maxPriceFilter === preset.max;
                return (
                  <Chip
                    key={preset.label}
                    size="small"
                    label={preset.label}
                    clickable
                    onClick={() => {
                      if (isSelected) {
                        setMinPriceFilter("");
                        setMaxPriceFilter("");
                      } else {
                        setMinPriceFilter(preset.min);
                        setMaxPriceFilter(preset.max);
                      }
                      setPageParam((prev) => ({ ...prev, page: 1 }));
                    }}
                    sx={{
                      height: 22,
                      fontSize: "0.68rem",
                      fontWeight: isSelected ? 700 : 500,
                      bgcolor: isSelected ? "#0284c7" : "#f1f5f9",
                      color: isSelected ? "#ffffff" : "#475569",
                      border: "1px solid",
                      borderColor: isSelected ? "#0284c7" : "#e2e8f0",
                      "&:hover": {
                        bgcolor: isSelected ? "#0369a1" : "#e2e8f0",
                      },
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          {/* Quick Hardcopy Flag */}
          <Box sx={{ pt: 0.5 }}>
            <Chip
              size="small"
              clickable
              icon={<WarningAmberIcon sx={{ fontSize: "14px !important", color: nonElectronicOnly ? "#ffffff !important" : "#b91c1c !important" }} />}
              label={`Compare Hardcopy${nonElectronicCount != null ? ` (${nonElectronicCount})` : ""}`}
              onClick={() => {
                setNonElectronicOnly((prev) => !prev);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{
                height: 28,
                fontSize: "0.73rem",
                fontWeight: 600,
                cursor: "pointer",
                bgcolor: nonElectronicOnly ? "#b91c1c" : "#fff1f2",
                color: nonElectronicOnly ? "#ffffff" : "#be123c",
                border: "1px solid",
                borderColor: nonElectronicOnly ? "#991b1b" : "#fecdd3",
                "&:hover": { bgcolor: nonElectronicOnly ? "#991b1b" : "#ffe4e6" },
              }}
            />
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pt: 1.5, mt: 1.5, borderTop: "1px solid #f1f5f9" }}>
          <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
            {activeClaimFiltersCount} active filter{activeClaimFiltersCount === 1 ? "" : "s"}
          </Typography>
          <MuiButton
            variant="contained"
            size="small"
            onClick={() => setFilterAnchorEl(null)}
            sx={{
              textTransform: "none",
              bgcolor: "#0284c7",
              fontSize: "0.75rem",
              fontWeight: 600,
              px: 2,
              "&:hover": { bgcolor: "#0369a1" },
            }}
          >
            Done
          </MuiButton>
        </Box>
      </Popover>

      {/* Active Filter Tags Row (Visible only when filters are active) */}
      {hasAnyActiveFilters && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexWrap: "wrap",
            mb: 1,
            p: "4px 8px",
            bgcolor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase" }}>
            Active:
          </Typography>

          {selectedPharmacyId && (
            <Chip
              size="small"
              icon={<LocalPharmacyOutlinedIcon sx={{ fontSize: "14px !important" }} />}
              label={`Pharmacy: ${pharmacies.find((p) => p.id === selectedPharmacyId)?.name || "Selected"}`}
              onDelete={() => {
                setSelectedPharmacyId("");
                setSelectedBatchId("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#f0fdf4", color: "#15803d", borderColor: "#86efac" }}
              variant="outlined"
            />
          )}

          {searchText && (
            <Chip
              size="small"
              label={`Search: "${searchText}"`}
              onDelete={() => {
                setSearchText("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#e2e8f0", color: "#1e293b" }}
            />
          )}

          {selectedDiscrepancyColumns.map((col) => (
            <Chip
              key={col}
              size="small"
              label={`Type: ${formatDiscrepancyRuleName(col)}`}
              onDelete={() => toggleDiscrepancyColumn(col)}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#e0f2fe", color: "#0369a1", borderColor: "#bae6fd" }}
              variant="outlined"
            />
          ))}

          {paymentMethodFilter && (
            <Chip
              size="small"
              label={`Payment: ${paymentMethodFilter === "I" ? "Insurance" : "Cash"}`}
              onDelete={() => {
                setPaymentMethodFilter("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#f1f5f9", color: "#334155" }}
            />
          )}

          {insCodeFilter.length > 0 && (
            <Chip
              size="small"
              label={insCodeFilter.length === 1 ? `Ins: ${insCodeFilter[0]}` : `Ins: ${insCodeFilter.length} codes`}
              onDelete={() => {
                setInsCodeFilter([]);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#dcfce7", color: "#15803d" }}
            />
          )}

          {binNoFilter.length > 0 && (
            <Chip
              size="small"
              label={binNoFilter.length === 1 ? `BIN: ${binNoFilter[0]}` : `BIN: ${binNoFilter.length} BINs`}
              onDelete={() => {
                setBinNoFilter([]);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#dcfce7", color: "#15803d" }}
            />
          )}

          {rxOriginFilter.length > 0 && (
            <Chip
              size="small"
              label={rxOriginFilter.length === 1 ? `Origin: ${rxOriginFilter[0]}` : `Origin: ${rxOriginFilter.length} origins`}
              onDelete={() => {
                setRxOriginFilter([]);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#f1f5f9", color: "#334155" }}
            />
          )}

          {(minPriceFilter !== "" || maxPriceFilter !== "") && (
            <Chip
              size="small"
              label={
                minPriceFilter !== "" && maxPriceFilter !== ""
                  ? `Price: $${minPriceFilter} - $${maxPriceFilter}`
                  : minPriceFilter !== ""
                  ? `Price: ≥$${minPriceFilter}`
                  : `Price: ≤$${maxPriceFilter}`
              }
              onDelete={() => {
                setMinPriceFilter("");
                setMaxPriceFilter("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}
              variant="outlined"
            />
          )}

          {nonElectronicOnly && (
            <Chip
              size="small"
              label="Compare Hardcopy"
              onDelete={() => {
                setNonElectronicOnly(false);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#fff1f2", color: "#be123c" }}
            />
          )}

          {sortBy && (
            <Chip
              size="small"
              label={`Sort: ${sortBy} (${sortOrder})`}
              onDelete={() => {
                setSortBy("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#f1f5f9", color: "#334155" }}
            />
          )}

          <Chip
            icon={<ClearIcon sx={{ fontSize: "11px !important" }} />}
            label="Clear All"
            size="small"
            clickable
            onClick={clearAllFilters}
            sx={{
              height: 22,
              fontSize: "0.7rem",
              fontWeight: 700,
              bgcolor: "#ffffff",
              borderColor: "#fca5a5",
              color: "#dc2626",
              border: "1px solid",
              "&:hover": { bgcolor: "#fef2f2" },
            }}
          />
        </Box>
      )}

      {/* Active Discrepancy Filter Banner - Pharmacy Clinical Sky Blue */}
      {selectedDiscrepancyColumns.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: { xs: "6px 10px", sm: "6px 14px" },
            fontSize: { xs: "0.78rem", sm: "0.82rem" },
            bgcolor: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            mb: 1.25,
            color: "#0369a1",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <FilterListIcon sx={{ color: "#0284c7" }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: "#0c4a6e" }}>
              {ERX_AUDIT_LABELS.MESSAGES.FILTERED_BY} <strong>{selectedDiscrepancyColumns.map(formatDiscrepancyRuleName).join(", ")}</strong>
              {" — "}{ERX_AUDIT_LABELS.formatShowingMismatches(totalRecords)}
            </Typography>
            <Chip
              size="small"
              icon={<ViewColumnOutlinedIcon sx={{ fontSize: "14px !important" }} />}
              label={showAllColumns ? ERX_AUDIT_LABELS.MESSAGES.ALL_COLUMNS_VIEW : ERX_AUDIT_LABELS.formatFocusedViewBadge(formatDiscrepancyRuleName(selectedDiscrepancyColumn))}
              sx={{
                fontWeight: 700,
                fontSize: "0.72rem",
                height: 22,
                bgcolor: showAllColumns ? "#ffffff" : "#0284c7",
                color: showAllColumns ? "#334155" : "#ffffff",
                border: showAllColumns ? "1px solid #cbd5e1" : "none",
              }}
            />
            <MuiButton
              size="small"
              variant="text"
              onClick={() => setShowAllColumns((prev) => !prev)}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#0369a1",
                textDecoration: "underline",
                py: 0,
                minWidth: 0,
              }}
            >
              {showAllColumns ? ERX_AUDIT_LABELS.ACTIONS.SWITCH_TO_FOCUSED : ERX_AUDIT_LABELS.ACTIONS.VIEW_ALL_COLUMNS}
            </MuiButton>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MuiButton
              size="small"
              variant="contained"
              startIcon={bulkUpdatingDiscrepancies ? <CircularProgress size={14} color="inherit" /> : <BlockOutlinedIcon />}
              onClick={handleIgnoreAllForColumn}
              disabled={bulkUpdatingDiscrepancies || totalRecords === 0}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.8rem",
                py: 0.5,
                px: 1.5,
                bgcolor: "#0369a1",
                color: "#ffffff",
                "&:hover": { bgcolor: "#0284c7" },
              }}
            >
              {ERX_AUDIT_LABELS.formatIgnoreAllForColumn(formatDiscrepancyRuleName(selectedDiscrepancyColumn), totalRecords)}
            </MuiButton>
            <MuiButton
              size="small"
              variant="outlined"
              startIcon={<ClearIcon />}
              onClick={() => {
                setSelectedDiscrepancyColumn("");
                setShowAllColumns(false);
                setPageParam((prev) => ({ ...prev, page: 1 }));
                setSelectedRecordIds([]);
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                py: 0.5,
                px: 1.5,
                borderColor: "#bae6fd",
                color: "#0369a1",
                bgcolor: "#ffffff",
                "&:hover": { borderColor: "#0284c7", bgcolor: "#e0f2fe" },
              }}
            >
              {ERX_AUDIT_LABELS.ACTIONS.CLEAR_FILTER}
            </MuiButton>
          </Box>
        </Box>
      )}

      {/* Table View */}
      {selectedDiscrepancyColumn && !showAllColumns ? (
        <Table
          columns={activeSummaryColumns}
          data={records}
          loading={loadingRecords}
          serialNumberOffset={(pageParam.page - 1) * pageParam.pageSize}
        />
      ) : viewMode === "full" ? (
        <Box
          className="erx-full-grid-wrapper"
          sx={{
            width: "100%",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: {
              xs: "50vh",
              sm: "55vh",
              md: "calc(100vh - 355px)",
            },
            minHeight: {
              xs: "220px",
              sm: "240px",
              md: "250px",
            },
            borderRadius: { xs: "6px", sm: "8px" },
            border: "1px solid #cbd5e1",
            bgcolor: "#ffffff",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.04)",
            boxSizing: "border-box",
            mb: 1,
            position: "relative",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
            scrollbarColor: "#94a3b8 #f1f5f9",
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "10px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f5f9",
              borderRadius: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#94a3b8",
              borderRadius: "6px",
              border: "2px solid #f1f5f9",
              "&:hover": {
                backgroundColor: "#64748b",
              },
            },
            "@media (max-height: 850px)": {
              maxHeight: "calc(100vh - 300px)",
              minHeight: "200px",
            },
            "@media (max-height: 700px)": {
              maxHeight: "calc(100vh - 240px)",
              minHeight: "160px",
            },
            "& .erx-full-table": {
              fontSize: { xs: "0.78rem", sm: "0.80rem", md: "0.82rem" },
            },
            "& .erx-full-table th, & .erx-full-table td": {
              padding: { xs: "6px 8px", sm: "7px 10px", md: "8px 12px" },
            },
            "& .erx-full-table th.sticky-col-1, & .erx-full-table td.sticky-col-1": {
              width: { xs: 36, sm: 44 },
              minWidth: { xs: 36, sm: 44 },
              maxWidth: { xs: 36, sm: 44 },
            },
            "& .erx-full-table th.sticky-col-2, & .erx-full-table td.sticky-col-2": {
              left: { xs: "36px", sm: "44px" },
            },
          }}
        >
          <table className="erx-full-table">
            <thead>
              {/* Category Super-Headers */}
              <tr>
                <th
                  className="erx-th-common sticky-super-col"
                  colSpan={2}
                  title={ERX_AUDIT_LABELS.SUPER_HEADERS.IDENTIFIERS_ACTIONS}
                >
                  {ERX_AUDIT_LABELS.SUPER_HEADERS.IDENTIFIERS_ACTIONS}
                </th>
                <th className="erx-th-common" colSpan={3}>
                  &nbsp;
                </th>
                <th
                  className="erx-th-ins"
                  colSpan={4}
                  title={ERX_AUDIT_LABELS.SUPER_HEADERS.INSURANCE_BILLING}
                >
                  {ERX_AUDIT_LABELS.SUPER_HEADERS.INSURANCE_BILLING}
                </th>
                <th
                  className="erx-th-mm"
                  colSpan={17}
                  title={ERX_AUDIT_LABELS.SUPER_HEADERS.MICROMERCHANT}
                >
                  {ERX_AUDIT_LABELS.SUPER_HEADERS.MICROMERCHANT}
                </th>
                <th
                  className="erx-th-erx"
                  colSpan={15}
                  title={ERX_AUDIT_LABELS.SUPER_HEADERS.ERX}
                >
                  {ERX_AUDIT_LABELS.SUPER_HEADERS.ERX}
                </th>
                <th
                  className="erx-th-notes"
                  colSpan={11}
                  title={ERX_AUDIT_LABELS.SUPER_HEADERS.LOGISTICS_DUR}
                >
                  {ERX_AUDIT_LABELS.SUPER_HEADERS.LOGISTICS_DUR}
                </th>
              </tr>
              {/* Individual Column Headers */}
              <tr>
                <th className="erx-th-common sticky-col-1" style={{ width: 44, minWidth: 44, textAlign: "center" }}>
                  <Checkbox
                    size="small"
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={handleToggleSelectAll}
                    disabled={records.length === 0}
                    sx={{ p: 0.5 }}
                  />
                </th>
                <th
                  className="erx-th-common sticky-col-2"
                  title={ERX_AUDIT_LABELS.TABLE_HEADERS.RX_NUMBER}
                >
                  {ERX_AUDIT_LABELS.TABLE_HEADERS.RX_NUMBER}
                </th>
                <th
                  className="erx-th-common"
                  title={ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS}
                >
                  {ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS}
                </th>
                <th
                  className="erx-th-common"
                  title={ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS}
                >
                  {ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS}
                </th>
                <th
                  className="erx-th-common"
                  title="Pharmacy"
                >
                  Pharmacy
                </th>

                {/* Insurance & Claims Columns (Columns L, M, N, O) */}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.PAYMENT_METHOD, ["PaymentMethod", "Payment Method"], "erx-th-ins")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.INS_CODE, ["InsCode", "Insurance Code"], "erx-th-ins")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.BIN_NO, ["BinNo", "BIN_NO", "Insurance BIN"], "erx-th-ins")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.TOTAL_INS_PAID, ["TotalInsPaid", "Total Amount Paid"], "erx-th-ins")}

                {/* MM Columns */}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_FILL_NUMBER, ["MmFillNumber", "Fill #"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_ORDER_DATE, ["MmOrderDate", "Order Date"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_DATE_FILLED, ["MmDateFilled", "Date Filled", "Fill Date Sequence"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_TIME_FILLED, ["MmTimeFilled"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PICKUP_DATE, ["PickupDate", "Pickup Date Sequence"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PATIENT_NAME, ["MmPatientName", "Patient Name"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PATIENT_DOB, ["MmPatientDob", "Patient DOB"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PATIENT_PHONE, ["MmPatientPhone", "Patient Phone"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PATIENT_ADDRESS, ["MmPatientAddress", "Patient Address"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PRESCRIBER_NAME, ["MmPrescriberName", "Prescriber Name"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PRESCRIBER_NPI, ["MmPrescriberNpi", "Prescriber NPI"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_PRESCRIBER_DEA, ["MmPrescriberDea", "Prescriber DEA"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_DISPENSED_DRUG, ["Drug Name", "MmDispensedDrugName"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_POTENCY_UNIT, ["POTENCYUNITCODE", "MmPotencyUnitCode"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_DISPENSED_NDC, ["NDC", "MmDispensedNdc"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_QTY_ORD, ["Qty Ordered", "MmQtyOrd"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_QTY_DISPENSED, ["Quantity Dispensed", "MmQtyDispensed"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_DAYS_SUPPLY, ["Days Supply", "MmDispensedDaysSupply"], "erx-th-mm")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MM_DISPENSED_SIG, ["Sig", "MmDispensedSig"], "erx-th-mm")}

                {/* ERX Columns */}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_RX_NUMBER, ["ErxRxNumber"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_ORDER_DATE, ["ErxOrderDate", "Order Date", "Fill Date Sequence"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_EFFECTIVE_DATE, ["ErxEffectiveDate", "Effective Date Compliance"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_RECEIVED_TIME, ["ErxReceivedDateTime"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PATIENT_NAME, ["Patient Name", "ErxPatientName"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PATIENT_DOB, ["Patient DOB", "ErxPatientDob"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PATIENT_PHONE, ["Patient Phone", "ErxPatientPhone"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PATIENT_ADDRESS, ["Patient Address", "ErxPatientAddress"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PRESCRIBER_NAME, ["Prescriber Name", "ErxPrescriberName"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.SUPERVISOR_NAME, ["SupervisorName"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PRESCRIBER_NPI, ["Prescriber NPI", "ErxPrescriberNpi"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_PRESCRIBER_DEA, ["Prescriber DEA", "ErxPrescriberDea"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_DRUG_NAME, ["Drug Name", "ErxDrugName"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_POTENCY_UNIT, ["POTENCYUNITCODE", "ErxPotencyUnitCode"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_NDC, ["NDC", "ErxNdc"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_QTY_ORD, ["Qty Ordered", "ErxQtyOrd"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_QTY_DISPENSED, ["Quantity Dispensed", "ErxQtyDispensed"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_DAYS_SUPPLY, ["Days Supply", "ErxDaysSupply"], "erx-th-erx")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_SIG, ["Sig", "ErxSig"], "erx-th-erx")}

                {/* Logistics & DUR */}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.DAW_CODE, ["DAW Code", "MmDawCode", "ErxDawCode"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.REFILLS, ["Class 2 Narcotic Refills", "Patient Refill", "Refills", "ErxRefill", "MmFillNumber", "Refills Originally prescriber sent"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.COPAY, ["MmCopay"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.DELIVERY, ["MmDelivery"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.RX_ORIGIN, ["MmRxOrigin"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.SIGNATURE, ["MmSignatureCaptured"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.FOLLOW_UP_TAG, ["FollowUpTag"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.TELEPHONE_NOTES, ["TelephoneNotes"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_NOTES, ["ErxNotes"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.DUR_REASON, ["DurReasonCd"], "erx-th-notes")}
                {renderTh(ERX_AUDIT_LABELS.TABLE_HEADERS.MESSAGE, ["Message"], "erx-th-notes")}
              </tr>
            </thead>
            <tbody>
              {loadingRecords ? (
                <tr>
                  <td colSpan={50} style={{ textAlign: "center", padding: 32 }}>
                    {ERX_AUDIT_LABELS.MESSAGES.LOADING_DATA}
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={50} style={{ textAlign: "center", padding: 32 }}>
                    {ERX_AUDIT_LABELS.MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              ) : (
                records.map((row) => {
                  const count = getRecordDiscrepancyCount(row);
                  const hasMismatch = count > 0;
                  const isRowSelected = selectedRecordIds.includes(row.recordId);

                  return (
                    <tr key={row.recordId} className={`${hasMismatch ? "has-mismatch" : ""} ${isRowSelected ? "row-selected" : ""}`}>
                      {/* Checkbox Column */}
                      <td className="sticky-col-1" style={{ width: 44, minWidth: 44, textAlign: "center" }}>
                        <Checkbox
                          size="small"
                          checked={isRowSelected}
                          onChange={() => handleToggleRow(row.recordId)}
                          sx={{ p: 0.5 }}
                        />
                      </td>

                      {/* Sticky RX and Action */}
                      <td className="sticky-col-2">
                        <span style={{ fontWeight: 700, color: "#1e40af" }}>{row.rxNumber}</span>
                      </td>
                      <td>
                        {hasMismatch ? (
                          <Chip
                            size="small"
                            color="error"
                            icon={<WarningAmberIcon />}
                            label={ERX_AUDIT_LABELS.formatMismatches(count)}
                            sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleOutlinedIcon />}
                            label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH}
                            sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
                          />
                        )}
                      </td>
                      <td>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <MuiButton
                            size="small"
                            variant="outlined"
                            startIcon={<CompareArrowsOutlinedIcon sx={{ fontSize: 13 }} />}
                            onClick={() => handleOpenDetail(row)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              py: 0.25,
                              px: 1,
                              fontSize: "0.75rem",
                              color: "#0369a1",
                              borderColor: "#bae6fd",
                              "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff" },
                            }}
                            title={ERX_AUDIT_LABELS.ACTIONS.COMPARE_TOOLTIP}
                          >
                            {ERX_AUDIT_LABELS.ACTIONS.COMPARE}
                          </MuiButton>
                          {selectedDiscrepancyColumn && (
                            hasOpenDiscrepancyForColumn(row, selectedDiscrepancyColumn) ? (
                              <MuiButton
                                size="small"
                                variant="outlined"
                                startIcon={<BlockOutlinedIcon sx={{ fontSize: 13 }} />}
                                onClick={() => handleIgnoreRecord(row, selectedDiscrepancyColumn)}
                                disabled={bulkUpdatingDiscrepancies}
                                sx={{
                                  textTransform: "none",
                                  fontWeight: 600,
                                  py: 0.25,
                                  px: 1,
                                  fontSize: "0.75rem",
                                  color: "#64748b",
                                  borderColor: "#cbd5e1",
                                  "&:hover": { borderColor: "#f87171", color: "#dc2626", bgcolor: "#fef2f2" },
                                }}
                                title={ERX_AUDIT_LABELS.formatIgnoreColumnTooltip(formatDiscrepancyRuleName(selectedDiscrepancyColumn), row.rxNumber)}
                              >
                                {ERX_AUDIT_LABELS.ACTIONS.IGNORE}
                              </MuiButton>
                            ) : isDiscrepancyIgnoredForColumn(row, selectedDiscrepancyColumn) ? (
                              <Chip
                                size="small"
                                label={ERX_AUDIT_LABELS.STATUS_BADGES.IGNORED}
                                sx={{
                                  height: 22,
                                  fontSize: "0.68rem",
                                  color: "#94a3b8",
                                  bgcolor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                }}
                              />
                            ) : null
                          )}
                        </Box>
                      </td>

                      {/* Pharmacy Column */}
                      <td>
                        {row.pharmacyName ? (
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}
                            >
                              {row.pharmacyName}
                            </Typography>
                            {row.pharmacyNpi && (
                              <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.68rem" }}>
                                NPI: {row.pharmacyNpi}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: "#94a3b8", fontStyle: "italic" }}>
                            —
                          </Typography>
                        )}
                      </td>

                      {/* Insurance & Claims Columns (Columns L, M, N, O) */}
                      <td className={isFieldFiltered(["PaymentMethod", "Payment Method"]) ? "erx-col-filtered" : ""}>
                        {getPaymentMethodBadge(row.paymentMethod)}
                      </td>
                      <td style={{ fontWeight: 600 }} className={isFieldFiltered(["InsCode", "Insurance Code"]) ? "erx-col-filtered" : ""}>
                        {row.insCode || "—"}
                      </td>
                      <td className={isFieldFiltered(["BinNo", "BIN_NO", "Insurance BIN"]) ? "erx-col-filtered" : ""}>
                        {row.binNo ? (
                          <span style={{ fontFamily: "monospace", fontSize: "0.74rem", fontWeight: 600, background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, border: "1px solid #e2e8f0" }}>
                            {row.binNo}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={isFieldFiltered(["TotalInsPaid", "Total Amount Paid"]) ? "erx-col-filtered" : ""}>
                        {getTotalInsPaidBadge(row.totalInsPaid)}
                      </td>

                      {/* MM Columns */}
                      <td className={isFieldFiltered(["MmFillNumber", "Fill #"]) ? "erx-col-filtered" : ""}>
                        {row.mmFillNumber || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmOrderDate", "Order Date"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.mmOrderDate)}
                      </td>
                      <td className={isFieldFiltered(["MmDateFilled", "Date Filled", "Fill Date Sequence"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.mmDateFilled)}
                      </td>
                      <td className={isFieldFiltered(["MmTimeFilled"]) ? "erx-col-filtered" : ""}>
                        {row.mmTimeFilled || "—"}
                      </td>
                      <td className={isFieldFiltered(["PickupDate", "Pickup Date Sequence"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.pickupDate)}
                      </td>
                      <td className={isFieldFiltered(["MmPatientName", "Patient Name"]) ? "erx-col-filtered" : ""}>
                        {row.mmPatientName || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmPatientDob", "Patient DOB"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.mmPatientDob)}
                      </td>
                      <td className={isFieldFiltered(["MmPatientPhone", "Patient Phone"]) ? "erx-col-filtered" : ""}>
                        {row.mmPatientPhone || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmPatientAddress", "Patient Address"]) ? "erx-col-filtered" : ""}>
                        {row.mmPatientAddress || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmPrescriberName", "Prescriber Name"]) ? "erx-col-filtered" : ""}>
                        {row.mmPrescriberName || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmPrescriberNpi", "Prescriber NPI"]) ? "erx-col-filtered" : ""}>
                        {row.mmPrescriberNpi || "—"}
                      </td>
                      <td className={isFieldFiltered(["MmPrescriberDea", "Prescriber DEA"]) ? "erx-col-filtered" : ""}>
                        {row.mmPrescriberDea || "—"}
                      </td>
                      <td
                        style={{ fontWeight: 600 }}
                        className={isFieldFiltered(["Drug Name", "MmDispensedDrugName"]) ? "erx-col-filtered" : ""}
                      >
                        {row.mmDispensedDrugName || "—"}
                      </td>
                      <td className={isFieldFiltered(["POTENCYUNITCODE", "MmPotencyUnitCode"]) ? "erx-col-filtered" : ""}>
                        {row.mmPotencyUnitCode || "—"}
                      </td>
                      <td className={isFieldFiltered(["NDC", "MmDispensedNdc"]) ? "erx-col-filtered" : ""}>
                        {row.mmDispensedNdc || "—"}
                      </td>
                      <td className={isFieldFiltered(["Qty Ordered", "MmQtyOrd"]) ? "erx-col-filtered" : ""}>
                        {row.mmQtyOrd ?? "—"}
                      </td>
                      <td className={isFieldFiltered(["Quantity Dispensed", "MmQtyDispensed"]) ? "erx-col-filtered" : ""}>
                        {row.mmQtyDispensed ?? "—"}
                      </td>
                      <td className={isFieldFiltered(["Days Supply", "MmDispensedDaysSupply"]) ? "erx-col-filtered" : ""}>
                        {row.mmDispensedDaysSupply ?? "—"}
                      </td>
                      <td
                        style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                        title={row.mmDispensedSig || ""}
                        className={isFieldFiltered(["Sig", "MmDispensedSig"]) ? "erx-col-filtered" : ""}
                      >
                        {row.mmDispensedSig || "—"}
                      </td>

                      {/* ERX Columns */}
                      <td className={isFieldFiltered(["ErxRxNumber"]) ? "erx-col-filtered" : ""}>
                        {row.erxRxNumber || "—"}
                      </td>
                      <td className={isFieldFiltered(["ErxOrderDate", "Order Date", "Fill Date Sequence"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.erxOrderDate)}
                      </td>
                      <td className={isFieldFiltered(["ErxEffectiveDate", "Effective Date Compliance"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.erxEffectiveDate)}
                      </td>
                      <td className={isFieldFiltered(["ErxReceivedDateTime"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDateTime(row.erxReceivedDateTime)}
                      </td>
                      <td className={isFieldFiltered(["Patient Name", "ErxPatientName"]) ? "erx-col-filtered" : ""}>
                        {row.erxPatientName || "—"}
                      </td>
                      <td className={isFieldFiltered(["Patient DOB", "ErxPatientDob"]) ? "erx-col-filtered" : ""}>
                        {formatUsaDate(row.erxPatientDob)}
                      </td>
                      <td className={isFieldFiltered(["Patient Phone", "ErxPatientPhone"]) ? "erx-col-filtered" : ""}>
                        {row.erxPatientPhone || "—"}
                      </td>
                      <td className={isFieldFiltered(["Patient Address", "ErxPatientAddress"]) ? "erx-col-filtered" : ""}>
                        {row.erxPatientAddress || "—"}
                      </td>
                      <td className={isFieldFiltered(["Prescriber Name", "ErxPrescriberName"]) ? "erx-col-filtered" : ""}>
                        {row.erxPrescriberName || "—"}
                      </td>
                      <td className={isFieldFiltered(["SupervisorName"]) ? "erx-col-filtered" : ""}>
                        {row.supervisorName || "—"}
                      </td>
                      <td className={isFieldFiltered(["Prescriber NPI", "ErxPrescriberNpi"]) ? "erx-col-filtered" : ""}>
                        {row.erxPrescriberNpi || "—"}
                      </td>
                      <td className={isFieldFiltered(["Prescriber DEA", "ErxPrescriberDea"]) ? "erx-col-filtered" : ""}>
                        {row.erxPrescriberDea || "—"}
                      </td>
                      <td
                        style={{ fontWeight: 600 }}
                        className={isFieldFiltered(["Drug Name", "ErxDrugName"]) ? "erx-col-filtered" : ""}
                      >
                        {row.erxDrugName || "—"}
                      </td>
                      <td className={isFieldFiltered(["POTENCYUNITCODE", "ErxPotencyUnitCode"]) ? "erx-col-filtered" : ""}>
                        {row.erxPotencyUnitCode || "—"}
                      </td>
                      <td className={isFieldFiltered(["NDC", "ErxNdc"]) ? "erx-col-filtered" : ""}>
                        {row.erxNdc || "—"}
                      </td>
                      <td className={isFieldFiltered(["Qty Ordered", "ErxQtyOrd"]) ? "erx-col-filtered" : ""}>
                        {row.erxQtyOrd ?? "—"}
                      </td>
                      <td className={isFieldFiltered(["Quantity Dispensed", "ErxQtyDispensed"]) ? "erx-col-filtered" : ""}>
                        {row.erxQtyDispensed ?? "—"}
                      </td>
                      <td className={isFieldFiltered(["Days Supply", "ErxDaysSupply"]) ? "erx-col-filtered" : ""}>
                        {row.erxBasedDaysSupply ?? row.erxDaysSupply ?? "—"}
                      </td>
                      <td
                        style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                        title={row.erxSig || ""}
                        className={isFieldFiltered(["Sig", "ErxSig"]) ? "erx-col-filtered" : ""}
                      >
                        {row.erxSig || "—"}
                      </td>

                      {/* Logistics & DUR */}
                      <td className={isFieldFiltered(["DAW Code", "MmDawCode", "ErxDawCode"]) ? "erx-col-filtered" : ""}>
                        {`${row.mmDawCode || "-"} / ${row.erxDawCode || "-"}`}
                      </td>
                      <td className={isFieldFiltered(["Class 2 Narcotic Refills", "Patient Refill", "Refills", "ErxRefill", "MmFillNumber", "Refills Originally prescriber sent"]) ? "erx-col-filtered" : ""}>
                        {`${row.mmFillNumber ?? row.mmRefillsPharmacistEntered ?? "-"} / ${row.erxRefill ?? "-"}`}
                      </td>
                      <td>{row.mmCopay != null ? `$${row.mmCopay.toFixed(2)}` : "—"}</td>
                      <td>{row.mmDelivery || "—"}</td>
                      <td className={isFieldFiltered(["MmRxOrigin"]) ? "erx-col-filtered" : ""}>
                        {getRxOriginBadge(row.mmRxOrigin)}
                      </td>
                      <td>{row.mmSignatureCaptured != null ? (row.mmSignatureCaptured ? "Yes" : "No") : "—"}</td>
                      <td>{row.followUpTag || "—"}</td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={row.telephoneNotes || ""}>
                        {row.telephoneNotes || "—"}
                      </td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={row.erxNotes || ""}>
                        {row.erxNotes || "—"}
                      </td>
                      <td>{row.durReasonCd || "—"}</td>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }} title={row.message || ""}>
                        {row.message || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Box>
      ) : (
        /* View Mode: Summary Table */
        <Table
          columns={activeSummaryColumns}
          data={records}
          loading={loadingRecords}
          serialNumberOffset={(pageParam.page - 1) * pageParam.pageSize}
        />
      )}

      {/* Floating / Sticky Bulk Action Toolbar - Responsive Material Box */}
      {selectedRecordIds.length > 0 && (
        <Box
          sx={{
            position: "sticky",
            bottom: { xs: "8px", sm: "16px" },
            zIndex: 100,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            bgcolor: "#0f172a",
            color: "#ffffff",
            p: { xs: "10px 14px", sm: "12px 20px" },
            borderRadius: "12px",
            border: "1px solid #334155",
            boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.35), 0 8px 10px -6px rgba(15, 23, 42, 0.2)",
            gap: { xs: 1.25, sm: 2 },
            mt: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {ERX_AUDIT_LABELS.formatPrescriptionsSelected(selectedRecordIds.length)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              flexWrap: "wrap",
              width: { xs: "100%", sm: "auto" },
              justifyContent: { xs: "space-between", sm: "flex-end" },
            }}
          >
            {selectedDiscrepancyColumn ? (
              <>
                <MuiButton
                  variant="contained"
                  size="small"
                  startIcon={bulkUpdatingDiscrepancies ? <CircularProgress size={16} color="inherit" /> : <BlockOutlinedIcon />}
                  onClick={handleBulkIgnoreSelected}
                  disabled={bulkUpdatingDiscrepancies}
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    bgcolor: "#0284c7",
                    color: "#ffffff",
                    "&:hover": { bgcolor: "#0369a1" },
                  }}
                >
                  {ERX_AUDIT_LABELS.formatIgnoreSelectedForColumn(formatDiscrepancyRuleName(selectedDiscrepancyColumn), selectedRecordIds.length)}
                </MuiButton>
                <MuiButton
                  variant="outlined"
                  size="small"
                  onClick={handleIgnoreAllForColumn}
                  disabled={bulkUpdatingDiscrepancies}
                  sx={{
                    fontWeight: 700,
                    textTransform: "none",
                    color: "#cbd5e1",
                    borderColor: "#475569",
                    "&:hover": { borderColor: "#94a3b8", bgcolor: "rgba(255, 255, 255, 0.05)" },
                  }}
                >
                  {ERX_AUDIT_LABELS.formatIgnoreAllForColumn(formatDiscrepancyRuleName(selectedDiscrepancyColumn), totalRecords)}
                </MuiButton>
              </>
            ) : (
              <MuiButton
                variant="contained"
                size="small"
                startIcon={bulkUpdatingDiscrepancies ? <CircularProgress size={16} color="inherit" /> : <BlockOutlinedIcon />}
                onClick={handleBulkIgnoreSelected}
                disabled={bulkUpdatingDiscrepancies}
                sx={{
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: "#0284c7",
                  color: "#ffffff",
                  "&:hover": { bgcolor: "#0369a1" },
                }}
              >
                {ERX_AUDIT_LABELS.MESSAGES.IGNORE_SELECTED_DISCREPANCIES} ({selectedRecordIds.length})
              </MuiButton>
            )}
            <MuiButton
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => setSelectedRecordIds([])}
              sx={{ textTransform: "none", borderColor: "#475569", color: "#cbd5e1" }}
            >
              {ERX_AUDIT_LABELS.ACTIONS.DESELECT_ALL}
            </MuiButton>
          </Box>
        </Box>
      )}

      <Box sx={{ width: "100%", overflowX: "auto", pt: 0.5 }}>
        <Pagination
          pageParam={pageParam}
          totalRecords={totalRecords}
          onPageChange={(page) => {
            setPageParam((prev) => ({ ...prev, page }));
            setSelectedRecordIds([]);
          }}
          onPageSizeChange={(pageSize) => {
            setPageParam({ page: 1, pageSize });
            setSelectedRecordIds([]);
          }}
        />
      </Box>

      {/* Side-by-Side Discrepancy Modal */}
      <ErxAuditDiscrepancyDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        record={
          selectedRecord
            ? (records.find((r) => r.recordId === selectedRecord.recordId) ?? selectedRecord)
            : null
        }
      />
    </div>
  );
}
