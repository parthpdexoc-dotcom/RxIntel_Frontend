import React, { useState, useEffect, useMemo, useRef } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./Pharmacy.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  getPharmacyId,
  hasPharmacyAdminRole,
  isEmployee,
} from "../../component/auth/authUtils";
import { getPharmacyByIdApi, downloadPharmacyDocument, viewPharmacyDocument } from "../../service/PharmacyService";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  fetchPharmacy,
  addPharmacy,
  deletePharmacy,
} from "../../slice/PharmacySlice";
import { fetchStates } from "../../slice/StateSlice";
import { fetchPharmacySoftware } from "../../slice/PharmacySoftwareSlice";
import FormValidation from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useListModalRoute } from "../../hooks/useListModalRoute";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import type { AppDispatch, RootState } from "../../app/store";
import type { PharmacyDto } from "../../dto/pharmacyDto";
import {
  EMPTY_PHARMACY,
  getPharmacyDisplayName,
  toFormInput,
  toPharmacyFormState,
  toUpsertPayload,
} from "../../dto/pharmacyDto";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import { buildRequiredFieldMessage } from "../../utils/formFieldLabels";
import {
  getAddressValidationMessage,
  getBusinessNameValidationMessage,
  getCityValidationMessage,
  getDigitsOnlyTypingValidationMessage,
  getEmailTypingValidationMessage,
  getEmailValidationMessage,
  getExpirationDateValidationMessage,
  getGlnValidationMessage,
  getPhoneFormatValidationMessage,
  getSoftwareSystemValidationMessage,
  getStateBoardLicenseValidationMessage,
  getZipValidationMessage,
  sanitizeGlnInput,
  sanitizePhoneInput,
  sanitizeStateBoardLicenseInput,
  sanitizeZipInput,
} from "../../utils/pharmacyValidation";
import {
  getDeaValidationMessage,
  getPharmacyDocumentValidationMessage,
  PHARMACY_DOCUMENT_ACCEPT,
  PHARMACY_DOCUMENT_FORMAT_ERROR,
} from "../../utils/validation";
import { getStateLicenseContext } from "../../dto/stateDto";
import {
  buildPharmacySoftwareDropdownOptions,
  isOtherPharmacySoftwareSelection,
  preparePharmacySoftwareForSave,
  resolvePharmacySoftwareFormId,
} from "../../utils/pharmacyBillingSoftware";
import { getStatesWithName } from "../../dto/stateDto";

/** Keeps letter prefix + trailing digits when editing mid-field (pharmacy page only). */
function sanitizePharmacyDeaInput(value: string): string {
  const raw = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  let index = 0;
  let letters = "";

  while (index < raw.length && letters.length < 2 && /[A-Z]/.test(raw[index]!)) {
    letters += raw[index];
    index += 1;
  }

  let digits = "";
  while (index < raw.length && digits.length < 7) {
    if (/\d/.test(raw[index]!)) {
      digits += raw[index];
    }
    index += 1;
  }

  return letters + digits;
}

type UploadFileActionsProps = {
  fileName: string;
  onView: () => void;
  onDownload: () => void;
  onRemove?: () => void;
};

