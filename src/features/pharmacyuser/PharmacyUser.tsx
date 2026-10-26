import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./PharmacyUser.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPharmacyUser,
  addPharmacyUser,
  deletePharmacyUser,
} from "../../slice/PharmacyUserSlice";
import FormValidation, { evaluateFormRules } from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import FormField from "../../component/molecules/FormField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import type { AppDispatch, RootState } from "../../app/store";
import type { PharmacyUserDto } from "../../dto/pharmacyUserDto";
import {
  getPharmacyUserRoleLabel,
  isPharmacyAdminRole,
  PHARMACY_USER_ROLE_OPTIONS,
  PharmacyUserRole,
} from "../../enums/PharmacyUserRole";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import { getPharmacyId, hasPharmacyAdminRole, isAdminUser, isEmployee } from "../../component/auth/authUtils";
import { usePharmacyDisplayName } from "../../hooks/usePharmacyDisplayName";
import { getPharmacyPossessivePageTitle } from "../../utils/pharmacyPageTitle";
import {
  getBusinessNameValidationMessage,
  getContactTitleValidationMessage,
  getDigitsOnlyTypingValidationMessage,
  getEmailTypingValidationMessage,
  getEmailValidationMessage,
  getPersonNameValidationMessage,
  getPhoneFormatValidationMessage,
  sanitizePhoneInput,
} from "../../utils/pharmacyValidation";
import {
  getPasswordValidationMessage,
  PASSWORD_REQUIREMENTS_HINT,
} from "../../utils/validation";

type PharmacyUserFormState = ReturnType<typeof createEmptyPharmacyUserForm>;

const PHARMACY_USER_FORM_RULES = {
  name: { required: true },
  userEmail: { required: true },
  password: { required: true },
  role: { required: true },
  pharmacyId: { required: true },
};

const PHARMACY_USER_VALIDATED_FIELDS = [
  "userEmail",
  "name",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactPhone",
  "primaryWholesalerName",
  "primaryWholesalerContactName",
  "primaryWholesalerPhone",
  "primaryWholesalerEmail",
] as const;

type PharmacyUserValidatedField = (typeof PHARMACY_USER_VALIDATED_FIELDS)[number];

/** Fields that show invalid-character errors while typing (not length/format). */
const PHARMACY_USER_TYPING_FIELDS = new Set<PharmacyUserValidatedField>([
  "userEmail",
  "name",
  "primaryContactName",
  "primaryContactTitle",
  "primaryContactPhone",
  "primaryWholesalerName",
  "primaryWholesalerContactName",
  "primaryWholesalerPhone",
  "primaryWholesalerEmail",
]);

function createEmptyPharmacyUserForm() {
  return {
    id: undefined as string | undefined,
    name: "",
    userEmail: "",
    password: "",
    confirmPassword: "",
    role: "",
    isActive: true,
    primaryContactName: "",
    primaryContactTitle: "",
    primaryContactPhone: "",
    primaryWholesalerName: "",
    primaryWholesalerContactName: "",
    primaryWholesalerPhone: "",
    primaryWholesalerEmail: "",
  };
}

function getPharmacyUserFieldValidationMessage(
  field: PharmacyUserValidatedField,
  form: PharmacyUserFormState
): string | null {
  switch (field) {
    case "userEmail":
      return getEmailValidationMessage(form.userEmail, true);
    case "name":
      return getPersonNameValidationMessage(form.name, true, "Name");
    case "primaryContactName":
      return getPersonNameValidationMessage(
        form.primaryContactName,
        false,
        "Contact Name"
      );
    case "primaryContactTitle":
      return getContactTitleValidationMessage(form.primaryContactTitle);
    case "primaryContactPhone":
      return getPhoneFormatValidationMessage(
        form.primaryContactPhone,
        "Contact Phone"
      );
    case "primaryWholesalerName":
      return getBusinessNameValidationMessage(
        form.primaryWholesalerName,
        false,
        "Primary Wholesaler Name"
      );
    case "primaryWholesalerContactName":
      return getPersonNameValidationMessage(
        form.primaryWholesalerContactName,
        false,
        "Wholesaler Contact"
      );
    case "primaryWholesalerPhone":
      return getPhoneFormatValidationMessage(
        form.primaryWholesalerPhone,
        "Wholesaler Phone"
      );
    case "primaryWholesalerEmail":
      return getEmailValidationMessage(form.primaryWholesalerEmail);
    default:
      return null;
  }
}

