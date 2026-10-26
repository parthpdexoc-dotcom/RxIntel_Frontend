import React, { useEffect, useState } from "react";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./PharmacySoftware.css";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import LaptopMacOutlinedIcon from "@mui/icons-material/LaptopMacOutlined";
import {
  fetchPharmacySoftware,
  addPharmacySoftware,
  deletePharmacySoftware,
} from "../../slice/PharmacySoftwareSlice";
import FormValidation from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import FormField from "../../component/molecules/FormField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useListModalRoute } from "../../hooks/useListModalRoute";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import type { AppDispatch, RootState } from "../../app/store";
import type { PharmacySoftwareDto } from "../../dto/pharmacySoftwareDto";
import {
  EMPTY_PHARMACY_SOFTWARE,
  getPharmacySoftwareDisplayName,
  toFormInput,
} from "../../dto/pharmacySoftwareDto";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import { getSoftwareSystemValidationMessage } from "../../utils/pharmacyValidation";

const PHARMACY_SOFTWARE_FORM_RULES = {
  softwareName: { required: true },
};

const PHARMACY_SOFTWARE_VALIDATED_FIELDS = ["softwareName"] as const;

type PharmacySoftwareValidatedField =
  (typeof PHARMACY_SOFTWARE_VALIDATED_FIELDS)[number];

const PHARMACY_SOFTWARE_TYPING_FIELDS = new Set<PharmacySoftwareValidatedField>([
  "softwareName",
]);

function getPharmacySoftwareFieldValidationMessage(
  field: PharmacySoftwareValidatedField,
  form: PharmacySoftwareDto
): string | null {
  switch (field) {
    case "softwareName":
      return getSoftwareSystemValidationMessage(
        toFormInput(form.softwareName),
        true,
        "Software"
      );
    default:
      return null;
  }
}

function getPharmacySoftwareTypingValidationMessage(
  field: PharmacySoftwareValidatedField,
  form: PharmacySoftwareDto
): string | null {
  switch (field) {
    case "softwareName":
      return getSoftwareSystemValidationMessage(
        toFormInput(form.softwareName),
        false,
        "Software"
      );
    default:
      return null;
  }
}