function UploadFileActions({
  fileName,
  onView,
  onDownload,
  onRemove,
}: UploadFileActionsProps) {
  return (
    <div className="upload-file-preview">
      <span className="upload-file-preview__name">{fileName}</span>
      <div className="upload-file-preview__actions">
        <button
          type="button"
          className="upload-file-preview__btn upload-file-preview__btn--view"
          onClick={onView}
          aria-label="View file"
        >
          <VisibilityOutlinedIcon fontSize="inherit" />
        </button>
        <button
          type="button"
          className="upload-file-preview__btn upload-file-preview__btn--download"
          onClick={onDownload}
          aria-label="Download file"
        >
          <DownloadOutlinedIcon fontSize="inherit" />
        </button>
        {onRemove ? (
          <button
            type="button"
            className="upload-file-preview__btn upload-file-preview__btn--remove"
            onClick={onRemove}
            aria-label="Remove file"
          >
            <DeleteOutlineOutlinedIcon fontSize="inherit" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

type PharmacyUploadFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  file?: File | null;
  existingFileName?: string | null;
  onViewExisting?: () => void;
  onDownloadExisting?: () => void;
  onFile: (file: File | null) => void;
};

function PharmacyUploadField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  required,
  file,
  existingFileName,
  onViewExisting,
  onDownloadExisting,
  onFile,
}: PharmacyUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const inputClassName = error ? "error-input" : undefined;

  useEffect(() => {
    if (!file) {
      setLocalFileUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleRemoveFile = () => {
    onFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleViewLocalFile = () => {
    if (!localFileUrl) return;
    window.open(localFileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadLocalFile = () => {
    if (!localFileUrl || !file) return;
    const link = document.createElement("a");
    link.href = localFileUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="form-field pharmacy-upload-field">
      <label>
        {label} {required && <span className="star">*</span>}
      </label>
      <div className="pharmacy-upload-input-wrap">
        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={inputClassName}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={PHARMACY_DOCUMENT_ACCEPT}
          hidden
          onChange={(e) => {
            onFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="pharmacy-upload-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label={`Upload ${label}`}
        >
          <UploadFileIcon fontSize="small" />
        </button>
      </div>
      {error ? <span className="error-text">{error}</span> : null}
      {file && localFileUrl ? (
        <UploadFileActions
          fileName={file.name}
          onView={handleViewLocalFile}
          onDownload={handleDownloadLocalFile}
          onRemove={handleRemoveFile}
        />
      ) : existingFileName && onViewExisting && onDownloadExisting ? (
        <UploadFileActions
          fileName={existingFileName}
          onView={onViewExisting}
          onDownload={onDownloadExisting}
        />
      ) : null}
    </div>
  );
}

const PHARMACY_FORM_RULES = {
  dea: { required: true },
  businessTradeName: { required: true },
  businessLegalName: { required: true },
  zipCode: { required: true },
  city: { required: true },
  email: { required: true },
  stateId: { required: true },
  phoneNumber: { required: true },
  pharmacyAddress: { required: true },
  deaExpirationDate: { required: true },
  bopLicenseExpirationDate: { required: true },
  stateBoardOfPharmacyLicenseNumber: { required: true },
};

const PHARMACY_VALIDATED_FIELDS = [
  "businessLegalName",
  "businessTradeName",
  "dea",
  "deaExpirationDate",
  "stateBoardOfPharmacyLicenseNumber",
  "bopLicenseExpirationDate",
  "email",
  "phoneNumber",
  "fax",
  "pharmacyAddress",
  "streetAddress",
  "globalLocationNumber",
  "city",
  "stateId",
  "zipCode",
  "pharmacyBillingSoftwareName",
  "pharmacyBillingSoftwarePhone",
  "pharmacyBillingSoftwareEmail",
  "npi",
] as const;

/** Fields that show invalid-character errors while typing (not length/format). */
const PHARMACY_TYPING_FIELDS = new Set<PharmacyValidatedField>([
  "businessLegalName",
  "businessTradeName",
  "pharmacyAddress",
  "streetAddress",
  "city",
  "pharmacyBillingSoftwareName",
  "email",
  "pharmacyBillingSoftwareEmail",
  "phoneNumber",
  "fax",
  "zipCode",
  "globalLocationNumber",
  "pharmacyBillingSoftwarePhone",
  "npi",
]);

type PharmacyValidatedField = (typeof PHARMACY_VALIDATED_FIELDS)[number];

type PharmacyValidationContext = {
  form: PharmacyDto;
  stateBoardLicenseFile: File | null;
  stateLicenseContext: ReturnType<typeof getStateLicenseContext>;
};

function getPharmacyFieldValidationMessage(
  field: PharmacyValidatedField,
  { form, stateBoardLicenseFile, stateLicenseContext }: PharmacyValidationContext
): string | null {
  switch (field) {
    case "businessLegalName":
      return getBusinessNameValidationMessage(
        toFormInput(form.businessLegalName),
        true,
        "Business Legal Name"
      );
    case "businessTradeName":
      return getBusinessNameValidationMessage(
        toFormInput(form.businessTradeName),
        true,
        "Business Trade Name (DBA)"
      );
    case "dea": {
      const dea = toFormInput(form.dea);
      if (!dea.trim()) return buildRequiredFieldMessage("dea");
      return getDeaValidationMessage(dea, toFormInput(form.businessTradeName));
    }
    case "deaExpirationDate":
      return getExpirationDateValidationMessage(
        form.deaExpirationDate,
        "DEA Expiration Date",
        true
      );
    case "stateBoardOfPharmacyLicenseNumber":
      return getStateBoardLicenseValidationMessage(
        toFormInput(form.stateBoardOfPharmacyLicenseNumber),
        !stateBoardLicenseFile,
        stateLicenseContext
      );
    case "bopLicenseExpirationDate":
      return getExpirationDateValidationMessage(
        form.bopLicenseExpirationDate,
        "BOP License Expiration Date",
        true
      );
    case "email":
      return getEmailValidationMessage(toFormInput(form.email), true);
    case "phoneNumber": {
      const phone = toFormInput(form.phoneNumber);
      if (!phone.trim()) return buildRequiredFieldMessage("phoneNumber");
      return getPhoneFormatValidationMessage(phone, "Phone", false);
    }
    case "fax":
      return getPhoneFormatValidationMessage(toFormInput(form.fax), "Fax");
    case "pharmacyAddress":
      return getAddressValidationMessage(
        toFormInput(form.pharmacyAddress),
        true,
        "Pharmacy Address"
      );
    case "streetAddress":
      return getAddressValidationMessage(
        toFormInput(form.streetAddress),
        false,
        "Street Address"
      );
    case "globalLocationNumber":
      return getGlnValidationMessage(toFormInput(form.globalLocationNumber));
    case "city":
      return getCityValidationMessage(toFormInput(form.city), true);
    case "stateId":
      return toFormInput(form.stateId)
        ? null
        : buildRequiredFieldMessage("stateId");
    case "zipCode": {
      const zipCode = toFormInput(form.zipCode);
      if (!zipCode.trim()) return buildRequiredFieldMessage("zipCode");
      return getZipValidationMessage(zipCode);
    }
    case "pharmacyBillingSoftwareName":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getSoftwareSystemValidationMessage(
        toFormInput(form.pharmacyBillingSoftwareName),
        true,
        "Pharmacy Billing Software Name"
      );
    case "pharmacyBillingSoftwarePhone":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getPhoneFormatValidationMessage(
        toFormInput(form.pharmacyBillingSoftwarePhone),
        "Pharmacy Billing Software Phone"
      );
    case "pharmacyBillingSoftwareEmail":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getEmailValidationMessage(toFormInput(form.pharmacyBillingSoftwareEmail));
    case "npi":
      return getPhoneFormatValidationMessage(toFormInput(form.npi), "NPI");
    default:
      return null;
  }
}

/** Character/pattern checks while typing — skips required and length/format rules. */
function getPharmacyTypingValidationMessage(
  field: PharmacyValidatedField,
  { form }: PharmacyValidationContext,
  rawValue?: string
): string | null {
  switch (field) {
    case "businessLegalName":
      return getBusinessNameValidationMessage(
        toFormInput(form.businessLegalName),
        false,
        "Business Legal Name"
      );
    case "businessTradeName":
      return getBusinessNameValidationMessage(
        toFormInput(form.businessTradeName),
        false,
        "Business Trade Name (DBA)"
      );
    case "pharmacyAddress":
      return getAddressValidationMessage(
        toFormInput(form.pharmacyAddress),
        false,
        "Pharmacy Address"
      );
    case "streetAddress":
      return getAddressValidationMessage(
        toFormInput(form.streetAddress),
        false,
        "Street Address"
      );
    case "city":
      return getCityValidationMessage(toFormInput(form.city), false);
    case "pharmacyBillingSoftwareName":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getSoftwareSystemValidationMessage(
        toFormInput(form.pharmacyBillingSoftwareName),
        false,
        "Pharmacy Billing Software Name"
      );
    case "email":
      return getEmailTypingValidationMessage(rawValue ?? toFormInput(form.email));
    case "pharmacyBillingSoftwareEmail":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getEmailTypingValidationMessage(
        rawValue ?? toFormInput(form.pharmacyBillingSoftwareEmail)
      );
    case "phoneNumber":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.phoneNumber),
        "Phone"
      );
    case "fax":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.fax),
        "Fax"
      );
    case "zipCode":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.zipCode),
        "Zip Code"
      );
    case "globalLocationNumber":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.globalLocationNumber),
        "Global Location Number"
      );
    case "pharmacyBillingSoftwarePhone":
      if (!isOtherPharmacySoftwareSelection(form.pharmacySoftwareId)) return null;
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.pharmacyBillingSoftwarePhone),
        "Pharmacy Billing Software Phone"
      );
    case "npi":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.npi),
        "NPI"
      );
    default:
      return null;
  }
}

