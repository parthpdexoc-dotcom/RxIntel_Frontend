import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./Login.css";
import "../terms/Terms.css";
import { fetchCurrentTermsApi } from "../../service/TermsService";
import type { TermsAndConditionsDto } from "../../dto/termsDto";
import {
  Box,
  Button,
  Checkbox,
  Container,
  FormControlLabel,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DesktopDatePicker } from "@mui/x-date-pickers/DesktopDatePicker";
import type { Dayjs } from "dayjs";
import MailIcon from "@mui/icons-material/Mail";
import LockIcon from "@mui/icons-material/Lock";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useDispatch, useSelector } from "react-redux";
import {
  loginUserAsync,
  loginEmployeeAsync,
  registerPharmacyEmployeeAsync,
} from "../../service/LoginService";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { clearAuthState } from "../../slice/LoginSlice";
import AuthTextField from "../../component/molecules/AuthTextField";
import AuthOrDivider from "../../component/molecules/AuthOrDivider";
import AuthInfoBox from "../../component/molecules/AuthInfoBox";
import GradientButton from "../../component/atoms/GradientButton";
import { CustomSelect } from "../../component/molecules/FormField";
import { showSuccess } from "../../component/atoms/ToastHelper";
import { rxBrand } from "../../theme/rxBrand";
import {
  isAuthenticated,
  persistAuth,
  getPostLoginPath,
} from "../../component/auth/authUtils";
import type { AppDispatch, RootState } from "../../app/store";
import { fetchStates } from "../../slice/StateSlice";
import { fetchPharmacySoftware } from "../../slice/PharmacySoftwareSlice";
import {
  getStateLicenseContext,
  getStateNameLabel,
  getStatesWithName,
  type StateDto,
} from "../../dto/stateDto";
import { unwrapTokenPayload } from "../../dto/loginDto";
import { PharmacyUserRole } from "../../enums/PharmacyUserRole";
import {
  DISPLAY_DATE_FORMAT,
  isPartialDisplayDate,
  parseDisplayDateOnly,
  toApiDateOnly,
} from "../../utils/formatDisplayDate";
import dayjs from "dayjs";
import {
  getDeaValidationMessage,
  getPasswordValidationMessage,
  getPharmacyDocumentValidationMessage,
  PASSWORD_REQUIREMENTS_HINT,
  PHARMACY_DOCUMENT_ACCEPT,
  PHARMACY_DOCUMENT_FORMAT_ERROR,
  MAX_DEA_LENGTH,
} from "../../utils/validation";
import {
  getAddressValidationMessage,
  getBusinessNameValidationMessage,
  getCityValidationMessage,
  getDigitsOnlyTypingValidationMessage,
  getEmailTypingValidationMessage,
  getEmailValidationMessage,
  getGlnValidationMessage,
  getContactTitleValidationMessage,
  getPersonNameValidationMessage,
  getPhoneFormatValidationMessage,
  getSoftwareSystemValidationMessage,
  getStateBoardLicenseValidationMessage,
  type StateLicenseContext,
  getExpirationDateValidationMessage,
  getZipValidationMessage,
  MAX_GLN_DIGITS,
  MAX_PHONE_DIGITS,
  MAX_ZIP_DIGITS,
  sanitizeGlnInput,
  sanitizePhoneInput,
  sanitizeStateBoardLicenseInput,
  sanitizeZipInput,
} from "../../utils/pharmacyValidation";
import { buildRequiredFieldMessage } from "../../utils/formFieldLabels";
import {
  buildPharmacySoftwareDropdownOptions,
  isOtherPharmacySoftwareSelection,
} from "../../utils/pharmacyBillingSoftware";
import {
  fieldErrorsFromApiBody,
  messageFromApiBody,
} from "../../slice/mappingThunkUtils";

/** Fixed role for pharmacy sign-up — matches backend PharmacyUserRole.PharmacyAdmin. */
const PHARMACY_SIGNUP_ROLE = PharmacyUserRole.PharmacyAdmin;

const SIGNUP_API_FIELD_ALIASES: Record<string, string> = {
  userEmail: "primaryContactEmail",
  name: "username",
};

function addSignupFieldError(
  errors: Record<string, string>,
  field: string,
  message: string | null | undefined
) {
  if (message) {
    errors[field] = message;
  }
}

function mapSignupApiFieldErrors(
  fieldErrors: Record<string, string>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    mapped[SIGNUP_API_FIELD_ALIASES[key] ?? key] = message;
  }
  return mapped;
}