function collectPharmacySoftwareFieldErrors(
  form: PharmacySoftwareDto
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of PHARMACY_SOFTWARE_VALIDATED_FIELDS) {
    const message = getPharmacySoftwareFieldValidationMessage(field, form);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

export default function PharmacySoftware() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.pharmacysoftware
  );

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState<PharmacySoftwareDto>(EMPTY_PHARMACY_SOFTWARE);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<PharmacySoftwareValidatedField, boolean>>
  >({});
  const [moreAnchorEl, setMoreAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMoreRow, setSelectedMoreRow] = useState<PharmacySoftwareDto | null>(
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

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation<Partial<PharmacySoftwareDto>>(
      {},
      PHARMACY_SOFTWARE_FORM_RULES
    );

  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();
  const isMoreMenuOpen = Boolean(moreAnchorEl);

  const { openAdd, openEdit, closeModal, leaveAddRoute, leaveEditRoute } = useListModalRoute({
    listPath: "/primerx",
    showDrawer,
    setShowDrawer,
    formId: form.id,
    onEnterAdd: () => {
      setForm(EMPTY_PHARMACY_SOFTWARE);
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
    list,
    getRowId: (row) => row.id,
    onLoadRow: (row) => {
      setForm(row);
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
  });

  useEffect(() => {
    dispatch(
      fetchPharmacySoftware({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam, debouncedSearch]);

  const columns: {
    header: string;
    accessor: keyof PharmacySoftwareDto;
  }[] = [{ header: "Software", accessor: "softwareName" }];

  const markFieldTouched = (field: PharmacySoftwareValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: PharmacySoftwareValidatedField,
    nextForm: PharmacySoftwareDto,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!PHARMACY_SOFTWARE_TYPING_FIELDS.has(field)) return;

      const typingMessage = getPharmacySoftwareTypingValidationMessage(
        field,
        nextForm
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = toFormInput(
      nextForm[field as keyof PharmacySoftwareDto] as string | null | undefined
    ).trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getPharmacySoftwareFieldValidationMessage(field, nextForm);

    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: PharmacySoftwareValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as PharmacySoftwareValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    const nextForm = {
      ...form,
      [name]: value === "" ? null : value,
    };
    setForm(nextForm);

    if (PHARMACY_SOFTWARE_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, { validateWhileTyping: true });
    }
  };

  const handleSave = async () => {
    clearActionMessage();

    const fieldErrors = collectPharmacySoftwareFieldErrors(form);
    setFieldErrors(fieldErrors);
    setTouchedFields(
      Object.fromEntries(
        PHARMACY_SOFTWARE_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<PharmacySoftwareValidatedField, boolean>>
    );

    if (Object.keys(fieldErrors).length > 0) return;

    const isValid = validate({
      softwareName: toFormInput(form.softwareName),
    });
    if (!isValid) return;

    try {
      await dispatch(addPharmacySoftware(form)).unwrap();
      closeModal();
    } catch (err) {
      clearErrors();
      const message = messageFromApiBody(err);
      showActionMessage(message);
    }
  };

  const handleReset = () => {
    // Keep id on edit so useListModalRoute does not reload the row after clear
    setForm(
      form.id
        ? { ...EMPTY_PHARMACY_SOFTWARE, id: form.id }
        : EMPTY_PHARMACY_SOFTWARE
    );
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

  const reloadList = () => {
    dispatch(
      fetchPharmacySoftware({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  };

  const handleOpenMoreMenu = (
    anchorEl: HTMLElement,
    row: PharmacySoftwareDto
  ) => {
    setMoreAnchorEl(anchorEl);
    setSelectedMoreRow(row);
  };

  const handleCloseMoreMenu = () => {
    setMoreAnchorEl(null);
    setSelectedMoreRow(null);
  };

  const handleViewBillingFieldMapping = () => {
    if (!selectedMoreRow?.id) return;
    const softwareName = encodeURIComponent(
      getPharmacySoftwareDisplayName(selectedMoreRow)
    );
    navigate(
      `/billingfieldmapping?pharmacySoftwareId=${selectedMoreRow.id}&softwareName=${softwareName}`
    );
    handleCloseMoreMenu();
  };

  const handleDelete = useDeleteHandler({
    list,
    getDisplayName: (row) => row.softwareName ?? "this pharmacy software",
    deleteThunk: deletePharmacySoftware,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell pharmacy-software-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<LaptopMacOutlinedIcon />}
          title="Pharmacy Software"
          subtitle="Manage and view pharmacy billing software systems."
          actions={
            <Button
              type="add"
              label="+ Add Pharmacy Software"
              onClick={() => {
                leaveEditRoute();
                openAdd();
              }}
            />
          }
        />

        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Pharmacy Software..."
            value={searchText}
            onChange={handleSearchChange}
          />
        </div>

        <div className="page-table-wrap pharmacy-software-table">
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
            <MenuItem onClick={handleViewBillingFieldMapping}>
              View Billing Field Mapping
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
        overlayClassName="pharmacy-software-modal-overlay"
        contentClassName="pharmacy-software-modal-form"
      >
        <div className="pharmacy-software-modal-header">
          <h3>{form.id != null ? "Update Pharmacy Software" : "Add Pharmacy Software"}</h3>
        </div>

        <div className="pharmacy-software-modal-body">
          <div className="pharmacy-software-grid-1">
            <FormField
              label="Software"
              name="softwareName"
              value={toFormInput(form.softwareName)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("softwareName")}
              error={errors.softwareName}
              required
            />
          </div>
        </div>

        <div className="pharmacy-software-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="pharmacy-software-modal-actions-buttons">
            <Button type="cancel" onClick={handleCloseModal} />
            <Button type="reset" onClick={handleReset} />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>
    </div>
  );
}