function collectPharmacyFieldErrors(
  context: PharmacyValidationContext
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of PHARMACY_VALIDATED_FIELDS) {
    const message = getPharmacyFieldValidationMessage(field, context);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

export default function Pharmacy() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const isOwnPharmacyView = isEmployee() && hasPharmacyAdminRole();

  useEffect(() => {
    if (isEmployee() && !hasPharmacyAdminRole()) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.pharmacy
  );
  const { list: stateList } = useSelector((state: RootState) => state.state);
  const { list: pharmacySoftwareList } = useSelector(
    (state: RootState) => state.pharmacysoftware
  );

  const [ownPharmacyList, setOwnPharmacyList] = useState<PharmacyDto[]>([]);
  const tableList = isOwnPharmacyView ? ownPharmacyList : list;
  const tableTotalRecords = isOwnPharmacyView
    ? ownPharmacyList.length
    : totalRecords;

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation<Partial<PharmacyDto>>({}, PHARMACY_FORM_RULES);

  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<PharmacyValidatedField, boolean>>
  >({});
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<PharmacyDto>(EMPTY_PHARMACY);
  const [deaLicenseFile, setDeaLicenseFile] = useState<File | null>(null);
  const [stateBoardLicenseFile, setStateBoardLicenseFile] =
    useState<File | null>(null);
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();
  const { openAdd, openEdit, closeModal, leaveAddRoute, leaveEditRoute } =
    useListModalRoute({
      listPath: "/pharmacy",
      showDrawer,
      setShowDrawer,
      formId: form.id,
      onEnterAdd: () => {
        setForm(EMPTY_PHARMACY);
        setDeaLicenseFile(null);
        setStateBoardLicenseFile(null);
        setTouchedFields({});
        clearErrors();
        clearActionMessage();
      },
      list: tableList,
      getRowId: (row) => row.id,
      onLoadRow: (row) => {
        const formState = toPharmacyFormState(row);
        const knownSoftwareIds = new Set(
          pharmacySoftwareList
            .filter((software) => software.id)
            .map((software) => String(software.id).toLowerCase())
        );
        const resolvedStateName =
          formState.stateName?.trim() ||
          (formState.stateId
            ? stateList.find(
                (state) =>
                  state.stateId.toLowerCase() ===
                  formState.stateId!.toLowerCase()
              )?.stateName?.trim() || null
            : null);
        setForm({
          ...formState,
          stateName: resolvedStateName,
          pharmacySoftwareId: resolvePharmacySoftwareFormId(
            formState,
            knownSoftwareIds
          ),
        });
        setDeaLicenseFile(null);
        setStateBoardLicenseFile(null);
        setTouchedFields({});
        clearErrors();
        clearActionMessage();
      },
    });

  const loadOwnPharmacy = async () => {
    const pharmacyId = getPharmacyId();
    if (!pharmacyId) {
      navigate("/home", { replace: true });
      return;
    }
    try {
      const res = await getPharmacyByIdApi(pharmacyId);
      setOwnPharmacyList([res.data as PharmacyDto]);
    } catch {
      navigate("/home", { replace: true });
    }
  };

  useEffect(() => {
    if (isOwnPharmacyView) {
      void loadOwnPharmacy();
    }
  }, [isOwnPharmacyView, navigate]);

  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMoreRow, setSelectedMoreRow] = useState<PharmacyDto | null>(
    null
  );

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      onSearchInputChange: () => {
        setPageParam((prev) =>
          prev.page === 1 ? prev : { ...prev, page: 1 }
        );
      },
    });

  const isMoreMenuOpen = Boolean(moreAnchorEl);

  useEffect(() => {
    dispatch(fetchStates());
    dispatch(fetchPharmacySoftware());
  }, [dispatch]);

  useEffect(() => {
    if (isOwnPharmacyView) return;

    dispatch(
      fetchPharmacy({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        isActive: status === "active",
      })
    );
  }, [dispatch, pageParam, debouncedSearch, status, isOwnPharmacyView]);

  useEffect(() => {
    if (!showDrawer) return;

    const mainContent = document.querySelector(".main-content") as HTMLElement | null;
    const previousOverflow = mainContent?.style.overflow ?? "";

    if (mainContent) {
      mainContent.style.overflow = "hidden";
    }

    return () => {
      if (mainContent) {
        mainContent.style.overflow = previousOverflow;
      }
    };
  }, [showDrawer]);

  const pharmacySoftwareOptions = useMemo(
    () => buildPharmacySoftwareDropdownOptions(pharmacySoftwareList),
    [pharmacySoftwareList]
  );

  const showOtherBillingSoftwareFields = isOtherPharmacySoftwareSelection(
    form.pharmacySoftwareId
  );

  const displayList = useMemo(
    () =>
      tableList.map((pharmacy) => ({
        ...pharmacy,
        stateName:
          pharmacy.stateName ??
          (pharmacy.stateId
            ? stateList.find(
                (state) =>
                  state.stateId.toLowerCase() ===
                  pharmacy.stateId!.toLowerCase()
              )?.stateName ?? null
            : null),
        softwareName:
          pharmacy.softwareName ??
          (pharmacy.pharmacySoftwareId
            ? (pharmacySoftwareList.find(
                (software) =>
                  software.id?.toLowerCase() ===
                  pharmacy.pharmacySoftwareId!.toLowerCase()
              )?.softwareName ?? pharmacy.pharmacyBillingSoftwareName ?? null)
            : pharmacy.pharmacyBillingSoftwareName ?? null),
      })),
    [tableList, stateList, pharmacySoftwareList]
  );

  const columns: {
    header: string;
    accessor: keyof PharmacyDto;
    render?: (row: PharmacyDto) => React.ReactNode;
  }[] = [
    {
      header: "Business Trade Name",
      accessor: "businessTradeName",
      render: (row) =>
        row.businessTradeName ? (
          <span className="pharmacy-cell-strong">{row.businessTradeName}</span>
        ) : null,
    },
    { header: "DEA", accessor: "dea" },
    { header: "City", accessor: "city" },
    { header: "State Name", accessor: "stateName" },
    {
      header: "Phone",
      accessor: "phoneNumber",
      render: (row) =>
        row.phoneNumber ? (
          <span className="pharmacy-cell-with-icon">
            <LocalPhoneOutlinedIcon className="pharmacy-cell-icon pharmacy-cell-icon--phone" fontSize="inherit" />
            {row.phoneNumber}
          </span>
        ) : null,
    },
    {
      header: "Email",
      accessor: "email",
      render: (row) =>
        row.email ? (
          <span className="pharmacy-cell-with-icon">
            <EmailOutlinedIcon className="pharmacy-cell-icon pharmacy-cell-icon--email" fontSize="inherit" />
            {row.email}
          </span>
        ) : null,
    },
    { header: "Software Name", accessor: "softwareName" },
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <Button type={row.isActive ? "active" : "inactive"} />
      ),
    },
  ];

  const getValidationContext = (
    nextForm: PharmacyDto = form,
    nextStateBoardLicenseFile: File | null = stateBoardLicenseFile
  ): PharmacyValidationContext => ({
    form: nextForm,
    stateBoardLicenseFile: nextStateBoardLicenseFile,
    stateLicenseContext: getStateLicenseContext(stateList, nextForm.stateId),
  });

  const markFieldTouched = (field: PharmacyValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: PharmacyValidatedField,
    context: PharmacyValidationContext,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!PHARMACY_TYPING_FIELDS.has(field)) return;

      const typingMessage = getPharmacyTypingValidationMessage(
        field,
        context,
        options.rawValue
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = toFormInput(
      context.form[field as keyof PharmacyDto] as string | null | undefined
    );
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getPharmacyFieldValidationMessage(field, context);

    if (!value.trim() && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleDateChange =
    (field: "deaExpirationDate" | "bopLicenseExpirationDate") =>
    (value: string | null) => {
      clearFieldErrorOnChange(field, clearActionMessage);
      setForm((prev) => {
        const nextForm = { ...prev, [field]: value };
        if (value) {
          queueMicrotask(() => {
            applyFieldValidation(field, getValidationContext(nextForm), {
              touched: true,
            });
          });
        }
        return nextForm;
      });
    };

  const handleDateBlur =
    (field: "deaExpirationDate" | "bopLicenseExpirationDate") => () => {
      markFieldTouched(field);
      applyFieldValidation(field, getValidationContext(), { touched: true });
    };

  const handleFieldBlur = (field: PharmacyValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, getValidationContext(), { touched: true });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement  | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const fieldName = name as PharmacyValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    if (name === "isActive") {
      setForm({ ...form, isActive: value === "true" });
      return;
    }

    if (name === "pharmacySoftwareId") {
      const nextSoftwareId = value === "" ? null : value;
      const nextForm = isOtherPharmacySoftwareSelection(nextSoftwareId)
        ? { ...form, pharmacySoftwareId: nextSoftwareId }
        : {
            ...form,
            pharmacySoftwareId: nextSoftwareId,
            pharmacyBillingSoftwareName: null,
            pharmacyBillingSoftwarePhone: null,
            pharmacyBillingSoftwareEmail: null,
          };

      setForm(nextForm);

      if (!isOtherPharmacySoftwareSelection(nextSoftwareId)) {
        setFieldErrors({
          pharmacyBillingSoftwareName: "",
          pharmacyBillingSoftwarePhone: "",
          pharmacyBillingSoftwareEmail: "",
        });
      }
      return;
    }

    if (name === "stateId") {
      const nextStateId = value === "" ? null : value;
      const selectedState = nextStateId
        ? stateList.find(
            (state) =>
              state.stateId.toLowerCase() === nextStateId.toLowerCase()
          )
        : undefined;
      const licenseContext = getStateLicenseContext(stateList, nextStateId);
      const sanitizedLicense = toFormInput(form.stateBoardOfPharmacyLicenseNumber)
        ? sanitizeStateBoardLicenseInput(
            toFormInput(form.stateBoardOfPharmacyLicenseNumber),
            licenseContext
          ) || null
        : form.stateBoardOfPharmacyLicenseNumber;

      const nextForm = {
        ...form,
        stateId: nextStateId,
        stateName: selectedState?.stateName?.trim() || null,
        stateBoardOfPharmacyLicenseNumber: sanitizedLicense,
      };
      setForm(nextForm);
      if (touchedFields.stateId) {
        applyFieldValidation("stateId", getValidationContext(nextForm), {
          touched: true,
        });
      }
      if (
        touchedFields.stateBoardOfPharmacyLicenseNumber ||
        toFormInput(nextForm.stateBoardOfPharmacyLicenseNumber)
      ) {
        applyFieldValidation(
          "stateBoardOfPharmacyLicenseNumber",
          getValidationContext(nextForm),
          { touched: true }
        );
      }
      return;
    }

    const nextValue =
      name === "dea"
        ? sanitizePharmacyDeaInput(value) || null
        : name === "phoneNumber" ||
      name === "fax" ||
      name === "pharmacyBillingSoftwarePhone" ||
      name === "npi"
        ? sanitizePhoneInput(value) || null
        : name === "globalLocationNumber"
          ? sanitizeGlnInput(value) || null
          : name === "zipCode"
            ? sanitizeZipInput(value) || null
            : name === "stateBoardOfPharmacyLicenseNumber"
              ? sanitizeStateBoardLicenseInput(
                  value,
                  getStateLicenseContext(stateList, form.stateId)
                ) || null
              : value === ""
                ? null
                : value;

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    if (PHARMACY_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, getValidationContext(nextForm), {
        validateWhileTyping: true,
        rawValue: value,
      });
    }

    if (
      name === "businessTradeName" &&
      toFormInput(nextForm.dea) &&
      touchedFields.dea
    ) {
      applyFieldValidation("dea", getValidationContext(nextForm), {
        touched: true,
      });
    }
  };

  const handleLicenseFile =
    (
      field: "dea" | "stateBoardOfPharmacyLicenseNumber",
      setFile: React.Dispatch<React.SetStateAction<File | null>>
    ) =>
    (file: File | null) => {
      if (!file) {
        setFile(null);
        return;
      }
      const fileError = getPharmacyDocumentValidationMessage(file);
      if (fileError) {
        setFile(null);
        setFieldErrors({ [field]: fileError });
        return;
      }
      setFile(file);
      clearFieldErrorOnChange(field, clearActionMessage);
      if (
        field === "stateBoardOfPharmacyLicenseNumber" &&
        touchedFields.stateBoardOfPharmacyLicenseNumber
      ) {
        applyFieldValidation(
          "stateBoardOfPharmacyLicenseNumber",
          getValidationContext(form, file),
          { touched: true }
        );
      }
    };

  const handleSave = async () => {
    clearActionMessage();

    const validationContext = getValidationContext();
    const fieldErrors = collectPharmacyFieldErrors(validationContext);
    setFieldErrors(fieldErrors);
    setTouchedFields(
      Object.fromEntries(
        PHARMACY_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<PharmacyValidatedField, boolean>>
    );

    if (Object.keys(fieldErrors).length > 0) return;

    const formValues = {
      dea: toFormInput(form.dea),
      businessTradeName: toFormInput(form.businessTradeName),
      businessLegalName: toFormInput(form.businessLegalName),
      zipCode: toFormInput(form.zipCode),
      city: toFormInput(form.city),
      email: toFormInput(form.email),
      stateId: toFormInput(form.stateId),
      phoneNumber: toFormInput(form.phoneNumber),
      pharmacyAddress: toFormInput(form.pharmacyAddress),
      deaExpirationDate: form.deaExpirationDate,
      bopLicenseExpirationDate: form.bopLicenseExpirationDate,
      stateBoardOfPharmacyLicenseNumber: toFormInput(
        form.stateBoardOfPharmacyLicenseNumber
      ),
    };

    const isValid = validate(formValues);
    if (!isValid) return;

    try {
      await dispatch(
        addPharmacy({
          data: toUpsertPayload(
            preparePharmacySoftwareForSave(toPharmacyFormState(form))
          ) as PharmacyDto,
          files: { deaLicenseFile, stateBoardLicenseFile },
        })
      ).unwrap();
      closeModal();
      reloadList();
    } catch (err) {
      clearErrors();
      const message = messageFromApiBody(err) ?? "";
      if (message.includes("INVALID_PHARMACY_DOCUMENT_FORMAT")) {
        if (deaLicenseFile) {
          setFieldErrors({ dea: PHARMACY_DOCUMENT_FORMAT_ERROR });
        } else if (stateBoardLicenseFile) {
          setFieldErrors({
            stateBoardOfPharmacyLicenseNumber: PHARMACY_DOCUMENT_FORMAT_ERROR,
          });
        }
        return;
      }
      showActionMessage(message);
    }
  };

  const handleReset = () => {
    // Keep id on edit so useListModalRoute does not reload the row after clear
    setForm(form.id ? { ...EMPTY_PHARMACY, id: form.id } : EMPTY_PHARMACY);
    setDeaLicenseFile(null);
    setStateBoardLicenseFile(null);
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleCloseModal = () => {
    clearActionMessage();
    setTouchedFields({});
    clearErrors();
    closeModal();
  };

  const handleOpenMoreMenu = (anchorEl: HTMLElement, row: PharmacyDto) => {
    setMoreAnchorEl(anchorEl);
    setSelectedMoreRow(row);
  };

  const handleCloseMoreMenu = () => {
    setMoreAnchorEl(null);
    setSelectedMoreRow(null);
  };

  const handleViewPharmacyWholesaler = () => {
    if (!selectedMoreRow?.id) return;
    const pharmacyName = encodeURIComponent(
      getPharmacyDisplayName(selectedMoreRow)
    );
    navigate(
      `/pharmacywholesaler?pharmacyId=${selectedMoreRow.id}&pharmacyName=${pharmacyName}`
    );
    handleCloseMoreMenu();
  };

  const handleViewPharmacyUsers = () => {
    if (!selectedMoreRow?.id) return;
    const pharmacyName = encodeURIComponent(
      getPharmacyDisplayName(selectedMoreRow)
    );
    navigate(
      `/pharmacyuser?pharmacyId=${selectedMoreRow.id}&pharmacyName=${pharmacyName}`
    );
    handleCloseMoreMenu();
  };

  const reloadList = () => {
    if (isOwnPharmacyView) {
      void loadOwnPharmacy();
      return;
    }
    dispatch(
      fetchPharmacy({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        isActive: status === "active",
      })
    );
  };

  const handleDelete = useDeleteHandler({
    list: tableList,
    getDisplayName: (row) => row.businessTradeName ?? "this pharmacy",
    deleteThunk: deletePharmacy,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell pharmacy-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<StorefrontOutlinedIcon />}
          title="Pharmacy"
          subtitle="Manage and view all pharmacy details."
          actions={
            !isOwnPharmacyView ? (
              <Button
                type="add"
                label="+ Add Pharmacy"
                onClick={() => {
                  leaveEditRoute();
                  openAdd();
                }}
              />
            ) : undefined
          }
        />

        {/* Search left + Active/Inactive + filter on the right (design) */}
        {!isOwnPharmacyView && (
        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Pharmacy..."
            value={searchText}
            onChange={handleSearchChange}
          />
          <div className="page-card-filters-right">
            <div className="status-btns pharmacy-status-toggle" role="group" aria-label="Status filter">
              <Button
                type="active"
                isActive={status === "active"}
                onClick={() => {
                  setStatus("active");
                  setPageParam((prev) =>
                    prev.page === 1 ? prev : { ...prev, page: 1 }
                  );
                }}
              />
              <Button
                type="inactive"
                isActive={status === "inactive"}
                onClick={() => {
                  setStatus("inactive");
                  setPageParam((prev) =>
                    prev.page === 1 ? prev : { ...prev, page: 1 }
                  );
                }}
              />
            </div>
          </div>
        </div>
        )}

        {/* Table */}
        <div className="page-table-wrap pharmacy-table">
          <Table
            columns={columns}
            data={displayList}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={!isOwnPharmacyView && loading}
            showEdit
            showDelete
            showMore
            moreTooltip="More Options"
            onEdit={(row) => {
              if (!row.id) return;
              leaveAddRoute();
              openEdit(row.id, row);
            }}
            onMore={(row, anchorEl) => {
              handleOpenMoreMenu(anchorEl, row);
            }}
            onDelete={(id) => void handleDelete(id)}
          />

          <Menu
            anchorEl={moreAnchorEl}
            open={isMoreMenuOpen}
            onClose={handleCloseMoreMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleViewPharmacyWholesaler}>
              View Pharmacy Wholesaler
            </MenuItem>
            <MenuItem onClick={handleViewPharmacyUsers}>
              View Pharmacy Users
            </MenuItem>
          </Menu>
        </div>

        {/* Pagination  */}
        {!isOwnPharmacyView && (
        <Pagination
          pageParam={pageParam}
          totalRecords={tableTotalRecords}
          onPageChange={(page) => setPageParam({ ...pageParam, page })}
          onPageSizeChange={(size) => setPageParam({ ...pageParam, pageSize: size, page: 1 })}
        />
        )}
      </div>

      {/* Drawer Form */}
      <CommonModal
        open={showDrawer}
        onClose={handleCloseModal}
        overlayClassName="pharmacy-modal-overlay"
        contentClassName="pharmacy-modal-form"
      >
            <div className="pharmacy-modal-header">
              <h3>{form.id != null ? "Update Pharmacy" : "Add Pharmacy"}</h3>
            </div>

            <div className="pharmacy-modal-body">
              <div className="pharmacy-modal-fields-grid">
                {/* Row 1: Business Legal Name | Business Trade Name | DEA */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="Business Legal Name"
                    name="businessLegalName"
                    value={toFormInput(form.businessLegalName)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("businessLegalName")}
                    error={errors.businessLegalName}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Business Trade Name (DBA)"
                    name="businessTradeName"
                    value={toFormInput(form.businessTradeName)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("businessTradeName")}
                    error={errors.businessTradeName}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <PharmacyUploadField
                    label="DEA"
                    name="dea"
                    value={toFormInput(form.dea)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("dea")}
                    error={errors.dea}
                    required
                    file={deaLicenseFile}
                    existingFileName={
                      !deaLicenseFile && form.hasDeaFile
                        ? form.deaFileName || "dea-document.pdf"
                        : null
                    }
                    onViewExisting={
                      form.id
                        ? () =>
                            void viewPharmacyDocument(
                              form.id!,
                              "dea",
                              form.deaFileName
                            )
                        : undefined
                    }
                    onDownloadExisting={
                      form.id
                        ? () =>
                            void downloadPharmacyDocument(
                              form.id!,
                              "dea",
                              form.deaFileName
                            )
                        : undefined
                    }
                    onFile={handleLicenseFile("dea", setDeaLicenseFile)}
                  />
                </div>

                {/* Row 2: DEA Expiration Date | BOP License Number | BOP License Expiration */}
                <div className="pharmacy-form-group">
                  <FormDateField
                    label="DEA Expiration Date"
                    value={form.deaExpirationDate}
                    onChange={handleDateChange("deaExpirationDate")}
                    onBlur={handleDateBlur("deaExpirationDate")}
                    error={errors.deaExpirationDate}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <PharmacyUploadField
                    label="State Board  License Number"
                    name="stateBoardOfPharmacyLicenseNumber"
                    value={toFormInput(form.stateBoardOfPharmacyLicenseNumber)}
                    onChange={handleChange}
                    onBlur={() =>
                      handleFieldBlur("stateBoardOfPharmacyLicenseNumber")
                    }
                    error={errors.stateBoardOfPharmacyLicenseNumber}
                    required
                    file={stateBoardLicenseFile}
                    existingFileName={
                      !stateBoardLicenseFile && form.hasStateBoardFile
                        ? form.stateBoardFileName || "state-board-license.pdf"
                        : null
                    }
                    onViewExisting={
                      form.id
                        ? () =>
                            void viewPharmacyDocument(
                              form.id!,
                              "state-board",
                              form.stateBoardFileName
                            )
                        : undefined
                    }
                    onDownloadExisting={
                      form.id
                        ? () =>
                            void downloadPharmacyDocument(
                              form.id!,
                              "state-board",
                              form.stateBoardFileName
                            )
                        : undefined
                    }
                    onFile={handleLicenseFile(
                      "stateBoardOfPharmacyLicenseNumber",
                      setStateBoardLicenseFile
                    )}
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormDateField
                    label="BOP License Expiration Date"
                    value={form.bopLicenseExpirationDate}
                    onChange={handleDateChange("bopLicenseExpirationDate")}
                    onBlur={handleDateBlur("bopLicenseExpirationDate")}
                    error={errors.bopLicenseExpirationDate}
                    required
                  />
                </div>

                {/* Row 3: Email | Phone | Fax */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="Email"
                    name="email"
                    type="email"
                    value={toFormInput(form.email)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("email")}
                    error={errors.email}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Phone"
                    name="phoneNumber"
                    value={toFormInput(form.phoneNumber)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("phoneNumber")}
                    error={errors.phoneNumber}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Fax"
                    name="fax"
                    value={toFormInput(form.fax)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("fax")}
                    error={errors.fax}
                  />
                </div>

                {/* Row 4: Pharmacy Address | Street Address | Global Location Number */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="Pharmacy Address"
                    name="pharmacyAddress"
                    value={toFormInput(form.pharmacyAddress)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("pharmacyAddress")}
                    error={errors.pharmacyAddress}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Street Address"
                    name="streetAddress"
                    value={toFormInput(form.streetAddress)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("streetAddress")}
                    error={errors.streetAddress}
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Global Location Number (GLN)"
                    name="globalLocationNumber"
                    value={toFormInput(form.globalLocationNumber)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("globalLocationNumber")}
                    error={errors.globalLocationNumber}
                  />
                </div>

                {/* Row 5: City | State | Zip Code */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="City"
                    name="city"
                    value={toFormInput(form.city)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("city")}
                    error={errors.city}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="State"
                    name="stateId"
                    type="select"
                    value={toFormInput(form.stateId)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("stateId")}
                    options={getStatesWithName(stateList)}
                    optionLabel="stateName"
                    optionValue="stateId"
                    error={errors.stateId}
                    required
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Zip Code"
                    name="zipCode"
                    value={toFormInput(form.zipCode)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("zipCode")}
                    error={errors.zipCode}
                    required
                  />
                </div>

                {/* Row 6: Software Name */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="Software Name"
                    name="pharmacySoftwareId"
                    type="select"
                    value={toFormInput(form.pharmacySoftwareId)}
                    onChange={handleChange}
                    options={pharmacySoftwareOptions}
                    optionLabel="softwareName"
                    optionValue="id"
                  />
                </div>

                {showOtherBillingSoftwareFields && (
                  <>
                    <div className="pharmacy-form-group">
                      <FormField
                        label="Pharmacy Billing Software Name"
                        name="pharmacyBillingSoftwareName"
                        value={toFormInput(form.pharmacyBillingSoftwareName)}
                        onChange={handleChange}
                        onBlur={() => handleFieldBlur("pharmacyBillingSoftwareName")}
                        error={errors.pharmacyBillingSoftwareName}
                        required
                      />
                    </div>

                    <div className="pharmacy-form-group">
                      <FormField
                        label="Pharmacy Billing Software Phone"
                        name="pharmacyBillingSoftwarePhone"
                        value={toFormInput(form.pharmacyBillingSoftwarePhone)}
                        onChange={handleChange}
                        onBlur={() => handleFieldBlur("pharmacyBillingSoftwarePhone")}
                        error={errors.pharmacyBillingSoftwarePhone}
                      />
                    </div>

                    <div className="pharmacy-form-group">
                      <FormField
                        label="Pharmacy Billing Software Email"
                        name="pharmacyBillingSoftwareEmail"
                        type="email"
                        value={toFormInput(form.pharmacyBillingSoftwareEmail)}
                        onChange={handleChange}
                        onBlur={() => handleFieldBlur("pharmacyBillingSoftwareEmail")}
                        error={errors.pharmacyBillingSoftwareEmail}
                      />
                    </div>
                  </>
                )}

                {/* Row 7: NPI | Status */}
                <div className="pharmacy-form-group">
                  <FormField
                    label="NPI"
                    name="npi"
                    value={toFormInput(form.npi)}
                    onChange={handleChange}
                    onBlur={() => handleFieldBlur("npi")}
                    error={errors.npi}
                  />
                </div>

                <div className="pharmacy-form-group">
                  <FormField
                    label="Status"
                    name="isActive"
                    value={form.isActive.toString()}
                    onChange={handleChange}
                    type="select"
                    options={[
                      { label: "Active", value: "true" },
                      { label: "Inactive", value: "false" },
                    ]}
                    optionLabel="label"
                    optionValue="value"
                  />
                </div>

              
              </div>
            </div>
            <div className="pharmacy-modal-actions">
              <ModalActionMessage message={actionMessage} />
              <div className="pharmacy-modal-actions-buttons">
                <Button type="cancel" onClick={handleCloseModal} />
                <Button type="reset" onClick={handleReset} />
                <Button type="save" onClick={handleSave} />
              </div>
            </div>
      </CommonModal>
    </div>
  );
}