function getPharmacyUserTypingValidationMessage(
  field: PharmacyUserValidatedField,
  form: PharmacyUserFormState,
  rawValue?: string
): string | null {
  switch (field) {
    case "userEmail":
      return getEmailTypingValidationMessage(rawValue ?? form.userEmail);
    case "name":
      return getPersonNameValidationMessage(form.name, false, "Name");
    case "primaryContactName":
      return getPersonNameValidationMessage(
        form.primaryContactName,
        false,
        "Contact Name"
      );
    case "primaryContactTitle":
      return getContactTitleValidationMessage(form.primaryContactTitle, false);
    case "primaryContactPhone":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? form.primaryContactPhone,
        "Contact Phone"
      );
    case "primaryWholesalerName":
      return getBusinessNameValidationMessage(
        form.primaryWholesalerName,
        false,
        "Primary Wholesaler Name"
      );
    case "primaryWholesalerContactName":
      return getPersonNameValidationMessage(
        form.primaryWholesalerContactName,
        false,
        "Wholesaler Contact"
      );
    case "primaryWholesalerPhone":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? form.primaryWholesalerPhone,
        "Wholesaler Phone"
      );
    case "primaryWholesalerEmail":
      return getEmailTypingValidationMessage(
        rawValue ?? form.primaryWholesalerEmail
      );
    default:
      return null;
  }
}

