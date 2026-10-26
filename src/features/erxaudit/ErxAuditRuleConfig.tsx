import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchErxRules,
  saveErxRule,
  deleteErxRule,
  fetchInsuranceCompanies,
} from "../../slice/ErxAuditSlice";
import type { ErxColumnMatchRuleDto, InsuranceCompanyDto } from "../../dto/erxAuditDto";
import Table, { type Column } from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import DeleteConfirmModal from "../../component/molecules/DeleteConfirmModal";
import Button from "../../component/atoms/Button";
import { CustomSelect } from "../../component/molecules/FormField";
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Autocomplete,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CheckIcon from "@mui/icons-material/Check";
import { isAdminUser } from "../../component/auth/authUtils";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

const GLOBAL_ALL_OPTION: InsuranceCompanyDto = {
  insuranceCompanyId: 0,
  name: "All Insurance Companies (Global Rule)",
  binNumber: "",
  isActive: true,
};

const EMPTY_RULE: ErxColumnMatchRuleDto = {
  ruleId: 0,
  fieldGroupName: "",
  mmColumnName: "",
  erxColumnName: "",
  matchType: "Exact",
  toleranceValue: null,
  insuranceCompanyId: null,
  insuranceCompanyName: null,
  insuranceCompanyIds: [],
  insuranceCompanyNames: [],
  isActive: true,
};

const ERX_RECORD_COLUMNS = [
  "RxNumber",
  "MmFillNumber",
  "ErxRxNumber",
  "MmOrderDate",
  "ErxOrderDate",
  "ErxEffectiveDate",
  "MmDateFilled",
  "MmTimeFilled",
  "PickupDate",
  "ErxReceivedDateTime",
  "MmPatientName",
  "ErxPatientName",
  "MmPatientDob",
  "ErxPatientDob",
  "MmPatientPhone",
  "ErxPatientPhone",
  "MmPatientAddress",
  "ErxPatientAddress",
  "MmPrescriberName",
  "ErxPrescriberName",
  "SupervisorName",
  "MmPrescriberNpi",
  "ErxPrescriberNpi",
  "MmPrescriberDea",
  "ErxPrescriberDea",
  "MmDispensedDrugName",
  "ErxDrugName",
  "MmPotencyUnitCode",
  "ErxPotencyUnitCode",
  "MmDispensedNdc",
  "ErxNdc",
  "MmQtyOrd",
  "ErxQtyOrd",
  "MmQtyDispensed",
  "ErxQtyDispensed",
  "MmDispensedDaysSupply",
  "ErxDaysSupply",
  "MmDispensedSig",
  "ErxSig",
  "TelephoneNotes",
  "TelephoneNotesDate",
  "ErxNotes",
  "ErxNotesDate",
  "ErxNotesCreatedBy",
  "MmDawCode",
  "ErxDawCode",
  "MmRefillsPharmacistEntered",
  "ErxRefill",
  "MmRphNotes",
  "MmSignatureCaptured",
  "FollowUpTag",
  "MmDelivery",
  "MmRxOrigin",
  "MmCopay",
  "DurReasonCd",
  "DurProfCd",
  "DurResultCode",
  "Message",
];

