import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import ExpandableImportErrorTable from "../../component/molecules/ExpandableImportErrorTable";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import type { AppDispatch, RootState } from "../../app/store";
import { ImportType } from "../../enums/ImportType";
import {
  deleteImportError,
  fetchImportErrors,
} from "../../slice/ImportErrorSlice";
import { isEmployee } from "../../component/auth/authUtils";

type BillingBatchErrorsTabProps = {
  batchId: string;
  fileName: string;
  uploadedAt: string;
  onBatchDeleted?: () => void;
};

export default function BillingBatchErrorsTab({
  batchId,
  fileName,
  uploadedAt,
  onBatchDeleted,
}: BillingBatchErrorsTabProps) {
  const isPharmacyEmployee = isEmployee();
  const dispatch = useDispatch<AppDispatch>();
  const { list, loading, activeImportType } = useSelector(
    (state: RootState) => state.importError
  );

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      paramName: "errorSearch",
      onSearchInputChange: () => {
        setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
      },
    });

  const reloadApiErrors = useCallback(() => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Billing,
        page: 1,
        pageSize: 500,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, debouncedSearch]);

  useEffect(() => {
    reloadApiErrors();
  }, [reloadApiErrors]);

  const tableData = useMemo(() => {
    if (activeImportType !== ImportType.Billing) return [];
    const byId = list.filter((item) => item.id === batchId);
    if (byId.length > 0) return byId;
    const normalizedFile = fileName.trim().toLowerCase();
    return list.filter(
      (item) => item.fileName.trim().toLowerCase() === normalizedFile
    );
  }, [list, batchId, fileName, activeImportType]);

  const handleDelete = async (id: string) => {
    await dispatch(
      deleteImportError({ id, importType: ImportType.Billing })
    ).unwrap();
    if (id === batchId) {
      onBatchDeleted?.();
      return;
    }
    reloadApiErrors();
  };

  return (
    <div className="billing-errors-panel">
      <div className="card-filters page-card-filters">
        <SearchInput
          placeholder="Search Errors..."
          value={searchText}
          onChange={handleSearchChange}
        />
      </div>

      <div className="page-table-wrap">
        <ExpandableImportErrorTable
          data={tableData}
          importType={ImportType.Billing}
          onDelete={handleDelete}
          showPharmacyName={!isPharmacyEmployee}
          loading={loading}
        />
      </div>

      {tableData.length > 0 && (
        <Pagination
          recordLabel="results"
          pageParam={pageParam}
          totalRecords={tableData.length}
          onPageChange={(page) => setPageParam({ ...pageParam, page })}
          onPageSizeChange={(size) =>
            setPageParam({ pageSize: size, page: 1 })
          }
        />
      )}
    </div>
  );
}
