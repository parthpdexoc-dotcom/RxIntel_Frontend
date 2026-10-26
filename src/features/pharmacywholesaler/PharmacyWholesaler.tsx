import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import FormControl from "@mui/material/FormControl";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CheckIcon from "@mui/icons-material/Check";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Table from "../../component/molecules/Table";
import Pagination from "../../component/molecules/Pagination";
import Button from "../../component/atoms/Button";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import {
  addPharmacyWholesalerLinks,
  deletePharmacyWholesaler,
  fetchPharmacyWholesaler,
} from "../../slice/PharmacyWholesalerSlice";
import { getWholesalerApi } from "../../service/WholesalerService";
import { showError } from "../../component/atoms/ToastHelper";
import { useDeleteHandler } from "../../hooks/useDeleteHandler";
import "./PharmacyWholesaler.css";
import { listPageParamRowOffset } from "../../types/listPageParam";
import type { AppDispatch, RootState } from "../../app/store";
import type { PharmacyWholesalerDto } from "../../dto/pharmacyWholesalerDto";
import { withPharmacyWholesalerDisplayName } from "../../dto/pharmacyWholesalerDto";
import type { WholesalerDto } from "../../dto/wholesalerDto";
import { usePharmacyDisplayName } from "../../hooks/usePharmacyDisplayName";
import { getPharmacyPossessivePageTitle } from "../../utils/pharmacyPageTitle";

const WHOLESALER_FETCH_LIMIT = 10;

