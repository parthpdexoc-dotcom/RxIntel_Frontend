import React, { useState, useEffect, useCallback, useRef } from "react";
import LinkIcon from "@mui/icons-material/Link";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import SearchInput from "../../component/molecules/SearchInput";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import "./MedicineMaster.css";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMedicineMaster,
  addMedicineMaster,
  deleteMedicineMaster,
} from "../../slice/MedicineMasterSlice";
import {
  getMedicineByIdApi,
  getMedicineDropdownApi,
} from "../../service/MedicineMasterService";
import {
  getSelectedNdcGroupMappingsApi,
  saveNdcGroupMappingsApi,
} from "../../service/NDCGroupService";
import FormValidation, { evaluateFormRules } from "../../hooks/FormValidation";
import Button from "../../component/atoms/Button";
import FormField from "../../component/molecules/FormField";
import CommonModal, { ModalActionMessage } from "../../component/atoms/CommonModal";
import { useDebouncedSearchQuery } from "../../hooks/useDebouncedSearchQuery";
import { useListModalRoute } from "../../hooks/useListModalRoute";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import { showError, showSuccess } from "../../component/atoms/ToastHelper";
import type { AppDispatch, RootState } from "../../app/store";
import type { MedicineMasterDto, NdcGroupMappingsDto } from "../../dto/medicineMasterDto";
import {
  EMPTY_MEDICINE_MASTER,
  normalizeMedicineMaster,
  parseMedicineMasterPagedResponse,
  toFormInput,
} from "../../dto/medicineMasterDto";
import { STRENGTH_OPTIONS, getStrengthLabel } from "../../enums/Strength";
import { MEDICINE_FORM_OPTIONS, getMedicineFormLabel } from "../../enums/MedicineForm";
import { listPageParamRowOffset } from "../../types/listPageParam";
import { messageFromApiBody } from "../../slice/mappingThunkUtils";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import { useActionMessage } from "../../hooks/useActionMessage";
import {
  MEDICINE_MASTER_TYPING_FIELDS,
  MEDICINE_MASTER_VALIDATED_FIELDS,
  collectMedicineMasterFieldErrors,
  getMedicineMasterFieldValidationMessage,
  getMedicineMasterTypingValidationMessage,
  sanitizeDecimalQuantityInput,
  sanitizeNdcInput,
  type MedicineMasterValidatedField,
} from "../../utils/medicineMasterValidation";

const MEDICINE_MASTER_FORM_RULES = {
  ndc: { required: true },
  brand: { required: true },
  packageSize: { required: true },
  strength: { required: true },
  strengthUnit: { required: true },
  dosageForm: { required: true },
};

/** String form values used by required-field validation (not DTO enum types). */
type MedicineMasterRequiredFormValues = {
  ndc?: string;
  brand?: string;
  packageSize?: string;
  strength?: string;
  strengthUnit?: string;
  dosageForm?: string;
};

const ENUM_NUMBER_FIELDS = new Set(["strengthUnit"]);
const NDC_DROPDOWN_PAGE_SIZE = 20;
const NDC_DROPDOWN_SEARCH_DEBOUNCE_MS = 300;

function mergeMedicineOptions(
  existing: MedicineMasterDto[],
  incoming: MedicineMasterDto[]
): MedicineMasterDto[] {
  const byId = new Map<string, MedicineMasterDto>();
  for (const item of existing) {
    const id = item.id == null ? "" : String(item.id).trim().toLowerCase();
    if (id) byId.set(id, item);
  }
  for (const item of incoming) {
    const id = item.id == null ? "" : String(item.id).trim().toLowerCase();
    if (id) byId.set(id, item);
  }
  return Array.from(byId.values());
}

function formatEnumLabels<T extends number>(
  values: T[] | null | undefined,
  getLabel: (value: T) => string
): string {
  if (!values?.length) return "";
  return values.map((value) => getLabel(value)).filter(Boolean).join(", ");
}

