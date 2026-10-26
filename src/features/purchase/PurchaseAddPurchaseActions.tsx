import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../component/atoms/Button";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import FormField from "../../component/molecules/FormField";
import PurchaseManualEntryModal from "./PurchaseManualEntryModal";
import { toFormInput } from "../../dto/purchaseDto";
import { fetchPharmacy, fetchPharmacyById } from "../../slice/PharmacySlice";
import { fetchWholesaler } from "../../slice/WholesalerSlice";
import { getPharmacyWholesalerApi } from "../../service/PharmacyWholesalerService";
import type { WholesalerDto } from "../../dto/wholesalerDto";
import {
  mapPharmacyWholesalerLinksToWholesalerOptions,
  parsePharmacyWholesalerPagedResponse,
} from "../../dto/pharmacyWholesalerDto";
import type { AppDispatch, RootState } from "../../app/store";
import { getPharmacyId, isEmployee } from "../../component/auth/authUtils";
import { bulkUpsertPurchase } from "../../slice/PurchaseSlice";
import { fetchImportErrors } from "../../slice/ImportErrorSlice";
import { ImportType } from "../../enums/ImportType";
import { showError } from "../../component/atoms/ToastHelper";
import FormValidation from "../../hooks/FormValidation";
import { buildRequiredFieldMessage } from "../../utils/formFieldLabels";
import { useActionMessage } from "../../hooks/useActionMessage";

const CSV_UPLOAD_FORM_RULES = {
  pharmacyId: { required: true },
  wholesalerId: { required: true },
};