export default function ErxAuditRuleConfig() {
  const dispatch = useDispatch<AppDispatch>();
  const isAdmin = isAdminUser();

  const {
    rules,
    totalRules,
    loadingRules,
    insuranceCompanies,
    loadingInsuranceCompanies,
    insuranceCompanyPage,
    insuranceCompanyTotal,
    insuranceCompanyHasMore,
  } = useSelector((state: RootState) => state.erxAudit);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [form, setForm] = useState<ErxColumnMatchRuleDto>(EMPTY_RULE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [companySearchText, setCompanySearchText] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const rulesSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleInsuranceListboxScroll = useCallback(
    (event: React.UIEvent<HTMLUListElement>) => {
      const listboxNode = event.currentTarget;
      if (!listboxNode) return;
      const isNearBottom =
        listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 50;

      if (isNearBottom && !loadingInsuranceCompanies && insuranceCompanyHasMore) {
        const nextPage = (insuranceCompanyPage || 1) + 1;
        dispatch(
          fetchInsuranceCompanies({
            page: nextPage,
            pageSize: 10,
            searchText: companySearchText.trim() || undefined,
            append: true,
          })
        );
      }
    },
    [dispatch, loadingInsuranceCompanies, insuranceCompanyHasMore, insuranceCompanyPage, companySearchText]
  );

  const handleCompanyInputChange = (
    _event: React.SyntheticEvent,
    newInputValue: string,
    reason: string
  ) => {
    if (reason === "input" || reason === "clear") {
      setCompanySearchText(newInputValue);
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      searchDebounceRef.current = setTimeout(() => {
        dispatch(
          fetchInsuranceCompanies({
            page: 1,
            pageSize: 10,
            searchText: newInputValue.trim() || undefined,
            append: false,
          })
        );
      }, 350);
    }
  };

  const mmOptions = useMemo(() => {
    const list = [...ERX_RECORD_COLUMNS];
    if (form.mmColumnName && !list.includes(form.mmColumnName)) {
      list.unshift(form.mmColumnName);
    }
    return list.map((col) => ({ label: col, value: col }));
  }, [form.mmColumnName]);

  const erxOptions = useMemo(() => {
    const list = [...ERX_RECORD_COLUMNS];
    if (form.erxColumnName && !list.includes(form.erxColumnName)) {
      list.unshift(form.erxColumnName);
    }
    return list.map((col) => ({ label: col, value: col }));
  }, [form.erxColumnName]);

  const dropdownCompanyOptions: InsuranceCompanyDto[] = useMemo(() => {
    const list = (insuranceCompanies || []).filter((c) => c.insuranceCompanyId > 0);

    // Ensure currently selected companies from form are preserved in options
    const selectedIds = form.insuranceCompanyIds ?? [];
    const selectedNames = form.insuranceCompanyNames ?? [];
    const existingIds = new Set(list.map((c) => c.insuranceCompanyId));
    const existingNames = new Set(list.map((c) => (c.name || "").toLowerCase().trim()));

    selectedNames.forEach((name, idx) => {
      if (name && !existingNames.has(name.toLowerCase().trim())) {
        const id = selectedIds[idx] ?? (idx + 10000);
        if (!existingIds.has(id)) {
          list.push({
            insuranceCompanyId: id,
            name,
            isActive: true,
            binNumber: null,
            insuranceId: null,
          });
          existingIds.add(id);
          existingNames.add(name.toLowerCase().trim());
        }
      }
    });

    const result: InsuranceCompanyDto[] = [];
    const isSearching = Boolean(companySearchText.trim());
    const query = companySearchText.toLowerCase().trim();

    // Include Global Option if not searching or if search matches "all" or "global"
    if (!isSearching || "all insurance companies global rule".includes(query)) {
      result.push(GLOBAL_ALL_OPTION);
    }

    result.push(...list);

    // Append loading indicator placeholder row while fetching next scroll page
    if (loadingInsuranceCompanies) {
      result.push({
        insuranceCompanyId: -999,
        name: "__LOADING_MORE__",
        isActive: true,
      });
    } else if (!insuranceCompanyHasMore && (insuranceCompanies?.length || 0) >= 10) {
      result.push({
        insuranceCompanyId: -998,
        name: "__ALL_LOADED__",
        isActive: true,
      });
    }

    return result;
  }, [
    insuranceCompanies,
    form.insuranceCompanyIds,
    form.insuranceCompanyNames,
    companySearchText,
    loadingInsuranceCompanies,
    insuranceCompanyHasMore,
  ]);

  const isGlobalScope = useMemo(() => {
    const ids = form.insuranceCompanyIds ?? [];
    const names = form.insuranceCompanyNames ?? [];
    return ids.length === 0 && names.length === 0;
  }, [form.insuranceCompanyIds, form.insuranceCompanyNames]);

  const autocompleteValue = useMemo(() => {
    if (isGlobalScope) {
      return [GLOBAL_ALL_OPTION];
    }
    const currentIds = form.insuranceCompanyIds ?? [];
    const currentNames = form.insuranceCompanyNames ?? [];
    return dropdownCompanyOptions.filter(
      (c) =>
        c.insuranceCompanyId > 0 &&
        (currentIds.includes(c.insuranceCompanyId) ||
          currentNames.some(
            (n) => n.toLowerCase() === (c.name || (c as any).insuranceName || "").toLowerCase()
          ))
    );
  }, [isGlobalScope, form.insuranceCompanyIds, form.insuranceCompanyNames, dropdownCompanyOptions]);

  const handleCompanyScopeChange = (
    _event: React.SyntheticEvent,
    selectedOptions: InsuranceCompanyDto[],
    _reason: string,
    details?: { option?: InsuranceCompanyDto }
  ) => {
    // If the user clicked the Global option
    if (details?.option?.insuranceCompanyId === 0) {
      setForm((prev) => ({
        ...prev,
        insuranceCompanyIds: [],
        insuranceCompanyNames: [],
        insuranceCompanyId: null,
        insuranceCompanyName: null,
      }));
      return;
    }

    // Specific companies selected
    const specificSelected = selectedOptions.filter((opt) => opt.insuranceCompanyId > 0);

    if (specificSelected.length === 0) {
      setForm((prev) => ({
        ...prev,
        insuranceCompanyIds: [],
        insuranceCompanyNames: [],
        insuranceCompanyId: null,
        insuranceCompanyName: null,
      }));
    } else {
      const ids = specificSelected.map((opt) => opt.insuranceCompanyId).filter(Boolean);
      const names = specificSelected
        .map((opt) => opt.name || (opt as any).insuranceName || "")
        .filter(Boolean);
      setForm((prev) => ({
        ...prev,
        insuranceCompanyIds: ids,
        insuranceCompanyNames: names,
        insuranceCompanyId: ids.length > 0 ? ids[0] : null,
        insuranceCompanyName: names.length > 0 ? names.join(", ") : null,
      }));
    }
  };

  useEffect(() => {
    dispatch(fetchInsuranceCompanies({ page: 1, pageSize: 10, append: false }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchErxRules({
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchText: debouncedSearch.trim() || undefined,
      })
    );
  }, [dispatch, pageParam.page, pageParam.pageSize, debouncedSearch]);

  useEffect(() => {
    return () => {
      if (rulesSearchDebounceRef.current) clearTimeout(rulesSearchDebounceRef.current);
    };
  }, []);

  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setForm(EMPTY_RULE);
    setErrors({});
    setCompanySearchText("");
    setModalOpen(true);
    dispatch(fetchInsuranceCompanies({ page: 1, pageSize: 10, append: false }));
  };

  const handleOpenEdit = (rule: ErxColumnMatchRuleDto) => {
    if (!isAdmin) return;
    let ids = rule.insuranceCompanyIds ?? [];
    let names = rule.insuranceCompanyNames ?? [];
    if (ids.length === 0 && rule.insuranceCompanyId) {
      ids = [rule.insuranceCompanyId];
      if (rule.insuranceCompanyName) {
        names = [rule.insuranceCompanyName];
      }
    }
    setForm({
      ...rule,
      insuranceCompanyIds: ids,
      insuranceCompanyNames: names,
    });
    setErrors({});
    setCompanySearchText("");
    setModalOpen(true);
    dispatch(fetchInsuranceCompanies({ page: 1, pageSize: 10, append: false }));
  };

  const handleOpenDelete = (ruleId: number) => {
    if (!isAdmin) return;
    setDeletingRuleId(ruleId);
    setDeleteModalOpen(true);
  };

  const validateField = (field: string, value: any): string => {
    switch (field) {
      case "fieldGroupName":
        if (!value || !value.toString().trim()) {
          return "Field Group Name is required.";
        }
        return "";
      case "mmColumnName":
        if (!value || !value.toString().trim()) {
          return "MicroMerchant Property / Column is required.";
        }
        return "";
      case "erxColumnName":
        if (!value || !value.toString().trim()) {
          return "ERX Property / Column is required.";
        }
        return "";
      case "toleranceValue":
        if (form.matchType === "NumericTolerance") {
          if (value === null || value === undefined || value === "" || isNaN(Number(value))) {
            return "Tolerance Value is required for Numeric Tolerance.";
          }
          if (Number(value) < 0) {
            return "Tolerance Value must be 0 or greater.";
          }
        }
        return "";
      default:
        return "";
    }
  };

  const handleFieldChange = (field: keyof ErxColumnMatchRuleDto, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  const handleBlur = (field: string) => {
    const val = (form as any)[field];
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const fgErr = validateField("fieldGroupName", form.fieldGroupName);
    if (fgErr) newErrors.fieldGroupName = fgErr;

    const mmErr = validateField("mmColumnName", form.mmColumnName);
    if (mmErr) newErrors.mmColumnName = mmErr;

    const erxErr = validateField("erxColumnName", form.erxColumnName);
    if (erxErr) newErrors.erxColumnName = erxErr;

    if (form.matchType === "NumericTolerance") {
      const tolErr = validateField("toleranceValue", form.toleranceValue);
      if (tolErr) newErrors.toleranceValue = tolErr;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const payload: ErxColumnMatchRuleDto = {
      ...form,
      insuranceCompanyIds: (form.insuranceCompanyIds ?? []).filter((id) => id > 0),
      insuranceCompanyNames: (form.insuranceCompanyNames ?? []).filter(
        (n) => n && !n.toLowerCase().includes("all insurance companies")
      ),
      insuranceCompanyId:
        (form.insuranceCompanyIds ?? []).filter((id) => id > 0).length > 0
          ? (form.insuranceCompanyIds ?? []).filter((id) => id > 0)[0]
          : null,
      insuranceCompanyName:
        (form.insuranceCompanyNames ?? []).filter(
          (n) => n && !n.toLowerCase().includes("all insurance companies")
        ).length > 0
          ? (form.insuranceCompanyNames ?? [])
              .filter((n) => n && !n.toLowerCase().includes("all insurance companies"))
              .join(", ")
          : null,
    };

    if (!isAdmin) return;
    const res = await dispatch(saveErxRule(payload));
    if (saveErxRule.fulfilled.match(res)) {
      setModalOpen(false);
      setForm(EMPTY_RULE);
      setErrors({});
      setPageParam((prev) => ({ ...prev, page: 1 }));
      dispatch(
        fetchErxRules({
          page: 1,
          pageSize: pageParam.pageSize,
          searchText: debouncedSearch.trim() || undefined,
        })
      );
    }
  };

  const handleDeleteConfirm = async () => {
    if (!isAdmin) return;
    if (deletingRuleId) {
      await dispatch(deleteErxRule(deletingRuleId));
      setDeleteModalOpen(false);
      setDeletingRuleId(null);
      const remaining = Math.max(0, totalRules - 1);
      const maxPage = Math.max(1, Math.ceil(remaining / pageParam.pageSize));
      const nextPage = Math.min(pageParam.page, maxPage);
      if (nextPage !== pageParam.page) {
        setPageParam((prev) => ({ ...prev, page: nextPage }));
      } else {
        dispatch(
          fetchErxRules({
            page: pageParam.page,
            pageSize: pageParam.pageSize,
            searchText: debouncedSearch.trim() || undefined,
          })
        );
      }
    }
  };

  const columns = useMemo<Column<ErxColumnMatchRuleDto>[]>(() => {
    const cols: Column<ErxColumnMatchRuleDto>[] = [
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.RULE_ID,
        accessor: "ruleId" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Typography component="span" sx={{ fontWeight: 700, color: "primary.main", fontSize: "0.875rem" }}>
            #{row.ruleId}
          </Typography>
        ),
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.FIELD_GROUP,
        accessor: "fieldGroupName" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Typography component="span" sx={{ fontWeight: 600, color: "text.primary", fontSize: "0.875rem" }}>
            {row.fieldGroupName}
          </Typography>
        ),
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.MM_COLUMN,
        accessor: "mmColumnName" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Box
            component="code"
            sx={{
              bgcolor: "#f1f5f9",
              color: "#334155",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            {row.mmColumnName}
          </Box>
        ),
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.ERX_COLUMN,
        accessor: "erxColumnName" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Box
            component="code"
            sx={{
              bgcolor: "#f1f5f9",
              color: "#334155",
              px: 1,
              py: 0.25,
              borderRadius: 1,
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            {row.erxColumnName}
          </Box>
        ),
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.MATCH_TYPE,
        accessor: "matchType" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => {
          let chipColor: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" = "info";
          if (row.matchType === "Exact") chipColor = "success";
          if (row.matchType === "Fuzzy") chipColor = "warning";
          if (row.matchType === "Ignore") chipColor = "default";
          return (
            <Chip
              size="small"
              color={chipColor}
              label={
                row.matchType === "NumericTolerance" && row.toleranceValue != null
                  ? `${row.matchType} (±${row.toleranceValue})`
                  : row.matchType
              }
              sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
            />
          );
        },
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.INSURANCE_SCOPE,
        accessor: "insuranceCompanyName" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => {
          const names =
            row.insuranceCompanyNames && row.insuranceCompanyNames.length > 0
              ? row.insuranceCompanyNames
              : row.insuranceCompanyName
              ? row.insuranceCompanyName.split(",").map((s) => s.trim()).filter(Boolean)
              : [];

          if (names.length === 0) {
            return (
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                {ERX_AUDIT_LABELS.STATUS_BADGES.ALL_PAYERS}
              </Typography>
            );
          }

          if (names.length === 1) {
            return (
              <Chip
                size="small"
                variant="outlined"
                color="primary"
                label={names[0]}
                sx={{ height: 24, fontSize: "0.75rem", maxWidth: 180 }}
              />
            );
          }

          return (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexWrap: "wrap" }}>
              <Chip
                size="small"
                variant="outlined"
                color="primary"
                label={names[0]}
                sx={{ height: 24, fontSize: "0.75rem", maxWidth: 140 }}
              />
              <Tooltip title={names.join(", ")} arrow>
                <Chip
                  size="small"
                  color="secondary"
                  variant="filled"
                  label={`+${names.length - 1} more`}
                  sx={{ height: 20, fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}
                />
              </Tooltip>
            </Box>
          );
        },
      },
      {
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIVE,
        accessor: "isActive" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Chip
            size="small"
            color={row.isActive ? "success" : "default"}
            variant={row.isActive ? "filled" : "outlined"}
            label={row.isActive ? ERX_AUDIT_LABELS.STATUS_BADGES.ACTIVE : ERX_AUDIT_LABELS.STATUS_BADGES.DISABLED}
            sx={{ height: 24, fontSize: "0.75rem", fontWeight: 600 }}
          />
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        header: ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS,
        accessor: "ruleId" as keyof ErxColumnMatchRuleDto,
        render: (row: ErxColumnMatchRuleDto) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => handleOpenEdit(row)}
              title="Edit Rule"
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => handleOpenDelete(row.ruleId)}
              title="Delete Rule"
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      });
    }

    return cols;
  }, [isAdmin]);

  return (
    <div>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          mb: 2,
          gap: 1.5,
        }}
      >
        <Box sx={{ width: { xs: "100%", sm: 280, md: 320 }, minWidth: 0 }}>
          <SearchInput
            value={searchText}
            placeholder={ERX_AUDIT_LABELS.FILTERS.SEARCH_RULES_PLACEHOLDER}
            onChange={(e) => {
              const value = e.target.value;
              setSearchText(value);
              setPageParam((prev) => ({ ...prev, page: 1 }));
              if (rulesSearchDebounceRef.current) {
                clearTimeout(rulesSearchDebounceRef.current);
              }
              rulesSearchDebounceRef.current = setTimeout(() => {
                setDebouncedSearch(value);
              }, 300);
            }}
          />
        </Box>
        {isAdmin && (
          <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
            <Button type="add" label={ERX_AUDIT_LABELS.ACTIONS.ADD_RULE} onClick={handleOpenAdd} />
          </Box>
        )}
      </Box>

      <Table columns={columns} data={rules} loading={loadingRules} />

      <Box sx={{ width: "100%", overflowX: "auto", pt: 0.5 }}>
        <Pagination
          pageParam={pageParam}
          totalRecords={totalRules}
          onPageChange={(page) => setPageParam((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPageParam({ page: 1, pageSize })}
        />
      </Box>

      {/* Add/Edit Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3, p: 0.5 } } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid",
            borderColor: "divider",
            pb: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
            {form.ruleId > 0 ? "Edit Column Match Rule" : "Add New Column Match Rule"}
          </Typography>
          <IconButton size="small" onClick={() => setModalOpen(false)} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2.5,
              mt: 1,
            }}
          >
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Field Group Name"
                required
                placeholder="e.g. Drug Name, Days Supply, NDC"
                value={form.fieldGroupName}
                onChange={(e) => handleFieldChange("fieldGroupName", e.target.value)}
                onBlur={() => handleBlur("fieldGroupName")}
                error={Boolean(errors.fieldGroupName)}
                helperText={errors.fieldGroupName}
              />
            </Box>

            <Box>
              <FormControl fullWidth size="small">
                <InputLabel id="match-type-label">Match Type *</InputLabel>
                <Select
                  labelId="match-type-label"
                  label="Match Type *"
                  value={form.matchType}
                  onChange={(e) => {
                    handleFieldChange("matchType", e.target.value);
                    if (e.target.value !== "NumericTolerance") {
                      setErrors((prev) => ({ ...prev, toleranceValue: "" }));
                    }
                  }}
                >
                  <MenuItem value="Exact">Exact (Strict Equality)</MenuItem>
                  <MenuItem value="CaseInsensitive">Case-Insensitive (Trimmed)</MenuItem>
                  <MenuItem value="NumericTolerance">Numeric Tolerance (± Tolerance)</MenuItem>
                  <MenuItem value="Fuzzy">Fuzzy (Token & Levenshtein Similarity)</MenuItem>
                  <MenuItem value="DateSameOrAfter">Date: Same or After (MM &gt;= ERX / Pickup &gt;= Fill)</MenuItem>
                  <MenuItem value="EffectiveDateGoverned">Effective Date Governed (Fill &gt;= Effective &amp; Order Date)</MenuItem>
                  <MenuItem value="DateWithinDays">Date: Within Allowed Days (Tolerance = Max Days)</MenuItem>
                  <MenuItem value="Class2ZeroRefills">Class 2 Narcotics (Schedule II) Zero Refills</MenuItem>
                  <MenuItem value="Class2Expiration30Days">DEA Class 2 Narcotics (Max 30 Days from Effective Date)</MenuItem>
                  <MenuItem value="Class3To5Expiration180Days">DEA Class 3-5 Narcotics (Max 180 Days from Effective Date)</MenuItem>
                  <MenuItem value="TexasClass2Expiration21Days">Texas Class 2 Narcotics (Max 21 Days from Effective Date)</MenuItem>
                  <MenuItem value="Ignore">Ignore (Bypass comparison)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <CustomSelect
                label="MicroMerchant Column *"
                name="mmColumnName"
                value={form.mmColumnName}
                options={mmOptions}
                optionLabel="label"
                optionValue="value"
                searchable={true}
                triggerClassName={`erx-select-trigger ${errors.mmColumnName ? "error-input" : ""}`}
                onChange={(e) => handleFieldChange("mmColumnName", e.target.value)}
              />
              {errors.mmColumnName && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                  {errors.mmColumnName}
                </Typography>
              )}
            </Box>

            <Box>
              <CustomSelect
                label="ERX Column *"
                name="erxColumnName"
                value={form.erxColumnName}
                options={erxOptions}
                optionLabel="label"
                optionValue="value"
                searchable={true}
                triggerClassName={`erx-select-trigger ${errors.erxColumnName ? "error-input" : ""}`}
                onChange={(e) => handleFieldChange("erxColumnName", e.target.value)}
              />
              {errors.erxColumnName && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: "block" }}>
                  {errors.erxColumnName}
                </Typography>
              )}
            </Box>

            {(form.matchType === "NumericTolerance" ||
              form.matchType === "DateWithinDays" ||
              form.matchType === "Class2Expiration30Days" ||
              form.matchType === "Class3To5Expiration180Days" ||
              form.matchType === "TexasClass2Expiration21Days") && (
              <Box>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={
                    form.matchType === "NumericTolerance"
                      ? "Tolerance Value (± allowed diff)"
                      : "Max Allowed Days (Threshold)"
                  }
                  required
                  placeholder={form.matchType === "NumericTolerance" ? "e.g. 0.00 or 1.00" : "e.g. 30, 180, or 21"}
                  value={form.toleranceValue ?? ""}
                  onChange={(e) =>
                    handleFieldChange(
                      "toleranceValue",
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  onBlur={() => handleBlur("toleranceValue")}
                  error={Boolean(errors.toleranceValue)}
                  helperText={errors.toleranceValue}
                />
              </Box>
            )}

            <Box sx={{ gridColumn: { xs: "1", sm: "span 2" } }}>
              <FormControl fullWidth size="small">
                <Autocomplete
                  multiple
                  size="small"
                  limitTags={3}
                  disableCloseOnSelect
                  options={dropdownCompanyOptions}
                  loading={loadingInsuranceCompanies}
                  filterOptions={(options) => options}
                  onInputChange={handleCompanyInputChange}
                  slotProps={{
                    listbox: {
                      onScroll: handleInsuranceListboxScroll,
                      sx: {
                        maxHeight: 280,
                      },
                    },
                  }}
                  getOptionLabel={(option) => {
                    if (option.insuranceCompanyId === 0) {
                      return option.name || "All Insurance Companies (Global Rule)";
                    }
                    if (option.insuranceCompanyId === -999) return "Loading more...";
                    if (option.insuranceCompanyId === -998) return "All loaded";
                    const name = option.name || (option as any).insuranceName || "";
                    const bin = option.binNumber ? ` (BIN: ${option.binNumber})` : "";
                    const inactive = option.isActive === false ? " [Inactive]" : "";
                    return `${name}${bin}${inactive}`;
                  }}
                  getOptionDisabled={(option) => option.insuranceCompanyId < 0}
                  isOptionEqualToValue={(option, value) =>
                    option.insuranceCompanyId === value.insuranceCompanyId ||
                    (option.insuranceCompanyId === 0 && value.insuranceCompanyId === 0) ||
                    String(option.name).toLowerCase() === String(value.name).toLowerCase()
                  }
                  value={autocompleteValue}
                  onChange={handleCompanyScopeChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Insurance Company Scope (Optional)"
                      placeholder={
                        isGlobalScope
                          ? ""
                          : "Search or select insurance companies..."
                      }
                    />
                  )}
                  renderOption={(props, option, { selected }) => {
                    if (option.insuranceCompanyId === -999) {
                      return (
                        <li
                          {...props}
                          key="loading-more-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                            padding: "10px",
                            color: "#2563eb",
                            fontSize: "0.82rem",
                            backgroundColor: "#f8fafc",
                            borderTop: "1px solid #e2e8f0",
                            fontWeight: 500,
                            cursor: "default",
                            pointerEvents: "none",
                          }}
                        >
                          <CircularProgress size={16} sx={{ color: "#2563eb" }} />
                          <span>Loading more insurance companies...</span>
                        </li>
                      );
                    }

                    if (option.insuranceCompanyId === -998) {
                      return (
                        <li
                          {...props}
                          key="all-loaded-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "8px",
                            color: "#94a3b8",
                            fontSize: "0.75rem",
                            backgroundColor: "#f8fafc",
                            borderTop: "1px solid #e2e8f0",
                            cursor: "default",
                            pointerEvents: "none",
                          }}
                        >
                          Showing all {insuranceCompanyTotal || insuranceCompanies.length} insurance companies
                        </li>
                      );
                    }

                    const isGlobal = option.insuranceCompanyId === 0;
                    return (
                      <li
                        {...props}
                        key={option.insuranceCompanyId ?? option.name}
                        style={{
                          fontWeight: isGlobal ? 600 : 400,
                          color: isGlobal ? "#1d5b91" : "inherit",
                          borderBottom: isGlobal ? "1px solid #e2e8f0" : "none",
                          paddingBottom: isGlobal ? "8px" : "6px",
                          paddingTop: isGlobal ? "8px" : "6px",
                          backgroundColor: isGlobal && selected ? "rgba(29, 91, 145, 0.08)" : undefined,
                        }}
                      >
                        {selected ? (
                          <CheckIcon sx={{ fontSize: 18, color: "#1d5b91", marginRight: "8px" }} />
                        ) : (
                          <span style={{ width: 18, marginRight: "8px" }} />
                        )}
                        <span>
                          {option.name || (option as any).insuranceName}
                          {option.binNumber ? ` (BIN: ${option.binNumber})` : ""}
                          {option.isActive === false ? " [Inactive]" : ""}
                        </span>
                      </li>
                    );
                  }}
                />
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gridColumn: { xs: "1", sm: "span 2" }, mt: 0.5 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    color="primary"
                  />
                }
                label="Rule Enabled & Active"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            type="cancel"
            onClick={() => {
              setModalOpen(false);
              setErrors({});
            }}
          />
          <Button type="save" label={ERX_AUDIT_LABELS.ACTIONS.SAVE_RULE} onClick={() => handleSave()} />
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={ERX_AUDIT_LABELS.MESSAGES.DELETE_RULE_TITLE}
        itemName={ERX_AUDIT_LABELS.MESSAGES.DELETE_RULE_ITEM}
      />
    </div>
  );
}