function collectPharmacyUserFieldErrors(
  form: PharmacyUserFormState
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of PHARMACY_USER_VALIDATED_FIELDS) {
    const message = getPharmacyUserFieldValidationMessage(field, form);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

export default function PharmacyUser() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryPharmacyId = searchParams.get("pharmacyId") || "";
  const queryPharmacyName = searchParams.get("pharmacyName") || "";
  const tokenPharmacyId = getPharmacyId() || "";
  const selectedPharmacyId = queryPharmacyId || tokenPharmacyId;
  const pharmacyDisplayName = usePharmacyDisplayName(
    selectedPharmacyId,
    queryPharmacyName
  );
  const pageTitle = getPharmacyPossessivePageTitle(
    pharmacyDisplayName,
    "User",
    "Pharmacy User"
  );
  const employeeSession = isEmployee();
  const superAdminSession = isAdminUser();
  const canManagePharmacyUsers =
    superAdminSession || (employeeSession && hasPharmacyAdminRole());

  useEffect(() => {
    if (!employeeSession || queryPharmacyId || !tokenPharmacyId) return;
    navigate(`/pharmacyuser?pharmacyId=${tokenPharmacyId}`, { replace: true });
  }, [employeeSession, queryPharmacyId, tokenPharmacyId, navigate]);

  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.pharmacyuser
  );

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      onSearchInputChange: () => {
        setPageParam((prev) =>
          prev.page === 1 ? prev : { ...prev, page: 1 }
        );
      },
    });

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation(
      {
        name: "",
        userEmail: "",
        password: "",
        role: "",
        pharmacyId: "",
      },
      PHARMACY_USER_FORM_RULES
    );

  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<PharmacyUserFormState>(() =>
    createEmptyPharmacyUserForm()
  );
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<PharmacyUserValidatedField, boolean>>
  >({});
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();

  useEffect(() => {
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  }, [selectedPharmacyId]);

  useEffect(() => {
    if (!selectedPharmacyId) return;
    dispatch(
      fetchPharmacyUser({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        pharmacyId: selectedPharmacyId,
        isActive: status === "active",
      })
    );
  }, [dispatch, pageParam, debouncedSearch, selectedPharmacyId, status]);

  const roleOptions = useMemo(() => {
    const pharmacyAdminAlreadyAssigned = list.some(
      (user) => isPharmacyAdminRole(user.role) && user.id !== form.id
    );

    if (!pharmacyAdminAlreadyAssigned) {
      return [...PHARMACY_USER_ROLE_OPTIONS];
    }

    return PHARMACY_USER_ROLE_OPTIONS.filter(
      (option) => option.value !== PharmacyUserRole.PharmacyAdmin
    );
  }, [list, form.id]);

  const columns: {
    header: string;
    accessor: keyof PharmacyUserDto;
    render?: (row: PharmacyUserDto) => React.ReactNode;
  }[] = [
    {
      header: "User/Email",
      accessor: "userEmail",
      render: (row) => row.userEmail ?? "",
    },
    { header: "Name", accessor: "name" },
    {
      header: "Role",
      accessor: "role",
      render: (row) => getPharmacyUserRoleLabel(row.role),
    },
    {
      header: "Status",
      accessor: "isActive",
      render: (row) => (
        <Button type={row.isActive ? "active" : "inactive"} />
      ),
    },
  ];

  const handleBack = () => {
    if (employeeSession && hasPharmacyAdminRole()) {
      navigate("/pharmacy");
      return;
    }
    if (employeeSession) return;
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/pharmacy");
  };

  const reloadList = () => {
    if (!selectedPharmacyId) return;
    dispatch(
      fetchPharmacyUser({
        ...pageParam,
        searchText: debouncedSearch || undefined,
        pharmacyId: selectedPharmacyId,
        isActive: status === "active",
      })
    );
  };

  const markFieldTouched = (field: PharmacyUserValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: PharmacyUserValidatedField,
    nextForm: PharmacyUserFormState,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!PHARMACY_USER_TYPING_FIELDS.has(field)) return;

      const typingMessage = getPharmacyUserTypingValidationMessage(
        field,
        nextForm,
        options.rawValue
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = String(nextForm[field as keyof PharmacyUserFormState] ?? "").trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getPharmacyUserFieldValidationMessage(field, nextForm);

    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: PharmacyUserValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as PharmacyUserValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    if (name === "isActive") {
      setForm({ ...form, isActive: value === "true" });
      return;
    }

    const nextValue =
      name === "primaryContactPhone" || name === "primaryWholesalerPhone"
        ? sanitizePhoneInput(value)
        : value;

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    if (PHARMACY_USER_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, {
        validateWhileTyping: true,
        rawValue: value,
      });
    }
  };

  const handleSave = async () => {
    clearActionMessage();

    const isAdd = form.id == null;
    const validateData = {
      name: form.name,
      userEmail: form.userEmail,
      password: isAdd ? form.password : "skip-password-check",
      role: form.role,
      pharmacyId: selectedPharmacyId,
    };

    const fieldErrors = collectPharmacyUserFieldErrors(form);
    const requiredErrors = evaluateFormRules(validateData, PHARMACY_USER_FORM_RULES);

    if (isAdd) {
      const passwordError = getPasswordValidationMessage(form.password);
      if (passwordError) {
        requiredErrors.password = passwordError;
      }

      const confirmPassword = form.confirmPassword?.trim() ?? "";
      if (!confirmPassword) {
        requiredErrors.confirmPassword = "Please confirm password";
      } else if (confirmPassword !== form.password?.trim()) {
        requiredErrors.confirmPassword = "Password and Confirm Password must match";
      }
    }

    const allErrors = { ...requiredErrors, ...fieldErrors };
    setFieldErrors(allErrors);
    setTouchedFields(
      Object.fromEntries(
        PHARMACY_USER_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<PharmacyUserValidatedField, boolean>>
    );

    if (Object.keys(allErrors).length > 0) return;

    const isValid = validate(validateData);
    if (!isValid) return;

    const trimmedPassword = form.password?.trim();
    const payload: Partial<PharmacyUserDto> = {
      id: form.id ? form.id : undefined,
      pharmacyId: selectedPharmacyId,
      name: form.name?.trim() || null,
      userEmail: form.userEmail?.trim() || null,
      role: Number(form.role) as PharmacyUserRole,
      isActive: form.isActive,
      primaryContactName: form.primaryContactName?.trim() || null,
      primaryContactTitle: form.primaryContactTitle?.trim() || null,
      primaryContactPhone: form.primaryContactPhone?.trim() || null,
      primaryWholesalerName: form.primaryWholesalerName?.trim() || null,
      primaryWholesalerContactName:
        form.primaryWholesalerContactName?.trim() || null,
      primaryWholesalerPhone: form.primaryWholesalerPhone?.trim() || null,
      primaryWholesalerEmail: form.primaryWholesalerEmail?.trim() || null,
    };

    if (isAdd) {
      payload.password = trimmedPassword || null;
      payload.confirmPassword = form.confirmPassword?.trim() || null;
    }

    try {
      await dispatch(addPharmacyUser(payload)).unwrap();
      setShowDrawer(false);
      reloadList();
    } catch (err) {
      clearErrors();
      const message = messageFromApiBody(err);
      showActionMessage(message);
    }
  };

  const handleReset = () => {
    setForm({
      ...createEmptyPharmacyUserForm(),
      ...(form.id ? { id: form.id } : {}),
    });
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleCloseModal = () => {
    setShowDrawer(false);
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleDelete = useDeleteHandler({
    list,
    getDisplayName: (row) => row.userEmail ?? row.name ?? "this pharmacy user",
    deleteThunk: deletePharmacyUser,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell pharmacyuser-page">
      <div className="card page-card">
        {(!employeeSession || hasPharmacyAdminRole()) && (
          <div className="pu-top-toolbar">
            <Button type="back" onClick={handleBack} />
          </div>
        )}

        <PageCardHeader
          icon={<GroupOutlinedIcon />}
          title={pageTitle}
          subtitle="Manage and view users linked to this pharmacy."
          actions={
            <Button
              type="add"
              label="+ Add Pharmacy User"
              onClick={() => {
                setForm(createEmptyPharmacyUserForm());
                setTouchedFields({});
                setShowDrawer(true);
                clearActionMessage();
                clearErrors();
              }}
              disabled={!selectedPharmacyId}
            />
          }
        />

        {!selectedPharmacyId && (
          <div className="pu-banner">
            {employeeSession
              ? "Your pharmacy could not be determined. Please sign in again."
              : "Open this screen from Pharmacy → More (⋮) → View Pharmacy Users so a pharmacy is selected."}
          </div>
        )}

        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Pharmacy User..."
            value={searchText}
            onChange={handleSearchChange}
            disabled={!selectedPharmacyId}
          />
          <div className="status-btns pu-status-toggle" role="group" aria-label="Status filter">
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

        <div className="page-table-wrap pharmacyuser-table">
          <Table
            columns={columns}
            data={list}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={loading}
            showEdit
            showDelete
            isEditDisabled={() => !canManagePharmacyUsers}
            isDeleteDisabled={(row) =>
              !canManagePharmacyUsers || isPharmacyAdminRole(row.role)
            }
            onEdit={(row: PharmacyUserDto) => {
              if (!canManagePharmacyUsers) return;
              setForm({
                id: row.id,
                name: row.name ?? "",
                userEmail: row.userEmail ?? "",
                password: "",
                confirmPassword: "",
                role: row.role != null ? String(row.role) : "",
                isActive: row.isActive,
                primaryContactName: row.primaryContactName ?? "",
                primaryContactTitle: row.primaryContactTitle ?? "",
                primaryContactPhone: row.primaryContactPhone ?? "",
                primaryWholesalerName: row.primaryWholesalerName ?? "",
                primaryWholesalerContactName:
                  row.primaryWholesalerContactName ?? "",
                primaryWholesalerPhone: row.primaryWholesalerPhone ?? "",
                primaryWholesalerEmail: row.primaryWholesalerEmail ?? "",
              });
              setTouchedFields({});
              clearActionMessage();
              clearErrors();
              setShowDrawer(true);
            }}
            onDelete={(id) => {
              if (!canManagePharmacyUsers) return;
              const row = list.find((item) => item.id === id);
              if (row && isPharmacyAdminRole(row.role)) return;
              void handleDelete(id);
            }}
          />
        </div>

        <Pagination
          pageParam={pageParam}
          totalRecords={totalRecords}
          onPageChange={(page) => setPageParam({ ...pageParam, page })}
          onPageSizeChange={(size) =>
            setPageParam({ ...pageParam, pageSize: size, page: 1 })
          }
        />
      </div>

      <CommonModal
        open={showDrawer}
        onClose={handleCloseModal}
        overlayClassName="pharmacyuser-modal-overlay"
        contentClassName="pharmacyuser-modal-form"
      >
        <div className="pharmacyuser-modal-header">
          <h3>{form.id != null ? "Update Pharmacy User" : "Add Pharmacy User"}</h3>
        </div>

        <div className="pharmacyuser-modal-body">
          <div className="pharmacyuser-modal-fields-grid">
            {/* Row 1: User/Email | Name | Role */}
            <div className="pharmacyuser-form-group">
              <FormField
                label="User/Email"
                name="userEmail"
                type="email"
                value={form.userEmail}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("userEmail")}
                error={errors.userEmail}
                required
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("name")}
                error={errors.name}
                required
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Role"
                name="role"
                type="select"
                value={form.role}
                onChange={handleChange}
                error={errors.role}
                required
                options={roleOptions}
                optionLabel="label"
                optionValue="value"
              />
            </div>

            {form.id == null && (
              <>
                <div className="pharmacyuser-form-group">
                  <FormField
                    label="Password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    error={errors.password}
                    required
                    placeholder={PASSWORD_REQUIREMENTS_HINT}
                  />
                </div>

                <div className="pharmacyuser-form-group">
                  <FormField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    error={errors.confirmPassword}
                    required
                    placeholder="Confirm password"
                  />
                </div>
              </>
            )}

            <div className="pharmacyuser-form-group">
              <FormField
                label="Contact Name"
                name="primaryContactName"
                value={form.primaryContactName}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryContactName")}
                error={errors.primaryContactName}
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Contact Title"
                name="primaryContactTitle"
                value={form.primaryContactTitle}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryContactTitle")}
                error={errors.primaryContactTitle}
              />
            </div>

            {/* Row 3: Contact Phone | Wholesaler Name | Wholesaler Contact */}
            <div className="pharmacyuser-form-group">
              <FormField
                label="Contact Phone"
                name="primaryContactPhone"
                value={form.primaryContactPhone}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryContactPhone")}
                error={errors.primaryContactPhone}
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Wholesaler Name"
                name="primaryWholesalerName"
                value={form.primaryWholesalerName}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryWholesalerName")}
                error={errors.primaryWholesalerName}
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Wholesaler Contact"
                name="primaryWholesalerContactName"
                value={form.primaryWholesalerContactName}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryWholesalerContactName")}
                error={errors.primaryWholesalerContactName}
              />
            </div>

            {/* Row 4: Wholesaler Phone | Wholesaler Email | Status */}
            <div className="pharmacyuser-form-group">
              <FormField
                label="Wholesaler Phone"
                name="primaryWholesalerPhone"
                value={form.primaryWholesalerPhone}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryWholesalerPhone")}
                error={errors.primaryWholesalerPhone}
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Wholesaler Email"
                name="primaryWholesalerEmail"
                type="email"
                value={form.primaryWholesalerEmail}
                onChange={handleChange}
                onBlur={() => handleFieldBlur("primaryWholesalerEmail")}
                error={errors.primaryWholesalerEmail}
              />
            </div>

            <div className="pharmacyuser-form-group">
              <FormField
                label="Status"
                name="isActive"
                type="select"
                value={form.isActive.toString()}
                onChange={handleChange}
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

        <div className="pharmacyuser-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="pharmacyuser-modal-actions-buttons">
            <Button type="cancel" onClick={handleCloseModal} />
            <Button type="reset" onClick={handleReset} />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
