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
  bulkUpsertBillingFieldMapping,
  fetchBillingFieldMappingByPharmacySoftware,
  fetchBillingFieldMappingList,
  resetBillingFieldMappingList,
  setBillingFieldMappingPageParam,
  uploadBillingFieldMappingCsvPreview,
} from "../../slice/BillingFieldMappingSlice";
import { type BillingFieldMappingUpsertPayload } from "../../dto/billingFieldMappingDto";
import { formatBillingFieldLabelForUi } from "../../utils/formatBillingFieldLabel";
import { generateGuid } from "../../utils/generateGuid";
import { getPharmacySoftwareByIdApi } from "../../service/PharmacySoftwareService";
import {
  billingDraftsFromMappingRows,
  mappingSourceFromRow,
  messageFromApiBody,
  normalizeFieldName,
  showApiError,
} from "../../slice/mappingThunkUtils";
import { useFieldMappingCsvColumns } from "../../hooks/useFieldMappingCsvColumns";
import { sourceValueForDestination } from "../../utils/fieldMappingCsvColumns";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { showError, showSuccess } from "../../component/atoms/ToastHelper";
import {
  buildRequiredFieldErrorMessage,
  findFirstMissingRequiredDestination,
} from "../../utils/fieldMappingValidation";
import { usePharmacySoftwareDisplayName } from "../../hooks/usePharmacySoftwareDisplayName";
import { getPharmacyPossessivePageTitle } from "../../utils/pharmacyPageTitle";
import "./BillingFieldMapping.css";

let bfmListFetchSignature: string | null = null;

const REQUIRED_BILLING_DESTINATIONS = new Set([
  "ndc",
  "quantitybilled",
  "billdate",
  "drugname",
  "primaryinsurancepaidamount",
  "primaryinsurancebinno",
]);

