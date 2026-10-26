import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import Button from "../../component/atoms/Button";
import CommonModal from "../../component/atoms/CommonModal";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconButton, Alert } from "@mui/material";
import PurchaseBatchErrorsTab from "./PurchaseBatchErrorsTab";
import {
  formatDisplayDate,
  DISPLAY_DATE_FORMAT,
} from "../../utils/formatDisplayDate";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import type { AppDispatch, RootState } from "../../app/store";
import { ImportType } from "../../enums/ImportType";
import { fetchImportErrors } from "../../slice/ImportErrorSlice";
import {
  deletePurchase,
  fetchPurchase,
  upsertPurchase,
} from "../../slice/PurchaseSlice";
import { fetchWholesaler } from "../../slice/WholesalerSlice";
import { fetchPharmacy } from "../../slice/PharmacySlice";
import type { PurchaseDto } from "../../dto/purchaseDto";
import { EMPTY_PURCHASE, toFormInput } from "../../dto/purchaseDto";
import { showError } from "../../component/atoms/ToastHelper";
import {
  getInvoiceNumberValidationMessage,
  getNdcValidationMessage,
  getPackageSizeValidationMessage,
  getQuantityPurchasedValidationMessage,
  sanitizeDecimalQuantityInput,
} from "../../utils/purchaseValidation";
import { getTransactionDateValidationMessage } from "../../utils/pharmacyValidation";
import "./PurchaseBatches.css";

type BatchRouteState = {
  fileName?: string;
  failedRowCount?: number;
};

