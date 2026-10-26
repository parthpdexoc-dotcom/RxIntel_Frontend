import React, { useState, useEffect } from "react";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./Wholesaler.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import {
  fetchWholesaler,
  addWholesaler,
  deleteWholesaler,
} from "../../slice/WholesalerSlice";
import FormValidation from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useListModalRoute } from "../../hooks/useListModalRoute";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import type { AppDispatch, RootState } from "../../app/store";
import type { WholesalerDto } from "../../dto/wholesalerDto";
import {
  EMPTY_WHOLESALER,
  toFormInput,
} from "../../dto/wholesalerDto";
import { formatDisplayDate } from "../../utils/formatDisplayDate";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import {
  getAddressValidationMessage,
  getBusinessNameValidationMessage,
  getDigitsOnlyTypingValidationMessage,
  getEmailTypingValidationMessage,
  getEmailValidationMessage,
  getPhoneFormatValidationMessage,
  sanitizePhoneInput,
} from "../../utils/pharmacyValidation";

const WHOLESALER_FORM_RULES = {
  wholesalerName: { required: true },
  address: { required: true },
  phone: { required: true },
};

const WHOLESALER_VALIDATED_FIELDS = [
  "wholesalerName",
  "email",
  "address",
  "phone",
] as const;

type WholesalerValidatedField = (typeof WHOLESALER_VALIDATED_FIELDS)[number];

const WHOLESALER_TYPING_FIELDS = new Set<WholesalerValidatedField>([
  "wholesalerName",
  "email",
  "address",
  "phone",
]);

const VAWD_OPTIONS = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

function getWholesalerFieldValidationMessage(
  field: WholesalerValidatedField,
  form: WholesalerDto
): string | null {
  switch (field) {
    case "wholesalerName":
      return getBusinessNameValidationMessage(
        toFormInput(form.wholesalerName),
        true,
        "Wholesaler Name"
      );
    case "email":
      return getEmailValidationMessage(toFormInput(form.email));
    case "address":
      return getAddressValidationMessage(toFormInput(form.address), true, "Address");
    case "phone":
      return getPhoneFormatValidationMessage(toFormInput(form.phone), "Phone", true);
    default:
      return null;
  }
}

function getWholesalerTypingValidationMessage(
  field: WholesalerValidatedField,
  form: WholesalerDto,
  rawValue?: string
): string | null {
  switch (field) {
    case "wholesalerName":
      return getBusinessNameValidationMessage(
        toFormInput(form.wholesalerName),
        false,
        "Wholesaler Name"
      );
    case "email":
      return getEmailTypingValidationMessage(rawValue ?? toFormInput(form.email));
    case "address":
      return getAddressValidationMessage(
        toFormInput(form.address),
        false,
        "Address"
      );
    case "phone":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.phone),
        "Phone"
      );
    default:
      return null;
  }
}

