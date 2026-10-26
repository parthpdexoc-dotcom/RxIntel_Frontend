import React, { useState, useEffect } from "react";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./Insurance.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchInsurance,
  addInsurance,
  deleteInsurance,
} from "../../slice/InsuranceSlice";
import { getInsuranceApi, getInsuranceDropdownApi } from "../../service/InsuranceService";
import {
  deleteInsuranceGroupMappingApi,
  getSelectedInsuranceGroupMappingsApi,
  saveInsuranceGroupMappingsApi,
} from "../../service/InsuranceGroupService";
import FormValidation from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import FormField from "../../component/molecules/FormField";
import FormDateField from "../../component/molecules/FormDateField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useListModalRoute } from "../../hooks/useListModalRoute";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import { showError, showSuccess } from "../../component/atoms/ToastHelper";
import type { AppDispatch, RootState } from "../../app/store";
import type {
  InsuranceDto,
  InsuranceGroupDto,
} from "../../dto/insuranceDto";
import { EMPTY_INSURANCE, toFormInput } from "../../dto/insuranceDto";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import { useActionMessage } from "../../hooks/useActionMessage";
import LinkIcon from "@mui/icons-material/Link";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import type { Dayjs } from "dayjs";
import {
  DISPLAY_DATE_FORMAT,
  formatDisplayDate,
  parseApiDateOnly,
  toApiDateOnly,
} from "../../utils/formatDisplayDate";
import {
  getBinNumberValidationMessage,
  getBusinessNameValidationMessage,
  getDigitsOnlyTypingValidationMessage,
  getEmailTypingValidationMessage,
  getEmailValidationMessage,
  getPhoneFormatValidationMessage,
  sanitizeBinInput,
  sanitizePhoneInput,
} from "../../utils/pharmacyValidation";

const INSURANCE_FORM_RULES = {
  insuranceName: { required: true },
  binNumber: { required: true },
};

const INSURANCE_VALIDATED_FIELDS = [
  "insuranceName",
  "binNumber",
  "phone",
  "email",
] as const;

type InsuranceValidatedField = (typeof INSURANCE_VALIDATED_FIELDS)[number];

const INSURANCE_TYPING_FIELDS = new Set<InsuranceValidatedField>([
  "insuranceName",
  "binNumber",
  "phone",
  "email",
]);

function getInsuranceFieldValidationMessage(
  field: InsuranceValidatedField,
  form: InsuranceDto
): string | null {
  switch (field) {
    case "insuranceName":
      return getBusinessNameValidationMessage(
        toFormInput(form.insuranceName),
        true,
        "Insurance Name"
      );
    case "binNumber":
      return getBinNumberValidationMessage(toFormInput(form.binNumber), true);
    case "phone":
      return getPhoneFormatValidationMessage(toFormInput(form.phone), "Phone");
    case "email":
      return getEmailValidationMessage(toFormInput(form.email));
    default:
      return null;
  }
}

function getInsuranceTypingValidationMessage(
  field: InsuranceValidatedField,
  form: InsuranceDto,
  rawValue?: string
): string | null {
  switch (field) {
    case "insuranceName":
      return getBusinessNameValidationMessage(
        toFormInput(form.insuranceName),
        false,
        "Insurance Name"
      );
    case "binNumber":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.binNumber),
        "BIN Number"
      );
    case "phone":
      return getDigitsOnlyTypingValidationMessage(
        rawValue ?? toFormInput(form.phone),
        "Phone"
      );
    case "email":
      return getEmailTypingValidationMessage(
        rawValue ?? toFormInput(form.email)
      );
    default:
      return null;
  }
}