export default function PurchaseBatchDetail() {
  const { batchId = "" } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = useMemo(() => (location.state ?? {}) as BatchRouteState, [location.state]);
  const dispatch = useDispatch<AppDispatch>();

  const { list: importFiles, activeImportType } = useSelector(
    (state: RootState) => state.importError
  );
  const { list, loading, totalRecords } = useSelector(
    (state: RootState) => state.purchase
  );
  const wholesalerList = useSelector(
    (state: RootState) => state.wholesaler.list ?? []
  );
  const pharmacyList = useSelector(
    (state: RootState) => state.pharmacy.list ?? []
  );

  const batchFile = useMemo(() => {
    if (activeImportType === ImportType.Purchase) {
      const match = importFiles.find((f) => f.id === batchId);
      if (match) return match;
    }
    if (routeState.fileName) {
      return {
        id: batchId,
        fileName: routeState.fileName,
        failedRowCount: routeState.failedRowCount ?? 0,
        createdDate: "",
      };
    }
    return null;
  }, [importFiles, activeImportType, batchId, routeState]);

  const [activeTab, setActiveTab] = useState<"purchase" | "errors">("purchase");
  const [errorsTabBadgeDismissed, setErrorsTabBadgeDismissed] = useState(false);
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });

  const errorTabCount = batchFile?.failedRowCount ?? routeState.failedRowCount ?? 0;
  const showErrorsTabBadge =
    !errorsTabBadgeDismissed && errorTabCount > 0;
  const fileName = batchFile?.fileName ?? routeState.fileName ?? "this file";
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<PurchaseDto>(EMPTY_PURCHASE);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      paramName: "purchaseSearch",
      onSearchInputChange: () => {
        setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
      },
    });

  const isEditMode = Boolean(form.id);

  useEffect(() => {
    setActiveTab("purchase");
    setErrorsTabBadgeDismissed(false);
  }, [batchId]);

  useEffect(() => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Purchase,
        page: 1,
        pageSize: 200,
      })
    );
    dispatch(fetchWholesaler({ page: 1, pageSize: 500 }));
    dispatch(fetchPharmacy({ page: 1, pageSize: 500 }));
  }, [dispatch]);

  const reloadPurchase = useCallback(() => {
    if (!batchId) return;
    dispatch(
      fetchPurchase({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        importErrorFileId: batchId,
      })
    );
  }, [dispatch, batchId, pageParam, debouncedSearch]);

  useEffect(() => {
    reloadPurchase();
  }, [reloadPurchase]);

  const pharmacyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pharmacyList) {
      if (p.id != null) {
        map.set(String(p.id), p.businessTradeName ?? "");
      }
    }
    return map;
  }, [pharmacyList]);

  const wholesalerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of wholesalerList) {
      if (w.id != null) {
        map.set(String(w.id), w.wholesalerName ?? "");
      }
    }
    return map;
  }, [wholesalerList]);

  if (!batchId) {
    return (
      <div className="page-shell purchase-page">
        <div className="card page-card">
          <Alert severity="warning">Purchase batch not found.</Alert>
          <Button type="cancel" label="Back to batches" onClick={() => navigate("/purchase")} />
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: "NDC",
      accessor: "ndc" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.ndc ?? "—",
    },
    {
      header: "Description",
      accessor: "description" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.description ?? "—",
    },
    {
      header: "Package Size",
      accessor: "packageSize" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.packageSize ?? "—",
    },
    {
      header: "Quantity Purchased",
      accessor: "quantityPurchased" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.quantityPurchased ?? "—",
    },
    {
      header: "Total Quantity Ordered",
      accessor: "totalQuantityOrdered" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.totalQuantityOrdered ?? "—",
    },
    {
      header: "Invoice Date",
      accessor: "invoiceDate" as keyof PurchaseDto,
      render: (row: PurchaseDto) =>
        row.invoiceDate ? formatDisplayDate(row.invoiceDate) : "—",
    },
    {
      header: "Invoice Number",
      accessor: "invoiceNumber" as keyof PurchaseDto,
      render: (row: PurchaseDto) => row.invoiceNumber ?? "—",
    },
    {
      header: "Wholesaler Name",
      accessor: "wholesalerId" as keyof PurchaseDto,
      render: (row: PurchaseDto) =>
        row.wholesalerId
          ? wholesalerNameById.get(String(row.wholesalerId)) ?? "—"
          : "—",
    },
    {
      header: "Pharmacy Name",
      accessor: "pharmacyId" as keyof PurchaseDto,
      render: (row: PurchaseDto) =>
        row.pharmacyId
          ? pharmacyNameById.get(String(row.pharmacyId)) ?? "—"
          : "—",
    },
  ];

  const handleSave = async () => {
    if (!isEditMode || !form.id) return;
    const errors: Record<string, string> = {};
    const ndcErr = getNdcValidationMessage(toFormInput(form.ndc), true);
    if (ndcErr) errors.ndc = ndcErr;
    const qtyErr = getQuantityPurchasedValidationMessage(toFormInput(form.quantityPurchased), true);
    if (qtyErr) errors.quantityPurchased = qtyErr;
    const pkgErr = getPackageSizeValidationMessage(toFormInput(form.packageSize));
    if (pkgErr) errors.packageSize = pkgErr;
    const invErr = getInvoiceNumberValidationMessage(toFormInput(form.invoiceNumber));
    if (invErr) errors.invoiceNumber = invErr;
    const dateErr = getTransactionDateValidationMessage(form.invoiceDate, "Invoice Date");
    if (dateErr) errors.invoiceDate = dateErr;

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await dispatch(upsertPurchase(form)).unwrap();
      setShowDrawer(false);
      setForm(EMPTY_PURCHASE);
      setEditErrors({});
      reloadPurchase();
    } catch {
      showError("Failed to update purchase record.");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await dispatch(deletePurchase(String(id))).unwrap();
      reloadPurchase();
    } catch {
      showError("Failed to delete purchase record.");
    }
  };

  return (
    <div className="page-shell purchase-page">
      <div className="card page-card">
        <PageCardHeader
          leading={
            <IconButton
              aria-label="Back to purchase batches"
              onClick={() => navigate("/purchase")}
              size="small"
              sx={{ color: "#64748b" }}
            >
              <ArrowBackIcon />
            </IconButton>
          }
          icon={<ShoppingCartOutlinedIcon />}
          title="Purchase"
          subtitle={`Manage and view purchase records for ${fileName} only.`}
        />

        <div className="page-tabs" role="tablist" aria-label="Purchase tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "purchase"}
            className={`page-tab${activeTab === "purchase" ? " page-tab--active" : ""}`}
            onClick={() => setActiveTab("purchase")}
          >
            Purchase
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "errors"}
            className={`page-tab${activeTab === "errors" ? " page-tab--active" : ""}`}
            onClick={() => {
              setActiveTab("errors");
              setErrorsTabBadgeDismissed(true);
            }}
          >
            Purchase Errors
            {showErrorsTabBadge && (
              <span className="page-tab-badge">
                {errorTabCount.toLocaleString()}
              </span>
            )}
          </button>
        </div>

        {activeTab === "purchase" ? (
          <>
            <div className="card-filters page-card-filters">
              <SearchInput
                placeholder="Search Purchase..."
                value={searchText}
                onChange={handleSearchChange}
              />
            </div>
            <div className="page-table-wrap">
              <Table
                columns={columns}
                data={list}
                serialNumberOffset={(pageParam.page - 1) * pageParam.pageSize}
                loading={loading}
                showEdit
                showDelete
                onEdit={(row) => {
                  setForm(row);
                  setEditErrors({});
                  setShowDrawer(true);
                }}
                onDelete={handleDelete}
              />
            </div>
            <Pagination
              pageParam={pageParam}
              totalRecords={totalRecords}
              onPageChange={(page) => setPageParam({ ...pageParam, page })}
              onPageSizeChange={(size) =>
                setPageParam({ pageSize: size, page: 1 })
              }
            />
          </>
        ) : (
          <PurchaseBatchErrorsTab
            batchId={batchId}
            fileName={fileName}
            uploadedAt={batchFile?.createdDate ?? ""}
            onBatchDeleted={() => navigate("/purchase")}
          />
        )}
      </div>

      <CommonModal
        open={showDrawer && isEditMode}
        onClose={() => {
          setShowDrawer(false);
          setForm(EMPTY_PURCHASE);
          setEditErrors({});
        }}
        overlayClassName="purchase-modal-overlay"
        contentClassName="purchase-modal-form purchase-modal-form--wide"
      >
        <div className="purchase-modal-header">
          <h3>Update Purchase</h3>
        </div>
        <div className="purchase-modal-body">
          <div className="purchase-modal-fields-grid">
            <FormField
              label="NDC"
              name="ndc"
              value={toFormInput(form.ndc)}
              onChange={(e) => setForm({ ...form, ndc: e.target.value })}
              error={editErrors.ndc}
              required
            />
            <FormField
              label="Description"
              name="description"
              value={toFormInput(form.description)}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <FormField
              label="Package Size"
              name="packageSize"
              value={toFormInput(form.packageSize)}
              onChange={(e) =>
                setForm({
                  ...form,
                  packageSize: sanitizeDecimalQuantityInput(e.target.value) || null,
                })
              }
              error={editErrors.packageSize}
            />
            <FormField
              label="Quantity Purchased"
              name="quantityPurchased"
              value={toFormInput(form.quantityPurchased)}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantityPurchased: sanitizeDecimalQuantityInput(e.target.value) || null,
                })
              }
              error={editErrors.quantityPurchased}
              required
            />
            <FormDateField
              label="Invoice Date"
              placeholder={DISPLAY_DATE_FORMAT}
              value={toFormInput(form.invoiceDate)}
              onChange={(v) => setForm({ ...form, invoiceDate: v ?? "" })}
              popperInPortal
              error={editErrors.invoiceDate}
            />
            <FormField
              label="Invoice Number"
              name="invoiceNumber"
              value={toFormInput(form.invoiceNumber)}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
              error={editErrors.invoiceNumber}
            />
          </div>
        </div>
        <div className="purchase-modal-actions">
          <div className="purchase-modal-actions-buttons">
            <Button
              type="cancel"
              onClick={() => {
                setShowDrawer(false);
                setForm(EMPTY_PURCHASE);
                setEditErrors({});
              }}
            />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