/** Keeps letter prefix + trailing digits when editing mid-field (register page only). */
function sanitizeSignupDeaInput(value: string): string {
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

const SIGNUP_VALIDATED_FIELDS = [
  "businessLegalName",
  "businessTradeName",
  "dea",
  "stateBoardOfPharmacyLicenseNumber",
  "globalLocationNumber",
  "phoneNumber",
  "fax",
  "email",
  "pharmacyBillingSoftwareName",
  "pharmacyBillingSoftwarePhone",
  "pharmacyBillingSoftwareEmail",
  "pharmacyAddress",
  "streetAddress",
  "city",
  "stateId",
  "zipCode",
  "username",
  "userPassword",
  "userConfirmPassword",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactPhone",
  "primaryContactEmail",
] as const;

type SignupValidatedField = (typeof SIGNUP_VALIDATED_FIELDS)[number];

const SIGNUP_TYPING_FIELDS = new Set<SignupValidatedField>([
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
  "username",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactPhone",
  "primaryContactEmail",
]);

type SignupValidationContext = {
  readValue: (field: string) => string;
  deaExpirationDate: string | null;
  bopLicenseExpirationDate: string | null;
  stateBoardLicenseFile: File | null;
  selectedStateId: string;
  selectedPharmacySoftwareId: string;
  stateLicenseContext: StateLicenseContext | null;
};

function getSignupFieldValidationMessage(
  field: SignupValidatedField,
  value: string,
  ctx: SignupValidationContext
): string | null {
  switch (field) {
    case "businessLegalName":
      return getBusinessNameValidationMessage(
        value,
        true,
        "Business Legal Name"
      );
    case "businessTradeName":
      return getBusinessNameValidationMessage(
        value,
        true,
        "Business Trade Name (DBA)"
      );
    case "dea":
      return getDeaValidationMessage(value, ctx.readValue("businessTradeName"));
    case "stateBoardOfPharmacyLicenseNumber":
      return getStateBoardLicenseValidationMessage(
        value,
        !ctx.stateBoardLicenseFile,
        ctx.stateLicenseContext
      );
    case "globalLocationNumber":
      return getGlnValidationMessage(value);
    case "phoneNumber":
      return getPhoneFormatValidationMessage(value, "Phone", true);
    case "fax":
      return getPhoneFormatValidationMessage(value, "Fax");
    case "email":
      return getEmailValidationMessage(value, true);
    case "pharmacyBillingSoftwareName":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getSoftwareSystemValidationMessage(
        value,
        true,
        "Pharmacy Billing Software Name"
      );
    case "pharmacyBillingSoftwarePhone":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getPhoneFormatValidationMessage(
        value,
        "Pharmacy Billing Software Phone"
      );
    case "pharmacyBillingSoftwareEmail":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getEmailValidationMessage(value);
    case "pharmacyAddress":
      return getAddressValidationMessage(value, true, "Pharmacy Address");
    case "streetAddress":
      return getAddressValidationMessage(value, false, "Street Address");
    case "city":
      return getCityValidationMessage(value, true);
    case "stateId":
      return value.trim() ? null : buildRequiredFieldMessage("stateId");
    case "zipCode":
      return (
        getZipValidationMessage(value) ??
        (!value.trim() ? buildRequiredFieldMessage("zipCode") : null)
      );
    case "username":
      return getPersonNameValidationMessage(value, true, "Username");
    case "userPassword":
      return getPasswordValidationMessage(value);
    case "userConfirmPassword": {
      const password = ctx.readValue("userPassword");
      if (!value.trim()) return "Passwords must match";
      if (value !== password) return "Passwords must match";
      return null;
    }
    case "primaryContactName":
      return getPersonNameValidationMessage(value, true, "Contact Name");
    case "primaryContactTitle":
      return getContactTitleValidationMessage(value);
    case "primaryContactPhone":
      return getPhoneFormatValidationMessage(value, "Contact Phone", true);
    case "primaryContactEmail":
      return getEmailValidationMessage(value, true);
    default:
      return null;
  }
}

function getSignupTypingValidationMessage(
  field: SignupValidatedField,
  value: string,
  ctx: SignupValidationContext,
  rawValue?: string
): string | null {
  const input = rawValue ?? value;

  switch (field) {
    case "businessLegalName":
      return getBusinessNameValidationMessage(value, false, "Business Legal Name");
    case "businessTradeName":
      return getBusinessNameValidationMessage(
        value,
        false,
        "Business Trade Name (DBA)"
      );
    case "pharmacyAddress":
      return getAddressValidationMessage(value, false, "Pharmacy Address");
    case "streetAddress":
      return getAddressValidationMessage(value, false, "Street Address");
    case "city":
      return getCityValidationMessage(value, false);
    case "pharmacyBillingSoftwareName":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getSoftwareSystemValidationMessage(
        value,
        false,
        "Pharmacy Billing Software Name"
      );
    case "email":
      return getEmailTypingValidationMessage(input);
    case "pharmacyBillingSoftwareEmail":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getEmailTypingValidationMessage(input);
    case "phoneNumber":
      return getDigitsOnlyTypingValidationMessage(input, "Phone");
    case "fax":
      return getDigitsOnlyTypingValidationMessage(input, "Fax");
    case "zipCode":
      return getDigitsOnlyTypingValidationMessage(input, "Zip Code");
    case "globalLocationNumber":
      return getDigitsOnlyTypingValidationMessage(input, "Global Location Number");
    case "pharmacyBillingSoftwarePhone":
      if (!isOtherPharmacySoftwareSelection(ctx.selectedPharmacySoftwareId)) {
        return null;
      }
      return getDigitsOnlyTypingValidationMessage(
        input,
        "Pharmacy Billing Software Phone"
      );
    case "username":
      return getPersonNameValidationMessage(value, false, "Username");
    case "primaryContactName":
      return getPersonNameValidationMessage(value, false, "Contact Name");
    case "primaryContactTitle":
      return getContactTitleValidationMessage(value, false);
    case "primaryContactPhone":
      return getDigitsOnlyTypingValidationMessage(input, "Contact Phone");
    case "primaryContactEmail":
      return getEmailTypingValidationMessage(input);
    default:
      return null;
  }
}

type SignupFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  type?: "text" | "email" | "password" | "tel";
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  helperVariant?: "error" | "hint";
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onClearError?: () => void;
  uploadAccept?: string;
  onFileUpload?: (file: File | null) => void;
  uploadedFile?: File | null;
  stateBoardLicenseState?: StateLicenseContext | null;
};