export default function PharmacyWholesaler() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPharmacyId = searchParams.get("pharmacyId") || "";
  const queryPharmacyName = searchParams.get("pharmacyName") || "";
  const pharmacyDisplayName = usePharmacyDisplayName(
    selectedPharmacyId,
    queryPharmacyName
  );
  const pageTitle = getPharmacyPossessivePageTitle(
    pharmacyDisplayName,
    "Wholesaler",
    "Pharmacy Wholesaler"
  );

  const { list, loading, totalRecords } = useSelector(
    (state: RootState) => state.pharmacywholesaler
  );
  const [wholesalerOptions, setWholesalerOptions] = useState<WholesalerDto[]>([]);

  const [pageParam, setPageParam] = useState({ page: 1, pageSize: 10 });
  const [selectedWholesalerIds, setSelectedWholesalerIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadWholesalers = async () => {
      try {
        let page = 1;
        let totalRecordsFromApi = Number.MAX_SAFE_INTEGER;
        const merged: WholesalerDto[] = [];

        while ((page - 1) * WHOLESALER_FETCH_LIMIT < totalRecordsFromApi) {
          const res = await getWholesalerApi({
            page,
            pageSize: WHOLESALER_FETCH_LIMIT,
          });
          const payload = res?.data || {};
          const pageData = Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload?.Data)
              ? payload.Data
              : Array.isArray(payload)
                ? payload
                : [];

          if (typeof payload?.totalRecords === "number") {
            totalRecordsFromApi = payload.totalRecords;
          } else if (typeof payload?.TotalRecords === "number") {
            totalRecordsFromApi = payload.TotalRecords;
          }

          if (pageData.length === 0) break;
          merged.push(...(pageData as WholesalerDto[]));
          page += 1;
        }

        const uniqueById = Array.from(
          new Map(merged.map((item) => [String(item.id), item])).values()
        );

        if (!cancelled) setWholesalerOptions(uniqueById);
      } catch {
        if (!cancelled) setWholesalerOptions([]);
      }
    };

    loadWholesalers();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    setPageParam((prev) => ({ ...prev, page: 1 }));
    setSelectedWholesalerIds([]);
  }, [selectedPharmacyId]);

  const reloadMappings = () => {
    if (!selectedPharmacyId) return;
    dispatch(
      fetchPharmacyWholesaler({
        pharmacyId: selectedPharmacyId,
        page: pageParam.page,
        pageSize: pageParam.pageSize,
      })
    );
  };

  useEffect(() => {
    reloadMappings();
  }, [dispatch, selectedPharmacyId, pageParam.page, pageParam.pageSize]);

  const linkedWholesalerIdSet = useMemo(() => {
    return new Set(
      list
        .map((item) => item.wholesalerId)
        .filter((id): id is string => id != null)
        .map((id) => String(id))
    );
  }, [list]);

  const availableWholesalers = useMemo(() => {
    return wholesalerOptions.filter((w) => {
      if (w.id == null) return false;
      return !linkedWholesalerIdSet.has(String(w.id));
    });
  }, [wholesalerOptions, linkedWholesalerIdSet]);

  const tableRows = useMemo((): PharmacyWholesalerDto[] => {
    return list.map((item) => withPharmacyWholesalerDisplayName(item, wholesalerOptions));
  }, [list, wholesalerOptions]);

  const columns = [{ header: "Wholesaler Name", accessor: "wholesalerName" as const }];

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/pharmacy");
  };

  const handleAdd = () => {
    if (!selectedPharmacyId) {
      showError("Please open this page from a Pharmacy row.");
      return;
    }
    if (selectedWholesalerIds.length === 0) {
      showError("Select at least one wholesaler.");
      return;
    }

    dispatch(
      addPharmacyWholesalerLinks({
        pharmacyId: selectedPharmacyId,
        wholesalerIds: selectedWholesalerIds,
      })
    )
      .unwrap()
      .then(() => {
        reloadMappings();
        setSelectedWholesalerIds([]);
      })
      .catch(() => {});
  };

  const onSelectChange = (_event: unknown, newValue: WholesalerDto[]) => {
    setSelectedWholesalerIds(
      newValue.map((item) => String(item.id)).filter(Boolean)
    );
  };

  const handleDelete = useDeleteHandler({
    list: tableRows,
    getDisplayName: (row) => row.wholesalerName ?? "this wholesaler",
    deleteThunk: deletePharmacyWholesaler,
    onSuccess: reloadMappings,
  });

  return (
    <div className="page-shell pw-page">
      <div className="card page-card">
        <div className="pw-top-toolbar">
          <Button type="back" onClick={handleBack} />
        </div>

        <PageCardHeader
          icon={<LocalShippingOutlinedIcon />}
          title={pageTitle}
          subtitle="Manage and view wholesalers linked to this pharmacy."
        />

        {!selectedPharmacyId && (
          <div className="pw-banner">
            Open this screen from Pharmacy → More (⋮) → View Pharmacy Wholesaler so a pharmacy is selected.
          </div>
        )}

        <div className="pw-picker-row page-primary-cta">
          <div className="pw-wholesaler-select-wrap">
            <FormControl fullWidth size="small" disabled={!selectedPharmacyId}>
              <Autocomplete
                multiple
                size="small"
                limitTags={2}
                disableCloseOnSelect
                options={availableWholesalers}
                getOptionLabel={(option) => option.wholesalerName ?? ""}
                isOptionEqualToValue={(option, value) =>
                  String(option.id) === String(value.id)
                }
                value={availableWholesalers.filter((w) =>
                  selectedWholesalerIds.includes(String(w.id))
                )}
                onChange={onSelectChange}
                disabled={!selectedPharmacyId}
                renderInput={(params) => (
                  <TextField {...params} label="Wholesaler Name" />
                )}
                renderOption={(props, option, { selected }) => (
                  <li {...props} key={option.id}>
                    {selected ? (
                      <CheckIcon sx={{ fontSize: 18, color: "#2f9f6e", marginRight: "8px" }} />
                    ) : (
                      <span style={{ width: 18, marginRight: "8px" }} />
                    )}
                    <span>{option.wholesalerName}</span>
                  </li>
                )}
              />
            </FormControl>
          </div>
          <Button
            type="add"
            label="+ Add"
            onClick={handleAdd}
            disabled={!selectedPharmacyId || loading}
          />
        </div>

        <div className="page-table-wrap pw-table-wrap">
          <Table
            columns={columns}
            data={tableRows}
            serialNumberOffset={listPageParamRowOffset(pageParam)}
            loading={loading}
            showDelete
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
    </div>
  );
}
