import React, { useState, useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../../app/store";
import { fetchErxBatches, uploadErxBatch, deleteErxBatch } from "../../slice/ErxAuditSlice";
import type { ErxAuditBatchDto } from "../../dto/erxAuditDto";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import DeleteConfirmModal from "../../component/molecules/DeleteConfirmModal";
import Button from "../../component/atoms/Button";
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Button as MuiButton,
  Alert,
  FormControl,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import { formatDisplayDateTime as formatUsaDateTime } from "../../utils/formatDisplayDate";
import { getPharmacyApi } from "../../service/PharmacyService";
import { isAdminUser, getPharmacyId } from "../../component/auth/authUtils";
import ERX_AUDIT_LABELS from "./erxAuditLabels";
import "./ErxAudit.css";

export default function ErxAuditBatchList() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { batches, totalBatches, loadingBatches, uploading } = useSelector(
    (state: RootState) => state.erxAudit
  );

  const isSuperAdmin = isAdminUser();
  const tokenPharmacyId = getPharmacyId();

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [searchText, setSearchText] = useState("");
  const [pharmacies, setPharmacies] = useState<Array<{ id: string; name: string; npi?: string }>>([]);
  const [selectedFilterPharmacyId, setSelectedFilterPharmacyId] = useState<string>(
    !isSuperAdmin && tokenPharmacyId ? tokenPharmacyId : ""
  );
  const [uploadPharmacyId, setUploadPharmacyId] = useState<string>(
    !isSuperAdmin && tokenPharmacyId ? tokenPharmacyId : ""
  );
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<ErxAuditBatchDto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSuperAdmin && tokenPharmacyId) {
      setSelectedFilterPharmacyId(tokenPharmacyId);
      setUploadPharmacyId(tokenPharmacyId);
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

  const loadData = useCallback(() => {
    dispatch(
      fetchErxBatches({
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchText,
        pharmacyId: selectedFilterPharmacyId || undefined,
      })
    );
  }, [dispatch, pageParam.page, pageParam.pageSize, searchText, selectedFilterPharmacyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "xlsm", "csv"].includes(ext || "")) {
        setFileError(ERX_AUDIT_LABELS.MESSAGES.FILE_VALIDATION_EXCEL_CSV);
        return;
      }
      setFileError("");
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "xlsm", "csv"].includes(ext || "")) {
        setFileError(ERX_AUDIT_LABELS.MESSAGES.FILE_DROP_VALIDATION);
        return;
      }
      setFileError("");
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      setFileError(ERX_AUDIT_LABELS.MESSAGES.FILE_CHOOSE_PROMPT);
      return;
    }
    setFileError("");

    const action = await dispatch(
      uploadErxBatch({
        file: selectedFile,
        pharmacyId: uploadPharmacyId || undefined,
      })
    );
    if (uploadErxBatch.fulfilled.match(action)) {
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadPharmacyId("");
      setFileError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (action.payload?.batchId) {
        navigate(`/erx-audit/batch/${action.payload.batchId}`);
      }
    }
  };

  const columns = [
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.FILE_NAME,
      accessor: "fileName" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}>
          <DescriptionOutlinedIcon color="success" sx={{ fontSize: 20 }} />
          <span>{row.fileName}</span>
        </Box>
      ),
    },
    {
      header: "Pharmacy",
      accessor: "pharmacyName" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <LocalPharmacyOutlinedIcon sx={{ fontSize: 16, color: row.pharmacyName ? "#0284c7" : "#94a3b8" }} />
            <Typography sx={{ fontWeight: 600, fontSize: "0.82rem", color: row.pharmacyName ? "#0f172a" : "#94a3b8" }}>
              {row.pharmacyName || "All / Unassigned"}
            </Typography>
          </Box>
          {row.pharmacyNpi && (
            <Typography variant="caption" sx={{ color: "#64748b", fontSize: "0.7rem", ml: 2.75 }}>
              NPI: {row.pharmacyNpi}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.UPLOADED_AT,
      accessor: "uploadedAt" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => formatUsaDateTime(row.uploadedAt),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.UPLOADED_BY,
      accessor: "uploadedBy" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => row.uploadedBy || "Admin",
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.TOTAL_ROWS,
      accessor: "totalRows" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {row.totalRows}
        </Box>
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.DISCREPANCIES,
      accessor: "totalDiscrepancies" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) =>
        row.totalDiscrepancies > 0 ? (
          <Chip
            size="small"
            color="error"
            icon={<WarningAmberIcon />}
            label={ERX_AUDIT_LABELS.formatDiscrepanciesCount(row.totalDiscrepancies)}
            sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
          />
        ) : (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleOutlinedIcon />}
            label={ERX_AUDIT_LABELS.STATUS_BADGES.MATCH_CLEAN}
            sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
          />
        ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.STATUS,
      accessor: "status" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => (
        <Chip
          size="small"
          color={
            row.status === "Completed"
              ? "success"
              : row.status === "Failed"
              ? "error"
              : "warning"
          }
          label={row.status}
          sx={{ fontWeight: 600, height: 24, fontSize: "0.75rem" }}
        />
      ),
    },
    {
      header: ERX_AUDIT_LABELS.TABLE_HEADERS.ACTIONS,
      accessor: "batchId" as keyof ErxAuditBatchDto,
      render: (row: ErxAuditBatchDto) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MuiButton
            size="small"
            variant="outlined"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/erx-audit/batch/${row.batchId}`);
            }}
            sx={{ textTransform: "none", fontWeight: 600, py: 0.5, fontSize: "0.8rem" }}
            title={ERX_AUDIT_LABELS.ACTIONS.VIEW_AUDIT_TOOLTIP}
          >
            {ERX_AUDIT_LABELS.ACTIONS.VIEW_AUDIT}
          </MuiButton>
          <MuiButton
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDelete(row);
            }}
            sx={{ textTransform: "none", fontWeight: 600, py: 0.5, fontSize: "0.8rem" }}
            title={ERX_AUDIT_LABELS.ACTIONS.DELETE_TOOLTIP}
          >
            {ERX_AUDIT_LABELS.ACTIONS.DELETE}
          </MuiButton>
        </Box>
      ),
    },
  ];

  const handleOpenDelete = (batch: ErxAuditBatchDto) => {
    setDeletingBatch(batch);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBatch) return;
    setIsDeleting(true);
    try {
      const res = await dispatch(deleteErxBatch(deletingBatch.batchId));
      if (deleteErxBatch.fulfilled.match(res)) {
        setDeleteModalOpen(false);
        setDeletingBatch(null);
        if (batches.length === 1 && pageParam.page > 1) {
          setPageParam((prev) => ({ ...prev, page: prev.page - 1 }));
        } else {
          loadData();
        }
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Table Controls */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", sm: "center" },
          mb: 2,
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
          <Box sx={{ width: { xs: "100%", sm: 260, md: 300 }, minWidth: 0 }}>
            <SearchInput
              placeholder={ERX_AUDIT_LABELS.FILTERS.SEARCH_BATCHES_PLACEHOLDER}
              value={searchText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchText(e.target.value);
                setPageParam((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </Box>

          {isSuperAdmin ? (
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220, md: 260 } }}>
              <Select
                value={selectedFilterPharmacyId}
                displayEmpty
                onChange={(e) => {
                  setSelectedFilterPharmacyId(e.target.value);
                  setPageParam((prev) => ({ ...prev, page: 1 }));
                }}
                sx={{
                  height: 36,
                  fontSize: "0.8rem",
                  fontWeight: selectedFilterPharmacyId ? 600 : 400,
                  bgcolor: selectedFilterPharmacyId ? "#f0f9ff" : "#ffffff",
                  color: selectedFilterPharmacyId ? "#0284c7" : "#334155",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: selectedFilterPharmacyId ? "#38bdf8" : "#cbd5e1",
                  },
                  "& .MuiSelect-select": { py: "6px 12px" },
                }}
              >
                <MenuItem value="" sx={{ fontSize: "0.8rem" }}>
                  All Pharmacies {pharmacies.length > 0 ? `(${pharmacies.length})` : ""}
                </MenuItem>
                {pharmacies.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.8rem" }}>
                    {p.name} {p.npi ? `(NPI: ${p.npi})` : ""}
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
                px: 1.5,
                py: 0.75,
                borderRadius: "8px",
                bgcolor: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <LocalPharmacyOutlinedIcon sx={{ fontSize: 18, color: "#16a34a" }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.82rem" }}>
                {pharmacies.find((p) => p.id === tokenPharmacyId)?.name || "My Pharmacy"}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Button
            type="add"
            label={ERX_AUDIT_LABELS.ACTIONS.UPLOAD_AUDIT_FILE}
            onClick={() => {
              setSelectedFile(null);
              setUploadPharmacyId(selectedFilterPharmacyId);
              setUploadModalOpen(true);
            }}
          />
        </Box>
      </Box>

      {/* Batches Table */}
      <Table
        columns={columns}
        data={batches}
        loading={loadingBatches}
      />

      <Box sx={{ width: "100%", overflowX: "auto", pt: 0.5 }}>
        <Pagination
          pageParam={pageParam}
          totalRecords={totalBatches}
          onPageChange={(page) => setPageParam((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPageParam({ page: 1, pageSize })}
        />
      </Box>

      {/* Upload File Modal */}
      <Dialog
        open={uploadModalOpen}
        onClose={() => {
          if (!uploading) setUploadModalOpen(false);
        }}
        maxWidth="sm"
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
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem" }}>
            {ERX_AUDIT_LABELS.ACTIONS.UPLOAD_MODAL_TITLE}
          </Typography>
          <IconButton
            size="small"
            onClick={() => !uploading && setUploadModalOpen(false)}
            aria-label="Close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {ERX_AUDIT_LABELS.MESSAGES.UPLOAD_MODAL_DESC}
          </Typography>

          {/* Pharmacy Selection for Upload */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "#475569", display: "block", mb: 0.5 }}>
              Assign to Pharmacy:
            </Typography>
            {isSuperAdmin ? (
              <FormControl fullWidth size="small">
                <Select
                  value={uploadPharmacyId}
                  displayEmpty
                  onChange={(e) => setUploadPharmacyId(e.target.value)}
                  sx={{
                    fontSize: "0.82rem",
                    bgcolor: "#ffffff",
                    borderRadius: 1.5,
                    "& .MuiSelect-select": { py: "7px 12px" },
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: "0.82rem" }}>
                    <em>All / Unassigned Pharmacy</em>
                  </MenuItem>
                  {pharmacies.map((p) => (
                    <MenuItem key={p.id} value={p.id} sx={{ fontSize: "0.82rem" }}>
                      {p.name} {p.npi ? `(NPI: ${p.npi})` : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Box sx={{ p: 1, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <LocalPharmacyOutlinedIcon sx={{ fontSize: 18, color: "#16a34a" }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.82rem" }}>
                  {pharmacies.find((p) => p.id === tokenPharmacyId)?.name || "Your Pharmacy"}
                </Typography>
              </Box>
            )}
          </Box>

          <Paper
            variant="outlined"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 2,
              borderStyle: "dashed",
              borderWidth: 2,
              borderColor: selectedFile ? "primary.main" : "grey.300",
              bgcolor: selectedFile ? "primary.50" : "grey.50",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: "#f0f7ff",
              },
            }}
          >
            <CloudUploadOutlinedIcon
              sx={{
                fontSize: 44,
                color: selectedFile ? "primary.main" : "text.secondary",
                mb: 1,
              }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
              {selectedFile ? ERX_AUDIT_LABELS.MESSAGES.FILE_SELECTED : ERX_AUDIT_LABELS.MESSAGES.DRAG_DROP_PROMPT}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ERX_AUDIT_LABELS.MESSAGES.BROWSE_COMPUTER_PROMPT}
            </Typography>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".xlsx,.xls,.xlsm,.csv"
              onChange={handleFileChange}
            />
          </Paper>

          {fileError && (
            <Alert severity="error" sx={{ mt: 1.5, py: 0.5 }}>
              {fileError}
            </Alert>
          )}

          {selectedFile && (
            <Paper
              variant="outlined"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                mt: 2,
                borderRadius: 2,
                bgcolor: "#f8fafc",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <DescriptionOutlinedIcon color="success" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </Typography>
                </Box>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Paper>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            type="cancel"
            onClick={() => setUploadModalOpen(false)}
            disabled={uploading}
          />
          <Button
            type="save"
            label={uploading ? ERX_AUDIT_LABELS.ACTIONS.PROCESSING_BATCH : ERX_AUDIT_LABELS.ACTIONS.UPLOAD_AND_COMPARE}
            onClick={handleUploadSubmit}
            disabled={!selectedFile || uploading}
          />
        </DialogActions>
      </Dialog>

      {/* Delete Batch Confirmation Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        title={ERX_AUDIT_LABELS.MESSAGES.DELETE_BATCH_TITLE}
        itemName={
          deletingBatch?.fileName
            ? `"${deletingBatch.fileName}" (${deletingBatch.totalRows} prescriptions)`
            : ERX_AUDIT_LABELS.MESSAGES.DELETE_BATCH_ITEM
        }
        confirming={isDeleting}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalOpen(false);
            setDeletingBatch(null);
          }
        }}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
