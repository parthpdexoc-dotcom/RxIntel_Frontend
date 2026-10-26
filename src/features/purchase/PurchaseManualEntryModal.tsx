import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../component/atoms/Button";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import type { AppDispatch, RootState } from "../../app/store";
import { getPharmacyId, isEmployee } from "../../component/auth/authUtils";
import { upsertPurchase } from "../../slice/PurchaseSlice";
import { fetchPharmacy, fetchPharmacyById } from "../../slice/PharmacySlice";
import { fetchWholesaler } from "../../slice/WholesalerSlice";
import { getPharmacyWholesalerApi } from "../../service/PharmacyWholesalerService";
import type { WholesalerDto } from "../../dto/wholesalerDto";
import {
  mapPharmacyWholesalerLinksToWholesalerOptions,
  parsePharmacyWholesalerPagedResponse,
} from "../../dto/pharmacyWholesalerDto";
import {
  EMPTY_PURCHASE,
  toFormInput,
} from "../../dto/purchaseDto";
import type { PurchaseDto } from "../../dto/purchaseDto";
import FormValidation, { evaluateFormRules } from "../../hooks/FormValidation";
import { useActionMessage } from "../../hooks/useActionMessage";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { DISPLAY_DATE_FORMAT } from "../../utils/formatDisplayDate";
import {
  getInvoiceNumberValidationMessage,
  getNdcValidationMessage,
  getPackageSizeValidationMessage,
  getQuantityPurchasedValidationMessage,
  sanitizeDecimalQuantityInput,
} from "../../utils/purchaseValidation";
import { getTransactionDateValidationMessage } from "../../utils/pharmacyValidation";

const PURCHASE_FORM_RULES = {
  pharmacyId: { required: true },
  wholesalerId: { required: true },
  ndc: { required: true },
  quantityPurchased: { required: true },
};

type PurchaseManualEntryModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function PurchaseManualEntryModal({
  open,
  onClose,
  onSuccess,
}: PurchaseManualEntryModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { list: pharmacyList } = useSelector((state: RootState) => state.pharmacy);
  const { list: wholesalerList } = useSelector((state: RootState) => state.wholesaler);
  const [linkedWholesalerOptions, setLinkedWholesalerOptions] = useState<WholesalerDto[]>([]);
  const [form, setForm] = useState<PurchaseDto>(EMPTY_PURCHASE);
  const [saving, setSaving] = useState(false);

  const isPharmacyEmployee = isEmployee();
  const employeePharmacyId = getPharmacyId();
  const activePharmacyId = isPharmacyEmployee
    ? employeePharmacyId ?? form.pharmacyId
    : form.pharmacyId;

  const withEmployeePharmacy = useCallback(
    (purchase: PurchaseDto): PurchaseDto =>
      isPharmacyEmployee && employeePharmacyId
        ? { ...purchase, pharmacyId: employeePharmacyId }
        : purchase,
    [isPharmacyEmployee, employeePharmacyId]
  );

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation<Partial<PurchaseDto>>({}, PURCHASE_FORM_RULES);
  const { actionMessage, clearActionMessage, showActionMessage } = useActionMessage();

  useEffect(() => {
    if (!open) return;
    dispatch(fetchWholesaler({ page: 1, pageSize: 500 }));
    if (!isPharmacyEmployee) {
      dispatch(fetchPharmacy({ page: 1, pageSize: 500 }));
    }
    if (isPharmacyEmployee && employeePharmacyId) {
      const alreadyLoaded = pharmacyList.some(
        (item) => String(item.id) === String(employeePharmacyId)
      );
      if (!alreadyLoaded) {
        dispatch(fetchPharmacyById(employeePharmacyId));
      }
    }
  }, [open, dispatch, isPharmacyEmployee, employeePharmacyId, pharmacyList]);

  const openInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openInitializedRef.current = false;
      return;
    }
    if (openInitializedRef.current) return;
    openInitializedRef.current = true;
    setForm(withEmployeePharmacy(EMPTY_PURCHASE));
    clearErrors();
    clearActionMessage();
  }, [open, withEmployeePharmacy, clearErrors, clearActionMessage]);

  useEffect(() => {
    if (!activePharmacyId) {
      setLinkedWholesalerOptions([]);
      return;
    }
    let cancelled = false;
    getPharmacyWholesalerApi({
      page: 1,
      pageSize: 500,
      pharmacyId: activePharmacyId,
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
  }, [activePharmacyId, wholesalerList]);

  const purchaseWholesalerOptions = useMemo((): WholesalerDto[] => {
    if (!activePharmacyId) return wholesalerList;
    return linkedWholesalerOptions;
  }, [activePharmacyId, linkedWholesalerOptions, wholesalerList]);

  const handleClose = () => {
    if (saving) return;
    openInitializedRef.current = false;
    clearErrors();
    clearActionMessage();
    onClose();
  };

  const handleReset = () => {
    setForm(withEmployeePharmacy(EMPTY_PURCHASE));
    clearErrors();
    clearActionMessage();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    clearFieldErrorOnChange(name, clearActionMessage);

    let nextValue: string | null = value === "" ? null : value;
    if (name === "quantityPurchased" || name === "packageSize") {
      nextValue = sanitizeDecimalQuantityInput(value) || null;
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
      ...(name === "pharmacyId" ? { wholesalerId: null } : {}),
    }));
  };

  const collectFieldErrors = (currentForm: PurchaseDto): Record<string, string> => {
    const fieldErrors: Record<string, string> = {};
    const ndc = getNdcValidationMessage(toFormInput(currentForm.ndc), true);
    if (ndc) fieldErrors.ndc = ndc;
    const pkg = getPackageSizeValidationMessage(toFormInput(currentForm.packageSize));
    if (pkg) fieldErrors.packageSize = pkg;
    const qty = getQuantityPurchasedValidationMessage(toFormInput(currentForm.quantityPurchased), true);
    if (qty) fieldErrors.quantityPurchased = qty;
    const inv = getInvoiceNumberValidationMessage(toFormInput(currentForm.invoiceNumber));
    if (inv) fieldErrors.invoiceNumber = inv;
    const dt = getTransactionDateValidationMessage(currentForm.invoiceDate, "Invoice Date");
    if (dt) fieldErrors.invoiceDate = dt;
    return fieldErrors;
  };

  const handleSave = async () => {
    clearActionMessage();
    const resolvedPharmacyId = isPharmacyEmployee && employeePharmacyId
      ? employeePharmacyId
      : form.pharmacyId;

    const validateData = {
      pharmacyId: toFormInput(resolvedPharmacyId),
      wholesalerId: toFormInput(form.wholesalerId),
      ndc: toFormInput(form.ndc),
      quantityPurchased: toFormInput(form.quantityPurchased),
    };

    const fieldErrors = collectFieldErrors(form);
    const requiredErrors = evaluateFormRules(validateData, PURCHASE_FORM_RULES);
    const allErrors = { ...requiredErrors, ...fieldErrors };
    setFieldErrors(allErrors);

    if (Object.keys(allErrors).length > 0) return;
    const isValid = validate(validateData);
    if (!isValid) return;

    setSaving(true);
    try {
      await dispatch(
        upsertPurchase({ ...form, pharmacyId: resolvedPharmacyId })
      ).unwrap();
      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      const msg = messageFromApiBody(err);
      showActionMessage(msg || "Failed to save purchase record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={handleClose}
      overlayClassName="purchase-modal-overlay"
      contentClassName="purchase-modal-form purchase-modal-form--wide"
    >
      <div className="purchase-modal-header">
        <h3>Add Purchase Data</h3>
      </div>
      <div className="purchase-modal-body">
        <div className="purchase-modal-fields-grid">
          {!isPharmacyEmployee && (
            <div className="purchase-form-group">
              <FormField
                label="Pharmacy Name"
                name="pharmacyId"
                type="select"
                value={toFormInput(form.pharmacyId)}
                onChange={handleChange}
                error={errors.pharmacyId}
                required
                options={pharmacyList}
                optionLabel="businessTradeName"
                optionValue="id"
              />
            </div>
          )}
          <div className="purchase-form-group">
            <FormField
              label="Wholesaler Name"
              name="wholesalerId"
              type="select"
              value={toFormInput(form.wholesalerId)}
              onChange={handleChange}
              error={errors.wholesalerId}
              required
              options={purchaseWholesalerOptions}
              optionLabel="wholesalerName"
              optionValue="id"
            />
          </div>
          <div className="purchase-form-group">
            <FormField
              label="NDC"
              name="ndc"
              value={toFormInput(form.ndc)}
              onChange={handleChange}
              error={errors.ndc}
              required
            />
          </div>
          <div className="purchase-form-group">
            <FormField
              label="Description"
              name="description"
              value={toFormInput(form.description)}
              onChange={handleChange}
            />
          </div>
          <div className="purchase-form-group">
            <FormField
              label="Package Size"
              name="packageSize"
              value={toFormInput(form.packageSize)}
              onChange={handleChange}
              error={errors.packageSize}
            />
          </div>
          <div className="purchase-form-group">
            <FormField
              label="Quantity Purchased"
              name="quantityPurchased"
              value={toFormInput(form.quantityPurchased)}
              onChange={handleChange}
              error={errors.quantityPurchased}
              required
            />
          </div>
          <div className="purchase-form-group">
            <FormDateField
              label="Invoice Date"
              placeholder={DISPLAY_DATE_FORMAT}
              value={form.invoiceDate}
              onChange={(v) => {
                clearFieldErrorOnChange("invoiceDate", clearActionMessage);
                setForm((prev) => ({ ...prev, invoiceDate: v }));
              }}
              error={errors.invoiceDate}
              popperInPortal
            />
          </div>
          <div className="purchase-form-group">
            <FormField
              label="Invoice Number"
              name="invoiceNumber"
              value={toFormInput(form.invoiceNumber)}
              onChange={handleChange}
              error={errors.invoiceNumber}
            />
          </div>
          <div className="purchase-grid-spacer" aria-hidden="true" />
        </div>
      </div>
      <div className="purchase-modal-actions">
        <ModalActionMessage message={actionMessage} />
        <div className="purchase-modal-actions-buttons">
          <Button type="cancel" onClick={handleClose} disabled={saving} />
          <Button type="reset" onClick={handleReset} disabled={saving} />
          <Button
            type="save"
            onClick={() => void handleSave()}
            disabled={saving}
          />
        </div>
      </div>
    </CommonModal>
  );
}