function SignupField({
  label,
  name,
  required = false,
  type = "text",
  placeholder,
  error = false,
  helperText,
  helperVariant = "error",
  onChange,
  onBlur,
  onClearError,
  uploadAccept,
  onFileUpload,
  uploadedFile,
  stateBoardLicenseState,
}: SignupFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localFileUrl, setLocalFileUrl] = useState<string | null>(null);
  const isPassword = type === "password";
  const isPhone = type === "tel";
  const isEmail = type === "email";
  const isZip = name === "zipCode";
  const isGln = name === "globalLocationNumber";
  const isDea = name === "dea";
  const inputType = isPassword
    ? showPassword
      ? "text"
      : "password"
    : isEmail
      ? "text"
      : type;
  const trimmedHelper = helperText?.trim() ?? "";
  const numericMaxLength = isDea
    ? MAX_DEA_LENGTH
    : isPhone
    ? MAX_PHONE_DIGITS
    : isZip
      ? MAX_ZIP_DIGITS
      : isGln
        ? MAX_GLN_DIGITS
        : undefined;

  useEffect(() => {
    if (!uploadedFile) {
      setLocalFileUrl(null);
      return;
    }

    const url = URL.createObjectURL(uploadedFile);
    setLocalFileUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [uploadedFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (name === "dea") {
      const sanitized = sanitizeSignupDeaInput(e.target.value);
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    } else if (isPhone) {
      const sanitized = sanitizePhoneInput(e.target.value);
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    } else if (name === "globalLocationNumber") {
      const sanitized = sanitizeGlnInput(e.target.value);
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    } else if (name === "zipCode") {
      const sanitized = sanitizeZipInput(e.target.value);
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    } else if (name === "stateBoardOfPharmacyLicenseNumber") {
      const sanitized = sanitizeStateBoardLicenseInput(
        e.target.value,
        stateBoardLicenseState
      );
      if (e.target.value !== sanitized) {
        e.target.value = sanitized;
      }
    }
    onChange?.(e);
  };

  const handleInputBlur = () => {
    onBlur?.();
  };

  const handleRemoveUploadedFile = () => {
    onFileUpload?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleViewUploadedFile = () => {
    if (!localFileUrl) return;
    window.open(localFileUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadUploadedFile = () => {
    if (!localFileUrl || !uploadedFile) return;
    const link = document.createElement("a");
    link.href = localFileUrl;
    link.download = uploadedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="signup-field">
      <label htmlFor={name}>
        {label}
        {required && <span className="signup-required">*</span>}
      </label>
      <input
        id={name}
        className={`signup-input${error ? " signup-input--error" : ""}`}
        type={inputType}
        name={name}
        placeholder={placeholder}
        required={required}
        autoComplete={isPassword ? "new-password" : undefined}
        inputMode={
          isEmail ? "email" : numericMaxLength != null ? "numeric" : undefined
        }
        maxLength={numericMaxLength}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
      />
      {isPassword && (
        <button
          type="button"
          className="signup-password-toggle"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={`toggle ${label} visibility`}
        >
          {showPassword ? (
            <VisibilityOffIcon fontSize="small" />
          ) : (
            <VisibilityIcon fontSize="small" />
          )}
        </button>
      )}
      {onFileUpload && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={uploadAccept}
            className="signup-file-input"
            tabIndex={-1}
            onChange={(e) => {
              onFileUpload(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="signup-file-upload"
            onClick={() => fileInputRef.current?.click()}
            aria-label={`Upload ${label}`}
          >
            <UploadFileIcon fontSize="small" />
          </button>
        </>
      )}
      {trimmedHelper ? (
        <span
          className={`signup-helper${
            helperVariant === "hint" ? " signup-helper--hint" : ""
          }`}
        >
          {helperText}
        </span>
      ) : uploadedFile && localFileUrl ? null : (
        <span className="signup-helper" aria-hidden>
          {" "}
        </span>
      )}
      {uploadedFile && localFileUrl ? (
        <div className="upload-file-preview">
          <span className="upload-file-preview__name">{uploadedFile.name}</span>
          <div className="upload-file-preview__actions">
            <button
              type="button"
              className="upload-file-preview__btn upload-file-preview__btn--view"
              onClick={handleViewUploadedFile}
              aria-label="View file"
            >
              <VisibilityOutlinedIcon fontSize="inherit" />
            </button>
            <button
              type="button"
              className="upload-file-preview__btn upload-file-preview__btn--download"
              onClick={handleDownloadUploadedFile}
              aria-label="Download file"
            >
              <DownloadOutlinedIcon fontSize="inherit" />
            </button>
            <button
              type="button"
              className="upload-file-preview__btn upload-file-preview__btn--remove"
              onClick={handleRemoveUploadedFile}
              aria-label="Remove file"
            >
              <DeleteOutlineOutlinedIcon fontSize="inherit" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type SignupDateFieldProps = {
  label: string;
  name: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onClearError?: () => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  onBlur?: () => void;
};

function commitSignupDateValue(
  date: Dayjs | null | undefined,
  onChange: (value: string | null) => void
) {
  if (date?.isValid()) {
    onChange(toApiDateOnly(date));
    return;
  }
  onChange(null);
}

function commitSignupTypedDateValue(
  rawValue: string | undefined,
  onChange: (value: string | null) => void
) {
  const trimmed = rawValue?.trim() ?? "";
  if (!trimmed) {
    onChange(null);
    return;
  }

  const parsed = parseDisplayDateOnly(trimmed);
  if (parsed?.isValid()) {
    commitSignupDateValue(parsed, onChange);
    return;
  }
  if (isPartialDisplayDate(trimmed)) {
    return;
  }
  onChange(null);
}

function readSignupPickerFieldText(container: HTMLDivElement | null): string {
  if (!container) return "";

  const sectionList = container.querySelector(".MuiPickersSectionList-root");
  if (sectionList?.textContent?.trim()) {
    return sectionList.textContent.trim();
  }

  const input = container.querySelector("input");
  return input?.value?.trim() ?? "";
}

type SignupSelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onClearError?: () => void;
  options: StateDto[];
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
};

function SignupSelectField({
  label,
  name,
  value,
  onChange,
  onClearError,
  options,
  required = false,
  error = false,
  helperText,
  disabled = false,
}: SignupSelectFieldProps) {
  return (
    <div className="signup-field">
      <label htmlFor={name}>
        {label}
        {required && <span className="signup-required">*</span>}
      </label>
      <CustomSelect
        label={label}
        name={name}
        value={value}
        options={options.map((option) => ({
          label: getStateNameLabel(option),
          value: option.stateId,
        }))}
        optionLabel="label"
        optionValue="value"
        triggerClassName={`signup-input signup-select${error ? " signup-input--error" : ""}`}
        disabled={disabled}
        onChange={(event) => {
          onClearError?.();
          onChange(String(event.target.value));
        }}
      />
      <span className="signup-helper">{helperText ?? " "}</span>
    </div>
  );
}

type SignupSoftwareSelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; softwareName: string }>;
  disabled?: boolean;
};

function SignupSoftwareSelectField({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
}: SignupSoftwareSelectFieldProps) {
  return (
    <div className="signup-field">
      <label htmlFor={name}>{label}</label>
      <CustomSelect
        label={label}
        name={name}
        value={value}
        options={options}
        optionLabel="softwareName"
        optionValue="id"
        triggerClassName="signup-input signup-select"
        disabled={disabled}
        onChange={(event) => onChange(String(event.target.value))}
      />
      <span className="signup-helper"> </span>
    </div>
  );
}

function SignupDateField({
  label,
  name,
  value,
  onChange,
  onBlur,
  onClearError,
  required = false,
  error = false,
  helperText,
  placeholder = DISPLAY_DATE_FORMAT,
}: SignupDateFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedDateRef = useRef(false);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const closePicker = (options?: { clickAway?: boolean }) => {
    setOpen(false);

    if (
      options?.clickAway &&
      !selectedDateRef.current &&
      !parseDisplayDateOnly(valueRef.current)
    ) {
      selectedDateRef.current = true;
      onClearError?.();
      onChangeRef.current(toApiDateOnly(dayjs().startOf("day")));
    }

    selectedDateRef.current = false;
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      closePicker({ clickAway: true });
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const handleOpen = () => {
    selectedDateRef.current = false;
    setOpen(true);
  };

  const handlePickerChange = (date: Dayjs | null) => {
    if (date?.isValid()) {
      selectedDateRef.current = true;
      onClearError?.();
      commitSignupDateValue(date, onChange);
    }
  };

  const handlePickerAccept = (date: Dayjs | null) => {
    selectedDateRef.current = Boolean(date?.isValid());
    onClearError?.();
    commitSignupDateValue(date, onChange);
    setOpen(false);
  };

  const handleFieldBlur = (event: React.FocusEvent) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (nextTarget && wrapRef.current?.contains(nextTarget)) {
      return;
    }
    onClearError?.();
    commitSignupTypedDateValue(readSignupPickerFieldText(wrapRef.current), onChange);
    onBlur?.();
  };

  return (
    <div
      className={`signup-field signup-field--date${
        placeholder && !value ? " signup-field--has-placeholder" : ""
      }`}
    >
      <label htmlFor={name}>
        {label}
        {required && <span className="signup-required">*</span>}
      </label>
      <div className="signup-date-input-wrap" ref={wrapRef}>
        <DesktopDatePicker
          views={["year", "month", "day"]}
          openTo="day"
          format={DISPLAY_DATE_FORMAT}
          value={parseDisplayDateOnly(value)}
          open={open}
          onOpen={handleOpen}
          onClose={() => closePicker()}
          onChange={handlePickerChange}
          onAccept={handlePickerAccept}
          slotProps={{
            field: {
              onBlur: handleFieldBlur,
            },
            textField: {
              id: name,
              name,
              size: "small",
              fullWidth: true,
              required,
              error,
              className: "signup-date-input",
            },
            openPickerButton: {
              onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen((current) => {
                  if (current) {
                    selectedDateRef.current = false;
                  }
                  return !current;
                });
              },
            },
            popper: {
              disablePortal: true,
              placement: "bottom-start",
              popperOptions: {
                strategy: "absolute",
                modifiers: [{ name: "flip", enabled: false }],
              },
              sx: { zIndex: 10000 },
            },
          }}
        />
        {placeholder && !value && (
          <span className="signup-date-placeholder">{placeholder}</span>
        )}
      </div>
      <span className="signup-helper">{helperText ?? " "}</span>
    </div>
  );
}

function Login() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.toLowerCase() === "/admin";

  const { loading, error, message, loggedInUser } = useSelector(
    (state: RootState) => state.login
  );
  const { list: stateList, loading: statesLoading } = useSelector(
    (state: RootState) => state.state
  );
  const { list: pharmacySoftwareList, loading: pharmacySoftwareLoading } =
    useSelector((state: RootState) => state.pharmacysoftware);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [navigate]);

  // Warm the post-login route chunks while the user is on the login screen
  useEffect(() => {
    const preload = () => {
      void import("../home/Home");
      void import("../dashboard/Dashboard");
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const id = idleWindow.requestIdleCallback(preload, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(id);
    }

    const timer = window.setTimeout(preload, 400);
    return () => window.clearTimeout(timer);
  }, []);

  // Warm API TLS/connection so the first login POST is not also the first network hit
  useEffect(() => {
    void import("../../utils/CommonApi").then((mod) => {
      mod.warmApiConnection();
    });
  }, []);

  useEffect(() => {
    if (loggedInUser?.token && isAuthenticated()) {
      navigate(getPostLoginPath(), { replace: true });
    }
  }, [loggedInUser, navigate]);

  useEffect(() => {
    if (isAdminRoute) {
      setIsRegister(false);
      setErrorField("");
      dispatch(clearAuthState());
    }
  }, [dispatch, isAdminRoute]);

  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [errorField, setErrorField] = useState<string>("");
  const [fieldErrorMessages, setFieldErrorMessages] = useState<
    Record<string, string>
  >({});
  const [showPasswordHint, setShowPasswordHint] = useState(false);
  const [deaLicenseFile, setDeaLicenseFile] = useState<File | null>(null);
  const [stateBoardLicenseFile, setStateBoardLicenseFile] =
    useState<File | null>(null);
  const [deaExpirationDate, setDeaExpirationDate] = useState<string | null>(null);
  const [bopLicenseExpirationDate, setBopLicenseExpirationDate] = useState<
    string | null
  >(null);
  const [selectedStateId, setSelectedStateId] = useState("");
  const [selectedPharmacySoftwareId, setSelectedPharmacySoftwareId] =
    useState("");
  const [touchedSignupFields, setTouchedSignupFields] = useState<
    Partial<Record<SignupValidatedField, boolean>>
  >({});
  const signupFormRef = useRef<HTMLFormElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevCardHeightRef = useRef<number | null>(null);
  const [currentTerms, setCurrentTerms] = useState<TermsAndConditionsDto | null>(
    null
  );
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsLoadError, setTermsLoadError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const pharmacySoftwareOptions = useMemo(
    () => buildPharmacySoftwareDropdownOptions(pharmacySoftwareList),
    [pharmacySoftwareList]
  );
  const showOtherBillingSoftwareFields = isOtherPharmacySoftwareSelection(
    selectedPharmacySoftwareId
  );

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const nextHeight = card.scrollHeight;

    if (isRegister) {
      card.style.height = "";
      card.style.overflow = "";
      card.style.transition = "";
      prevCardHeightRef.current = nextHeight;
      return;
    }

    // Keep login card height auto so footer/OR content is never clipped
    card.style.height = "";
    card.style.overflow = "";
    card.style.transition = "";
    prevCardHeightRef.current = nextHeight;
  }, [isRegister, error]);

  useEffect(() => {
    if (isRegister) {
      dispatch(fetchStates());
      dispatch(fetchPharmacySoftware());
    }
  }, [dispatch, isRegister]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTermsLoading(true);
      setTermsLoadError(null);
      try {
        const terms = await fetchCurrentTermsApi();
        if (cancelled) return;
        setCurrentTerms(terms);
        if (!terms?.content) {
          setTermsLoadError(
            "Terms and Conditions are not available. Registration is temporarily unavailable."
          );
        }
      } catch {
        if (!cancelled) {
          setTermsLoadError(
            "Unable to load Terms and Conditions. Please try again later."
          );
          setCurrentTerms(null);
        }
      } finally {
        if (!cancelled) setTermsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRegister) {
      setTermsAccepted(false);
    }
  }, [isRegister]);

  useEffect(() => {
    if (message && isRegister) {
      showSuccess(message);
      dispatch(clearAuthState());
      setIsRegister(false);
    }
  }, [message, isRegister, dispatch]);

  // LOGIN SUBMIT
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;

    const email = (form.email as HTMLInputElement).value;
    const password = (form.password as HTMLInputElement).value;

    if (!email) return setErrorField("email");
    if (!password) return setErrorField("password");

    setErrorField("");

    const loginThunk = isAdminRoute ? loginUserAsync : loginEmployeeAsync;

    dispatch(
      loginThunk({
        Email: email,
        Password: password,
      })
    ).then((res) => {
      if (res.meta.requestStatus === "rejected") {
        form.reset();
        return;
      }
      if (res.meta.requestStatus === "fulfilled") {
        const userData = unwrapTokenPayload(
          res.payload as Parameters<typeof unwrapTokenPayload>[0]
        );

        if (!userData?.token) {
          localStorage.removeItem("admin")

               return;
               
        }

        const auth = persistAuth(userData);
        navigate(getPostLoginPath(auth), { replace: true });
      }
    });
  };

  const signupFieldError = (field: string) =>
    Boolean(fieldErrorMessages[field]) || errorField === field;

  const fieldErrorText = (field: string, defaultMessage: string) =>
    fieldErrorMessages[field] ?? (errorField === field ? defaultMessage : " ");

  const resetSignupForm = (form?: HTMLFormElement) => {
    form?.reset();
    setDeaExpirationDate(null);
    setBopLicenseExpirationDate(null);
    setSelectedStateId("");
    setSelectedPharmacySoftwareId("");
    setErrorField("");
    setFieldErrorMessages({});
    setTouchedSignupFields({});
    setShowPasswordHint(false);
    setDeaLicenseFile(null);
    setStateBoardLicenseFile(null);
  };

  const clearFieldError = (field: string) => {
    setFieldErrorMessages((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setErrorField((current) => (current === field ? "" : current));
  };

  const clearSignupServerMessage = () => {
    dispatch(clearAuthState());
  };

  const clearPasswordFieldErrors = () => {
    clearFieldError("userPassword");
    clearFieldError("userConfirmPassword");
  };

  const handlePasswordInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setShowPasswordHint(
      value.length > 0 && getPasswordValidationMessage(value) !== null
    );
    clearPasswordFieldErrors();
  };

  const clearSignupFieldError = (field: string) => () => clearFieldError(field);

  const readSignupInputValue = (field: string) => {
    const form = signupFormRef.current;
    if (!form) return "";
    return getInputValue(form, field);
  };

  const getSignupValidationContext = (): SignupValidationContext => ({
    readValue: readSignupInputValue,
    deaExpirationDate,
    bopLicenseExpirationDate,
    stateBoardLicenseFile,
    selectedStateId,
    selectedPharmacySoftwareId,
    stateLicenseContext: getStateLicenseContext(stateList, selectedStateId),
  });

  const setSignupFieldError = (field: string, message: string | null | undefined) => {
    if (message) {
      setFieldErrorMessages((prev) => ({ ...prev, [field]: message }));
      setErrorField(field);
      return;
    }
    clearFieldError(field);
  };

  const applySignupFieldValidation = (
    field: SignupValidatedField,
    value: string,
    options: { touched?: boolean; validateWhileTyping?: boolean; rawValue?: string } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!SIGNUP_TYPING_FIELDS.has(field)) return;

      const typingMessage = getSignupTypingValidationMessage(
        field,
        value,
        getSignupValidationContext(),
        options.rawValue
      );
      setSignupFieldError(field, typingMessage);
      return;
    }

    const shouldShow =
      options.touched ||
      touchedSignupFields[field] ||
      Boolean(fieldErrorMessages[field]);

    if (!shouldShow) return;

    if (!value.trim() && !options.touched && !touchedSignupFields[field]) {
      clearFieldError(field);
      return;
    }

    const message = getSignupFieldValidationMessage(
      field,
      value,
      getSignupValidationContext()
    );
    setSignupFieldError(field, message);
  };

  const markSignupFieldTouched = (field: SignupValidatedField) => {
    setTouchedSignupFields((prev) => ({ ...prev, [field]: true }));
  };

  const handleSignupFieldChange =
    (field: SignupValidatedField) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;

      clearSignupServerMessage();

      if (field === "dea") {
        clearFieldError("dea");
      }

      applySignupFieldValidation(field, value, {
        validateWhileTyping: true,
        rawValue: value,
      });

      if (field === "businessTradeName" && readSignupInputValue("dea")) {
        applySignupFieldValidation("dea", readSignupInputValue("dea"), {
          touched: Boolean(touchedSignupFields.dea || fieldErrorMessages.dea),
        });
      }
    };

  const handleSignupFieldBlur = (field: SignupValidatedField) => () => {
    markSignupFieldTouched(field);
    applySignupFieldValidation(field, readSignupInputValue(field), {
      touched: true,
    });
  };

  const signupFieldBindings = (field: SignupValidatedField, defaultMessage: string) => ({
    onChange: handleSignupFieldChange(field),
    onBlur: handleSignupFieldBlur(field),
    error: signupFieldError(field),
    helperText: fieldErrorText(field, defaultMessage),
  });

  const handleSignupDateChange =
    (
      field: "deaExpirationDate" | "bopLicenseExpirationDate",
      label: string,
      setter: React.Dispatch<React.SetStateAction<string | null>>
    ) =>
    (value: string | null) => {
      clearSignupServerMessage();
      clearFieldError(field);
      setter(value);
      if (!value) return;
      queueMicrotask(() => {
        const message = getExpirationDateValidationMessage(value, label, true);
        if (message) {
          setFieldErrorMessages((prev) => ({ ...prev, [field]: message }));
        }
      });
    };

  const handleSignupDateBlur =
    (field: "deaExpirationDate" | "bopLicenseExpirationDate", label: string) =>
    () => {
      const value =
        field === "deaExpirationDate" ? deaExpirationDate : bopLicenseExpirationDate;
      const message = getExpirationDateValidationMessage(value, label, true);
      if (message) {
        setFieldErrorMessages((prev) => ({ ...prev, [field]: message }));
      } else {
        clearFieldError(field);
      }
    };

  const handleDeaLicenseFile = (file: File | null) => {
    clearSignupServerMessage();

    if (!file) {
      setDeaLicenseFile(null);
      return;
    }
    const fileError = getPharmacyDocumentValidationMessage(file);
    if (fileError) {
      setDeaLicenseFile(null);
      setFieldErrorMessages({ dea: fileError });
      setErrorField("dea");
      return;
    }
    setDeaLicenseFile(file);
    clearFieldError("dea");
  };

  const handleStateBoardLicenseFile = (file: File | null) => {
    clearSignupServerMessage();

    if (!file) {
      setStateBoardLicenseFile(null);
      return;
    }
    const fileError = getPharmacyDocumentValidationMessage(file);
    if (fileError) {
      setStateBoardLicenseFile(null);
      setFieldErrorMessages({
        stateBoardOfPharmacyLicenseNumber: fileError,
      });
      setErrorField("stateBoardOfPharmacyLicenseNumber");
      return;
    }
    setStateBoardLicenseFile(file);
    clearFieldError("stateBoardOfPharmacyLicenseNumber");
  };

  const getInputValue = (form: HTMLFormElement, field: string) =>
    (form[field as keyof HTMLFormElement] as HTMLInputElement)?.value?.trim() ??
    "";

  // REGISTER SUBMIT
  const handlePharmacySoftwareChange = (value: string) => {
    clearSignupServerMessage();
    setSelectedPharmacySoftwareId(value);
    if (!isOtherPharmacySoftwareSelection(value)) {
      clearFieldError("pharmacyBillingSoftwareName");
      clearFieldError("pharmacyBillingSoftwarePhone");
      clearFieldError("pharmacyBillingSoftwareEmail");
    }
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;

    const businessLegalName = getInputValue(form, "businessLegalName");
    const businessTradeName = getInputValue(form, "businessTradeName");
    const pharmacyAddress = getInputValue(form, "pharmacyAddress");
    const streetAddress = getInputValue(form, "streetAddress");
    const city = getInputValue(form, "city");
    const zipCode = getInputValue(form, "zipCode");
    const phoneNumber = getInputValue(form, "phoneNumber");
    const fax = getInputValue(form, "fax");
    const email = getInputValue(form, "email");
    const dea = getInputValue(form, "dea");
    const stateBoardOfPharmacyLicenseNumber = getInputValue(
      form,
      "stateBoardOfPharmacyLicenseNumber"
    );
    const globalLocationNumber = getInputValue(form, "globalLocationNumber");
    const pharmacyBillingSoftwareName = getInputValue(
      form,
      "pharmacyBillingSoftwareName"
    );
    const pharmacyBillingSoftwarePhone = getInputValue(
      form,
      "pharmacyBillingSoftwarePhone"
    );
    const pharmacyBillingSoftwareEmail = getInputValue(
      form,
      "pharmacyBillingSoftwareEmail"
    );
    const isOtherSoftware = isOtherPharmacySoftwareSelection(
      selectedPharmacySoftwareId
    );

    const username = getInputValue(form, "username");
    const userPassword = getInputValue(form, "userPassword");
    const userConfirmPassword = getInputValue(form, "userConfirmPassword");
    const primaryContactName = getInputValue(form, "primaryContactName");
    const primaryContactTitle = getInputValue(form, "primaryContactTitle");
    const primaryContactPhone = getInputValue(form, "primaryContactPhone");
    const primaryContactEmail = getInputValue(form, "primaryContactEmail");

    setErrorField("");
    setFieldErrorMessages({});
    setTouchedSignupFields(
      Object.fromEntries(
        SIGNUP_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<SignupValidatedField, boolean>>
    );

    const signupCtx: SignupValidationContext = {
      readValue: (field) => getInputValue(form, field),
      deaExpirationDate,
      bopLicenseExpirationDate,
      stateBoardLicenseFile,
      selectedStateId,
      selectedPharmacySoftwareId,
      stateLicenseContext: getStateLicenseContext(stateList, selectedStateId),
    };

    const fieldErrors: Record<string, string> = {};

    for (const field of SIGNUP_VALIDATED_FIELDS) {
      const value =
        field === "stateId" ? selectedStateId : getInputValue(form, field);
      addSignupFieldError(
        fieldErrors,
        field,
        getSignupFieldValidationMessage(field, value, signupCtx)
      );
    }

    addSignupFieldError(
      fieldErrors,
      "deaExpirationDate",
      getExpirationDateValidationMessage(
        deaExpirationDate,
        "DEA Expiration Date",
        true
      )
    );
    addSignupFieldError(
      fieldErrors,
      "bopLicenseExpirationDate",
      getExpirationDateValidationMessage(
        bopLicenseExpirationDate,
        "BOP License Expiration Date",
        true
      )
    );

    if (deaLicenseFile) {
      addSignupFieldError(
        fieldErrors,
        "dea",
        getPharmacyDocumentValidationMessage(deaLicenseFile)
      );
    }
    if (stateBoardLicenseFile) {
      addSignupFieldError(
        fieldErrors,
        "stateBoardOfPharmacyLicenseNumber",
        getPharmacyDocumentValidationMessage(stateBoardLicenseFile)
      );
    }

    if (!currentTerms?.id || !currentTerms.content) {
      setFieldErrorMessages({
        termsAccepted:
          termsLoadError ??
          "Terms and Conditions are not available. Registration cannot be completed.",
      });
      return;
    }

    if (!termsAccepted) {
      setFieldErrorMessages({
        termsAccepted: "You must accept the Terms and Conditions to register.",
      });
      return;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrorMessages(fieldErrors);
      return;
    }

    const registerRes = await dispatch(
      registerPharmacyEmployeeAsync({
        businessLegalName,
        businessTradeName,
        dea,
        phoneNumber,
        fax,
        streetAddress,
        pharmacyAddress,
        city,
        stateId: selectedStateId,
        stateName:
          stateList.find(
            (state) =>
              state.stateId.toLowerCase() === selectedStateId.toLowerCase()
          )?.stateName ?? undefined,
        zipCode,
        email,
        deaExpirationDate,
        stateBoardOfPharmacyLicenseNumber,
        bopLicenseExpirationDate,
        globalLocationNumber,
        pharmacySoftwareId: isOtherSoftware ? undefined : selectedPharmacySoftwareId,
        pharmacyBillingSoftwareName: isOtherSoftware
          ? pharmacyBillingSoftwareName
          : undefined,
        pharmacyBillingSoftwarePhone: isOtherSoftware
          ? pharmacyBillingSoftwarePhone
          : undefined,
        pharmacyBillingSoftwareEmail: isOtherSoftware
          ? pharmacyBillingSoftwareEmail
          : undefined,
        userEmail: primaryContactEmail,
        name: username,
        password: userPassword,
        confirmPassword: userConfirmPassword,
        role: PHARMACY_SIGNUP_ROLE,
        primaryContactName,
        primaryContactTitle,
        primaryContactPhone,
        deaLicenseFile,
        stateBoardLicenseFile,
        acceptedTermsAndConditions: true,
      })
    );

    if (registerRes.meta.requestStatus === "rejected") {
      const payload = registerRes.payload;
      const apiFieldErrors = mapSignupApiFieldErrors(
        fieldErrorsFromApiBody(payload)
      );
      const apiFieldNames = Object.keys(apiFieldErrors);

      if (apiFieldNames.length > 0) {
        setFieldErrorMessages(apiFieldErrors);
        setErrorField(apiFieldNames[0]);
        dispatch(clearAuthState());
        return;
      }

      const apiMessage = String(
        typeof payload === "string"
          ? payload
          : messageFromApiBody(payload) ?? ""
      );
      if (apiMessage.includes("INVALID_PHARMACY_DOCUMENT_FORMAT")) {
        if (deaLicenseFile) {
          setFieldErrorMessages({ dea: PHARMACY_DOCUMENT_FORMAT_ERROR });
          setErrorField("dea");
        } else if (stateBoardLicenseFile) {
          setFieldErrorMessages({
            stateBoardOfPharmacyLicenseNumber: PHARMACY_DOCUMENT_FORMAT_ERROR,
          });
          setErrorField("stateBoardOfPharmacyLicenseNumber");
        }
        dispatch(clearAuthState());
        return;
      }
      resetSignupForm(form);
      return;
    }

    if (registerRes.meta.requestStatus === "fulfilled") {
      resetSignupForm(form);
      setIsRegister(false);
      dispatch(clearAuthState());
    } else {
      resetSignupForm(form);
    }
  };

  const loginForm = (
    <Box component="form" className="auth-form" onSubmit={handleLogin}>
      <AuthTextField
        startIcon={<MailIcon fontSize="small" />}
        type="email"
        name="email"
        label={isAdminRoute ? "Admin email" : "Work email"}
        required
        error={errorField === "email"}
        helperText={errorField === "email" ? "Please enter your email" : " "}
      />

      <AuthTextField
        startIcon={<LockIcon fontSize="small" />}
        type="password"
        name="password"
        label="Password"
        required
        error={errorField === "password"}
        helperText={errorField === "password" ? "Please enter your password" : " "}
      />

      <GradientButton type="submit" loading={loading} loadingLabel="Logging...">
        Log In
      </GradientButton>
    </Box>
  );

  return (
    <Box
      component="main"
      className={
        isRegister
          ? "login-main-container login-main-container--register"
          : "login-main-container"
      }
    >
      <Container
        maxWidth={false}
        className={isRegister ? "login-shell login-shell--register" : "login-shell"}
      >
        <Typography className="bg-text" aria-hidden>
          RxIntel
        </Typography>
        <Paper
          ref={cardRef}
          className={isRegister ? "login-card login-card--register" : "login-card"}
          elevation={0}
          sx={{ backgroundColor: "transparent", backgroundImage: "none" }}
        >
          <Stack
            className={isRegister ? "auth-stack auth-stack--register" : "auth-stack"}
          >
        {!isRegister ? (
          <Box>
            <Box className="login-logo-wrap">
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/assets/rxintel-logo.svg`}
                alt="RxIntel"
                className="login-logo"
              />
            </Box>
            <Typography variant="h5" className="auth-title" sx={{ textAlign: "center" }}>
              Welcome Back
            </Typography>
            <Typography
              variant="body2"
              className="subtitle"
              sx={{ textAlign: "center", mb: 1.5 }}
            >
              Pharma intelligence workspace.
            </Typography>

            {loginForm}

            {!isAdminRoute && (
              <>
                <AuthOrDivider />
                <Button
                  type="button"
                  variant="outlined"
                  fullWidth
                  startIcon={<PersonAddAlt1Icon />}
                  onClick={() => {
                    dispatch(clearAuthState());
                    resetSignupForm();
                    setIsRegister(true);
                  }}
                  sx={{
                    minHeight: 44,
                    borderColor: rxBrand.border,
                    color: rxBrand.teal,
                    fontWeight: 600,
                    bgcolor: "rgba(255,255,255,0.9)",
                    "&:hover": {
                      borderColor: rxBrand.green,
                      bgcolor: "rgba(102, 194, 133, 0.08)",
                      color: rxBrand.greenDeep,
                    },
                  }}
                >
                  Create an account
                </Button>
              </>
            )}
          </Box>
        ) : (
          <>
            <Box className="login-logo-wrap">
              <img
                src={`${process.env.PUBLIC_URL}/assets/rxintel-logo.svg`}
                alt="RxIntel"
                className="login-logo"
              />
            </Box>
            <Typography className="auth-title">Create Account</Typography>
            <Typography className="subtitle">
              Pharma intelligence workspace.
            </Typography>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Box
                component="form"
                ref={signupFormRef}
                className="auth-form auth-form--register"
                onSubmit={handleRegister}
              >
                <Typography className="signup-section-heading">
                  Pharmacy Details
                </Typography>

                <Box className="signup-fields-grid">
                  {/* Row 1 — Business & DEA */}
                  <SignupField
                    label="Business Legal Name"
                    name="businessLegalName"
                    placeholder="Enter business legal name"
                    required
                    {...signupFieldBindings(
                      "businessLegalName",
                      "Please enter business legal name"
                    )}
                  />
                  <SignupField
                    label="Business Trade Name (DBA)"
                    name="businessTradeName"
                    placeholder="Enter business trade name"
                    required
                    {...signupFieldBindings(
                      "businessTradeName",
                      "Please enter business trade name"
                    )}
                  />
                  <SignupField
                    label="DEA"
                    name="dea"
                    placeholder="Enter DEA number"
                    required
                    {...signupFieldBindings("dea", "Please enter DEA number")}
                    uploadAccept={PHARMACY_DOCUMENT_ACCEPT}
                    onFileUpload={handleDeaLicenseFile}
                    uploadedFile={deaLicenseFile}
                  />
                  <SignupDateField
                    label="DEA Expiration Date"
                    name="deaExpirationDate"
                    value={deaExpirationDate}
                    onChange={handleSignupDateChange(
                      "deaExpirationDate",
                      "DEA Expiration Date",
                      setDeaExpirationDate
                    )}
                    onBlur={handleSignupDateBlur(
                      "deaExpirationDate",
                      "DEA Expiration Date"
                    )}
                    onClearError={clearSignupFieldError("deaExpirationDate")}
                    required
                    error={signupFieldError("deaExpirationDate")}
                    helperText={fieldErrorText(
                      "deaExpirationDate",
                      "Please enter DEA expiration date"
                    )}
                  />

                  {/* Row 2 — License, Software & GLN */}
                  <SignupField
                    label="State Board License"
                    name="stateBoardOfPharmacyLicenseNumber"
                    placeholder="Enter license number"
                    required
                    {...signupFieldBindings(
                      "stateBoardOfPharmacyLicenseNumber",
                      "Please enter license number"
                    )}
                    stateBoardLicenseState={getStateLicenseContext(
                      stateList,
                      selectedStateId
                    )}
                    uploadAccept={PHARMACY_DOCUMENT_ACCEPT}
                    onFileUpload={handleStateBoardLicenseFile}
                    uploadedFile={stateBoardLicenseFile}
                  />
                  <SignupDateField
                    label="BOP License Expiration Date"
                    name="bopLicenseExpirationDate"
                    value={bopLicenseExpirationDate}
                    onChange={handleSignupDateChange(
                      "bopLicenseExpirationDate",
                      "BOP License Expiration Date",
                      setBopLicenseExpirationDate
                    )}
                    onBlur={handleSignupDateBlur(
                      "bopLicenseExpirationDate",
                      "BOP License Expiration Date"
                    )}
                    onClearError={clearSignupFieldError("bopLicenseExpirationDate")}
                    required
                    error={signupFieldError("bopLicenseExpirationDate")}
                    helperText={fieldErrorText(
                      "bopLicenseExpirationDate",
                      "Please enter BOP license expiration date"
                    )}
                  />
                  <SignupSoftwareSelectField
                    label="Software Name"
                    name="pharmacySoftwareId"
                    value={selectedPharmacySoftwareId}
                    onChange={handlePharmacySoftwareChange}
                    options={pharmacySoftwareOptions}
                    disabled={pharmacySoftwareLoading}
                  />
                  {showOtherBillingSoftwareFields && (
                    <>
                      <SignupField
                        label="Pharmacy Billing Software Name"
                        name="pharmacyBillingSoftwareName"
                        placeholder="Enter pharmacy billing software name"
                        required
                        {...signupFieldBindings(
                          "pharmacyBillingSoftwareName",
                          "Pharmacy Billing Software Name is required"
                        )}
                      />
                      <SignupField
                        label="Pharmacy Billing Software Phone"
                        name="pharmacyBillingSoftwarePhone"
                        type="tel"
                        placeholder="Enter pharmacy billing software phone"
                        {...signupFieldBindings("pharmacyBillingSoftwarePhone", " ")}
                      />
                      <SignupField
                        label="Pharmacy Billing Software Email"
                        name="pharmacyBillingSoftwareEmail"
                        type="email"
                        placeholder="Enter pharmacy billing software email"
                        {...signupFieldBindings("pharmacyBillingSoftwareEmail", " ")}
                      />
                    </>
                  )}
                  <SignupField
                    label="GLN"
                    name="globalLocationNumber"
                    placeholder="Enter global location number"
                    {...signupFieldBindings("globalLocationNumber", " ")}
                  />

                  {/* Row 3 — Address & Contact */}
                  <SignupField
                    label="Pharmacy Address"
                    name="pharmacyAddress"
                    placeholder="Enter pharmacy address"
                    required
                    {...signupFieldBindings(
                      "pharmacyAddress",
                      "Please enter pharmacy address"
                    )}
                  />
                  <SignupField
                    label="Street Address"
                    name="streetAddress"
                    placeholder="Enter street address"
                    {...signupFieldBindings("streetAddress", " ")}
                  />
                  <SignupField
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="Enter email"
                    required
                    {...signupFieldBindings("email", "Please enter pharmacy email")}
                  />
                  <SignupField
                    label="Phone"
                    name="phoneNumber"
                    type="tel"
                    placeholder="Enter phone"
                    required
                    {...signupFieldBindings("phoneNumber", "Please enter pharmacy phone")}
                  />

                  {/* Row 4 — Fax, State, City & Zip Code */}
                  <SignupField
                    label="Fax"
                    name="fax"
                    type="tel"
                    placeholder="Enter fax"
                    {...signupFieldBindings("fax", " ")}
                  />
                  <SignupSelectField
                    label="State Name"
                    name="stateId"
                    value={selectedStateId}
                    onChange={(value) => {
                      clearSignupServerMessage();
                      setSelectedStateId(value);
                      markSignupFieldTouched("stateId");
                      applySignupFieldValidation("stateId", value, { touched: true });
                      const licenseValue = readSignupInputValue(
                        "stateBoardOfPharmacyLicenseNumber"
                      );
                      if (
                        licenseValue.trim() ||
                        touchedSignupFields.stateBoardOfPharmacyLicenseNumber
                      ) {
                        applySignupFieldValidation(
                          "stateBoardOfPharmacyLicenseNumber",
                          licenseValue,
                          { touched: true }
                        );
                      }
                    }}
                    options={getStatesWithName(stateList)}
                    required
                    disabled={statesLoading}
                    error={signupFieldError("stateId")}
                    helperText={fieldErrorText(
                      "stateId",
                      statesLoading
                        ? "Loading states..."
                        : "Please select state name"
                    )}
                  />
                  <SignupField
                    label="City"
                    name="city"
                    placeholder="Enter city"
                    required
                    {...signupFieldBindings("city", "Please enter city")}
                  />
                  <SignupField
                    label="Zip Code"
                    name="zipCode"
                    placeholder="Enter zip code"
                    required
                    {...signupFieldBindings("zipCode", "Please enter zip code")}
                  />
                </Box>

                <Typography className="signup-section-heading">
                  Pharmacy User Details
                </Typography>

                <Box className="signup-fields-grid">
                  <SignupField
                    label="Username"
                    name="username"
                    placeholder="Enter username"
                    required
                    {...signupFieldBindings("username", "Please enter username")}
                  />
                  <SignupField
                    label="Password"
                    name="userPassword"
                    type="password"
                    placeholder="Enter password"
                    required
                    onChange={(e) => {
                      handlePasswordInput(e);
                      handleSignupFieldChange("userPassword")(e);
                    }}
                    onBlur={handleSignupFieldBlur("userPassword")}
                    error={signupFieldError("userPassword")}
                    helperText={
                      signupFieldError("userPassword")
                        ? fieldErrorText("userPassword", "Please enter password")
                        : showPasswordHint
                          ? PASSWORD_REQUIREMENTS_HINT
                          : " "
                    }
                    helperVariant={
                      signupFieldError("userPassword")
                        ? "error"
                        : showPasswordHint
                          ? "hint"
                          : "error"
                    }
                  />
                  <SignupField
                    label="Confirm Password"
                    name="userConfirmPassword"
                    type="password"
                    placeholder="Confirm password"
                    required
                    {...signupFieldBindings(
                      "userConfirmPassword",
                      "Passwords must match"
                    )}
                  />
                  <SignupField
                    label="Contact Name"
                    name="primaryContactName"
                    placeholder="Enter contact name"
                    required
                    {...signupFieldBindings(
                      "primaryContactName",
                      "Please enter contact name"
                    )}
                  />
                </Box>

                <Box className="signup-fields-grid signup-fields-grid--3col">
                  <SignupField
                    label="Contact Title"
                    name="primaryContactTitle"
                    placeholder="Enter contact title"
                    {...signupFieldBindings("primaryContactTitle", " ")}
                  />
                  <SignupField
                    label="Contact Phone"
                    name="primaryContactPhone"
                    type="tel"
                    placeholder="Enter contact phone"
                    required
                    {...signupFieldBindings(
                      "primaryContactPhone",
                      "Please enter contact phone"
                    )}
                  />
                  <SignupField
                    label="Contact Email"
                    name="primaryContactEmail"
                    type="email"
                    placeholder="Enter contact email"
                    required
                    {...signupFieldBindings(
                      "primaryContactEmail",
                      "Please enter contact email"
                    )}
                  />
                </Box>

                <Box className="login-terms-row">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={termsAccepted}
                        onChange={(_, checked) => {
                          setTermsAccepted(checked);
                          if (checked) {
                            setFieldErrorMessages((prev) => {
                              const next = { ...prev };
                              delete next.termsAccepted;
                              return next;
                            });
                          }
                        }}
                        disabled={
                          termsLoading ||
                          !currentTerms?.content ||
                          Boolean(termsLoadError)
                        }
                        slotProps={{
                          input: { "aria-label": "Accept Terms and Conditions" },
                        }}
                        sx={{
                          color: rxBrand.teal,
                          "&.Mui-checked": { color: rxBrand.green },
                        }}
                      />
                    }
                    label={
                      <Typography component="span" className="login-terms-label">
                        I agree to the{" "}
                        <Link
                          component={RouterLink}
                          to="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="login-terms-link"
                          underline="hover"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Terms and Conditions
                        </Link>
                        .
                      </Typography>
                    }
                  />
                </Box>
                {fieldErrorMessages.termsAccepted ? (
                  <Typography className="error-text" sx={{ mt: 0, mb: 0.5 }}>
                    {fieldErrorMessages.termsAccepted}
                  </Typography>
                ) : null}

                <GradientButton
                  className="signup-register-btn"
                  type="submit"
                  loading={loading}
                  loadingLabel="Registering..."
                  disabled={
                    termsLoading ||
                    !currentTerms?.content ||
                    Boolean(termsLoadError)
                  }
                  sx={{ mt: 1.5 }}
                >
                  Register
                </GradientButton>
              </Box>
            </LocalizationProvider>

            <AuthOrDivider />

            <Button
              type="button"
              variant="outlined"
              fullWidth
              onClick={() => {
                dispatch(clearAuthState());
                resetSignupForm();
                setIsRegister(false);
              }}
              sx={{
                minHeight: 44,
                borderColor: rxBrand.border,
                color: rxBrand.teal,
                fontWeight: 600,
                bgcolor: "rgba(255,255,255,0.9)",
                "&:hover": {
                  borderColor: rxBrand.green,
                  bgcolor: "rgba(102, 194, 133, 0.08)",
                  color: rxBrand.greenDeep,
                },
              }}
            >
              Back to Login
            </Button>
          </>
        )}

        {error && (
          <Typography className="error-text">{error}</Typography>
        )}

        <AuthInfoBox />

        <Box className="login-site-footer">
          <Typography
            variant="caption"
            className="copyright"
            sx={{
              color: rxBrand.muted,
              m: 0,
            }}
          >
            © 2026 RxIntel. All rights reserved.
          </Typography>
          {!isRegister ? (
            <>
              <span className="login-site-footer-sep" aria-hidden="true">
                ·
              </span>
              <Link
                component={RouterLink}
                to="/terms"
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                className="login-site-footer-link"
                underline="hover"
              >
                Terms and Conditions
              </Link>
            </>
          ) : null}
        </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

export default Login;