function collectInsuranceFieldErrors(form: InsuranceDto): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const field of INSURANCE_VALIDATED_FIELDS) {
    const message = getInsuranceFieldValidationMessage(field, form);
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

const LINK_INVALID_DATE_MESSAGE = `Please enter valid format (${DISPLAY_DATE_FORMAT})`;

function dateInRange(date: Dayjs, range: Pick<InsuranceGroupDto, "startDate" | "endDate">) {
  const rangeStart = parseApiDateOnly(range.startDate);
  const rangeEnd = parseApiDateOnly(range.endDate);
  const current = date.startOf("day");
  return (
    current.isValid() &&
    !!rangeStart?.isValid() &&
    !current.isBefore(rangeStart, "day") &&
    (!rangeEnd?.isValid() || !current.isAfter(rangeEnd, "day"))
  );
}

function rangesOverlap(
  start: Dayjs,
  end: Dayjs | null,
  range: Pick<InsuranceGroupDto, "startDate" | "endDate">
) {
  const rangeStart = parseApiDateOnly(range.startDate);
  const rangeEnd = parseApiDateOnly(range.endDate);
  if (!start.isValid() || !rangeStart?.isValid()) {
    return false;
  }
  if (end && !end.isValid()) {
    return false;
  }
  const startsBeforeExistingEnds =
    !rangeEnd?.isValid() || !start.isAfter(rangeEnd, "day");
  const endsAfterExistingStarts =
    !end || !end.isBefore(rangeStart, "day");
  return startsBeforeExistingEnds && endsAfterExistingStarts;
}

function unwrapApiList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  const payload = data as { data?: unknown };
  return Array.isArray(payload?.data) ? payload.data : [];
}

