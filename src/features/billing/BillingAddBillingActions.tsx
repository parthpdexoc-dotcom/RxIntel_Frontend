import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../component/atoms/Button";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import FormField from "../../component/molecules/FormField";
import BillingManualEntryModal from "./BillingManualEntryModal";
import { toFormInput } from "../../dto/billingDto";
import { fetchPharmacy, fetchPharmacyById } from "../../slice/PharmacySlice";
import type { AppDispatch, RootState } from "../../app/store";
import { getPharmacyId, isEmployee } from "../../component/auth/authUtils";
import { bulkUpsertBilling } from "../../slice/BillingSlice";
import { fetchImportErrors } from "../../slice/ImportErrorSlice";
import { ImportType } from "../../enums/ImportType";
import { showError } from "../../component/atoms/ToastHelper";
import FormValidation from "../../hooks/FormValidation";
import { buildRequiredFieldMessage } from "../../utils/formFieldLabels";
import { useActionMessage } from "../../hooks/useActionMessage";
const CSV_UPLOAD_FORM_RULES = {
  pharmacyId: { required: true },
};

export default function BillingAddBillingActions() {
  const dispatch = useDispatch<AppDispatch>();
  const { list: pharmacyList } = useSelector((state: RootState) => state.pharmacy);
  const employeePharmacyId = getPharmacyId();
  const isPharmacyEmployee = isEmployee();

  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<File | null>(null);
  const [uploadPharmacyId, setUploadPharmacyId] = useState("");
  const [uploading, setUploading] = useState(false);

  const { validate, errors, clearErrors, setFieldErrors } = FormValidation<
    { pharmacyId?: string }
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

  const reloadBatches = () => {
    dispatch(
      fetchImportErrors({
        importType: ImportType.Billing,
        page: 1,
        pageSize: 50,
      })
    );
  };

  const resolveUploadPharmacyId = (): string | null => {
    if (isPharmacyEmployee) return employeePharmacyId;
    return uploadPharmacyId || null;
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
    clearCsvFileSelection();
    clearActionMessage();
    clearErrors();
  };

  const handlePharmacyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setUploadPharmacyId(e.target.value);
    setFieldErrors({ pharmacyId: "" });
    clearCsvFileSelection();
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    csvFileRef.current = file;
    clearActionMessage();

    if (!file) return;

    const hasRequiredSelections = isPharmacyEmployee
      ? !!employeePharmacyId
      : !!uploadPharmacyId;

    if (!hasRequiredSelections) {
      showError(
        isPharmacyEmployee
          ? "Pharmacy is not configured for your account."
          : "Please select Pharmacy before uploading CSV."
      );
      clearCsvFileSelection();
    }
  };

  const handleCsvSave = async () => {
    const resolvedPharmacyId = resolveUploadPharmacyId();

    if (!isPharmacyEmployee) {
      const fieldErrors: Record<string, string> = {};
      if (!toFormInput(resolvedPharmacyId)) {
        fieldErrors.pharmacyId = buildRequiredFieldMessage("pharmacyId");
      }
      if (Object.keys(fieldErrors).length > 0) {
        setFieldErrors(fieldErrors);
        return;
      }
      const isValid = validate({ pharmacyId: toFormInput(resolvedPharmacyId) });
      if (!isValid) return;
    } else if (!resolvedPharmacyId) {
      showError("Pharmacy is not configured for your account.");
      return;
    }

    if (!csvFileRef.current) {
      showActionMessage("Please upload a billing file (.csv, .xlsx, .xls).");
      return;
    }

    const pharmacySoftwareId = pharmacyList.find(
      (p) => String(p.id) === String(resolvedPharmacyId)
    )?.pharmacySoftwareId;

    setUploading(true);
    try {
      await dispatch(
        bulkUpsertBilling({
          file: csvFileRef.current,
          pharmacyId: String(resolvedPharmacyId),
          pharmacySoftwareId: pharmacySoftwareId ?? null,
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
      <div className="billing-add-dropdown-wrap" ref={addDropdownRef}>
        <Button
          type="add"
          label="+ Add Billing"
          onClick={() => setShowAddDropdown((v) => !v)}
        />
        {showAddDropdown && (
          <div className="billing-add-dropdown" role="menu">
            <button
              type="button"
              className="billing-add-dropdown-item"
              role="menuitem"
              onClick={openCsvModal}
            >
              Upload CSV
            </button>
            <button
              type="button"
              className="billing-add-dropdown-item"
              role="menuitem"
              onClick={() => {
                setShowAddDropdown(false);
                setShowManualModal(true);
              }}
            >
              Add Billing Data
            </button>
          </div>
        )}
      </div>

      <CommonModal
        open={uploadModalOpen}
        onClose={handleCloseCsvModal}
        overlayClassName="billing-modal-overlay"
        contentClassName="billing-modal-form"
      >
        <div className="billing-modal-header">
          <h3>Add Billing</h3>
        </div>

        <div className="billing-modal-body">
          <div
            className={
              isPharmacyEmployee ? "billing-csv-upload-only" : "billing-grid-2"
            }
          >
            {!isPharmacyEmployee && (
              <FormField
                label="Pharmacy Name"
                name="pharmacyId"
                type="select"
                value={toFormInput(uploadPharmacyId)}
                onChange={handlePharmacyChange}
                error={errors.pharmacyId}
                required
                options={pharmacyList}
                optionLabel="businessTradeName"
                optionValue="id"
              />
            )}
            <div className="form-field billing-csv-upload-cell">
              <label htmlFor="billingCsvUpload" className="billing-csv-upload-label">
                Upload Billing File (.csv, .xlsx, .xls)
              </label>
              <input
                ref={csvFileInputRef}
                id="billingCsvUpload"
                className="billing-csv-upload-input"
                type="file"
                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel,.xlsm"
                disabled={uploading}
                onChange={handleCsvFileChange}
              />
            </div>
          </div>
        </div>

        <div className="billing-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="billing-modal-actions-buttons">
            <Button type="cancel" onClick={handleCloseCsvModal} disabled={uploading} />
            <Button type="reset" onClick={handleCsvReset} disabled={uploading} />
            <Button
              type="save"
              onClick={() => void handleCsvSave()}
              disabled={uploading}
            />
          </div>
        </div>
      </CommonModal>

      <BillingManualEntryModal
        open={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={reloadBatches}
      />
    </>
  );
}
