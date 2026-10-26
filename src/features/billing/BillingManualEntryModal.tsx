import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../component/atoms/Button";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import type { AppDispatch, RootState } from "../../app/store";
import { getPharmacyId, isEmployee } from "../../component/auth/authUtils";
import { upsertBilling } from "../../slice/BillingSlice";
import { fetchPharmacy, fetchPharmacyById } from "../../slice/PharmacySlice";
import { fetchInsurance } from "../../slice/InsuranceSlice";
import { getInsuranceApi } from "../../service/InsuranceService";
import type { InsuranceDto, InsurancePagedResponse } from "../../dto/insuranceDto";
import {
  EMPTY_BILLING,
  enrichBillingWithSecondaryInsuranceId,
  toFormInput,
} from "../../dto/billingDto";
import type { BillingDto } from "../../dto/billingDto";
import FormValidation, { evaluateFormRules } from "../../hooks/FormValidation";
import { buildRequiredFieldMessage } from "../../utils/formFieldLabels";
import { useActionMessage } from "../../hooks/useActionMessage";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { DISPLAY_DATE_FORMAT } from "../../utils/formatDisplayDate";
import {
  BILLING_TYPING_FIELDS,
  BILLING_VALIDATED_FIELDS,
  collectBillingFieldErrors,
  getBillingFieldValidationMessage,
  getBillingTypingValidationMessage,
  sanitizeBinInput,
  sanitizeDecimalQuantityInput,
  sanitizeIntegerInput,
  sanitizeNdcInput,
  type BillingValidatedField,
} from "../../utils/billingValidation";
import { MEDICINE_FORM_LABEL_OPTIONS } from "../../enums/MedicineForm";
import { getTransactionDateValidationMessage } from "../../utils/pharmacyValidation";

const BILLING_FORM_RULES = {
  pharmacyId: { required: true },
  insuranceId: { required: true },
  ndc: { required: true },
  quantityBilled: { required: true },
  billDate: { required: true },
  drugName: { required: true },
  primaryInsurancePaidAmount: { required: true },
  primaryInsuranceBinNo: { required: true },
};

type BillingManualEntryModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function BillingManualEntryModal({
  open,
  onClose,
  onSuccess,
}: BillingManualEntryModalProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { list: pharmacyList } = useSelector((state: RootState) => state.pharmacy);
  const { list: insuranceList } = useSelector((state: RootState) => state.insurance);
  const [insuranceDropdownOptions, setInsuranceDropdownOptions] = useState<InsuranceDto[]>([]);
  const [form, setForm] = useState<BillingDto>(EMPTY_BILLING);
  const [saving, setSaving] = useState(false);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<BillingValidatedField, boolean>>
  >({});

  const isPharmacyEmployee = isEmployee();
  const employeePharmacyId = getPharmacyId();

  const withEmployeePharmacy = useCallback(
    (billing: BillingDto): BillingDto =>
      isPharmacyEmployee && employeePharmacyId
        ? { ...billing, pharmacyId: employeePharmacyId }
        : billing,
    [isPharmacyEmployee, employeePharmacyId]
  );

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation<Partial<BillingDto>>({}, BILLING_FORM_RULES);
  const { actionMessage, clearActionMessage, showActionMessage } = useActionMessage();

  useEffect(() => {
    if (!open) return;
    dispatch(fetchInsurance({ page: 1, pageSize: 500 }));
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
  }, [
    open,
    dispatch,
    isPharmacyEmployee,
    employeePharmacyId,
    pharmacyList,
  ]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getInsuranceApi({
          page: 1,
          pageSize: 500,
          uniqueInsuranceNames: true,
        });
        const payload = res.data as InsurancePagedResponse;
        if (!cancelled) {
          setInsuranceDropdownOptions(payload?.data ?? []);
        }
      } catch {
        if (!cancelled) setInsuranceDropdownOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const openInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openInitializedRef.current = false;
      return;
    }
    if (openInitializedRef.current) return;
    openInitializedRef.current = true;
    setForm(withEmployeePharmacy(EMPTY_BILLING));
    setTouchedFields({});
    clearErrors();
    clearActionMessage();
  }, [open, withEmployeePharmacy, clearErrors, clearActionMessage]);

  const insuranceSelectOptions = useMemo(() => {
    const options = [...insuranceDropdownOptions];
    const ensureOptionForId = (id: string | null | undefined) => {
      if (!id) return;
      if (options.some((item) => String(item.id) === String(id))) return;
      const match = insuranceList.find((item) => String(item.id) === String(id));
      if (match) options.push(match);
    };
    ensureOptionForId(form.insuranceId);
    ensureOptionForId(form.secondaryInsuranceId);
    return options.sort((a, b) =>
      (a.insuranceName ?? "").localeCompare(b.insuranceName ?? "", undefined, {
        sensitivity: "base",
      })
    );
  }, [
    insuranceDropdownOptions,
    insuranceList,
    form.insuranceId,
    form.secondaryInsuranceId,
  ]);

  const markFieldTouched = (field: BillingValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: BillingValidatedField,
    nextForm: BillingDto,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!BILLING_TYPING_FIELDS.has(field)) return;
      setFieldErrors({
        [field]:
          getBillingTypingValidationMessage(field, nextForm, options.rawValue) ??
          "",
      });
      return;
    }

    const value = toFormInput(
      nextForm[field as keyof BillingDto] as string | number | null | undefined
    ).trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);
    if (!shouldShow) return;

    const message = getBillingFieldValidationMessage(field, nextForm);
    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }
    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: BillingValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const applyBillDateValidation = (value: string | null) => {
    const message = getTransactionDateValidationMessage(value, "Bill Date", true);
    setFieldErrors({ billDate: message ?? "" });
  };

  const handleBillDateChange = (value: string | null) => {
    clearFieldErrorOnChange("billDate", clearActionMessage);
    setForm((prev) => ({ ...prev, billDate: value }));
    applyBillDateValidation(value);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as BillingValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    const nextValue =
      name === "ndc"
        ? sanitizeNdcInput(value) || null
        : name === "days"
          ? sanitizeIntegerInput(value) || null
          : name === "primaryInsuranceBinNo" || name === "secondaryInsuranceBinNo"
            ? sanitizeBinInput(value) || null
            : name === "packageSize" ||
                name === "quantityBilled" ||
                name === "primaryInsurancePaidAmount" ||
                name === "secondaryInsurancePaidAmount"
              ? sanitizeDecimalQuantityInput(value) || null
              : value === ""
                ? null
                : value;

    let nextForm = { ...form, [name]: nextValue };

    const findInsurance = (id: string) =>
      insuranceList.find((item) => String(item.id) === String(id)) ??
      insuranceSelectOptions.find((item) => String(item.id) === String(id));

    if (name === "insuranceId" && nextValue) {
      const ins = findInsurance(String(nextValue));
      if (ins?.binNumber) {
        nextForm = {
          ...nextForm,
          primaryInsuranceBinNo: ins.binNumber.trim(),
        };
      }
    }
    if (name === "secondaryInsuranceId" && nextValue) {
      const ins = findInsurance(String(nextValue));
      if (ins?.binNumber) {
        nextForm = {
          ...nextForm,
          secondaryInsuranceBinNo: ins.binNumber.trim(),
          secondaryInsurance: ins.insuranceName ?? null,
        };
      }
    }

    setForm(nextForm);

    if (BILLING_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, {
        validateWhileTyping: true,
        rawValue: value,
      });
    }
  };

  const handleReset = () => {
    setForm(withEmployeePharmacy(EMPTY_BILLING));
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleSave = async () => {
    const resolvedPharmacyId =
      isPharmacyEmployee && employeePharmacyId
        ? employeePharmacyId
        : form.pharmacyId;

    clearActionMessage();

    const validateData = {
      pharmacyId: toFormInput(resolvedPharmacyId),
      insuranceId: toFormInput(form.insuranceId),
      ndc: toFormInput(form.ndc),
      quantityBilled: toFormInput(form.quantityBilled),
      billDate: toFormInput(form.billDate),
      drugName: toFormInput(form.drugName),
      primaryInsurancePaidAmount: toFormInput(form.primaryInsurancePaidAmount),
      primaryInsuranceBinNo: toFormInput(form.primaryInsuranceBinNo),
    };

    const fieldErrors = collectBillingFieldErrors(form);
    const billDateError = getTransactionDateValidationMessage(
      form.billDate,
      "Bill Date",
      true
    );
    if (billDateError) fieldErrors.billDate = billDateError;
    const requiredErrors = evaluateFormRules(validateData, BILLING_FORM_RULES);
    const allErrors = { ...requiredErrors, ...fieldErrors };
    setFieldErrors(allErrors);
    setTouchedFields(
      Object.fromEntries(
        BILLING_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<BillingValidatedField, boolean>>
    );
    if (Object.keys(allErrors).length > 0) return;

    const isValid = validate(validateData);
    if (!isValid) return;

    setSaving(true);
    try {
      const payload = enrichBillingWithSecondaryInsuranceId(
        { ...form, pharmacyId: resolvedPharmacyId },
        insuranceList
      );
      await dispatch(upsertBilling(payload)).unwrap();
      onSuccess?.();
      onClose();
    } catch (err) {
      showActionMessage(messageFromApiBody(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <CommonModal
      open={open}
      onClose={handleClose}
      overlayClassName="billing-modal-overlay"
      contentClassName="billing-modal-form billing-modal-form--wide"
    >
      <div className="billing-modal-header">
        <h3>Add Billing Data</h3>
      </div>
      <div className="billing-modal-body">
        <div className="billing-modal-fields-grid">
          {!isPharmacyEmployee && (
            <div className="billing-form-group">
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
          <div className="billing-form-group">
            <FormField
              label="Primary Insurance"
              name="insuranceId"
              type="select"
              value={toFormInput(form.insuranceId)}
              onChange={handleChange}
              error={errors.insuranceId}
              required
              options={insuranceSelectOptions}
              optionLabel="insuranceName"
              optionValue="id"
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="RX No"
              name="rxno"
              value={toFormInput(form.rxno)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("rxno")}
              error={errors.rxno}
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="NDC"
              name="ndc"
              value={toFormInput(form.ndc)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("ndc")}
              error={errors.ndc}
              required
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Drug Name"
              name="drugName"
              value={toFormInput(form.drugName)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("drugName")}
              error={errors.drugName}
              required
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Drug Form"
              name="drugForm"
              type="select"
              value={toFormInput(form.drugForm)}
              onChange={handleChange}
              options={MEDICINE_FORM_LABEL_OPTIONS}
              optionLabel="label"
              optionValue="value"
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Package Size"
              name="packageSize"
              value={toFormInput(form.packageSize)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("packageSize")}
              error={errors.packageSize}
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Quantity Billed"
              name="quantityBilled"
              value={toFormInput(form.quantityBilled)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("quantityBilled")}
              error={errors.quantityBilled}
              required
            />
          </div>
          <div className="billing-form-group">
            <FormDateField
              label="Bill Date"
              placeholder={DISPLAY_DATE_FORMAT}
              value={form.billDate}
              onChange={handleBillDateChange}
              onBlur={() => applyBillDateValidation(form.billDate)}
              error={errors.billDate}
              required
              popperInPortal
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Drug Therapy"
              name="drugTherapy"
              value={toFormInput(form.drugTherapy)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("drugTherapy")}
              error={errors.drugTherapy}
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Days"
              name="days"
              value={toFormInput(form.days)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("days")}
              error={errors.days}
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Primary Insurance Paid Amount"
              name="primaryInsurancePaidAmount"
              value={toFormInput(form.primaryInsurancePaidAmount)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("primaryInsurancePaidAmount")}
              error={errors.primaryInsurancePaidAmount}
              required
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Primary Insurance Bin No"
              name="primaryInsuranceBinNo"
              value={toFormInput(form.primaryInsuranceBinNo)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("primaryInsuranceBinNo")}
              error={errors.primaryInsuranceBinNo}
              required
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Secondary Insurance"
              name="secondaryInsuranceId"
              type="select"
              value={toFormInput(form.secondaryInsuranceId)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("secondaryInsuranceId")}
              error={errors.secondaryInsuranceId}
              options={insuranceSelectOptions}
              optionLabel="insuranceName"
              optionValue="id"
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Secondary Insurance Paid Amount"
              name="secondaryInsurancePaidAmount"
              value={toFormInput(form.secondaryInsurancePaidAmount)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("secondaryInsurancePaidAmount")}
              error={errors.secondaryInsurancePaidAmount}
            />
          </div>
          <div className="billing-form-group">
            <FormField
              label="Secondary Insurance Bin No"
              name="secondaryInsuranceBinNo"
              value={toFormInput(form.secondaryInsuranceBinNo)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("secondaryInsuranceBinNo")}
              error={errors.secondaryInsuranceBinNo}
            />
          </div>
          <div className="billing-grid-spacer" aria-hidden="true" />
        </div>
      </div>
      <div className="billing-modal-actions">
        <ModalActionMessage message={actionMessage} />
        <div className="billing-modal-actions-buttons">
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
