import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import Button from "../../component/atoms/Button";
import CommonModal from "../../component/atoms/CommonModal";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { CustomSelect } from "../../component/molecules/FormField";
import {
  bulkUpsertWholesalerFieldMapping,
  fetchWholesalerFieldMappingByWholesaler,
  fetchWholesalerFieldMappingList,
  resetWholesalerFieldMappingList,
  setWholesalerFieldMappingPageParam,
  uploadWholesalerFieldMappingCsvPreview,
} from "../../slice/WholesalerFieldMappingSlice";
import { type WholesalerFieldMappingUpsertPayload } from "../../dto/wholesalerFieldMappingDto";
import { formatBillingFieldLabelForUi } from "../../utils/formatBillingFieldLabel";
import { generateGuid } from "../../utils/generateGuid";
import { getWholesalerByIdApi } from "../../service/WholesalerService";
import {
  normalizeFieldName,
  wholesalerDraftsFromMappingRows,
  wholesalerMappingSourceFromRow,
} from "../../slice/mappingThunkUtils";
import { useFieldMappingCsvColumns } from "../../hooks/useFieldMappingCsvColumns";
import { useWholesalerDisplayName } from "../../hooks/useWholesalerDisplayName";
import { getPharmacyPossessivePageTitle } from "../../utils/pharmacyPageTitle";
import { sourceValueForDestination } from "../../utils/fieldMappingCsvColumns";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { showError } from "../../component/atoms/ToastHelper";
import {
  buildRequiredFieldErrorMessage,
  findFirstMissingRequiredDestination,
} from "../../utils/fieldMappingValidation";
import "./WholesalerFieldMapping.css";

let wfmListFetchSignature: string | null = null;

