import React, { useCallback, useEffect, useState } from "react";
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

export default function BillingErrorsTab() {
  const isPharmacyEmployee = isEmployee();
  const dispatch = useDispatch<AppDispatch>();
  const { list, totalRecords, loading, activeImportType } = useSelector(
    (state: RootState) => state.importError
  );
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  // The importError slice is shared with Purchase, so ignore rows left over
  // from the other import type until this tab's fetch lands.
  const isBillingData = activeImportType === ImportType.Billing;

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      // Own URL param so it doesn't clash with the parent Billing tab's "search".
      paramName: "errorSearch",
      onSearchInputChange: () => {
        setPageParam((prev) =>
          prev.page === 1 ? prev : { ...prev, page: 1 }
        );
      },
    });

  const reloadList = useCallback(() => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Billing,
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam, debouncedSearch]);

  useEffect(() => {
    reloadList();
  }, [reloadList]);

  const handleDelete = async (id: string) => {
    await dispatch(
      deleteImportError({ id, importType: ImportType.Billing })
    ).unwrap();
    reloadList();
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
          data={isBillingData ? list : []}
          importType={ImportType.Billing}
          onDelete={handleDelete}
          showPharmacyName={!isPharmacyEmployee}
          loading={loading || !isBillingData}
        />
      </div>

      <Pagination
        recordLabel="results"
        pageParam={pageParam}
        totalRecords={isBillingData ? totalRecords : 0}
        onPageChange={(page) => setPageParam({ ...pageParam, page })}
        onPageSizeChange={(size) =>
          setPageParam({ ...pageParam, pageSize: size, page: 1 })
        }
      />
    </div>
  );
}
