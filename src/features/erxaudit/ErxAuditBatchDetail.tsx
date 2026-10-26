import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { FaBalanceScale } from "react-icons/fa";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchErxBatchRecords,
  fetchErxBatches,
  exportErxAuditRecords,
  fetchErxDiscrepancySummary,
  bulkUpdateDiscrepancyStatus,
  fetchErxFilterOptions,
} from "../../slice/ErxAuditSlice";
import type { ErxAuditRecordDto } from "../../dto/erxAuditDto";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import Button from "../../component/atoms/Button";
import ErxAuditDiscrepancyDetailModal from "./ErxAuditDiscrepancyDetailModal";
import { formatDisplayDate as formatUsaDate } from "../../utils/formatDisplayDate";
import {
  Box,
  Typography,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Button as MuiButton,
  CircularProgress,
  Checkbox,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
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
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import FilterListIcon from "@mui/icons-material/FilterList";
import ClearIcon from "@mui/icons-material/Clear";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import StarsOutlinedIcon from "@mui/icons-material/StarsOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
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
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

export default function ErxAuditBatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
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

  const [selectedDiscrepancyColumn, setSelectedDiscrepancyColumn] = useState<string>("");
  const [showAllColumns, setShowAllColumns] = useState<boolean>(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [discrepanciesOnly, setDiscrepanciesOnly] = useState<boolean>(false);
  const [selectedRecord, setSelectedRecord] = useState<ErxAuditRecordDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    debouncedSearch ||
    searchInput ||
    selectedDiscrepancyColumn ||
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
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedDiscrepancyColumn("");
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

  const currentBatch = batches.find((b) => b.batchId === batchId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(() => {
    if (!batchId) return;
    dispatch(
      fetchErxBatchRecords({
        batchId,
        params: {
          page: pageParam.page,
          pageSize: pageParam.pageSize,
          searchText: debouncedSearch,
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
    batchId,
    selectedDiscrepancyColumn,
    pageParam.page,
    pageParam.pageSize,
    debouncedSearch,
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
    if (batches.length === 0) {
      dispatch(fetchErxBatches(undefined));
    }
  }, [batches.length, dispatch]);

  useEffect(() => {
    if (batchId) {
      dispatch(fetchErxDiscrepancySummary(batchId));
      dispatch(fetchErxFilterOptions(batchId));
    }
  }, [batchId, dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = (record: ErxAuditRecordDto) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleExport = (format: "xlsx" | "csv" = "xlsx") => {
    if (!batchId) return;
    dispatch(
      exportErxAuditRecords({
        batchId,
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

  const handleRefresh = async () => {
    if (isRefreshing || !batchId) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        dispatch(fetchErxDiscrepancySummary(batchId)),
        dispatch(fetchErxFilterOptions(batchId)),
        dispatch(
          fetchErxBatchRecords({
            batchId,
            params: {
              page: pageParam.page,
              pageSize: pageParam.pageSize,
              searchText: debouncedSearch,
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
        ),
      ]);
    } finally {
      setIsRefreshing(false);
    }
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

  // Ignore actions
  const handleIgnoreRecord = async (record: ErxAuditRecordDto, colName?: string) => {
    const column = colName || selectedDiscrepancyColumn;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        recordIds: [record.recordId],
        discrepancyColumn: column || undefined,
        batchId,
        status: "Ignored",
      })
    );
    if (batchId) dispatch(fetchErxDiscrepancySummary(batchId));
    loadData();
  };

  const handleBulkIgnoreSelected = async () => {
    if (selectedRecordIds.length === 0) return;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        recordIds: selectedRecordIds,
        discrepancyColumn: selectedDiscrepancyColumn || undefined,
        batchId,
        status: "Ignored",
      })
    );
    setSelectedRecordIds([]);
    if (batchId) dispatch(fetchErxDiscrepancySummary(batchId));
    loadData();
  };

  const handleIgnoreAllForColumn = async () => {
    if (!selectedDiscrepancyColumn) return;
    await dispatch(
      bulkUpdateDiscrepancyStatus({
        discrepancyColumn: selectedDiscrepancyColumn,
        batchId,
        status: "Ignored",
      })
    );
    setSelectedRecordIds([]);
    if (batchId) dispatch(fetchErxDiscrepancySummary(batchId));
    loadData();
  };

  // Helpers to check discrepancy status on a row
  const hasOpenDiscrepancyForColumn = (record: ErxAuditRecordDto, colName: string) => {
    if (!record.discrepancies) return false;
    const target = colName.toLowerCase().replace(/[\s_-]/g, "");
    if (
      (target.includes("drug") || target.includes("medication") || target.includes("ndc")) &&
      areNdcsMatching(record.mmDispensedNdc, record.erxNdc)
    ) {
      return false;
    }
    if (
      (target.includes("quantitydispensed") || target.includes("qtydispensed") || target === "quantity" || target === "qty") &&
      isQuantityDispensedCompliant(record)
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

  const standardColumns = [
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
          <span style={{ fontWeight: 700, color: "#0f172a" }}>{row.rxNumber}</span>
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
            {row.pharmacyName || currentBatch?.pharmacyName || "—"}
          </div>
          {(row.pharmacyNpi || currentBatch?.pharmacyNpi) && (
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              NPI: {row.pharmacyNpi || currentBatch?.pharmacyNpi}
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
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.DATES_FILL_ORDER,
      accessor: "mmDateFilled" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <div style={{ fontSize: "0.85rem" }}>
          <div style={{ fontWeight: 500 }}>Fill: {formatUsaDate(row.mmDateFilled)}</div>
          <div style={{ color: "#64748b" }}>
            Ord: {formatUsaDate(row.erxOrderDate)}
          </div>
        </div>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.QTY_MM_ERX,
      accessor: "mmQtyDispensed" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <span style={{ fontWeight: 600 }}>
          {`${row.mmQtyDispensed ?? "-"} / ${row.erxQtyOrd ?? "-"}`}
        </span>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.DAYS_SUPPLY_SUMMARY,
      accessor: "mmDispensedDaysSupply" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => (
        <span style={{ fontWeight: 600 }}>
          {`${row.mmDispensedDaysSupply ?? "-"} / ${row.erxBasedDaysSupply ?? row.erxDaysSupply ?? "-"}`}
        </span>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.REFILLS_SUMMARY,
      accessor: "mmFillNumber" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) =>
        `${row.mmFillNumber ?? row.mmRefillsPharmacistEntered ?? "-"} / ${row.erxRefill ?? "-"}`,
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.AUDIT_RESULT,
      accessor: "hasDiscrepancy" as keyof ErxAuditRecordDto,
      render: (row: ErxAuditRecordDto) => {
        const ndcsMatch = areNdcsMatching(row.mmDispensedNdc, row.erxNdc);
        const qtyCompliant = isQuantityDispensedCompliant(row);
        const daysSupplyCompliant = isDaysSupplyCompliant(row);
        const count = row.discrepancies
          ? row.discrepancies.filter((d) => {
              if (d.status !== "Open" && d.status) return false;
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
            }).length
          : (row.discrepancyCount ?? 0);
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

  const activeColumns = useMemo(() => {
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
      });
    }
    return standardColumns;
  }, [
    selectedDiscrepancyColumn,
    showAllColumns,
    selectedRuleId,
    selectedRecordIds,
    isAllSelected,
    isSomeSelected,
    records.length,
    bulkUpdatingDiscrepancies,
    standardColumns,
  ]);

  return (
    <Box
      sx={{
        py: 1,
        px: { xs: 0.5, sm: 1.5 },
        width: "100%",
        boxSizing: "border-box",
        "@media (max-height: 700px)": {
          py: 0.5,
        },
      }}
    >
      {/* Top Breadcrumb Navigation - Responsive Material Box */}
      <Box
        component="nav"
        aria-label="breadcrumb"
        sx={{
          display: "flex",
          alignItems: "center",
          mb: { xs: 1, sm: 1.5 },
          fontSize: { xs: "0.75rem", sm: "0.8rem" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Box
            component="span"
            onClick={() => navigate("/erx-audit/data")}
            role="button"
            tabIndex={0}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              color: "#64748b",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "4px",
              py: 0.25,
              px: 0.75,
              transition: "all 0.15s ease",
              "&:hover": {
                color: "#2d5bff",
                bgcolor: "rgba(45, 91, 255, 0.08)",
              },
            }}
          >
            <FaBalanceScale style={{ fontSize: "0.85rem", color: "#2d5bff" }} />
            {ERX_AUDIT_LABELS.MODULE_NAME}
          </Box>
          <Typography component="span" sx={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.85rem", userSelect: "none" }}>
            ›
          </Typography>
          <Box
            component="span"
            onClick={() => navigate("/erx-audit/batches")}
            role="button"
            tabIndex={0}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              color: "#64748b",
              fontWeight: 500,
              cursor: "pointer",
              borderRadius: "4px",
              py: 0.25,
              px: 0.75,
              transition: "all 0.15s ease",
              "&:hover": {
                color: "#2d5bff",
                bgcolor: "rgba(45, 91, 255, 0.08)",
              },
            }}
          >
            {ERX_AUDIT_LABELS.SECTIONS.BATCHES.LABEL}
          </Box>
          <Typography component="span" sx={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.85rem", userSelect: "none" }}>
            ›
          </Typography>
          <Box
            component="span"
            sx={{
              color: "#0f172a",
              fontWeight: 600,
              bgcolor: "#f1f5f9",
              py: 0.25,
              px: 1,
              borderRadius: "4px",
              border: "1px solid #e2e8f0",
            }}
          >
            {ERX_AUDIT_LABELS.BATCH_DETAIL.BATCH_PREFIX}{batchId ? batchId.slice(0, 8) : ERX_AUDIT_LABELS.BATCH_DETAIL.DETAILS} ({currentBatch?.fileName || ERX_AUDIT_LABELS.BATCH_DETAIL.DEFAULT_FILE_NAME})
          </Box>
        </Box>
      </Box>

      {/* Header - Responsive Material Box */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          mb: 1.25,
          gap: 1,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.25 }}>
            <Button
              type="back"
              onClick={() => navigate("/erx-audit/batches")}
              label={ERX_AUDIT_LABELS.ACTIONS.BACK_TO_BATCHES}
            />
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", fontSize: { xs: "1.05rem", sm: "1.15rem" } }}>
              {ERX_AUDIT_LABELS.BATCH_DETAIL.TITLE}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "#64748b", fontSize: { xs: "0.72rem", sm: "0.78rem" } }}>
            {ERX_AUDIT_LABELS.BATCH_DETAIL.FILE_LABEL} <strong>{currentBatch?.fileName || ERX_AUDIT_LABELS.BATCH_DETAIL.DEFAULT_FILE_NAME}</strong> | {ERX_AUDIT_LABELS.BATCH_DETAIL.UPLOADED_LABEL}{" "}
            {currentBatch?.uploadedAt ? new Date(currentBatch.uploadedAt).toLocaleString() : ERX_AUDIT_LABELS.BATCH_DETAIL.RECENTLY}
            {currentBatch?.pharmacyName && (
              <>
                {" | "}Pharmacy: <strong>{currentBatch.pharmacyName}</strong>
                {currentBatch.pharmacyNpi ? ` (NPI: ${currentBatch.pharmacyNpi})` : ""}
              </>
            )}
          </Typography>
        </Box>
      </Box>

      {/* Summary Executive KPI Ribbon - Compact */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: { xs: 1, sm: 1.25 },
          p: { xs: "6px 8px", sm: "6px 12px" },
          mb: 1,
          bgcolor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.03)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 0.75, sm: 1 }, flexWrap: "wrap", width: "100%" }}>
          {/* Prescriptions Audited Pill */}
          <Tooltip title="View all prescriptions in batch" arrow>
            <Box
              onClick={() => {
                setDiscrepanciesOnly(false);
                setSelectedDiscrepancyColumn("");
                setShowAllColumns(false);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.4,
                borderRadius: "6px",
                bgcolor: !discrepanciesOnly && !selectedDiscrepancyColumn ? "#f1f5f9" : "#ffffff",
                border: "1px solid",
                borderColor: !discrepanciesOnly && !selectedDiscrepancyColumn ? "#94a3b8" : "#e2e8f0",
                cursor: "pointer",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "#cbd5e1", bgcolor: "#f8fafc" },
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: 16, color: !discrepanciesOnly && !selectedDiscrepancyColumn ? "#1e293b" : "#64748b" }} />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: !discrepanciesOnly && !selectedDiscrepancyColumn ? 700 : 600,
                  color: !discrepanciesOnly && !selectedDiscrepancyColumn ? "#0f172a" : "#475569",
                  fontSize: "0.76rem",
                }}
              >
                {ERX_AUDIT_LABELS.KPIS.PRESCRIPTIONS_AUDITED}:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: !discrepanciesOnly && !selectedDiscrepancyColumn ? "#0f172a" : "#1e293b",
                  fontSize: "0.84rem",
                }}
              >
                {currentBatch?.totalRows ?? totalRecords}
              </Typography>
            </Box>
          </Tooltip>

          {/* Discrepancies To Review Pill */}
          <Tooltip title="Click to filter by prescriptions needing review" arrow>
            <Box
              onClick={() => {
                setDiscrepanciesOnly(true);
                setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
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
                {discrepancySummaries && discrepancySummaries.length > 0
                  ? discrepancySummaries.reduce((acc, s) => acc + s.discrepancyCount, 0)
                  : currentBatch?.totalDiscrepancies ??
                    records.reduce(
                      (acc, r) =>
                        acc +
                        (r.discrepancies
                          ? r.discrepancies.filter((d) => d.status === "Open" || !d.status).length
                          : (r.discrepancyCount ?? 0)),
                      0
                    )}
              </Typography>
            </Box>
          </Tooltip>

          {/* Batch Status Pill */}
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
            <CheckCircleOutlinedIcon sx={{ fontSize: 16, color: "#64748b" }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", fontSize: "0.76rem" }}>
              {ERX_AUDIT_LABELS.KPIS.AUDIT_STATUS}:
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1e293b", fontSize: "0.84rem" }}>
              {currentBatch?.status || ERX_AUDIT_LABELS.STATUS_BADGES.COMPLETED}
            </Typography>
          </Box>

          {/* Pharmacy Pill */}
          {currentBatch?.pharmacyName && (
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
                {currentBatch.pharmacyName} {currentBatch.pharmacyNpi ? `(${currentBatch.pharmacyNpi})` : ""}
              </Typography>
            </Box>
          )}
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
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchInput(e.target.value);
              }}
            />
          </Box>

          {/* Discrepancy Type Dropdown */}
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200, md: 230 } }}>
            <Select
              value={selectedDiscrepancyColumn}
              displayEmpty
              onChange={(e) => {
                setSelectedDiscrepancyColumn(e.target.value);
                setShowAllColumns(false);
                setPageParam((prev) => ({ ...prev, page: 1 }));
                setSelectedRecordIds([]);
              }}
              renderValue={(selected) => {
                if (!selected) {
                  return <span style={{ color: "#475569" }}>All Discrepancy Types ({totalDiscrepanciesCount})</span>;
                }
                return <span>{formatDiscrepancyRuleName(selected)}</span>;
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
                fontWeight: selectedDiscrepancyColumn ? 600 : 500,
                bgcolor: selectedDiscrepancyColumn ? "#f0f9ff" : "#ffffff",
                color: selectedDiscrepancyColumn ? "#0284c7" : "#334155",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: selectedDiscrepancyColumn ? "#38bdf8" : "#cbd5e1",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#0284c7",
                },
                "& .MuiSelect-select": { py: "4px 10px" },
              }}
            >
              <MenuItem
                value=""
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  borderBottom: "1px solid #e2e8f0",
                  bgcolor: "#f8fafc",
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
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
                const isSelected = selectedDiscrepancyColumn.toLowerCase() === s.fieldGroupName.toLowerCase();
                return (
                  <MenuItem key={s.ruleId || s.fieldGroupName} value={s.fieldGroupName} sx={{ fontSize: "0.75rem" }}>
                    <Typography component="span" sx={{ fontSize: "0.75rem", flex: 1, fontWeight: isSelected ? 700 : 400, color: isSelected ? "#0284c7" : "inherit" }}>
                      {formatDiscrepancyRuleName(s.fieldGroupName)}
                    </Typography>
                    <Chip
                      size="small"
                      label={s.discrepancyCount}
                      sx={{
                        height: 18,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        bgcolor: isSelected ? "#e0f2fe" : "#f1f5f9",
                        color: isSelected ? "#0284c7" : "#64748b",
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
          <Tooltip title={ERX_AUDIT_LABELS.ACTIONS.REFRESH_TOOLTIP} arrow>
            <MuiButton
              variant="outlined"
              size="small"
              onClick={handleRefresh}
              disabled={isRefreshing || loadingRecords}
              startIcon={
                isRefreshing ? (
                  <CircularProgress size={13} />
                ) : (
                  <RefreshOutlinedIcon sx={{ fontSize: 15 }} />
                )
              }
              sx={{
                height: 32,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.75rem",
                color: "#0f172a",
                borderColor: "#cbd5e1",
                bgcolor: "#ffffff",
                px: 1.25,
                flexShrink: 0,
                whiteSpace: "nowrap",
                "&:hover": { borderColor: "#0284c7", bgcolor: "#f0f9ff", color: "#0284c7" },
              }}
            >
              {ERX_AUDIT_LABELS.ACTIONS.REFRESH}
            </MuiButton>
          </Tooltip>

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

          {searchInput && (
            <Chip
              size="small"
              label={`Search: "${searchInput}"`}
              onDelete={() => {
                setSearchInput("");
                setDebouncedSearch("");
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#e2e8f0", color: "#1e293b" }}
            />
          )}

          {selectedDiscrepancyColumn && (
            <Chip
              size="small"
              label={`Type: ${formatDiscrepancyRuleName(selectedDiscrepancyColumn)}`}
              onDelete={() => {
                setSelectedDiscrepancyColumn("");
                setShowAllColumns(false);
                setPageParam((prev) => ({ ...prev, page: 1 }));
                setSelectedRecordIds([]);
              }}
              sx={{ height: 22, fontSize: "0.7rem", bgcolor: "#e0f2fe", color: "#0369a1", borderColor: "#bae6fd" }}
              variant="outlined"
            />
          )}

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

      {/* Active Filter Banner - Pharmacy Clinical Sky Blue */}
      {selectedDiscrepancyColumn && (
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
              {ERX_AUDIT_LABELS.MESSAGES.FILTERED_BY} <strong>{formatDiscrepancyRuleName(selectedDiscrepancyColumn)}</strong>
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

      {/* Common Table Component */}
      <Table
        columns={activeColumns}
        data={records}
        loading={loadingRecords}
        serialNumberOffset={(pageParam.page - 1) * pageParam.pageSize}
      />

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
    </Box>
  );
}