function collectWholesalerFieldErrors(form: WholesalerDto): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of WHOLESALER_VALIDATED_FIELDS) {
    const message = getWholesalerFieldValidationMessage(field, form);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

export default function Wholesaler() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.wholesaler
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
    FormValidation<Partial<WholesalerDto>>({}, WHOLESALER_FORM_RULES);

  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<WholesalerDto>(EMPTY_WHOLESALER);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<WholesalerValidatedField, boolean>>
  >({});
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMoreRow, setSelectedMoreRow] = useState<WholesalerDto | null>(null);
  const isMoreMenuOpen = Boolean(moreAnchorEl);
  const { openAdd, openEdit, closeModal, leaveAddRoute, leaveEditRoute } = useListModalRoute({
    listPath: "/wholesaler",
    showDrawer,
    setShowDrawer,
    formId: form.id,
    onEnterAdd: () => {
      setForm(EMPTY_WHOLESALER);
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
    list,
    getRowId: (row) => row.id,
    onLoadRow: (row) => {
      setForm({
        ...EMPTY_WHOLESALER,
        ...row,
        vawd: typeof row.vawd === "boolean" ? row.vawd : null,
        vawdDate: row.vawdDate ?? null,
      });
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
  });

  useEffect(() => {
    dispatch(
      fetchWholesaler({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam, debouncedSearch]);

  const columns: {
    header: string;
    accessor: keyof WholesalerDto;
    render?: (row: WholesalerDto) => React.ReactNode;
  }[] = [
    { header: "Wholesaler Name", accessor: "wholesalerName" },
    { header: "Phone", accessor: "phone" },
    { header: "Email", accessor: "email" },
    {
      header: "Vawd",
      accessor: "vawd",
      render: (row) => (row.vawd ? "Yes" : "No"),
    },
    {
      header: "Vawd Date",
      accessor: "vawdDate",
      render: (row) => formatDisplayDate(row.vawdDate) || null,
    },
  ];

  const markFieldTouched = (field: WholesalerValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: WholesalerValidatedField,
    nextForm: WholesalerDto,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!WHOLESALER_TYPING_FIELDS.has(field)) return;

      const typingMessage = getWholesalerTypingValidationMessage(
        field,
        nextForm,
        options.rawValue
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = toFormInput(
      nextForm[field as keyof WholesalerDto] as string | null | undefined
    ).trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getWholesalerFieldValidationMessage(field, nextForm);

    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: WholesalerValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as WholesalerValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    let nextValue: string | boolean | null;
    if (name === "vawd") {
      nextValue = value === "" ? null : value === "true";
    } else if (name === "phone") {
      nextValue = sanitizePhoneInput(value) || null;
    } else {
      nextValue = value === "" ? null : value;
    }

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    if (WHOLESALER_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, {
        validateWhileTyping: true,
        rawValue: value,
      });
    }
  };

  const handleSave = async () => {
    clearActionMessage();

    const fieldErrors = collectWholesalerFieldErrors(form);
    setFieldErrors(fieldErrors);
    setTouchedFields(
      Object.fromEntries(
        WHOLESALER_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<WholesalerValidatedField, boolean>>
    );

    if (Object.keys(fieldErrors).length > 0) return;

    const isValid = validate({
      wholesalerName: toFormInput(form.wholesalerName),
      address: toFormInput(form.address),
      phone: toFormInput(form.phone),
    });
    if (!isValid) return;

    try {
      await dispatch(
        addWholesaler({
          ...form,
          vawd: form.vawd === true,
          vawdDate: form.vawd === true ? form.vawdDate : null,
        })
      ).unwrap();
      closeModal();
    } catch (err) {
      clearErrors();
      const message = messageFromApiBody(err);
      showActionMessage(message);
    }
  };

  const handleReset = () => {
    // Keep id on edit so useListModalRoute does not reload the row after clear
    setForm(form.id ? { ...EMPTY_WHOLESALER, id: form.id } : EMPTY_WHOLESALER);
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleCloseModal = () => {
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
    closeModal();
  };

  const handleOpenMoreMenu = (anchorEl: HTMLElement, row: WholesalerDto) => {
    setMoreAnchorEl(anchorEl);
    setSelectedMoreRow(row);
  };

  const handleCloseMoreMenu = () => {
    setMoreAnchorEl(null);
    setSelectedMoreRow(null);
  };

  const handleViewWholesalerFieldMapping = () => {
    if (!selectedMoreRow?.id) return;
    const wholesalerName = encodeURIComponent(
      selectedMoreRow.wholesalerName?.trim() ?? ""
    );
    navigate(
      `/wholesalerfieldmapping?wholesalerId=${selectedMoreRow.id}&wholesalerName=${wholesalerName}`
    );
    handleCloseMoreMenu();
  };

  const reloadList = () => {
    dispatch(
      fetchWholesaler({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  };

  const handleDelete = useDeleteHandler({
    list,
    getDisplayName: (row) => row.wholesalerName ?? "this wholesaler",
    deleteThunk: deleteWholesaler,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell wholesaler-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<LocalShippingOutlinedIcon />}
          title="Wholesaler"
          subtitle="Manage and view all wholesaler details."
          actions={
            <Button
              type="add"
              label="+ Add Wholesaler"
              onClick={() => {
                leaveEditRoute();
                openAdd();
              }}
            />
          }
        />

        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Wholesaler..."
            value={searchText}
            onChange={handleSearchChange}
          />
        </div>

        <div className="page-table-wrap wholesaler-table">
          <Table
            columns={columns}
            data={list}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={loading}
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
            <MenuItem onClick={handleViewWholesalerFieldMapping}>
              View Wholesaler Field Mapping
            </MenuItem>
          </Menu>
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
        overlayClassName="wholesaler-modal-overlay"
        contentClassName="wholesaler-modal-form"
      >
        <div className="wholesaler-modal-header">
          <h3>{form.id != null ? "Update Wholesaler" : "Add Wholesaler"}</h3>
        </div>

        <div className="wholesaler-modal-body">
          <div className="wholesaler-grid-2">
            <FormField
              label="Wholesaler Name"
              name="wholesalerName"
              value={toFormInput(form.wholesalerName)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("wholesalerName")}
              error={errors.wholesalerName}
              required
            />

            <FormField
              label="Email"
              name="email"
              type="email"
              value={toFormInput(form.email)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("email")}
              error={errors.email}
            />

            <FormField
              label="Address"
              name="address"
              value={toFormInput(form.address)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("address")}
              error={errors.address}
              required
            />

            <FormField
              label="Phone"
              name="phone"
              value={toFormInput(form.phone)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("phone")}
              error={errors.phone}
              required
            />

            <FormDateField
              label="Vawd Date"
              value={form.vawdDate}
              onChange={(value) => {
                clearFieldErrorOnChange("vawdDate", clearActionMessage);
                setForm((prev) => ({ ...prev, vawdDate: value }));
              }}
              popperInPortal
            />

            <FormField
              label="Vawd"
              name="vawd"
              type="select"
              value={form.vawd === null ? "" : String(form.vawd)}
              onChange={handleChange}
              options={VAWD_OPTIONS}
              optionLabel="label"
              optionValue="value"
              searchable={false}
            />
          </div>
        </div>
        <div className="wholesaler-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="wholesaler-modal-actions-buttons">
            <Button type="cancel" onClick={handleCloseModal} />
            <Button type="reset" onClick={handleReset} />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
