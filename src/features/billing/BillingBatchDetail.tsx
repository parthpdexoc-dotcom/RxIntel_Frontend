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
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { IconButton, Alert } from "@mui/material";
import BillingBatchErrorsTab from "./BillingBatchErrorsTab";
import {
  formatDisplayDate,
  DISPLAY_DATE_FORMAT,
} from "../../utils/formatDisplayDate";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import type { AppDispatch, RootState } from "../../app/store";
import { ImportType } from "../../enums/ImportType";
import { fetchImportErrors } from "../../slice/ImportErrorSlice";
import {
  deleteBilling,
  fetchBilling,
  upsertBilling,
} from "../../slice/BillingSlice";
import { fetchInsurance } from "../../slice/InsuranceSlice";
import { fetchPharmacy } from "../../slice/PharmacySlice";
import type { BillingDto } from "../../dto/billingDto";
import { EMPTY_BILLING, toFormInput } from "../../dto/billingDto";
import { showError } from "../../component/atoms/ToastHelper";
import "./BillingBatches.css";

type BatchRouteState = {
  fileName?: string;
  failedRowCount?: number;
};

export default function BillingBatchDetail() {
  const { batchId = "" } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? {}) as BatchRouteState;
  const dispatch = useDispatch<AppDispatch>();

  const { list: importFiles, activeImportType } = useSelector(
    (state: RootState) => state.importError
  );
  const { list, loading, totalRecords } = useSelector(
    (state: RootState) => state.billing
  );
  const insuranceList = useSelector(
    (state: RootState) => state.insurance.list ?? []
  );
  const pharmacyList = useSelector(
    (state: RootState) => state.pharmacy.list ?? []
  );

  const batchFile = useMemo(() => {
    if (activeImportType === ImportType.Billing) {
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

  const [activeTab, setActiveTab] = useState<"billing" | "errors">("billing");
  const [errorsTabBadgeDismissed, setErrorsTabBadgeDismissed] = useState(false);
  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });

  const errorTabCount = batchFile?.failedRowCount ?? routeState.failedRowCount ?? 0;
  const showErrorsTabBadge =
    !errorsTabBadgeDismissed && errorTabCount > 0;
  const fileName = batchFile?.fileName ?? routeState.fileName ?? "this file";
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<BillingDto>(EMPTY_BILLING);

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      paramName: "billingSearch",
      onSearchInputChange: () => {
        setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
      },
    });

  const isEditMode = Boolean(form.id);

  useEffect(() => {
    setActiveTab("billing");
    setErrorsTabBadgeDismissed(false);
  }, [batchId]);

  useEffect(() => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Billing,
        page: 1,
        pageSize: 200,
      })
    );
    dispatch(fetchInsurance({ page: 1, pageSize: 500 }));
    dispatch(fetchPharmacy({ page: 1, pageSize: 500 }));
  }, [dispatch]);

  const reloadBilling = useCallback(() => {
    if (!batchId) return;
    dispatch(
      fetchBilling({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        importErrorFileId: batchId,
      })
    );
  }, [dispatch, batchId, pageParam, debouncedSearch]);

  useEffect(() => {
    reloadBilling();
  }, [reloadBilling]);

  const pharmacyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pharmacyList) {
      if (p.id != null) {
        map.set(String(p.id), p.businessTradeName ?? "");
      }
    }
    return map;
  }, [pharmacyList]);

  const insuranceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const ins of insuranceList) {
      if (ins.id != null) {
        map.set(String(ins.id), ins.insuranceName ?? "");
      }
    }
    return map;
  }, [insuranceList]);

  if (!batchId) {
    return (
      <div className="page-shell billing-page">
        <div className="card page-card">
          <Alert severity="warning">Billing batch not found.</Alert>
          <Button type="cancel" label="Back to batches" onClick={() => navigate("/billing")} />
        </div>
      </div>
    );
  }

  const columns = [
    {
      header: "RX No",
      accessor: "rxno" as keyof BillingDto,
      render: (row: BillingDto) => row.rxno ?? "—",
    },
    { header: "NDC", accessor: "ndc" as keyof BillingDto },
    { header: "Drug Name", accessor: "drugName" as keyof BillingDto },
    { header: "Quantity Billed", accessor: "quantityBilled" as keyof BillingDto },
    {
      header: "Bill Date",
      accessor: "billDate" as keyof BillingDto,
      render: (row: BillingDto) =>
        row.billDate ? formatDisplayDate(row.billDate) : "—",
    },
    {
      header: "Total Ins Paid",
      accessor: "totalInsurancePaidAmount" as keyof BillingDto,
    },
    {
      header: "Pharmacy Name",
      accessor: "pharmacyId" as keyof BillingDto,
      render: (row: BillingDto) =>
        row.pharmacyId
          ? pharmacyNameById.get(String(row.pharmacyId)) ?? "—"
          : "—",
    },
    {
      header: "Primary Insurance",
      accessor: "insuranceId" as keyof BillingDto,
      render: (row: BillingDto) =>
        row.insuranceId
          ? insuranceNameById.get(String(row.insuranceId)) ?? "—"
          : "—",
    },
  ];

  const handleSave = async () => {
    if (!isEditMode || !form.id) return;
    try {
      await dispatch(upsertBilling(form)).unwrap();
      setShowDrawer(false);
      setForm(EMPTY_BILLING);
      reloadBilling();
    } catch {
      showError("Failed to update billing record.");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await dispatch(deleteBilling(String(id))).unwrap();
      reloadBilling();
    } catch {
      showError("Failed to delete billing record.");
    }
  };

  return (
    <div className="page-shell billing-page">
      <div className="card page-card">
        <PageCardHeader
          leading={
            <IconButton
              aria-label="Back to billing batches"
              onClick={() => navigate("/billing")}
              size="small"
              sx={{ color: "#64748b" }}
            >
              <ArrowBackIcon />
            </IconButton>
          }
          icon={<ReceiptLongOutlinedIcon />}
          title="Billing"
          subtitle={`Manage and view billing records for ${fileName} only.`}
        />

        <div className="page-tabs" role="tablist" aria-label="Billing tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "billing"}
            className={`page-tab${activeTab === "billing" ? " page-tab--active" : ""}`}
            onClick={() => setActiveTab("billing")}
          >
            Billing
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
            Billing Errors
            {showErrorsTabBadge && (
              <span className="page-tab-badge">
                {errorTabCount.toLocaleString()}
              </span>
            )}
          </button>
        </div>

        {activeTab === "billing" ? (
          <>
            <div className="card-filters page-card-filters">
              <SearchInput
                placeholder="Search Billing..."
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
          <BillingBatchErrorsTab
            batchId={batchId}
            fileName={fileName}
            uploadedAt={batchFile?.createdDate ?? ""}
            onBatchDeleted={() => navigate("/billing")}
          />
        )}
      </div>

      <CommonModal
        open={showDrawer && isEditMode}
        onClose={() => {
          setShowDrawer(false);
          setForm(EMPTY_BILLING);
        }}
        overlayClassName="billing-modal-overlay"
        contentClassName="billing-modal-form billing-modal-form--wide"
      >
        <div className="billing-modal-header">
          <h3>Update Billing</h3>
        </div>
        <div className="billing-modal-body">
          <div className="billing-modal-fields-grid">
            <FormField
              label="RX No"
              name="rxno"
              value={toFormInput(form.rxno)}
              onChange={(e) => setForm({ ...form, rxno: e.target.value })}
            />
            <FormField
              label="NDC"
              name="ndc"
              value={toFormInput(form.ndc)}
              onChange={(e) => setForm({ ...form, ndc: e.target.value })}
            />
            <FormField
              label="Drug Name"
              name="drugName"
              value={toFormInput(form.drugName)}
              onChange={(e) => setForm({ ...form, drugName: e.target.value })}
            />
            <FormField
              label="Quantity Billed"
              name="quantityBilled"
              value={toFormInput(form.quantityBilled)}
              onChange={(e) =>
                setForm({ ...form, quantityBilled: e.target.value })
              }
            />
            <FormDateField
              label="Bill Date"
              placeholder={DISPLAY_DATE_FORMAT}
              value={toFormInput(form.billDate)}
              onChange={(v) => setForm({ ...form, billDate: v ?? "" })}
              popperInPortal
            />
            <FormField
              label="Total Ins Paid"
              name="totalInsurancePaidAmount"
              value={toFormInput(form.totalInsurancePaidAmount)}
              onChange={(e) =>
                setForm({
                  ...form,
                  totalInsurancePaidAmount: e.target.value,
                })
              }
            />
          </div>
        </div>
        <div className="billing-modal-actions">
          <div className="billing-modal-actions-buttons">
            <Button
              type="cancel"
              onClick={() => {
                setShowDrawer(false);
                setForm(EMPTY_BILLING);
              }}
            />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