export default function PurchaseAddPurchaseActions() {
  const dispatch = useDispatch<AppDispatch>();
  const { list: pharmacyList } = useSelector((state: RootState) => state.pharmacy);
  const { list: wholesalerList } = useSelector((state: RootState) => state.wholesaler);
  const employeePharmacyId = getPharmacyId();
  const isPharmacyEmployee = isEmployee();

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<File | null>(null);
  const [uploadPharmacyId, setUploadPharmacyId] = useState("");
  const [uploadWholesalerId, setUploadWholesalerId] = useState("");
  const [linkedWholesalerOptions, setLinkedWholesalerOptions] = useState<WholesalerDto[]>([]);
  const [uploading, setUploading] = useState(false);

  const { validate, errors, clearErrors, setFieldErrors } = FormValidation<
    { pharmacyId?: string; wholesalerId?: string }
  >({}, CSV_UPLOAD_FORM_RULES);
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();

  useEffect(() => {
    if (!showAddDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        addDropdownRef.current &&
        !addDropdownRef.current.contains(e.target as Node)
      ) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showAddDropdown]);

  useEffect(() => {
    if (!uploadModalOpen) return;
    dispatch(fetchWholesaler({ page: 1, pageSize: 500 }));
    if (!isPharmacyEmployee) {
      dispatch(fetchPharmacy({ page: 1, pageSize: 500 }));
    } else if (employeePharmacyId) {
      setUploadPharmacyId(employeePharmacyId);
      const alreadyLoaded = pharmacyList.some(
        (item) => String(item.id) === String(employeePharmacyId)
      );
      if (!alreadyLoaded) {
        dispatch(fetchPharmacyById(employeePharmacyId));
      }
    }
  }, [
    uploadModalOpen,
    dispatch,
    isPharmacyEmployee,
    employeePharmacyId,
    pharmacyList,
  ]);

  const resolvedPharmacyId = isPharmacyEmployee ? employeePharmacyId : uploadPharmacyId;

  useEffect(() => {
    if (!resolvedPharmacyId) {
      setLinkedWholesalerOptions([]);
      return;
    }
    let cancelled = false;
    getPharmacyWholesalerApi({
      page: 1,
      pageSize: 500,
      pharmacyId: resolvedPharmacyId,
    })
      .then((res) => {
        if (cancelled) return;
        const parsed = parsePharmacyWholesalerPagedResponse(res.data);
        const options = mapPharmacyWholesalerLinksToWholesalerOptions(
          parsed.data,
          wholesalerList
        );
        setLinkedWholesalerOptions(options);
      })
      .catch(() => {
        if (!cancelled) setLinkedWholesalerOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedPharmacyId, wholesalerList]);

  const purchaseWholesalerOptions = useMemo((): WholesalerDto[] => {
    if (!resolvedPharmacyId) return wholesalerList;
    return linkedWholesalerOptions;
  }, [resolvedPharmacyId, linkedWholesalerOptions, wholesalerList]);

  const reloadBatches = () => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Purchase,
        page: 1,
        pageSize: 50,
      })
    );
  };

  const clearCsvFileSelection = () => {
    csvFileRef.current = null;
    if (csvFileInputRef.current) csvFileInputRef.current.value = "";
  };

  const openCsvModal = () => {
    setShowAddDropdown(false);
    clearCsvFileSelection();
    clearActionMessage();
    clearErrors();
    setUploadPharmacyId(
      isPharmacyEmployee && employeePharmacyId ? employeePharmacyId : ""
    );
    setUploadWholesalerId("");
    setUploadModalOpen(true);
  };

  const handleCloseCsvModal = () => {
    if (uploading) return;
    clearCsvFileSelection();
    clearActionMessage();
    clearErrors();
    setUploadModalOpen(false);
  };

  const handleCsvReset = () => {
    setUploadPharmacyId(
      isPharmacyEmployee && employeePharmacyId ? employeePharmacyId : ""
    );
    setUploadWholesalerId("");
    clearCsvFileSelection();
    clearActionMessage();
    clearErrors();
  };

  const handlePharmacyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUploadPharmacyId(e.target.value);
    setUploadWholesalerId("");
    setFieldErrors({ pharmacyId: "", wholesalerId: "" });
    clearCsvFileSelection();
  };

  const handleWholesalerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUploadWholesalerId(e.target.value);
    setFieldErrors({ wholesalerId: "" });
    clearCsvFileSelection();
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    csvFileRef.current = file;
    clearActionMessage();

    if (!file) return;

    const hasRequiredPharmacy = isPharmacyEmployee
      ? !!employeePharmacyId
      : !!uploadPharmacyId;

    if (!hasRequiredPharmacy) {
      showError(
        isPharmacyEmployee
          ? "Pharmacy is not configured for your account."
          : "Please select Pharmacy before uploading CSV."
      );
      clearCsvFileSelection();
      return;
    }

    if (!uploadWholesalerId) {
      showError("Please select Wholesaler before uploading CSV.");
      clearCsvFileSelection();
    }
  };

  const handleCsvSave = async () => {
    const resolvedPhId = isPharmacyEmployee ? employeePharmacyId : uploadPharmacyId;

    const fieldErrors: Record<string, string> = {};
    if (!isPharmacyEmployee && !toFormInput(resolvedPhId)) {
      fieldErrors.pharmacyId = buildRequiredFieldMessage("pharmacyId");
    }
    if (!toFormInput(uploadWholesalerId)) {
      fieldErrors.wholesalerId = buildRequiredFieldMessage("wholesalerId");
    }

    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(fieldErrors);
      return;
    }

    if (!isPharmacyEmployee) {
      const isValid = validate({
        pharmacyId: toFormInput(resolvedPhId),
        wholesalerId: toFormInput(uploadWholesalerId),
      });
      if (!isValid) return;
    }

    if (!csvFileRef.current) {
      showActionMessage("Please upload a purchase file (.csv, .xlsx, .xls).");
      return;
    }

    setUploading(true);
    try {
      await dispatch(
        bulkUpsertPurchase({
          file: csvFileRef.current,
          pharmacyId: String(resolvedPhId),
          wholesalerId: String(uploadWholesalerId),
        })
      ).unwrap();
      reloadBatches();
      handleCloseCsvModal();
    } catch {
      handleCloseCsvModal();
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="purchase-add-dropdown-wrap" ref={addDropdownRef}>
        <Button
          type="add"
          label="+ Add Purchase"
          onClick={() => setShowAddDropdown((v) => !v)}
        />
        {showAddDropdown && (
          <div className="purchase-add-dropdown" role="menu">
            <button
              type="button"
              className="purchase-add-dropdown-item"
              role="menuitem"
              onClick={openCsvModal}
            >
              Upload CSV
            </button>
            <button
              type="button"
              className="purchase-add-dropdown-item"
              role="menuitem"
              onClick={() => {
                setShowAddDropdown(false);
                setShowManualModal(true);
              }}
            >
              Add Purchase Data
            </button>
          </div>
        )}
      </div>

      <CommonModal
        open={uploadModalOpen}
        onClose={handleCloseCsvModal}
        overlayClassName="purchase-modal-overlay"
        contentClassName="purchase-modal-form"
      >
        <div className="purchase-modal-header">
          <h3>Add Purchase</h3>
        </div>

        <div className="purchase-modal-body">
          <div
            className={
              isPharmacyEmployee ? "purchase-grid-2" : "purchase-grid-3"
            }
          >
            {!isPharmacyEmployee && (
              <FormField
                label="Pharmacy Name"
                name="pharmacyId"
                type="select"
                value={uploadPharmacyId}
                onChange={handlePharmacyChange}
                error={errors.pharmacyId}
                required
                options={pharmacyList}
                optionLabel="businessTradeName"
                optionValue="id"
              />
            )}

            <FormField
              label="Wholesaler Name"
              name="wholesalerId"
              type="select"
              value={uploadWholesalerId}
              onChange={handleWholesalerChange}
              error={errors.wholesalerId}
              required
              options={purchaseWholesalerOptions}
              optionLabel="wholesalerName"
              optionValue="id"
            />

            <div className="form-field purchase-csv-upload-cell">
              <label
                htmlFor="purchaseBatchCsvUpload"
                className="purchase-csv-upload-label"
              >
                Upload Purchase File (.csv, .xlsx, .xls)
              </label>
              <input
                ref={csvFileInputRef}
                id="purchaseBatchCsvUpload"
                className="purchase-csv-upload-input"
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.xlsm"
                disabled={uploading}
                onChange={handleCsvFileChange}
              />
            </div>
          </div>
        </div>

        <div className="purchase-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="purchase-modal-actions-buttons">
            <Button
              type="cancel"
              onClick={handleCloseCsvModal}
              disabled={uploading}
            />
            <Button type="reset" onClick={handleCsvReset} disabled={uploading} />
            <Button
              type="save"
              onClick={() => void handleCsvSave()}
              disabled={uploading}
            />
          </div>
        </div>
      </CommonModal>

      <PurchaseManualEntryModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={reloadBatches}
      />
    </>
  );
}