export default function Insurance() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.insurance
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
    FormValidation<Partial<InsuranceDto>>({}, INSURANCE_FORM_RULES);

  const [showDrawer, setShowDrawer] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [form, setForm] = useState<InsuranceDto>(EMPTY_INSURANCE);
  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<InsuranceValidatedField, boolean>>
  >({});
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();
  const { openAdd, openEdit, closeModal, leaveAddRoute, leaveEditRoute } = useListModalRoute({
    listPath: "/insurance",
    showDrawer,
    setShowDrawer,
    formId: form.id,
    onEnterAdd: () => {
      setForm(EMPTY_INSURANCE);
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
  const [dropdownInsuranceList, setDropdownInsuranceList] = useState<InsuranceDto[]>([]);
  const [selectedParentInsuranceId, setSelectedParentInsuranceId] = useState("");
  const [selectedParentBinNumber, setSelectedParentBinNumber] = useState("");
  const [selectedParentInsuranceName, setSelectedParentInsuranceName] = useState("");
  const [linkMappings, setLinkMappings] = useState<InsuranceGroupDto[]>([]);
  const [pickerChildId, setPickerChildId] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(
      fetchInsurance({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam, debouncedSearch]);

  useEffect(() => {
    if (!showDrawer && !showMoreDrawer) return;

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
  }, [showDrawer, showMoreDrawer]);

  const columns: {
    header: string;
    accessor: keyof InsuranceDto;
  }[] = [
    { header: "Insurance Name", accessor: "insuranceName" },
    { header: "BIN Number", accessor: "binNumber" },
    { header: "Phone", accessor: "phone" },
  ];

  const markFieldTouched = (field: InsuranceValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: InsuranceValidatedField,
    nextForm: InsuranceDto,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!INSURANCE_TYPING_FIELDS.has(field)) return;

      const typingMessage = getInsuranceTypingValidationMessage(
        field,
        nextForm,
        options.rawValue
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = toFormInput(
      nextForm[field as keyof InsuranceDto] as string | null | undefined
    ).trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getInsuranceFieldValidationMessage(field, nextForm);

    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: InsuranceValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as InsuranceValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    const nextValue =
      name === "phone"
        ? sanitizePhoneInput(value) || null
        : name === "binNumber"
          ? sanitizeBinInput(value) || null
          : value === ""
            ? null
            : value;

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    if (INSURANCE_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, {
        validateWhileTyping: true,
        rawValue: value,
      });
    }
  };

  const handleSave = async () => {
    clearActionMessage();

    const fieldErrors = collectInsuranceFieldErrors(form);
    setFieldErrors(fieldErrors);
    setTouchedFields(
      Object.fromEntries(
        INSURANCE_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<InsuranceValidatedField, boolean>>
    );

    if (Object.keys(fieldErrors).length > 0) return;

    const isValid = validate({
      insuranceName: toFormInput(form.insuranceName),
      binNumber: toFormInput(form.binNumber),
    });
    if (!isValid) return;

    try {
      await dispatch(addInsurance(form)).unwrap();
      closeModal();
    } catch (err) {
      clearErrors();
      const message = messageFromApiBody(err);
      showActionMessage(message);
    }
  };

  const handleReset = () => {
    // Keep id on edit so useListModalRoute does not reload the row after clear
    setForm(form.id ? { ...EMPTY_INSURANCE, id: form.id } : EMPTY_INSURANCE);
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

  const normalizeId = (value: unknown) =>
    value === null || value === undefined ? "" : String(value).trim().toLowerCase();

  const getInsuranceNameById = (id: string) => {
    const match = dropdownInsuranceList.find((item) => normalizeId(item.id) === normalizeId(id));
    return match?.insuranceName ?? id;
  };

  const reloadDropdownInsuranceList = async (parentId: string) => {
    if (!parentId) return;
    try {
      const response = await getInsuranceDropdownApi(parentId);
      setDropdownInsuranceList(unwrapApiList(response.data) as InsuranceDto[]);
    } catch (error) {
      console.error("Insurance dropdown refresh failed:", error);
    }
  };

  const loadLinkMappings = async (binNumber: string) => {
    if (!binNumber) {
      setLinkMappings([]);
      return;
    }
    try {
      const mappingsResponse = await getSelectedInsuranceGroupMappingsApi(binNumber);
      setLinkMappings(unwrapApiList(mappingsResponse?.data) as InsuranceGroupDto[]);
    } catch (mappingsError) {
      console.error("Insurance group selected mappings fetch failed:", mappingsError);
      setLinkMappings([]);
    }
  };

  const resetLinkPicker = () => {
    setPickerChildId("");
    setStartDate(null);
    setEndDate(null);
    setLinkErrors({});
  };

  const getOccupiedRangesForChild = (childId: string) => {
    if (!childId) return [];
    const child = dropdownInsuranceList.find(
      (item) => normalizeId(item.id) === normalizeId(childId)
    );
    return (child?.insuranceGroups ?? []).filter((m) => m.startDate);
  };

  const handlePickerChildChange = (value: string) => {
    setPickerChildId(value);
    setStartDate(null);
    setEndDate(null);
    setLinkErrors({});
  };

  const handleLinkAdd = async () => {
    const errors: Record<string, string> = {};
    const parsedStart = parseApiDateOnly(startDate);
    const parsedEnd = parseApiDateOnly(endDate);

    if (!pickerChildId) errors.pickerChildId = "Add Insurance Name is required";
    if (!parsedStart?.isValid()) {
      errors.startDate =
        linkErrors.startDate ||
        (startDate ? LINK_INVALID_DATE_MESSAGE : "Start Date is required");
    }
    if (endDate && !parsedEnd?.isValid()) {
      errors.endDate =
        linkErrors.endDate || LINK_INVALID_DATE_MESSAGE;
    } else if (
      parsedEnd?.isValid() &&
      parsedStart?.isValid() &&
      parsedEnd.isBefore(parsedStart, "day")
    ) {
      errors.endDate = "End Date must be on or after Start Date";
    } else if (
      parsedStart?.isValid() &&
      getOccupiedRangesForChild(pickerChildId).some((range) =>
        rangesOverlap(
          parsedStart,
          parsedEnd?.isValid() ? parsedEnd : null,
          range
        )
      )
    ) {
      errors.endDate =
        "Selected dates overlap with an existing booking for this insurance";
    }
    if (Object.keys(errors).length > 0) {
      setLinkErrors(errors);
      return;
    }
    setLinkErrors({});

    if (!selectedParentBinNumber) {
      showError("BIN Number is required to link insurance");
      return;
    }

    const selectedChild = dropdownInsuranceList.find(
      (item) => normalizeId(item.id) === normalizeId(pickerChildId)
    );
    const childInsuranceId = selectedChild?.id ?? pickerChildId;

    try {
      const existingMappingsPayload: InsuranceGroupDto[] = linkMappings.map((mapping) => ({
        id: mapping.id ?? undefined,
        binNumber: mapping.binNumber || selectedParentBinNumber,
        childInsuranceId: mapping.childInsuranceId,
        startDate: mapping.startDate ?? null,
        endDate: mapping.endDate ?? null,
      }));

      const payload: InsuranceGroupDto[] = [
        ...existingMappingsPayload,
        {
          binNumber: selectedParentBinNumber,
          childInsuranceId,
          startDate: parsedStart ? toApiDateOnly(parsedStart) : null,
          endDate: parsedEnd ? toApiDateOnly(parsedEnd) : null,
        },
      ];

      const response = await saveInsuranceGroupMappingsApi(payload);
      showSuccess(response?.data?.message || "Insurance link added");
      resetLinkPicker();
      await loadLinkMappings(selectedParentBinNumber);
      await reloadDropdownInsuranceList(selectedParentInsuranceId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Failed to add insurance link");
      console.error("Insurance group mapping save failed:", error);
    }
  };

  const handleRemoveLinkMapping = async (mapping: InsuranceGroupDto) => {
    if (!mapping.id) {
      showError("Unable to remove link: mapping id is missing");
      return;
    }

    try {
      await deleteInsuranceGroupMappingApi(mapping.id);
      showSuccess("Insurance link removed");
      resetLinkPicker();
      await loadLinkMappings(selectedParentBinNumber);
      await reloadDropdownInsuranceList(selectedParentInsuranceId);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showError(err?.response?.data?.message || "Failed to remove insurance link");
    }
  };

  const openMoreModal = async (row: InsuranceDto) => {
    const parentId = row.id != null ? String(row.id) : "";
    const parentBinNumber = row.binNumber?.trim() || "";
    if (!parentBinNumber) {
      showError("BIN Number is required to link insurance");
      return;
    }
    setSelectedParentInsuranceId(parentId);
    setSelectedParentBinNumber(parentBinNumber);
    setSelectedParentInsuranceName(row.insuranceName?.trim() || "Insurance");
    resetLinkPicker();
    try {
      const response = await getInsuranceDropdownApi(row.id ?? undefined);
      const dropdownData = unwrapApiList(response.data) as InsuranceDto[];
      setDropdownInsuranceList(dropdownData);
      await loadLinkMappings(parentBinNumber);
      setShowMoreDrawer(true);
    } catch (error) {
      try {
        const fallbackResponse = await getInsuranceApi();
        const fallbackList = unwrapApiList(fallbackResponse.data) as InsuranceDto[];
        const fallbackData = fallbackList.length > 0 ? fallbackList : list;

        setDropdownInsuranceList(fallbackData);
        await loadLinkMappings(parentBinNumber);
        setShowMoreDrawer(true);
      } catch (fallbackError) {
        showError("Unable to load insurance dropdown");
        console.error("Insurance dropdown fetch failed:", error);
        console.error("Insurance fallback fetch failed:", fallbackError);
      }
    }
  };

  const linkMappingRows = linkMappings.map((mapping) => ({
    id: mapping.id ?? mapping.childInsuranceId,
    insuranceName: getInsuranceNameById(mapping.childInsuranceId),
    startDate: formatDisplayDate(mapping.startDate, "—"),
    endDate: formatDisplayDate(mapping.endDate, "—"),
    _mapping: mapping,
  }));

  const reloadList = () => {
    dispatch(
      fetchInsurance({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  };

  const handleDelete = useDeleteHandler({
    list,
    getDisplayName: (row) => row.insuranceName ?? "this insurance",
    deleteThunk: deleteInsurance,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell insurance-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<HealthAndSafetyOutlinedIcon />}
          title="Insurance"
          subtitle="Manage and view all insurance details."
          actions={
            <Button
              type="add"
              label="+ Add Insurance"
              onClick={() => {
                leaveEditRoute();
                openAdd();
              }}
            />
          }
        />

        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Insurance..."
            value={searchText}
            onChange={handleSearchChange}
          />
        </div>

        <div className="page-table-wrap insurance-table">
          <Table
            columns={columns}
            data={list}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={loading}
            showEdit
            showDelete
            showMore
            moreIcon={<LinkIcon />}
            moreTooltip="Insurance Group Form"
            onEdit={(row) => {
              if (!row.id) return;
              leaveAddRoute();
              openEdit(row.id, row);
            }}
            onMore={(row) => {
              void openMoreModal(row);
            }}
            onDelete={(id) => void handleDelete(id)}
          />
        </div>

        <Pagination
          pageParam={pageParam}
          totalRecords={totalRecords}
          onPageChange={(page) =>
            setPageParam({
              ...pageParam,
              page,
            })
          }
          onPageSizeChange={(size) =>
            setPageParam({ ...pageParam, pageSize: size, page: 1 })
          }
        />
      </div>

      <CommonModal
        open={showDrawer}
        onClose={handleCloseModal}
        overlayClassName="insurance-modal-overlay"
        contentClassName="insurance-modal-form"
      >
        <div className="insurance-modal-header">
          <h3>{form.id != null ? "Update Insurance" : "Add Insurance"}</h3>
        </div>

        <div className="insurance-modal-body">
          <div className="insurance-grid-2">
            <FormField
              label="Insurance Name"
              name="insuranceName"
              value={toFormInput(form.insuranceName)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("insuranceName")}
              error={errors.insuranceName}
              required
            />

            <FormField
              label="BIN Number"
              name="binNumber"
              value={toFormInput(form.binNumber)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("binNumber")}
              error={errors.binNumber}
              required
            />

            <FormField
              label="Phone"
              name="phone"
              value={toFormInput(form.phone)}
              onChange={handleChange}
              onBlur={() => handleFieldBlur("phone")}
              error={errors.phone}
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
          </div>
        </div>

        <div className="insurance-modal-actions">
          <ModalActionMessage message={actionMessage} />
          <div className="insurance-modal-actions-buttons">
            <Button type="cancel" onClick={handleCloseModal} />
            <Button type="reset" onClick={handleReset} />
            <Button type="save" onClick={handleSave} />
          </div>
        </div>
      </CommonModal>

      <CommonModal
        open={showMoreDrawer}
        onClose={() => {
          setShowMoreDrawer(false);
          resetLinkPicker();
        }}
        overlayClassName="insurance-modal-overlay"
        contentClassName="insurance-modal-form insurance-modal-form--link"
      >
          <div className="insurance-modal-header">
            <h3>{selectedParentInsuranceName} Insurance link with -</h3>
          </div>

          <div className="insurance-modal-body">
            <div className="insurance-link-picker-row">
              <FormField
                type="select"
                label="Add Insurance Name"
                name="pickerChildId"
                value={pickerChildId}
                options={dropdownInsuranceList}
                optionLabel="insuranceName"
                optionValue="id"
                searchable
                required
                error={linkErrors.pickerChildId}
                onChange={(e) =>
                  handlePickerChildChange(String(e.target.value ?? ""))
                }
              />

              <FormDateField
                label="Start Date"
                required
                value={startDate}
                popperInPortal
                disabled={!pickerChildId}
                error={linkErrors.startDate}
                onChange={(value) => {
                  setStartDate(value);
                  setLinkErrors(({ startDate: _, ...rest }) => rest);
                }}
                shouldDisableDate={(date) =>
                  getOccupiedRangesForChild(pickerChildId).some((r) =>
                    dateInRange(date, r)
                  )
                }
              />

              <FormDateField
                label="End Date"
                value={endDate}
                popperInPortal
                disabled={!pickerChildId}
                minDate={parseApiDateOnly(startDate) ?? undefined}
                error={linkErrors.endDate}
                onChange={(value) => {
                  setEndDate(value);
                  setLinkErrors(({ endDate: _, ...rest }) => rest);
                }}
                shouldDisableDate={(date) => {
                  const occupiedRanges = getOccupiedRangesForChild(pickerChildId);
                  const rangeStart = parseApiDateOnly(startDate);
                  return (
                    occupiedRanges.some((r) => dateInRange(date, r)) ||
                    (rangeStart?.isValid() &&
                      occupiedRanges.some((r) =>
                        rangesOverlap(rangeStart, date, r)
                      )) ||
                    (rangeStart ? date.isBefore(rangeStart, "day") : false)
                  );
                }}
              />

              <Button
                type="add"
                label="+ Add"
                onClick={() => void handleLinkAdd()}
                disabled={!pickerChildId}
              />
            </div>

            <div className="insurance-link-mappings-table">
              {linkMappingRows.length === 0 ? (
                <p className="insurance-link-empty">No insurance links added</p>
              ) : (
                <Table
                  columns={[
                    { header: "Insurance Name", accessor: "insuranceName" as const },
                    { header: "Start Date", accessor: "startDate" as const },
                    { header: "End Date", accessor: "endDate" as const },
                  ]}
                  data={linkMappingRows}
                  showDelete
                  onDelete={async (id) => {
                    const row = linkMappingRows.find(
                      (item) => String(item.id) === String(id)
                    );
                    if (row?._mapping) {
                      await handleRemoveLinkMapping(row._mapping);
                    }
                  }}
                />
              )}
            </div>
          </div>
      </CommonModal>
    </div>
  );
}