export default function BillingFieldMapping() {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPharmacySoftwareId = searchParams.get("pharmacySoftwareId") || "";
  const querySoftwareName = searchParams.get("softwareName") || "";
  const softwareDisplayName = usePharmacySoftwareDisplayName(
    selectedPharmacySoftwareId,
    querySoftwareName
  );
  const pageTitle = getPharmacyPossessivePageTitle(
    softwareDisplayName,
    "billing field mapping",
    "Billing Field Mapping"
  );

  const { list, totalRecords, listLoading, pageParam } =
    useSelector((state: any) => state.billingfieldmapping);

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
  /** Rows loaded for edit modal (preview or by-pharmacy). */
  const [editModalRows, setEditModalRows] = useState<any[]>([]);

  const rowFieldHelpers = useMemo(() => {
    const destinationFieldFromRow = (row: any): string => {
      const destination =
        typeof row?.destinationFieldName === "string"
          ? row.destinationFieldName.trim()
          : typeof row?.DestinationFieldName === "string"
            ? row.DestinationFieldName.trim()
            : "";
      if (destination) return destination;
      const id = row?.id != null ? String(row.id).trim() : "";
      return id;
    };

    const csvFieldFromRow = (row: any): string => mappingSourceFromRow(row);

    return { destinationFieldFromRow, csvFieldFromRow };
  }, []);

  const fieldMappingRowHelpers = useMemo(
    () => ({
      destinationFromRow: rowFieldHelpers.destinationFieldFromRow,
      csvFieldFromRow: rowFieldHelpers.csvFieldFromRow,
    }),
    [rowFieldHelpers]
  );

  const loadParentById = useCallback(
    (id: string) => getPharmacySoftwareByIdApi(id),
    []
  );

  const fetchMappingsByParent = useCallback(
    async (id: string) => {
      const fetched = await dispatch(
        fetchBillingFieldMappingByPharmacySoftware(id)
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

  const filterBillingDestinationColumns = (cols: string[]) =>
    cols.filter((col: string) => {
      const lowered = col.toLowerCase();
      return (
        lowered !== "id" &&
        lowered !== "createddate" &&
        lowered !== "modifieddate" &&
        lowered !== "pharmacysoftwareid" &&
        lowered !== "insuranceid"
      );
    });

  const hasMappingRecords = useMemo(() => {
    const { destinationFieldFromRow } = rowFieldHelpers;
    return (
      Array.isArray(list) &&
      list.some((row: any) => destinationFieldFromRow(row).length > 0)
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
    parentId: selectedPharmacySoftwareId,
    loadParentById,
    fetchMappingsByParent,
    draftsFromMappingRows: billingDraftsFromMappingRows,
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
      const { destinationFieldFromRow } = rowFieldHelpers;
      const fromList = Array.from(
        new Set(
          list
            .map((row: any) => destinationFieldFromRow(row))
            .filter((name: string) => name.length > 0)
        )
      );
      const fromListFiltered = filterBillingDestinationColumns(fromList);
      if (fromListFiltered.length > 0) return fromListFiltered;
    }

    if (csvPreviewReady) {
      const fromDrafts = filterBillingDestinationColumns(Object.keys(sourceDrafts));
      if (fromDrafts.length > 0) return fromDrafts;
    }

    return [];
  }, [hasMappingRecords, list, rowFieldHelpers, csvPreviewReady, sourceDrafts]);

  const allMappingRows = useMemo(() => {
    if (!selectedPharmacySoftwareId || destinationColumns.length === 0) return [];
    const { destinationFieldFromRow, csvFieldFromRow } = rowFieldHelpers;
    const listByDestination = new Map<string, any>();
    for (const row of Array.isArray(list) ? list : []) {
      const destination = destinationFieldFromRow(row);
      if (destination) listByDestination.set(normalizeFieldName(destination), row);
    }
    return destinationColumns.map((destination) => {
      const existing = listByDestination.get(normalizeFieldName(destination));
      const csvFromRow = existing ? csvFieldFromRow(existing) : "";
      const existingId = existing?.id ?? existing?.Id;
      return {
        id: existingId != null ? String(existingId) : undefined,
        pharmacySoftwareId: selectedPharmacySoftwareId,
        destinationFieldName: destination,
        sourceFieldName: sourceValueForDestination(destination, sourceDrafts, csvFromRow),
      };
    });
  }, [
    selectedPharmacySoftwareId,
    destinationColumns,
    list,
    sourceDrafts,
    rowFieldHelpers,
  ]);

  const mainGridRows = useMemo(() => {
    if (showEditModal || !hasMappingRecords) return [];

    if (destinationColumns.length > 0) {
      return allMappingRows.filter(
        (row) => (row.destinationFieldName ?? "").trim().length > 0
      );
    }

    if (!Array.isArray(list)) return [];
    const { destinationFieldFromRow, csvFieldFromRow } = rowFieldHelpers;
    return list
      .map((row: any) => ({
        ...row,
        destinationFieldName: destinationFieldFromRow(row),
        sourceFieldName: csvFieldFromRow(row),
      }))
      .filter((row) => row.destinationFieldName.length > 0);
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
    const { destinationFieldFromRow, csvFieldFromRow } = rowFieldHelpers;
    return editModalRows.map((row: any) => {
      const destination = destinationFieldFromRow(row);
      const csvFromRow = csvFieldFromRow(row);
      const csv = destination
        ? sourceValueForDestination(destination, sourceDrafts, csvFromRow)
        : csvFromRow;
      return {
        ...row,
        pharmacySoftwareId:
          selectedPharmacySoftwareId || row.pharmacySoftwareId || row.pharmacyId,
        destinationFieldName: destination,
        sourceFieldName: csv,
      };
    });
  }, [
    showEditModal,
    editModalRows,
    sourceDrafts,
    rowFieldHelpers,
    selectedPharmacySoftwareId,
  ]);

  useEffect(() => {
    bfmListFetchSignature = null;
    dispatch(resetBillingFieldMappingList());
    setCsvPreviewReady(false);
    setCsvFile(null);
    setShowDrawer(false);
    setShowEditModal(false);
    setEditModalError("");
    setCsvPreviewRows([]);
    setEditModalRows([]);
    dispatch(setBillingFieldMappingPageParam({ page: 1 }));
  }, [selectedPharmacySoftwareId, dispatch]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchText.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (!selectedPharmacySoftwareId) return;
    const signature = `${selectedPharmacySoftwareId}|${pageParam.page}|${pageParam.pageSize}|${debouncedSearch}`;
    if (bfmListFetchSignature === signature) return;
    bfmListFetchSignature = signature;
    dispatch(
      fetchBillingFieldMappingList({
        pharmacySoftwareId: selectedPharmacySoftwareId,
        page: pageParam.page,
        pageSize: pageParam.pageSize,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [
    dispatch,
    selectedPharmacySoftwareId,
    pageParam.page,
    pageParam.pageSize,
    debouncedSearch,
  ]);

  const renderDestinationCellForGrid = (row: any) =>
    formatBillingFieldLabelForUi(row.destinationFieldName);

  const renderDestinationCellForEdit = (row: any) => {
    const destination = row.destinationFieldName ?? "";
    const isRequired = REQUIRED_BILLING_DESTINATIONS.has(
      normalizeFieldName(destination)
    );
    return (
      <span className="bfm-destination-label">
        {formatBillingFieldLabelForUi(destination)}
        {isRequired ? <span className="bfm-required-star"> *</span> : null}
      </span>
    );
  };

  const columns = [
    {
      header: "Destination Field Name",
      accessor: "destinationFieldName" as const,
      render: renderDestinationCellForGrid,
    },
    {
      header: "Source Field Name",
      accessor: "sourceFieldName" as const,
      render: (row: any) => {
        const value = row.sourceFieldName?.trim?.() ?? row.sourceFieldName ?? "";
        if (!value) return "";
        return formatBillingFieldLabelForUi(value);
      },
    },
  ];

  const editColumns = [
    {
      header: "Destination Field Name",
      accessor: "destinationFieldName" as const,
      render: renderDestinationCellForEdit,
    },
    {
      header: "Source Field Name",
      accessor: "sourceFieldName" as const,
      render: (row: any) => {
        const key = row.destinationFieldName || row.id || "";
        const rawRow =
          editModalRows.find(
            (item: any) => rowFieldHelpers.destinationFieldFromRow(item) === key
          ) ?? row;
        const dbSource = mappingSourceFromRow(rawRow);
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
            triggerClassName="bfm-destination-select"
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
                      getDestination: (item: any) => item.destinationFieldName ?? "",
                      getMappedSource: (item: any) =>
                        sourceValueForDestination(
                          item.destinationFieldName ?? "",
                          next,
                          item.sourceFieldName ?? ""
                        ),
                      isRequired: (destination: string) =>
                        REQUIRED_BILLING_DESTINATIONS.has(
                          normalizeFieldName(destination)
                        ),
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
    Boolean(selectedPharmacySoftwareId) &&
    (hasMappingRecords ||
      listLoading ||
      searchText.trim().length > 0 ||
      totalRecords > 0);

  const editButtonDisabled = !selectedPharmacySoftwareId || !editEnabled;

  const handleUpload = async () => {
    if (!csvFile) return;
    if (!selectedPharmacySoftwareId) {
      showError("Please open this page from a Pharmacy Software row.");
      return;
    }

    setCsvUploading(true);
    try {
      const result = await dispatch(
        uploadBillingFieldMappingCsvPreview({
          file: csvFile,
          pharmacySoftwareId: selectedPharmacySoftwareId,
        })
      ).unwrap();
      const uploadMessage = messageFromApiBody(result.api);
      if (uploadMessage) showSuccess(uploadMessage);
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
        dispatch(setBillingFieldMappingPageParam({ page: 1 }));
        setShowEditModal(true);
      }
    } catch (err) {
      setShowDrawer(false);
      setCsvFile(null);
      showApiError(err, "Billing mapping CSV upload failed");
    } finally {
      setCsvUploading(false);
    }
  };

  const handleSaveMappings = async (closeAfterSave?: boolean) => {
    setEditModalError("");
    const rowsForSave =
      editModalRows.length > 0
        ? editTableRows
        : allMappingRows;

    const firstMissingRequiredDestination = findFirstMissingRequiredDestination(rowsForSave, {
      getDestination: (row: any) => row.destinationFieldName ?? "",
      getMappedSource: (row: any) => row.sourceFieldName ?? "",
      isRequired: (destination: string) =>
        REQUIRED_BILLING_DESTINATIONS.has(normalizeFieldName(destination)),
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
      .map((row): BillingFieldMappingUpsertPayload | null => {
        const destination = row.destinationFieldName?.trim();
        if (!destination) return null;

        const existingId = row.id;
        const hasDraft = Object.prototype.hasOwnProperty.call(sourceDrafts, destination);
        const csv = (row.sourceFieldName ?? "").trim();

        if (!csv && !existingId && !hasDraft) return null;

        return {
          id: existingId ?? generateGuid(),
          pharmacySoftwareId: selectedPharmacySoftwareId,
          sourceFieldName: csv.length > 0 ? csv : "",
          destinationFieldName: destination,
        };
      })
      .filter(
        (item: BillingFieldMappingUpsertPayload | null): item is BillingFieldMappingUpsertPayload =>
          item !== null
      );

    if (mappings.length === 0) {
      showError("No mapping rows to save.");
      return;
    }

    try {
      const saveResult = await dispatch(bulkUpsertBillingFieldMapping(mappings)).unwrap();
      const saveMessage = messageFromApiBody(saveResult.api);
      if (saveMessage) showSuccess(saveMessage);

      setCsvPreviewReady(false);
      setCsvPreviewRows([]);
      setEditModalRows([]);
      dispatch(setBillingFieldMappingPageParam({ page: 1 }));
      bfmListFetchSignature = null;

      await dispatch(
        fetchBillingFieldMappingList({
            pharmacySoftwareId: selectedPharmacySoftwareId,
          page: 1,
          pageSize: pageParam.pageSize,
          searchText: debouncedSearch || undefined,
        })
      ).unwrap();

      const savedDrafts: Record<string, string> = {};
      for (const mapping of mappings) {
        const destination = mapping.destinationFieldName?.trim();
        if (destination) {
          savedDrafts[destination] = mapping.sourceFieldName?.trim() ?? "";
        }
      }

      await refreshCsvColumnsFromServer(selectedPharmacySoftwareId, {
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
    } catch (err) {
      const message = messageFromApiBody(err);
      if (message) showError(message);
    }
  };

  const handleOpenEditModal = async () => {
    if (!editEnabled) return;
    if (!selectedPharmacySoftwareId) return;

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
        const loaded = await loadEditModalServerData(selectedPharmacySoftwareId);
        if (!loaded || loaded.rows.length === 0) {
          showError("No billing field mapping rows to edit.");
          return;
        }
        setEditModalRows(loaded.rows);
        applyMappingRowsToFormState(loaded.rows, loaded.headerBase, loaded.drafts);
        setEditModalError("");
      }

      dispatch(setBillingFieldMappingPageParam({ page: 1 }));
      setShowEditModal(true);
    } catch (err) {
      const message = messageFromApiBody(err);
      if (message) showError(message);
    } finally {
      setEditModalLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/primerx");
  };

  return (
    <div className="page-shell bfm-page">
      <div className="card page-card">
        <div className="bfm-top-toolbar">
          <Button type="back" onClick={handleBack} />
        </div>

        <PageCardHeader
          icon={<AccountTreeOutlinedIcon />}
          title={pageTitle}
          subtitle="Map pharmacy software CSV columns to RxIntel fields."
          actions={
            <div className="bfm-header-actions">
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
                placeholder="Search Billing Field Mapping..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (pageParam.page !== 1) {
                    dispatch(setBillingFieldMappingPageParam({ page: 1 }));
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
                  dispatch(setBillingFieldMappingPageParam({ page }));
                }}
                onPageSizeChange={(size) => {
                  dispatch(setBillingFieldMappingPageParam({ pageSize: size, page: 1 }));
                }}
              />
            )}
          </>
        )}
      </div>

      <CommonModal
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        overlayClassName="bfm-modal-overlay"
        contentClassName="bfm-modal-form"
      >
        <div className="bfm-modal-header">
          <h3>Upload Billing Mapping File</h3>
        </div>

        <div className="bfm-modal-body">
          <div className="bfm-upload-group">
            <label htmlFor="bfmCsvUpload" className="bfm-upload-label">
              Upload File (.csv, .xlsx, .xls)
            </label>
            <input
              id="bfmCsvUpload"
              className="bfm-upload-input"
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.xlsm"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            />
            {csvFile && <span className="bfm-upload-file-name">{csvFile.name}</span>}
          </div>
        </div>

        <div className="bfm-modal-actions">
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
        overlayClassName="bfm-modal-overlay"
        contentClassName="bfm-modal-form bfm-modal-form--edit"
      >
        <div className="bfm-modal-header">
          <h2 className="common-header">Edit Billing Field Mapping</h2>
        </div>

        <div className="bfm-modal-body bfm-modal-body--edit-scroll">
          {editModalLoading ? (
            <p className="bfm-edit-loading">Loading mappings...</p>
          ) : (
            <Table
              columns={editColumns}
              data={editTableRows}
              serialNumberOffset={0}
            />
          )}
        </div>

        <div className="bfm-edit-footer">
          <div className="bfm-modal-actions">
            {editModalError ? (
              <p className="bfm-edit-error-message" role="alert">
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