export default function MedicineMaster() {
  const dispatch = useDispatch<AppDispatch>();
  const { list, totalRecords, loading } = useSelector(
    (state: RootState) => state.medicinemaster
  );

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [listRequested, setListRequested] = useState(false);

  const { searchText, debouncedSearch, handleSearchChange } =
    useDebouncedSearchQuery({
      onSearchInputChange: () => {
        setPageParam((prev) =>
          prev.page === 1 ? prev : { ...prev, page: 1 }
        );
      },
    });

  const { validate, errors, clearErrors, clearFieldErrorOnChange, setFieldErrors } =
    FormValidation<MedicineMasterRequiredFormValues>(
      {},
      MEDICINE_MASTER_FORM_RULES
    );

  const [touchedFields, setTouchedFields] = useState<
    Partial<Record<MedicineMasterValidatedField, boolean>>
  >({});
  const [showDrawer, setShowDrawer] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [form, setForm] = useState<MedicineMasterDto>(EMPTY_MEDICINE_MASTER);
  const { actionMessage, clearActionMessage, showActionMessage } =
    useActionMessage();
  const { openAdd, openEdit, closeModal, leaveAddRoute, leaveEditRoute } = useListModalRoute({
    listPath: "/medicinemaster",
    showDrawer,
    setShowDrawer,
    formId: form.id,
    onEnterAdd: () => {
      setForm(EMPTY_MEDICINE_MASTER);
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
    list,
    getRowId: (row) => row.id,
    onLoadRow: (row) => {
      setForm(normalizeMedicineMaster(row) ?? EMPTY_MEDICINE_MASTER);
      setTouchedFields({});
      clearErrors();
      clearActionMessage();
    },
  });
  const [selectedMedicineIds, setSelectedMedicineIds] = useState<string[]>([]);
  const [dropdownMedicineList, setDropdownMedicineList] = useState<MedicineMasterDto[]>([]);
  const [dropdownPage, setDropdownPage] = useState(1);
  const [dropdownHasMore, setDropdownHasMore] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState("");
  const [debouncedDropdownSearch, setDebouncedDropdownSearch] = useState("");
  const [selectedMedicineLabels, setSelectedMedicineLabels] = useState<
    Record<string, string>
  >({});
  const [selectedParentMedicineId, setSelectedParentMedicineId] = useState("");
  const ndcDropdownFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setListRequested(true);
    dispatch(
      fetchMedicineMaster({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  }, [dispatch, pageParam, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDropdownSearch(dropdownSearchQuery.trim());
    }, NDC_DROPDOWN_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [dropdownSearchQuery]);

  const fetchNdcDropdownPage = useCallback(
    async (opts: {
      page: number;
      append?: boolean;
      searchText?: string;
      parentId: string;
    }) => {
      if (!opts.parentId) return;

      setDropdownLoading(true);
      try {
        const response = await getMedicineDropdownApi({
          page: opts.page,
          pageSize: NDC_DROPDOWN_PAGE_SIZE,
          searchText: opts.searchText,
          parentMedicineId: opts.parentId,
        });
        const { data, totalRecords } = parseMedicineMasterPagedResponse(
          response.data
        );

        setDropdownMedicineList((prev) =>
          opts.append ? mergeMedicineOptions(prev, data) : data
        );
        setDropdownPage(opts.page);
        setDropdownHasMore(opts.page * NDC_DROPDOWN_PAGE_SIZE < totalRecords);
      } catch (error) {
        if (!opts.append) {
          setDropdownMedicineList([]);
          setDropdownHasMore(false);
        }
        console.error("Medicine dropdown fetch failed:", error);
        throw error;
      } finally {
        setDropdownLoading(false);
      }
    },
    []
  );

  const hydrateSelectedMedicineLabels = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const labels: Record<string, string> = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await getMedicineByIdApi(id);
          const medicine = normalizeMedicineMaster(response.data);
          if (medicine?.brand) {
            labels[id] = medicine.brand;
          }
        } catch (error) {
          console.error("Failed to load medicine label:", id, error);
        }
      })
    );

    if (Object.keys(labels).length) {
      setSelectedMedicineLabels((prev) => ({ ...prev, ...labels }));
    }
  }, []);

  useEffect(() => {
    if (!showMoreDrawer || !selectedParentMedicineId) {
      ndcDropdownFetchKeyRef.current = null;
      return;
    }

    const fetchKey = `${selectedParentMedicineId}|${debouncedDropdownSearch}`;
    if (ndcDropdownFetchKeyRef.current === fetchKey) return;
    ndcDropdownFetchKeyRef.current = fetchKey;

    void fetchNdcDropdownPage({
      page: 1,
      parentId: selectedParentMedicineId,
      searchText: debouncedDropdownSearch || undefined,
    }).catch(() => {
      showError("Unable to load medicine dropdown");
    });
  }, [
    debouncedDropdownSearch,
    fetchNdcDropdownPage,
    selectedParentMedicineId,
    showMoreDrawer,
  ]);

  const columns: {
    header: string;
    accessor: keyof MedicineMasterDto;
    render?: (row: MedicineMasterDto) => React.ReactNode;
  }[] = [
    { header: "Brand", accessor: "brand" },
    { header: "NDC", accessor: "ndc" },
    { header: "Strength", accessor: "strength" },
    {
      header: "Strength Unit",
      accessor: "strengthUnit",
      render: (row) => getStrengthLabel(row.strengthUnit),
    },
    {
      header: "Dosage Form",
      accessor: "dosageForm",
      render: (row) => formatEnumLabels(row.dosageForm, getMedicineFormLabel),
    },
    { header: "Package Size", accessor: "packageSize" },
  ];

  const markFieldTouched = (field: MedicineMasterValidatedField) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const applyFieldValidation = (
    field: MedicineMasterValidatedField,
    nextForm: MedicineMasterDto,
    options: {
      touched?: boolean;
      validateWhileTyping?: boolean;
      rawValue?: string;
    } = {}
  ) => {
    if (options.validateWhileTyping && !options.touched) {
      if (!MEDICINE_MASTER_TYPING_FIELDS.has(field)) return;

      const typingMessage = getMedicineMasterTypingValidationMessage(
        field,
        nextForm,
        options.rawValue
      );
      setFieldErrors({ [field]: typingMessage ?? "" });
      return;
    }

    const value = toFormInput(
      nextForm[field as keyof MedicineMasterDto] as string | number | null | undefined
    ).trim();
    const shouldShow =
      options.touched || touchedFields[field] || Boolean(errors[field]);

    if (!shouldShow) return;

    const message = getMedicineMasterFieldValidationMessage(field, nextForm);

    if (!value && !options.touched && !touchedFields[field]) {
      setFieldErrors({ [field]: "" });
      return;
    }

    setFieldErrors({ [field]: message ?? "" });
  };

  const handleFieldBlur = (field: MedicineMasterValidatedField) => {
    markFieldTouched(field);
    applyFieldValidation(field, form, { touched: true });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const fieldName = name as MedicineMasterValidatedField;

    clearFieldErrorOnChange(name, clearActionMessage);

    if (name === "dosageForm") {
      const raw = (e.target as { value: string | string[] }).value;
      const selected = (Array.isArray(raw) ? raw : [raw])
        .filter((item) => item !== "")
        .map(Number);
      setForm({ ...form, dosageForm: selected });
      return;
    }

    if (ENUM_NUMBER_FIELDS.has(name)) {
      setForm({ ...form, [name]: value === "" ? null : Number(value) });
      return;
    }

    const nextValue =
      name === "ndc" || name === "productNDC"
        ? sanitizeNdcInput(value) || null
        : name === "packageSize"
          ? sanitizeDecimalQuantityInput(value) || null
          : value === ""
            ? null
            : value;

    const nextForm = { ...form, [name]: nextValue };
    setForm(nextForm);

    if (MEDICINE_MASTER_TYPING_FIELDS.has(fieldName)) {
      applyFieldValidation(fieldName, nextForm, {
        validateWhileTyping: true,
        rawValue: value,
      });
    }
  };

  const handleSave = async () => {
    clearActionMessage();

    const validateData = {
      ndc: toFormInput(form.ndc),
      brand: toFormInput(form.brand),
      packageSize: toFormInput(form.packageSize),
      strength: toFormInput(form.strength),
      strengthUnit: toFormInput(form.strengthUnit),
      dosageForm: form.dosageForm.length > 0 ? "selected" : "",
    };

    const fieldErrors = collectMedicineMasterFieldErrors(form);
    const requiredErrors = evaluateFormRules(validateData, MEDICINE_MASTER_FORM_RULES);
    const allErrors = { ...requiredErrors, ...fieldErrors };
    setFieldErrors(allErrors);
    setTouchedFields(
      Object.fromEntries(
        MEDICINE_MASTER_VALIDATED_FIELDS.map((field) => [field, true])
      ) as Partial<Record<MedicineMasterValidatedField, boolean>>
    );

    if (Object.keys(allErrors).length > 0) return;

    const isValid = validate(validateData);
    if (!isValid) return;

    try {
      await dispatch(addMedicineMaster(form)).unwrap();
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
      form.id ? { ...EMPTY_MEDICINE_MASTER, id: form.id } : EMPTY_MEDICINE_MASTER
    );
    setTouchedFields({});
    clearActionMessage();
    clearErrors();
  };

  const handleCloseModal = () => {
    clearActionMessage();
    clearErrors();
    setTouchedFields({});
    closeModal();
  };

  const handleMoreReset = () => {
    setSelectedMedicineIds([]);
    setSelectedMedicineLabels({});
  };

  const handleMoreSave = async () => {
    if (!selectedParentMedicineId) {
      showError("Parent medicine is required");
      return;
    }

    try {
      const payload: NdcGroupMappingsDto = {
        parentMedicineId: selectedParentMedicineId,
        childMedicineIds: selectedMedicineIds,
      };

      const response = await saveNdcGroupMappingsApi(payload);
      showSuccess(response?.data?.message || "NDC group mappings saved");
      setShowMoreDrawer(false);
      setSelectedMedicineIds([]);
    } catch (error: any) {
      showError(error?.response?.data?.message || "Failed to save NDC group mappings");
      console.error("NDC group mapping save failed:", error);
    }
  };

  const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = (e.target as { value: string | string[] }).value;
    const ids = Array.isArray(raw) ? raw : [raw].filter(Boolean);
    setSelectedMedicineIds(ids);
    setSelectedMedicineLabels((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const match = dropdownMedicineList.find(
          (item) => normalizeId(item.id) === id
        );
        if (match?.brand) {
          next[id] = match.brand;
        }
      }
      return next;
    });
  };

  const normalizeId = (value: unknown) =>
    value === null || value === undefined ? "" : String(value).trim().toLowerCase();

  const extractSelectedIdsFromMappingsResponse = (mappingsData: unknown) => {
    const data = mappingsData as {
      childMedicineIds?: unknown[];
      data?: { childMedicineIds?: unknown[] };
    };
    const nestedChildIds = data?.data?.childMedicineIds;
    const childIds = Array.isArray(data?.childMedicineIds)
      ? data.childMedicineIds
      : Array.isArray(nestedChildIds)
      ? nestedChildIds
      : [];

    return childIds.map(normalizeId).filter(Boolean);
  };

  const openMoreModal = async (row: MedicineMasterDto) => {
    const parentId = normalizeId(row.id);
    if (!parentId) {
      showError("Parent medicine is required");
      return;
    }

    setSelectedParentMedicineId(parentId);
    setSelectedMedicineIds([]);
    setSelectedMedicineLabels({});
    setDropdownMedicineList([]);
    setDropdownPage(1);
    setDropdownHasMore(false);
    setDropdownSearchQuery("");
    setDebouncedDropdownSearch("");
    ndcDropdownFetchKeyRef.current = null;
    setShowMoreDrawer(true);

    try {
      const mappingsResponse = await getSelectedNdcGroupMappingsApi(parentId);
      const preselectedIds = extractSelectedIdsFromMappingsResponse(
        mappingsResponse?.data
      );
      setSelectedMedicineIds(preselectedIds);
      if (preselectedIds.length) {
        void hydrateSelectedMedicineLabels(preselectedIds);
      }
    } catch (mappingsError) {
      console.error("NDC group selected mappings fetch failed:", mappingsError);
    }
  };

  const selectedMedicineItems = selectedMedicineIds.map((id) => ({
    id,
    brand:
      selectedMedicineLabels[id] ??
      dropdownMedicineList.find((item) => normalizeId(item.id) === id)?.brand ??
      id,
  }));

  const handleRemoveSelectedMedicine = (id: string) => {
    setSelectedMedicineIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const reloadList = () => {
    dispatch(
      fetchMedicineMaster({
        ...pageParam,
        searchText: debouncedSearch || undefined,
      })
    );
  };

  const handleDelete = useDeleteHandler({
    list,
    getDisplayName: (row) => row.brand ?? "this medicine",
    deleteThunk: deleteMedicineMaster,
    onSuccess: reloadList,
  });

  return (
    <div className="page-shell medicinemaster-page">
      <div className="card page-card">
        <PageCardHeader
          icon={<MedicationOutlinedIcon />}
          title="Medicine Master"
          subtitle="Manage and view all medicine details."
          actions={
            <Button
              type="add"
              label="+ Add Medicine"
              onClick={() => {
                leaveEditRoute();
                openAdd();
              }}
            />
          }
        />

        <div className="card-filters page-card-filters">
          <SearchInput
            placeholder="Search Medicine..."
            value={searchText}
            onChange={handleSearchChange}
          />
        </div>

        <div className="page-table-wrap">
          <Table
            columns={columns}
            data={loading || !listRequested ? [] : list}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={loading || !listRequested}
            showEdit
            showDelete
            showMore
            moreIcon={<LinkIcon />}
            moreTooltip="NDC Group Form"
            onEdit={(row) => {
              if (!row.id) return;
              leaveAddRoute();
              openEdit(row.id, row);
            }}
            onMore={(row) => {
              openMoreModal(row);
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
        overlayClassName="medicinemaster-modal-overlay"
        contentClassName="medicinemaster-modal-form"
      >
            <div className="medicinemaster-modal-header">
              <h3>{form.id != null ? "Update Medicine Master" : "Add Medicine Master"}</h3>
            </div>

            <div className="medicinemaster-modal-body">
              <div className="medicinemaster-grid-3">
                <FormField
                  label="Brand"
                  name="brand"
                  value={toFormInput(form.brand)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("brand")}
                  error={errors.brand}
                  required
                />

                <FormField
                  label="NDC"
                  name="ndc"
                  value={toFormInput(form.ndc)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("ndc")}
                  error={errors.ndc}
                  required
                />

                <FormField
                  label="Strength"
                  name="strength"
                  value={toFormInput(form.strength)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("strength")}
                  error={errors.strength}
                  required
                />

                <FormField
                  label="Strength Unit"
                  name="strengthUnit"
                  type="select"
                  value={toFormInput(form.strengthUnit)}
                  onChange={handleChange}
                  options={STRENGTH_OPTIONS}
                  optionLabel="label"
                  optionValue="value"
                  error={errors.strengthUnit}
                  required
                />

                <FormField
                  label="Package Size"
                  name="packageSize"
                  value={toFormInput(form.packageSize)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("packageSize")}
                  error={errors.packageSize}
                  required
                />

                <FormField
                  label="Dosage Form"
                  name="dosageForm"
                  type="select"
                  multiple
                  searchable
                  value={form.dosageForm.map(String)}
                  onChange={handleChange}
                  options={MEDICINE_FORM_OPTIONS}
                  optionLabel="label"
                  optionValue="value"
                  error={errors.dosageForm}
                  required
                />

                <FormField
                  label="Product NDC"
                  name="productNDC"
                  value={toFormInput(form.productNDC)}
                  onChange={handleChange}
                />

                <FormField
                  label="Suffix"
                  name="suffix"
                  value={toFormInput(form.suffix)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("suffix")}
                  error={errors.suffix}
                />

                <FormField
                  label="Generic"
                  name="generic"
                  value={toFormInput(form.generic)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("generic")}
                  error={errors.generic}
                />

                <FormField
                  label="Route"
                  name="route"
                  value={toFormInput(form.route)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("route")}
                  error={errors.route}
                />

                <FormField
                  label="Labeler"
                  name="labeler"
                  value={toFormInput(form.labeler)}
                  onChange={handleChange}
                  onBlur={() => handleFieldBlur("labeler")}
                  error={errors.labeler}
                />
              </div>
            </div>

            <div className="medicinemaster-modal-actions">
              <ModalActionMessage message={actionMessage} />
              <div className="medicinemaster-modal-actions-buttons">
                <Button type="cancel" onClick={handleCloseModal} />
                <Button type="reset" onClick={handleReset} />
                <Button type="save" onClick={handleSave} />
              </div>
            </div>
      </CommonModal>

      <CommonModal
        open={showMoreDrawer}
        onClose={() => setShowMoreDrawer(false)}
        overlayClassName="medicinemaster-modal-overlay"
        contentClassName="medicinemaster-modal-form"
      >
            <div className="medicinemaster-modal-header">
              <h3>Medicine Master</h3>
            </div>

            <div className="medicinemaster-modal-body">
              <FormField
                label="Add Medicine Name"
                name="medicineIds"
                type="select"
                multiple
                value={selectedMedicineIds}
                onChange={handleMultiSelectChange}
                options={dropdownMedicineList.map((item) => ({
                  ...item,
                  id: normalizeId(item.id),
                }))}
                optionLabel="brand"
                optionValue="id"
                remoteOptions
                optionsLoading={dropdownLoading}
                hasMoreOptions={dropdownHasMore}
                onOptionsSearch={setDropdownSearchQuery}
                onLoadMoreOptions={() => {
                  if (dropdownLoading || !dropdownHasMore || !selectedParentMedicineId) {
                    return;
                  }
                  void fetchNdcDropdownPage({
                    page: dropdownPage + 1,
                    append: true,
                    parentId: selectedParentMedicineId,
                    searchText: debouncedDropdownSearch || undefined,
                  });
                }}
              />

              <div className="medicinemaster-selected-list-wrap">
                <p className="medicinemaster-selected-list-title">Selected Medicine</p>
                {selectedMedicineItems.length === 0 ? (
                  <p className="medicinemaster-selected-empty">No medicine selected</p>
                ) : (
                  <div className="medicinemaster-selected-chips">
                    {selectedMedicineItems.map((item) => (
                      <span key={String(item.id)} className="medicinemaster-selected-chip">
                        {item.brand}
                        <button
                          type="button"
                          className="medicinemaster-selected-chip-remove"
                          onClick={() => handleRemoveSelectedMedicine(normalizeId(item.id))}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="medicinemaster-modal-actions">
              <Button type="cancel" onClick={() => setShowMoreDrawer(false)} />
              <Button type="reset" onClick={handleMoreReset} />
              <Button type="save" onClick={handleMoreSave} />
            </div>
      </CommonModal>
    </div>
  );
}
