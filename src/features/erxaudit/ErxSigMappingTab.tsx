import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchSigMappings,
  createSigMapping,
  updateSigMapping,
  deleteSigMapping,
  toggleSigMappingActive,
  testSigComparison,
  clearSigTestResult,
} from "../../slice/ErxAuditSlice";
import type {
  ErxSigMappingDto,
  CreateErxSigMappingDto,
  UpdateErxSigMappingDto,
} from "../../dto/erxAuditDto";
import Pagination, { type PageParam } from "../../component/molecules/Pagination";
import DeleteConfirmModal from "../../component/molecules/DeleteConfirmModal";
import { showSuccess, showError } from "../../component/atoms/ToastHelper";
import { isAdminUser } from "../../component/auth/authUtils";

// Material UI Components
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Switch,
  CircularProgress,
  InputAdornment,
  Tooltip,
} from "@mui/material";

// Material UI Icons
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ClearIcon from "@mui/icons-material/Clear";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

interface FormErrors {
  abbr?: string;
  simpleEnglish?: string;
}

export default function ErxSigMappingTab() {
  const dispatch = useDispatch<AppDispatch>();
  const isAdmin = isAdminUser();
  const { sigMappings, totalSigMappings, loadingSigMappings, testingSig, sigTestResult } =
    useSelector((state: RootState) => state.erxAudit);

  // Search and Pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageParam, setPageParam] = useState<PageParam>({ page: 1, pageSize: 10 });
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<ErxSigMappingDto | null>(null);
  const [abbr, setAbbr] = useState("");
  const [simpleEnglish, setSimpleEnglish] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ abbr?: boolean; simpleEnglish?: boolean }>({});
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<ErxSigMappingDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Live tester state & validation
  const [showTester, setShowTester] = useState(false);
  const [testErxSig, setTestErxSig] = useState("take 1 tab po qhs");
  const [testMmSig, setTestMmSig] = useState("TAKE 1 TAB BY MOUTH AT BEDTIME");
  const [testerErrors, setTesterErrors] = useState<{ erx?: string; mm?: string }>({});

  const loadMappings = useCallback(() => {
    dispatch(
      fetchSigMappings({
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchTerm: debouncedSearch.trim() || undefined,
      })
    );
  }, [dispatch, pageParam.page, pageParam.pageSize, debouncedSearch]);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPageParam((prev) => ({ ...prev, page: 1 }));
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setPageParam((prev) => ({ ...prev, page: 1 }));
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  // --- Validation Logic ---
  const validateField = (field: "abbr" | "simpleEnglish", value: string): string | undefined => {
    const trimmed = value.trim();

    if (field === "abbr") {
      if (!trimmed) {
        return "Abbreviation is required.";
      }
      if (trimmed.length > 50) {
        return "Abbreviation cannot exceed 50 characters.";
      }
      // Check for uniqueness
      const isDuplicate = sigMappings.some(
        (m) =>
          m.abbreviation.trim().toLowerCase() === trimmed.toLowerCase() &&
          (!editingMapping || m.id !== editingMapping.id)
      );
      if (isDuplicate) {
        return "This abbreviation already exists. Please enter a unique code.";
      }
    }

    if (field === "simpleEnglish") {
      if (!trimmed) {
        return "Simple English statement is required.";
      }
      if (trimmed.length < 2) {
        return "Simple English statement must be at least 2 characters.";
      }
      if (trimmed.length > 150) {
        return "Simple English statement cannot exceed 150 characters.";
      }
    }

    return undefined;
  };

  const validateForm = (): boolean => {
    const abbrErr = validateField("abbr", abbr);
    const simpleEngErr = validateField("simpleEnglish", simpleEnglish);

    setErrors({
      abbr: abbrErr,
      simpleEnglish: simpleEngErr,
    });
    setTouched({
      abbr: true,
      simpleEnglish: true,
    });

    return !abbrErr && !simpleEngErr;
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    if (!isAdmin) return;
    setEditingMapping(null);
    setAbbr("");
    setSimpleEnglish("");
    setIsActive(true);
    setErrors({});
    setTouched({});
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (mapping: ErxSigMappingDto) => {
    if (!isAdmin) return;
    setEditingMapping(mapping);
    setAbbr(mapping.abbreviation);
    setSimpleEnglish(mapping.simpleEnglish);
    setIsActive(mapping.isActive);
    setErrors({});
    setTouched({});
    setModalOpen(true);
  };

  // Save Mapping (Create or Update)
  const handleSave = async () => {
    if (!isAdmin) return;
    if (!validateForm()) return;

    setSaving(true);
    try {
      if (editingMapping) {
        const updatePayload: UpdateErxSigMappingDto = {
          abbreviation: abbr.trim().toUpperCase(),
          simpleEnglish: simpleEnglish.trim(),
          normalizedToken: simpleEnglish.trim().toLowerCase(),
          category: "General",
          isActive,
        };
        await dispatch(updateSigMapping({ id: editingMapping.id, data: updatePayload })).unwrap();
        showSuccess(`Abbreviation "${abbr.trim().toUpperCase()}" updated successfully.`);
      } else {
        const createPayload: CreateErxSigMappingDto = {
          abbreviation: abbr.trim().toUpperCase(),
          simpleEnglish: simpleEnglish.trim(),
          normalizedToken: simpleEnglish.trim().toLowerCase(),
          category: "General",
        };
        await dispatch(createSigMapping(createPayload)).unwrap();
        showSuccess(`Abbreviation "${abbr.trim().toUpperCase()}" created successfully.`);
      }
      setModalOpen(false);
      loadMappings();
    } catch (err: any) {
      showError(err?.message || "Failed to save mapping. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggle = async (id: number, currentActive: boolean) => {
    if (!isAdmin) return;
    try {
      await dispatch(toggleSigMappingActive(id)).unwrap();
      showSuccess(`Mapping ${currentActive ? "deactivated" : "activated"} successfully.`);
      loadMappings();
    } catch (err: any) {
      showError(err?.message || "Failed to toggle status.");
    }
  };

  // Trigger Delete Confirmation Modal
  const handleOpenDelete = (mapping: ErxSigMappingDto) => {
    if (!isAdmin) return;
    setDeletingItem(mapping);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!isAdmin || !deletingItem) return;
    setDeleting(true);
    try {
      await dispatch(deleteSigMapping(deletingItem.id)).unwrap();
      showSuccess(`Abbreviation "${deletingItem.abbreviation}" deleted successfully.`);
      setDeleteModalOpen(false);
      setDeletingItem(null);

      const remainingTotal = Math.max(0, totalSigMappings - 1);
      const maxPage = Math.max(1, Math.ceil(remainingTotal / pageParam.pageSize));
      if (pageParam.page > maxPage) {
        setPageParam((prev) => ({ ...prev, page: maxPage }));
      } else {
        loadMappings();
      }
    } catch (err: any) {
      showError(err?.message || "Failed to delete abbreviation mapping.");
    } finally {
      setDeleting(false);
    }
  };

  // Direction Tester Validation & Run
  const handleRunTest = () => {
    const errs: { erx?: string; mm?: string } = {};
    if (!testErxSig.trim()) {
      errs.erx = "ERX direction is required.";
    }
    if (!testMmSig.trim()) {
      errs.mm = "MicroMerchant direction is required.";
    }

    setTesterErrors(errs);
    if (Object.keys(errs).length > 0) return;

    dispatch(testSigComparison({ erxSig: testErxSig.trim(), mmSig: testMmSig.trim() }));
  };

  const handleClearTest = () => {
    setTestErxSig("");
    setTestMmSig("");
    setTesterErrors({});
    dispatch(clearSigTestResult());
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, width: "100%" }}>
      {/* Header Banner - Fully Responsive */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          borderRadius: 2.5,
          border: "1px solid #e2e8f0",
          backgroundColor: "#ffffff",
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 0.5, flexWrap: "wrap" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b", letterSpacing: "-0.01em" }}>
              TypeSafe AI · SIG Clinical Evaluation
            </Typography>
            <Chip
              label="TypeSafe AI (jev-latest) Active"
              size="small"
              sx={{ backgroundColor: "#ecfdf5", color: "#065f46", fontWeight: 700, fontSize: "0.75rem", border: "1px solid #a7f3d0" }}
            />
            <Chip
              label="System One Decision Model"
              size="small"
              sx={{ backgroundColor: "#f0f9ff", color: "#0369a1", fontWeight: 600, fontSize: "0.75rem", border: "1px solid #bae6fd" }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 840, fontSize: { xs: "0.8125rem", sm: "0.875rem" } }}>
            Prescription directions (MicroMerchant vs eRx) are dynamically evaluated by TypeSafe AI's calibrated System One model (jev-latest).
            The model analyzes clinical dosage, frequency, and administration route with high probability scoring, automatically eliminating false discrepancies.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ScienceOutlinedIcon />}
            onClick={() => setShowTester((prev) => !prev)}
            sx={{
              borderColor: "#cbd5e1",
              color: "#334155",
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              py: 1,
              px: 2,
              whiteSpace: "nowrap",
              "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f8fafc" },
            }}
          >
            {showTester ? "Hide Direction Tester" : "Test Directions"}
          </Button>

          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{
                backgroundColor: "#0284c7",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                py: 1,
                px: 2.5,
                whiteSpace: "nowrap",
                boxShadow: "0 1px 2px rgba(2, 132, 199, 0.2)",
                "&:hover": { backgroundColor: "#0369a1" },
              }}
            >
              {ERX_AUDIT_LABELS.ACTIONS.ADD_SIG_MAPPING}
            </Button>
          )}
        </Box>
      </Paper>

      {/* Live Direction Tester Section (Expandable) */}
      {showTester && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5, md: 3 },
            borderRadius: 2.5,
            border: "1px solid #bfdbfe",
            backgroundColor: "#f8fafc",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <ScienceOutlinedIcon sx={{ color: "#2563eb", fontSize: 22 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#1e293b" }}>
              Live Clinical Direction Tester
            </Typography>
            <Typography variant="body2" sx={{ color: "#64748b", ml: { xs: 0, sm: 1 }, width: { xs: "100%", sm: "auto" } }}>
              Validate how two directions are parsed, expanded to Simple English, and evaluated for equivalence.
            </Typography>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", mb: 0.5, display: "block" }}>
                ERX Directions (Physician E-Prescribing) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={testErxSig}
                onChange={(e) => {
                  setTestErxSig(e.target.value);
                  if (testerErrors.erx) setTesterErrors((prev) => ({ ...prev, erx: undefined }));
                }}
                error={Boolean(testerErrors.erx)}
                helperText={testerErrors.erx}
                placeholder="e.g. take 1 tab po qhs or By mouth (orally)"
                sx={{ backgroundColor: "#ffffff" }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", mb: 0.5, display: "block" }}>
                MicroMerchant Directions (Dispensed in Pharmacy) *
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={testMmSig}
                onChange={(e) => {
                  setTestMmSig(e.target.value);
                  if (testerErrors.mm) setTesterErrors((prev) => ({ ...prev, mm: undefined }));
                }}
                error={Boolean(testerErrors.mm)}
                helperText={testerErrors.mm}
                placeholder="e.g. TAKE 1 TAB BY MOUTH AT BEDTIME"
                sx={{ backgroundColor: "#ffffff" }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, pt: { xs: 1, md: 2.75 }, width: { xs: "100%", sm: "auto" } }}>
              <Button
                variant="contained"
                onClick={handleRunTest}
                disabled={testingSig}
                startIcon={testingSig ? <CircularProgress size={16} color="inherit" /> : <CompareArrowsIcon />}
                sx={{
                  backgroundColor: "#0ea5e9",
                  textTransform: "none",
                  fontWeight: 600,
                  height: 40,
                  px: 2.5,
                  flex: { xs: 1, sm: "none" },
                  "&:hover": { backgroundColor: "#0284c7" },
                }}
              >
                {testingSig ? "Testing..." : "Compare"}
              </Button>
              {(testErxSig || testMmSig || sigTestResult) && (
                <Button
                  variant="outlined"
                  onClick={handleClearTest}
                  startIcon={<ClearIcon />}
                  sx={{
                    borderColor: "#cbd5e1",
                    color: "#64748b",
                    textTransform: "none",
                    fontWeight: 600,
                    height: 40,
                    px: 2,
                    "&:hover": { borderColor: "#94a3b8", backgroundColor: "#f1f5f9" },
                  }}
                >
                  Clear
                </Button>
              )}
            </Box>
          </Box>

          {/* Test Results Display */}
          {sigTestResult && (
            <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>
                {sigTestResult.isEquivalent ? (
                  <Chip
                    icon={<CheckCircleIcon sx={{ "&&": { color: "#166534" } }} />}
                    label="Equivalent Match (No Discrepancy)"
                    sx={{ backgroundColor: "#dcfce7", color: "#166534", fontWeight: 700 }}
                  />
                ) : (
                  <Chip
                    icon={<ErrorOutlineIcon sx={{ "&&": { color: "#991b1b" } }} />}
                    label="Discrepancy Detected"
                    sx={{ backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: 700 }}
                  />
                )}
                {sigTestResult.confidenceScore !== undefined && sigTestResult.confidenceScore !== null && (
                  <Chip
                    size="small"
                    label={`Calibrated Probability: ${Math.round(sigTestResult.confidenceScore * 100)}%`}
                    sx={{
                      backgroundColor: sigTestResult.isEquivalent ? "#ecfdf5" : "#fef2f2",
                      color: sigTestResult.isEquivalent ? "#047857" : "#b91c1c",
                      fontWeight: 700,
                      border: "1px solid",
                      borderColor: sigTestResult.isEquivalent ? "#a7f3d0" : "#fecaca",
                    }}
                  />
                )}
                {sigTestResult.evaluator && (
                  <Chip
                    size="small"
                    label={sigTestResult.evaluator}
                    sx={{ backgroundColor: "#f1f5f9", color: "#334155", fontWeight: 600 }}
                  />
                )}
                {sigTestResult.latencyMs !== undefined && sigTestResult.latencyMs !== null && (
                  <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                    Latency: {sigTestResult.latencyMs} ms
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500 }}>
                  {sigTestResult.matchReason}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 1.5, borderRadius: 1.5, backgroundColor: "#f1f5f9" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155", display: "block" }}>
                    ERX Simple English Statement
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                    {sigTestResult.erxSimpleEnglish || "—"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", wordBreak: "break-word" }}>
                    Normalized: <code>{sigTestResult.erxNormalized}</code>
                  </Typography>
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 1.5, backgroundColor: "#f1f5f9" }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#334155", display: "block" }}>
                    MicroMerchant Simple English Statement
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#0f172a", fontWeight: 600, wordBreak: "break-word" }}>
                    {sigTestResult.mmSimpleEnglish || "—"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#64748b", wordBreak: "break-word" }}>
                    Normalized: <code>{sigTestResult.mmNormalized}</code>
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Search & Results Summary Bar */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1.5,
        }}
      >
        <Box sx={{ width: { xs: "100%", sm: 380, md: 450 } }}>
          <TextField
            fullWidth
            size="small"
            placeholder={ERX_AUDIT_LABELS.FILTERS.SEARCH_SIG_PLACEHOLDER}
            value={searchTerm}
            onChange={handleSearchChange}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94a3b8", fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} aria-label="Clear search">
                      <ClearIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
            sx={{ backgroundColor: "#ffffff" }}
          />
        </Box>

        <Typography variant="body2" sx={{ color: "#64748b", textAlign: { xs: "left", sm: "right" } }}>
          Showing <b>{sigMappings.length}</b> of <b>{totalSigMappings}</b> abbreviations
        </Typography>
      </Box>

      {/* Main Table of Mappings with Responsive Container */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2.5,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          backgroundColor: "#ffffff",
        }}
      >
        {loadingSigMappings ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : totalSigMappings === 0 ? (
          <Box sx={{ textAlign: "center", p: 6 }}>
            <Typography variant="body1" sx={{ color: "#64748b", fontWeight: 500 }}>
              {debouncedSearch
                ? `No abbreviation mappings found matching "${debouncedSearch}".`
                : "No abbreviations found. Click 'Add New Mapping' to create one."}
            </Typography>
            {debouncedSearch && (
              <Button variant="text" onClick={handleClearSearch} sx={{ mt: 1, textTransform: "none" }}>
                Clear Search Filter
              </Button>
            )}
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: { xs: 460, sm: 600, md: 700 }, overflowX: "auto" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ "& th": { backgroundColor: "#f8fafc", fontWeight: 700, color: "#334155", py: 1.5 } }}>
                    <TableCell
                      title={ERX_AUDIT_LABELS.TABLE_HEADERS.ABBREVIATION_CODE}
                      sx={{ width: { xs: 120, sm: 180, md: 220 } }}
                    >
                      {ERX_AUDIT_LABELS.TABLE_HEADERS.ABBREVIATION_CODE}
                    </TableCell>
                    <TableCell title={ERX_AUDIT_LABELS.TABLE_HEADERS.CLINICAL_MEANING}>
                      {ERX_AUDIT_LABELS.TABLE_HEADERS.CLINICAL_MEANING}
                    </TableCell>
                    <TableCell
                      title={ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS_COL}
                      sx={{ width: 110, textAlign: "center" }}
                    >
                      {ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS_COL}
                    </TableCell>
                    {isAdmin && (
                      <TableCell
                        title={ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS}
                        sx={{ width: 110, textAlign: "right" }}
                      >
                        {ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS}
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sigMappings.map((m) => {
                    return (
                      <TableRow
                        key={m.id}
                        hover
                        sx={{
                          opacity: m.isActive ? 1 : 0.55,
                          backgroundColor: m.isActive ? "inherit" : "#fafafa",
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        {/* Abbreviation Badge */}
                        <TableCell sx={{ py: 1.5 }}>
                          <Box
                            sx={{
                              display: "inline-block",
                              px: 1.25,
                              py: 0.35,
                              borderRadius: 1.5,
                              backgroundColor: "#f1f5f9",
                              fontWeight: 700,
                              color: "#0f172a",
                              fontSize: "0.875rem",
                              fontFamily: "monospace",
                              letterSpacing: "0.02em",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {m.abbreviation}
                          </Box>
                        </TableCell>

                        {/* Simple English Statement */}
                        <TableCell sx={{ py: 1.5, fontWeight: 600, color: "#1e293b", fontSize: "0.875rem", wordBreak: "break-word" }}>
                          {m.simpleEnglish}
                        </TableCell>

                        {/* Active / Inactive Status Switch */}
                        <TableCell sx={{ py: 1.5, textAlign: "center" }}>
                          {isAdmin ? (
                            <Tooltip title={m.isActive ? "Active in comparison engine" : "Inactive (ignored in comparisons)"}>
                              <Switch
                                size="small"
                                checked={m.isActive}
                                onChange={() => handleToggle(m.id, m.isActive)}
                                color="primary"
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              size="small"
                              color={m.isActive ? "success" : "default"}
                              variant={m.isActive ? "filled" : "outlined"}
                              label={m.isActive ? ERX_AUDIT_LABELS.STATUS_BADGES.ACTIVE : ERX_AUDIT_LABELS.STATUS_BADGES.DISABLED}
                              sx={{ height: 24, fontSize: "0.75rem", fontWeight: 600 }}
                            />
                          )}
                        </TableCell>

                        {/* Actions */}
                        {isAdmin && (
                          <TableCell sx={{ py: 1.5, textAlign: "right", whiteSpace: "nowrap" }}>
                            <Tooltip title="Edit mapping">
                              <IconButton size="small" onClick={() => handleOpenEdit(m)} sx={{ color: "#64748b", "&:hover": { color: "#0284c7" } }}>
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete mapping">
                              <IconButton size="small" onClick={() => handleOpenDelete(m)} sx={{ color: "#ef4444", "&:hover": { color: "#b91c1c" } }}>
                                <DeleteOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Generic Pagination Component */}
            <Box sx={{ borderTop: "1px solid #e2e8f0", px: 2, py: 1.5 }}>
              <Pagination
                pageParam={pageParam}
                totalRecords={totalSigMappings}
                onPageChange={(page) => setPageParam((prev) => ({ ...prev, page }))}
                onPageSizeChange={(pageSize) => setPageParam({ page: 1, pageSize })}
                recordLabel="abbreviations"
              />
            </Box>
          </>
        )}
      </Paper>

      {/* Add / Edit Mapping Dialog with Validations */}
      <Dialog
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: 3, m: { xs: 2, sm: 3 } } },
        }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
            {editingMapping ? `Edit Mapping — ${editingMapping.abbreviation}` : "Add New Abbreviation Mapping"}
          </Typography>
          <IconButton size="small" onClick={() => !saving && setModalOpen(false)} disabled={saving} aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {/* Abbreviation Field */}
          <Box>
            <TextField
              label="Abbreviation *"
              fullWidth
              size="small"
              value={abbr}
              onChange={(e) => {
                const val = e.target.value;
                setAbbr(val);
                if (touched.abbr) {
                  setErrors((prev) => ({ ...prev, abbr: validateField("abbr", val) }));
                }
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, abbr: true }));
                setErrors((prev) => ({ ...prev, abbr: validateField("abbr", abbr) }));
              }}
              error={Boolean(touched.abbr && errors.abbr)}
              helperText={
                touched.abbr && errors.abbr
                  ? errors.abbr
                  : "The short medical abbreviation used in ERX or MicroMerchant directions (e.g. PO, BID, QHS)"
              }
              placeholder="e.g. PO, BID, QHS, PRN"
              disabled={saving}
              autoFocus
            />
          </Box>

          {/* Simple English Statement Field */}
          <Box>
            <TextField
              label="Simple English Statement *"
              fullWidth
              size="small"
              value={simpleEnglish}
              onChange={(e) => {
                const val = e.target.value;
                setSimpleEnglish(val);
                if (touched.simpleEnglish) {
                  setErrors((prev) => ({ ...prev, simpleEnglish: validateField("simpleEnglish", val) }));
                }
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, simpleEnglish: true }));
                setErrors((prev) => ({ ...prev, simpleEnglish: validateField("simpleEnglish", simpleEnglish) }));
              }}
              error={Boolean(touched.simpleEnglish && errors.simpleEnglish)}
              helperText={
                touched.simpleEnglish && errors.simpleEnglish
                  ? errors.simpleEnglish
                  : "The plain English instruction to match against (e.g. By mouth (orally), Twice a day)"
              }
              placeholder="e.g. By mouth (orally), Twice a day, Every night at bedtime"
              disabled={saving}
            />
          </Box>

          {/* Active Switch (for Edit mode) */}
          {editingMapping && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 0.5 }}>
              <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={saving} />
              <Typography variant="body2" sx={{ fontWeight: 500, color: "#334155" }}>
                Active in Audit Comparison Engine
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={() => setModalOpen(false)} disabled={saving} sx={{ textTransform: "none", color: "#64748b" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{
              backgroundColor: "#0284c7",
              textTransform: "none",
              fontWeight: 600,
              minWidth: 120,
              "&:hover": { backgroundColor: "#0369a1" },
            }}
          >
            {saving ? "Saving..." : editingMapping ? "Update Mapping" : "Save Mapping"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generic Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        title={ERX_AUDIT_LABELS.MESSAGES.DELETE_SIG_TITLE}
        itemName={deletingItem ? `"${deletingItem.abbreviation}" (${deletingItem.simpleEnglish})` : ERX_AUDIT_LABELS.MESSAGES.DELETE_SIG_ITEM}
        onClose={() => {
          if (!deleting) {
            setDeleteModalOpen(false);
            setDeletingItem(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        confirming={deleting}
      />
    </Box>
  );
}
