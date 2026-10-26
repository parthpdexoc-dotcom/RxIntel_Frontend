import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import DeleteConfirmModal from "../../component/molecules/DeleteConfirmModal";
import { Box, Button as MuiButton } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import { formatDisplayDateTime } from "../../utils/formatDisplayDate";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import type { AppDispatch, RootState } from "../../app/store";
import { ImportType } from "../../enums/ImportType";
import {
  deleteImportError,
  fetchImportErrors,
} from "../../slice/ImportErrorSlice";
import type { ImportErrorFileDto } from "../../dto/importErrorDto";
import "./PurchaseBatches.css";

function totalRowCount(file: ImportErrorFileDto): number {
  return (file.totalImportedRows ?? 0) + (file.failedRowCount ?? 0);
}

export default function PurchaseBatchList() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading, totalRecords, activeImportType } = useSelector(
    (state: RootState) => state.importError
  );

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<ImportErrorFileDto | null>(
    null
  );

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      paramName: "batchSearch",
      onSearchInputChange: () => {
        setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
      },
    });

  const reload = useCallback(() => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Purchase,
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam.page, pageParam.pageSize, debouncedSearch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const batches = useMemo(() => {
    if (activeImportType !== ImportType.Purchase) return [];
    return list;
  }, [list, activeImportType]);

  const columns = [
    {
      header: "File Name",
      accessor: "fileName" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 600 }}>
          <DescriptionOutlinedIcon color="success" sx={{ fontSize: 20 }} />
          <span>{row.fileName}</span>
        </Box>
      ),
    },
    {
      header: "Uploaded At",
      accessor: "createdDate" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => formatDisplayDateTime(row.createdDate),
    },
    {
      header: "Uploaded By",
      accessor: "uploadedBy" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => row.uploadedBy || "—",
    },
    {
      header: "Total Rows",
      accessor: "totalImportedRows" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {totalRowCount(row).toLocaleString()}
        </Box>
      ),
    },
    {
      header: "Failed Rows",
      accessor: "failedRowCount" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => {
        const failed = row.failedRowCount ?? 0;
        return (
          <Box
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: failed > 0 ? "error.main" : "text.primary",
            }}
          >
            {failed.toLocaleString()}
          </Box>
        );
      },
    },
    {
      header: "Actions",
      accessor: "id" as keyof ImportErrorFileDto,
      render: (row: ImportErrorFileDto) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <MuiButton
            size="small"
            variant="outlined"
            color="success"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/purchase/batch/${row.id}`, {
                state: {
                  fileName: row.fileName,
                  failedRowCount: row.failedRowCount,
                },
              });
            }}
            sx={{ textTransform: "none", fontWeight: 600, py: 0.5, fontSize: "0.8rem" }}
          >
            View Purchase
          </MuiButton>
          <MuiButton
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlinedIcon />}
            onClick={(e) => {
              e.stopPropagation();
              setDeletingBatch(row);
              setDeleteModalOpen(true);
            }}
            sx={{ textTransform: "none", fontWeight: 600, py: 0.5, fontSize: "0.8rem" }}
          >
            Delete
          </MuiButton>
        </Box>
      ),
    },
  ];

  return (
    <div className="purchase-batches">
      <div className="card-filters page-card-filters">
        <SearchInput
          placeholder="Search batches by file name or uploader..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <Table columns={columns} data={batches} loading={loading} />

      <Box sx={{ width: "100%", overflowX: "auto", pt: 0.5 }}>
        <Pagination
          pageParam={pageParam}
          totalRecords={totalRecords || batches.length}
          onPageChange={(page) => setPageParam((prev) => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPageParam({ page: 1, pageSize })}
        />
      </Box>

      <DeleteConfirmModal
        open={deleteModalOpen}
        title="Delete purchase batch?"
        itemName={deletingBatch?.fileName ?? "this batch"}
        detail={
          deletingBatch
            ? `This removes the batch record, all validation error messages, and ${(deletingBatch.totalImportedRows ?? 0).toLocaleString()} imported purchase row(s) linked to this file.`
            : undefined
        }
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingBatch(null);
        }}
        onConfirm={async () => {
          if (deletingBatch) {
            await dispatch(
              deleteImportError({
                id: deletingBatch.id,
                importType: ImportType.Purchase,
              })
            ).unwrap();
            reload();
          }
          setDeleteModalOpen(false);
          setDeletingBatch(null);
        }}
      />
    </div>
  );
}