export default function WholesalerFieldMapping() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedWholesalerId = searchParams.get("wholesalerId") || "";
  const queryWholesalerName = searchParams.get("wholesalerName") || "";
  const wholesalerDisplayName = useWholesalerDisplayName(
    selectedWholesalerId,
    queryWholesalerName
  );
  const pageTitle = getPharmacyPossessivePageTitle(
    wholesalerDisplayName,
    "wholesaler field mapping",
    "Wholesaler Field Mapping"
  );

  const { list, totalRecords, listLoading, pageParam } = useSelector(
    (state: any) => state.wholesalerfieldmapping
  );

  const [csvPreviewReady, setCsvPreviewReady] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState("");
  /** Rows from upload-csv-preview; used for edit modal until save. */
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  /** Rows loaded for edit modal (preview or by-wholesaler). */
  const [editModalRows, setEditModalRows] = useState<any[]>([]);

  const rowFieldHelpers = useMemo(() => {
    const destinationColumnFromRow = (row: any): string => {
      const destination =
        typeof row?.destinationColumnName === "string"
          ? row.destinationColumnName.trim()
          : typeof row?.DestinationColumnName === "string"
            ? row.DestinationColumnName.trim()
            : typeof row?.canonicalFieldName === "string"
              ? row.canonicalFieldName.trim()
              : typeof row?.CanonicalFieldName === "string"
                ? row.CanonicalFieldName.trim()
                : "";
      if (destination) return destination;
      const id = row?.id != null ? String(row.id).trim() : "";
      return id;
    };

    const csvFieldFromRow = (row: any): string => wholesalerMappingSourceFromRow(row);

    return { destinationColumnFromRow, csvFieldFromRow };
  }, []);

  const fieldMappingRowHelpers = useMemo(
    () => ({
      destinationFromRow: rowFieldHelpers.destinationColumnFromRow,
      csvFieldFromRow: rowFieldHelpers.csvFieldFromRow,
    }),
    [rowFieldHelpers]
  );

  const loadParentById = useCallback((id: string) => getWholesalerByIdApi(id), []);

  const fetchMappingsByParent = useCallback(
    async (id: string) => {
      const fetched = await dispatch(
        fetchWholesalerFieldMappingByWholesaler(id)
      ).unwrap();
      return {
        rows: Array.isArray(fetched?.rows) ? fetched.rows : [],
        sourceColumns: Array.isArray(fetched?.sourceColumns)
          ? fetched.sourceColumns
          : [],
      };
    },
    [dispatch]
  );

  const filterDestinationColumnNames = (cols: string[]) =>
    cols.filter((col: string) => {
      const lowered = col.toLowerCase();
      return (
        lowered !== "id" &&
        lowered !== "createddate" &&
        lowered !== "modifieddate" &&
        lowered !== "pharmacyid" &&
        lowered !== "wholesalerid"
      );
    });

  const hasMappingRecords = useMemo(() => {
    const { destinationColumnFromRow } = rowFieldHelpers;
    return (
      Array.isArray(list) &&
      list.some((row: any) => destinationColumnFromRow(row).length > 0)
    );
  }, [list, rowFieldHelpers]);

  const {
    csvColumns,
    sourceDrafts,
    setSourceDrafts,
    csvColumnsRef,
    refreshCsvColumnsFromServer,
    applyMappingRowsToFormState,
    setUploadPreviewColumns,
    loadEditModalServerData,
  } = useFieldMappingCsvColumns({
    parentId: selectedWholesalerId,
    loadParentById,
    fetchMappingsByParent,
    draftsFromMappingRows: wholesalerDraftsFromMappingRows,
    rowFieldHelpers: fieldMappingRowHelpers,
    list: Array.isArray(list) ? list : [],
    hasMappingRecords,
    showEditModal,
    csvPreviewReady,
    rowsForHydration: Array.isArray(list) ? list : [],
    hasDestinationColumns: hasMappingRecords || csvPreviewReady,
  });

  const hasAnySourceMapped = useMemo(() => {
    const { csvFieldFromRow } = rowFieldHelpers;
    return (
      Array.isArray(list) &&
      list.some((row: any) => csvFieldFromRow(row).length > 0)
    );
  }, [list, rowFieldHelpers]);

  const editEnabled = hasMappingRecords || hasAnySourceMapped || csvPreviewReady;

  const destinationColumns = useMemo(() => {
    if (hasMappingRecords && Array.isArray(list)) {
      const { destinationColumnFromRow } = rowFieldHelpers;
      const fromList = Array.from(
        new Set(
          list
            .map((row: any) => destinationColumnFromRow(row))
            .filter((name: string) => name.length > 0)
        )
      );
      const fromListFiltered = filterDestinationColumnNames(fromList);
      if (fromListFiltered.length > 0) return fromListFiltered;
    }

    if (csvPreviewReady) {
      const fromDrafts = filterDestinationColumnNames(Object.keys(sourceDrafts));
      if (fromDrafts.length > 0) return fromDrafts;
    }

    return [];
  }, [hasMappingRecords, list, rowFieldHelpers, csvPreviewReady, sourceDrafts]);

  const allMappingRows = useMemo(() => {
    if (!selectedWholesalerId || destinationColumns.length === 0) return [];
    const { destinationColumnFromRow, csvFieldFromRow } = rowFieldHelpers;
    const listByDestination = new Map<string, any>();
    for (const row of Array.isArray(list) ? list : []) {
      const destination = destinationColumnFromRow(row);
      if (destination) listByDestination.set(normalizeFieldName(destination), row);
    }
    return destinationColumns.map((destination) => {
      const existing = listByDestination.get(normalizeFieldName(destination));
      const csvFromRow = existing ? csvFieldFromRow(existing) : "";
      const existingId = existing?.id ?? existing?.Id;
      return {
        id: existingId != null ? String(existingId) : undefined,
        wholesalerId: selectedWholesalerId,
        destinationColumnName: destination,
        sourceColumnName: sourceValueForDestination(destination, sourceDrafts, csvFromRow),
      };
    });
  }, [selectedWholesalerId, destinationColumns, list, sourceDrafts, rowFieldHelpers]);

  const mainGridRows = useMemo(() => {
    if (showEditModal || !hasMappingRecords) return [];

    if (destinationColumns.length > 0) {
      return allMappingRows.filter(
        (row) => (row.destinationColumnName ?? "").trim().length > 0
      );
    }

    if (!Array.isArray(list)) return [];
    const { destinationColumnFromRow, csvFieldFromRow } = rowFieldHelpers;
    return list
      .map((row: any) => ({
        ...row,
        destinationColumnName: destinationColumnFromRow(row),
        sourceColumnName: csvFieldFromRow(row),
      }))
      .filter((row) => row.destinationColumnName.length > 0);
  }, [
    list,
    showEditModal,
    rowFieldHelpers,
    hasMappingRecords,
    destinationColumns,
    allMappingRows,
  ]);

  const editTableRows = useMemo(() => {
    if (!showEditModal || editModalRows.length === 0) return [];
    const { destinationColumnFromRow, csvFieldFromRow } = rowFieldHelpers;
    return editModalRows.map((row: any) => {
      const destination = destinationColumnFromRow(row);
      const csvFromRow = csvFieldFromRow(row);
      const csv = destination
        ? sourceValueForDestination(destination, sourceDrafts, csvFromRow)
        : csvFromRow;
      return {
        ...row,
        wholesalerId: selectedWholesalerId || row.wholesalerId,
        destinationColumnName: destination,
        sourceColumnName: csv,
      };
    });
  }, [showEditModal, editModalRows, sourceDrafts, rowFieldHelpers, selectedWholesalerId]);

  useEffect(() => {
    wfmListFetchSignature = null;
    dispatch(resetWholesalerFieldMappingList());
    setCsvPreviewReady(false);
    setCsvFile(null);
    setShowDrawer(false);
    setShowEditModal(false);
    setEditModalError("");
    setCsvPreviewRows([]);
    setEditModalRows([]);
    dispatch(setWholesalerFieldMappingPageParam({ page: 1 }));
  }, [selectedWholesalerId, dispatch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (!selectedWholesalerId) return;
    const signature = `${selectedWholesalerId}|${pageParam.page}|${pageParam.pageSize}|${debouncedSearch}`;
    if (wfmListFetchSignature === signature) return;
    wfmListFetchSignature = signature;
    dispatch(
      fetchWholesalerFieldMappingList({
        wholesalerId: selectedWholesalerId,
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [
    dispatch,
    selectedWholesalerId,
    pageParam.page,
    pageParam.pageSize,
    debouncedSearch,
  ]);

  const renderDestinationCell = (row: any) =>
    formatBillingFieldLabelForUi(row.destinationColumnName);

  const renderDestinationCellForEdit = (row: any) => {
    const destination = row.destinationColumnName ?? "";
    return (
      <span className="wfm-destination-label">
        {formatBillingFieldLabelForUi(destination)}
        <span className="wfm-required-star"> *</span>
      </span>
    );
  };

  const columns = [
    {
      header: "Destination Column Name",
      accessor: "destinationColumnName" as const,
      render: renderDestinationCell,
    },
    {
      header: "Source Field Name",
      accessor: "sourceColumnName" as const,
      render: (row: any) => {
        const value = row.sourceColumnName?.trim?.() ?? row.sourceColumnName ?? "";
        if (!value) return "";
        return formatBillingFieldLabelForUi(value);
      },
    },
  ];

  const editColumns = [
    {
      header: "Destination Column Name",
      accessor: "destinationColumnName" as const,
      render: renderDestinationCellForEdit,
    },
    {
      header: "Source Field Name",
      accessor: "sourceColumnName" as const,
      render: (row: any) => {
        const key = row.destinationColumnName || row.id || "";
        const rawRow =
          editModalRows.find(
            (item: any) => rowFieldHelpers.destinationColumnFromRow(item) === key
          ) ?? row;
        const dbSource = wholesalerMappingSourceFromRow(rawRow);
        const selectedValue = Object.prototype.hasOwnProperty.call(sourceDrafts, key)
          ? sourceDrafts[key]
          : dbSource;
        const usedValues = Object.entries(sourceDrafts)
          .filter(([destination, value]) => destination !== key && Boolean(value))
          .map(([, value]) => value.toLowerCase());

        let availableOptions = csvColumns.filter(
          (opt) => opt === selectedValue || !usedValues.includes(opt.toLowerCase())
        );

        if (availableOptions.length === 0 && selectedValue) {
          availableOptions = [selectedValue];
        }

        return (
          <CustomSelect
            label="Source Field Name"
            name={key}
            value={selectedValue}
            options={availableOptions.map((opt) => ({
              label: formatBillingFieldLabelForUi(opt),
              value: opt,
            }))}
            optionLabel="label"
            optionValue="value"
            triggerClassName="wfm-source-select"
            onChange={(e) =>
              setSourceDrafts((prev) => {
                const next = {
                  ...prev,
                  [key]: e.target.value,
                };
                if (editModalError) {
                  const pendingRequiredDestination = findFirstMissingRequiredDestination(
                    editTableRows,
                    {
                      getDestination: (item: any) => item.destinationColumnName ?? "",
                      getMappedSource: (item: any) =>
                        sourceValueForDestination(
                          item.destinationColumnName ?? "",
                          next,
                          item.sourceColumnName ?? ""
                        ),
                      isRequired: () => true,
                    }
                  );
                  if (!pendingRequiredDestination) {
                    setEditModalError("");
                  } else {
                    setEditModalError(
                      buildRequiredFieldErrorMessage(
                        pendingRequiredDestination,
                        formatBillingFieldLabelForUi
                      )
                    );
                  }
                }
                return next;
              })
            }
          />
        );
      },
    },
  ];

  const showMainGridSection =
    Boolean(selectedWholesalerId) &&
    (hasMappingRecords ||
      listLoading ||
      searchText.trim().length > 0 ||
      totalRecords > 0);

  const editButtonDisabled = !selectedWholesalerId || !editEnabled;

  const handleUpload = async () => {
    if (!csvFile) return;
    if (!selectedWholesalerId) {
      showError("Please open this page from a Wholesaler row.");
      return;
    }

    setCsvUploading(true);
    try {
      const result = await dispatch(
        uploadWholesalerFieldMappingCsvPreview({
          file: csvFile,
          wholesalerId: selectedWholesalerId,
        })
      ).unwrap();
      const previewRows = Array.isArray(result.rows) ? result.rows : [];
      setCsvPreviewRows(previewRows);
      setUploadPreviewColumns(result.csvColumns);
      setSourceDrafts(result.prefilled);
      setCsvPreviewReady(true);
      setShowDrawer(false);
      setCsvFile(null);

      if (previewRows.length > 0) {
        setEditModalRows(previewRows);
        applyMappingRowsToFormState(previewRows, result.csvColumns);
        dispatch(setWholesalerFieldMappingPageParam({ page: 1 }));
        setShowEditModal(true);
      }
    } catch {
      /* toast from slice */
    } finally {
      setCsvUploading(false);
    }
  };

  const handleSaveMappings = async (closeAfterSave?: boolean) => {
    setEditModalError("");
    const rowsForSave = editModalRows.length > 0 ? editTableRows : allMappingRows;

    const firstMissingRequiredDestination = findFirstMissingRequiredDestination(rowsForSave, {
      getDestination: (row: any) => row.destinationColumnName ?? "",
      getMappedSource: (row: any) => row.sourceColumnName ?? "",
      isRequired: () => true,
    });

    if (firstMissingRequiredDestination) {
      setEditModalError(
        buildRequiredFieldErrorMessage(
          firstMissingRequiredDestination,
          formatBillingFieldLabelForUi
        )
      );
      return;
    }

    const mappings = rowsForSave
      .map((row): WholesalerFieldMappingUpsertPayload | null => {
        const destination = row.destinationColumnName?.trim();
        if (!destination) return null;

        const existingId = row.id;
        const hasDraft = Object.prototype.hasOwnProperty.call(sourceDrafts, destination);
        const csv = (row.sourceColumnName ?? "").trim();

        if (!csv && !existingId && !hasDraft) return null;

        return {
          id: existingId ?? generateGuid(),
          wholesalerId: selectedWholesalerId,
          sourceColumnName: csv.length > 0 ? csv : "",
          destinationColumnName: destination,
        };
      })
      .filter(
        (item: WholesalerFieldMappingUpsertPayload | null): item is WholesalerFieldMappingUpsertPayload =>
          item !== null
      );

    if (mappings.length === 0) {
      showError("No mapping rows to save.");
      return;
    }

    try {
      await dispatch(bulkUpsertWholesalerFieldMapping(mappings)).unwrap();

      setCsvPreviewReady(false);
      setCsvPreviewRows([]);
      setEditModalRows([]);
      dispatch(setWholesalerFieldMappingPageParam({ page: 1 }));
      wfmListFetchSignature = null;

      await dispatch(
        fetchWholesalerFieldMappingList({
          wholesalerId: selectedWholesalerId,
          page: 1,
          pageSize: pageParam.pageSize,
          searchText: debouncedSearch || undefined,
        })
      ).unwrap();

      const savedDrafts: Record<string, string> = {};
      for (const mapping of mappings) {
        const destination = mapping.destinationColumnName?.trim();
        if (destination) {
          savedDrafts[destination] = mapping.sourceColumnName?.trim() ?? "";
        }
      }

      await refreshCsvColumnsFromServer(selectedWholesalerId, {
        drafts: closeAfterSave
          ? savedDrafts
          : { ...sourceDrafts, ...savedDrafts },
      });

      if (closeAfterSave) {
        setSourceDrafts(savedDrafts);
      }

      if (closeAfterSave) {
        setShowEditModal(false);
      }
    } catch {
      /* toast from slice */
    }
  };

  const handleOpenEditModal = async () => {
    if (!editEnabled) return;
    if (!selectedWholesalerId) return;

    setEditModalLoading(true);
    try {
      if (csvPreviewReady && csvPreviewRows.length > 0) {
        setEditModalRows(csvPreviewRows);
        applyMappingRowsToFormState(
          csvPreviewRows,
          csvColumnsRef.current.length > 0 ? csvColumnsRef.current : undefined
        );
        setEditModalError("");
      } else {
        const loaded = await loadEditModalServerData(selectedWholesalerId);
        if (!loaded || loaded.rows.length === 0) {
          showError("No wholesaler field mapping rows to edit.");
          return;
        }
        setEditModalRows(loaded.rows);
        applyMappingRowsToFormState(loaded.rows, loaded.headerBase, loaded.drafts);
        setEditModalError("");
      }

      dispatch(setWholesalerFieldMappingPageParam({ page: 1 }));
      setShowEditModal(true);
    } catch {
      /* toast from slice */
    } finally {
      setEditModalLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/wholesaler");
  };

  return (
    <div className="page-shell wfm-page">
      <div className="card page-card">
        <div className="wfm-top-toolbar">
          <Button type="back" onClick={handleBack} />
        </div>

        <PageCardHeader
          icon={<AccountTreeOutlinedIcon />}
          title={pageTitle}
          subtitle="Map wholesaler CSV columns to RxIntel fields."
          actions={
            <div className="wfm-header-actions">
              <Button
                type="add"
                label={editModalLoading ? "Loading..." : "Edit"}
                onClick={() => void handleOpenEditModal()}
                disabled={editButtonDisabled || editModalLoading}
              />
              <Button
                type="add"
                label="Upload CSV Template"
                onClick={() => setShowDrawer(true)}
              />
            </div>
          }
        />

        {showMainGridSection && (
          <>
            <div className="card-filters page-card-filters">
              <SearchInput
                placeholder="Search Wholesaler Field Mapping..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (pageParam.page !== 1) {
                    dispatch(setWholesalerFieldMappingPageParam({ page: 1 }));
                  }
                }}
              />
            </div>

            <div className="page-table-wrap">
              <Table
                columns={columns}
                data={mainGridRows}
                serialNumberOffset={listPageParamRowOffset(pageParam)}
                loading={listLoading}
                loadingMessage="Loading..."
              />
            </div>

            {!showEditModal && (
              <Pagination
                pageParam={pageParam}
                totalRecords={totalRecords}
                onPageChange={(page) => {
                  dispatch(setWholesalerFieldMappingPageParam({ page }));
                }}
                onPageSizeChange={(size) => {
                  dispatch(setWholesalerFieldMappingPageParam({ pageSize: size, page: 1 }));
                }}
              />
            )}
          </>
        )}
      </div>

      <CommonModal
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        overlayClassName="wfm-modal-overlay"
        contentClassName="wfm-modal-form"
      >
        <div className="wfm-modal-header">
          <h3>Upload Wholesaler Mapping File</h3>
        </div>

        <div className="wfm-modal-body">
          <div className="wfm-upload-group">
            <label htmlFor="wfmCsvUpload" className="wfm-upload-label">
              Upload File (.csv, .xlsx, .xls)
            </label>
            <input
              id="wfmCsvUpload"
              className="wfm-upload-input"
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.xlsm"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            {csvFile && <span className="wfm-upload-file-name">{csvFile.name}</span>}
          </div>
        </div>

        <div className="wfm-modal-actions">
          <Button type="cancel" onClick={() => setShowDrawer(false)} />
          <button
            type="button"
            className="common-btn primary"
            disabled={!csvFile || csvUploading}
            onClick={() => void handleUpload()}
          >
            {csvUploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </CommonModal>

      <CommonModal
        open={showEditModal}
        onClose={() => {
          setEditModalError("");
          setShowEditModal(false);
        }}
        overlayClassName="wfm-modal-overlay"
        contentClassName="wfm-modal-form wfm-modal-form--edit"
      >
        <div className="wfm-modal-header">
          <h2 className="common-header">Edit Wholesaler Field Mapping</h2>
        </div>

        <div className="wfm-modal-body wfm-modal-body--edit-scroll">
          {editModalLoading ? (
            <p className="wfm-edit-loading">Loading mappings...</p>
          ) : (
            <Table
              columns={editColumns}
              data={editTableRows}
              serialNumberOffset={0}
            />
          )}
        </div>

        <div className="wfm-edit-footer">
          <div className="wfm-modal-actions">
            {editModalError ? (
              <p className="wfm-edit-error-message" role="alert">
                {editModalError}
              </p>
            ) : null}
            <Button
              type="cancel"
              onClick={() => {
                setEditModalError("");
                setShowEditModal(false);
              }}
            />
            <Button type="save" onClick={() => void handleSaveMappings(true)} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
