import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import Popover from "@mui/material/Popover";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import { useDispatch, useSelector } from "react-redux";
import Pagination, { type PageParam } from "../../component/molecules/Pagination";
import ScrollAreaWithLoading from "../../component/molecules/ScrollAreaWithLoading";
import PageCardHeader from "../../component/molecules/PageCardHeader";
import { CustomSelect } from "../../component/molecules/FormField";
import ReportDateRangePicker, {
  type DateRange,
  type DateRangeValue,
  isDateRangeSet,
} from "./ReportDateRangePicker";
import {
  loadReportDashboardFilters,
  loadVisibleMetricsConfig,
  saveVisibleMetricsConfig,
  type VisibleMetricsConfig,
} from "./reportDashboardStorage";
import { fetchDataAnalytics, exportDataAnalytics, clearDataAnalytics } from "../../slice/DataAnalyticsSlice";
import { fetchPharmacy, fetchPharmacyById } from "../../slice/PharmacySlice";
import { fetchInsurance } from "../../slice/InsuranceSlice";
import { getPharmacyDisplayName } from "../../dto/pharmacyDto";
import type { DataAnalyticsRowDto } from "../../dto/dataAnalyticsDto";
import SortableColumnHeader from "../../component/molecules/SortableColumnHeader";
import ColumnResizeHandle from "../../component/molecules/ColumnResizeHandle";
import {
  DEFAULT_DATA_ANALYTICS_SORT,
  REPORT_BASE_SORT_COLUMNS,
  toggleSortDirection,
  type ReportBaseSortField,
} from "../../constants/dataAnalyticsSort";
import {
  NET_QUANTITY_FILTER,
  NET_QUANTITY_FILTER_OPTIONS,
  toApiNetQuantityFilter,
  type NetQuantityFilterValue,
} from "../../constants/netQuantityFilter";
import type { ListSortDirection } from "../../types/listPageParam";
import { getPharmacyId, isEmployee } from "../../component/auth/authUtils";
import type { AppDispatch, RootState } from "../../app/store";
import { DEFAULT_LIST_PAGE_PARAM } from "../../types/listPageParam";
import { useResizableColumns } from "../../hooks/useResizableColumns";
import "./ReportDashboard.css";

const BASE_COLUMN_KEYS = REPORT_BASE_SORT_COLUMNS.map((c) => c.sortKey);

const TABS = ["Simple View", "Advanced View"] as const;

type ColumnGroup = {
  label: string;
  columns: string[];
  columnTitles?: string[];
  headerClassName?: string;
  /** Thicker left rule before this group (e.g. after Wholesaler Quantity). */
  sectionDividerBefore?: boolean;
  badge?: boolean;
  getGroupTotal?: (row: DataAnalyticsRowDto) => number;
  getValue: (row: DataAnalyticsRowDto, column: string) => number | undefined;
  format?: (value: number | undefined) => string;
};

const formatPackageNumber = (value: number | undefined): string => {
  if (value == null || value === 0) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatDollarAmount = (value: number | undefined): string => {
  const amount = value == null || value === 0 ? 0 : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatTotalDollars = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const renderCell = (value: string) =>
  value ? value : <span className="cell-empty">–</span>;

const cellHoverTitle = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
};

const formatGroupHeaderLabel = (
  group: ColumnGroup,
  sampleRow?: DataAnalyticsRowDto
): string => {
  if (!group.getGroupTotal || !sampleRow) return group.label;
  const totalText = group.format?.(group.getGroupTotal(sampleRow));
  return totalText ? `${group.label} (${totalText})` : group.label;
};

const renderBadgeCell = (value: string, numericValue?: number) => {
  if (!value) return <span className="cell-empty">–</span>;
  const isNegative = numericValue != null && numericValue < 0;
  const displayValue = isNegative ? value.replace(/^-/, "") : value;
  return (
    <span
      className={`cell-badge${isNegative ? " cell-badge--negative" : ""}`}
    >
      {displayValue}
    </span>
  );
};

const toIsoDate = (date: dayjs.Dayjs) => date.format("YYYY-MM-DD");

/** Previous calendar month (e.g. Aug 12 → Jul 1–31). */
function getPreviousMonthRange(): DateRange {
  const previousMonth = dayjs().subtract(1, "month");
  return {
    start: previousMonth.startOf("month"),
    end: previousMonth.endOf("month").startOf("day"),
  };
}

/** Last two full calendar months (e.g. Aug → Jun 1–Jul 31). */
function getLastTwoMonthsRange(): DateRange {
  return {
    start: dayjs().subtract(2, "month").startOf("month"),
    end: dayjs().subtract(1, "month").endOf("month").startOf("day"),
  };
}

function readInitialFilters(employeePharmacyId: string) {
  const saved = loadReportDashboardFilters();
  return {
    pharmacyId: employeePharmacyId,
    billingDateRange: saved.billingDateRange,
    orderedDateRange: saved.orderedDateRange,
  };
}

export default function ReportDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const isPharmacyEmployee = isEmployee();
  const employeePharmacyId = getPharmacyId() ?? "";

  const initialFilters = useMemo(
    () => readInitialFilters(employeePharmacyId),
    [employeePharmacyId]
  );

  const { list: pharmacyList } = useSelector((state: RootState) => state.pharmacy);
  const { list: insuranceList } = useSelector((state: RootState) => state.insurance);
  const {
    list,
    totalRecords,
    primaryInsuranceColumnNames,
    insuranceFamilies,
    wholesalerColumnNames,
    filterNdcOptions,
    filterProductNameOptions,
    filterPackageSizeOptions,
    loading,
  } = useSelector((state: RootState) => state.dataAnalytics);

  const [pageParam, setPageParam] = useState<PageParam>({
    page: DEFAULT_LIST_PAGE_PARAM.page,
    pageSize: DEFAULT_LIST_PAGE_PARAM.pageSize,
  });
  const [sortParam, setSortParam] = useState<{
    sortBy: ReportBaseSortField;
    sortDirection: ListSortDirection;
  }>(DEFAULT_DATA_ANALYTICS_SORT);
  const [pharmacyId, setPharmacyId] = useState(initialFilters.pharmacyId);
  const [billingDateRange, setBillingDateRange] = useState<DateRangeValue>(
    initialFilters.billingDateRange
  );
  const [orderedDateRange, setOrderedDateRange] = useState<DateRangeValue>(
    initialFilters.orderedDateRange
  );
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Simple View");
  const [exporting, setExporting] = useState(false);
  const [metricsConfig, setMetricsConfig] = useState<VisibleMetricsConfig>(() =>
    loadVisibleMetricsConfig()
  );
  const [draftConfig, setDraftConfig] =
    useState<VisibleMetricsConfig>(metricsConfig);
  const [customizeAnchorEl, setCustomizeAnchorEl] =
    useState<HTMLButtonElement | null>(null);

  const [selectedNdcs, setSelectedNdcs] = useState<string[]>([]);
  const [ndcSpecified, setNdcSpecified] = useState<boolean>(false);
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [selectedPackageSizes, setSelectedPackageSizes] = useState<string[]>([]);
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [netQuantityFilter, setNetQuantityFilter] = useState<NetQuantityFilterValue>(
    NET_QUANTITY_FILTER.all
  );

  const handleOpenCustomize = (event: React.MouseEvent<HTMLButtonElement>) => {
    setDraftConfig(metricsConfig);
    setCustomizeAnchorEl(event.currentTarget);
  };

  const handleCloseCustomize = () => {
    setCustomizeAnchorEl(null);
  };

  const handleCancelCustomize = () => {
    setDraftConfig(metricsConfig);
    setCustomizeAnchorEl(null);
  };

  const handleApplyCustomize = () => {
    setMetricsConfig(draftConfig);
    saveVisibleMetricsConfig(draftConfig);
    setCustomizeAnchorEl(null);
  };

  const handleToggleGroup = (groupKey: "showDollarsBilled") => {
    setDraftConfig((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const handleToggleColumn = (columnName: string) => {
    setDraftConfig((prev) => {
      const isHidden = prev.hiddenColumns.includes(columnName);
      const nextHidden = isHidden
        ? prev.hiddenColumns.filter((c) => c !== columnName)
        : [...prev.hiddenColumns, columnName];
      return {
        ...prev,
        hiddenColumns: nextHidden,
      };
    });
  };



  useEffect(() => {
    if (isPharmacyEmployee && employeePharmacyId) {
      dispatch(fetchPharmacyById(employeePharmacyId));
    } else {
      dispatch(fetchPharmacy());
    }
    dispatch(
      fetchInsurance({ page: 1, pageSize: 500, uniqueInsuranceNames: true })
    );
  }, [dispatch, isPharmacyEmployee, employeePharmacyId]);

  const availableInsuranceNames = useMemo(() => {
    const names = new Set<string>();
    primaryInsuranceColumnNames.forEach((n) => {
      if (n && n.trim()) names.add(n.trim());
    });
    insuranceList.forEach((ins) => {
      if (ins.insuranceName && ins.insuranceName.trim()) {
        names.add(ins.insuranceName.trim());
      }
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [primaryInsuranceColumnNames, insuranceList]);

  // Always keep user-selected values in the option lists so multi-select chips
  // continue to show every selected NDC/product/package after cascade refetches.
  const ndcOptions = useMemo(() => {
    const set = new Set(filterNdcOptions.map((ndc) => ndc.trim()).filter(Boolean));
    selectedNdcs.forEach((ndc) => {
      if (ndc.trim()) set.add(ndc.trim());
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((val) => ({ id: val, label: val }));
  }, [filterNdcOptions, selectedNdcs]);

  const productNameOptions = useMemo(() => {
    const set = new Set(
      filterProductNameOptions.map((name) => name.trim()).filter(Boolean)
    );
    selectedProductNames.forEach((name) => {
      if (name.trim()) set.add(name.trim());
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((val) => ({ id: val, label: val }));
  }, [filterProductNameOptions, selectedProductNames]);

  const packageSizeOptions = useMemo(() => {
    const set = new Set(
      filterPackageSizeOptions.map((size) => size.trim()).filter(Boolean)
    );
    selectedPackageSizes.forEach((size) => {
      if (size.trim()) set.add(size.trim());
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((val) => ({ id: val, label: val }));
  }, [filterPackageSizeOptions, selectedPackageSizes]);

  const insuranceOptions = useMemo(() => {
    const set = new Set<string>();
    primaryInsuranceColumnNames.forEach((name) => {
      if (name && name.trim()) {
        set.add(name.trim());
      }
    });
    availableInsuranceNames.forEach((name) => {
      if (name.trim()) set.add(name.trim());
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b))
      .map((val) => ({ id: val, label: val }));
  }, [primaryInsuranceColumnNames, availableInsuranceNames]);

  const handleNdcFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = (e.target as { value: string | string[] }).value;
    setSelectedNdcs(Array.isArray(raw) ? raw : [raw].filter(Boolean));
    // Reset dependent cascade filters so Product/Package only reflect the new NDC set.
    setSelectedProductNames([]);
    setSelectedPackageSizes([]);
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handleProductNameFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = (e.target as { value: string | string[] }).value;
    setSelectedProductNames(Array.isArray(raw) ? raw : [raw].filter(Boolean));
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handlePackageSizeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = (e.target as { value: string | string[] }).value;
    setSelectedPackageSizes(Array.isArray(raw) ? raw : [raw].filter(Boolean));
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const clearDependentProductFilters = useCallback(() => {
    setSelectedNdcs([]);
    setSelectedProductNames([]);
    setSelectedPackageSizes([]);
  }, []);

  const handleSortColumn = (sortKey: ReportBaseSortField) => {
    setSortParam((prev) => ({
      sortBy: sortKey,
      sortDirection: toggleSortDirection(
        prev.sortBy,
        sortKey,
        prev.sortDirection
      ),
    }));
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handleInsuranceFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = (e.target as { value: string | string[] }).value;
    setSelectedInsurances(Array.isArray(raw) ? raw : [raw].filter(Boolean));
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handleNetQuantityFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const raw = e.target.value as NetQuantityFilterValue;
    setNetQuantityFilter(raw || NET_QUANTITY_FILTER.all);
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    if (!isPharmacyEmployee) {
      setPharmacyId("");
    }
    setBillingDateRange(null);
    setOrderedDateRange(null);
    setSelectedNdcs([]);
    setNdcSpecified(false);
    setSelectedProductNames([]);
    setSelectedPackageSizes([]);
    setSelectedInsurances([]);
    setNetQuantityFilter(NET_QUANTITY_FILTER.all);
    dispatch(clearDataAnalytics());
    setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
  };

  const hasActiveFilters =
    (!isPharmacyEmployee && Boolean(pharmacyId)) ||
    Boolean(billingDateRange) ||
    Boolean(orderedDateRange) ||
    selectedNdcs.length > 0 ||
    selectedProductNames.length > 0 ||
    selectedPackageSizes.length > 0 ||
    selectedInsurances.length > 0 ||
    ndcSpecified ||
    netQuantityFilter !== NET_QUANTITY_FILTER.all;

  const hasActiveSecondaryFilters =
    selectedNdcs.length > 0 ||
    selectedProductNames.length > 0 ||
    selectedPackageSizes.length > 0 ||
    selectedInsurances.length > 0 ||
    ndcSpecified;

  useEffect(() => {
    if (employeePharmacyId) {
      setPharmacyId(employeePharmacyId);
    }
  }, [employeePharmacyId]);

  const pharmacyOptions = useMemo(
    () =>
      pharmacyList
        .filter((pharmacy) => pharmacy.id)
        .map((pharmacy) => ({
          id: String(pharmacy.id),
          name: getPharmacyDisplayName(pharmacy),
        })),
    [pharmacyList]
  );

  const isReportReadyToLoad =
    Boolean(pharmacyId) && isDateRangeSet(billingDateRange);

  useEffect(() => {
    if (!isReportReadyToLoad) {
      dispatch(clearDataAnalytics());
    }
  }, [dispatch, isReportReadyToLoad]);

  const buildAnalyticsParams = useCallback(() => {
    if (!pharmacyId || !isDateRangeSet(billingDateRange)) {
      return null;
    }

    const billingRange = billingDateRange;
    const netQuantityFilterApi = toApiNetQuantityFilter(netQuantityFilter);

    const filters = {
      page: pageParam.page,
      pageSize: pageParam.pageSize,
      sortBy: sortParam.sortBy,
      sortDirection: sortParam.sortDirection,
      advancedView: activeTab === "Advanced View",
      ...(netQuantityFilterApi ? { netQuantityFilter: netQuantityFilterApi } : {}),
      ...(selectedNdcs.length > 0 ? { filterNdcs: selectedNdcs, ndcSpecified } : {}),
      ...(selectedProductNames.length > 0
        ? { filterProductNames: selectedProductNames }
        : {}),
      ...(selectedPackageSizes.length > 0
        ? { filterPackageSizes: selectedPackageSizes }
        : {}),
      ...(selectedInsurances.length > 0
        ? { filterInsuranceNames: selectedInsurances }
        : {}),
    };

    if (!isDateRangeSet(orderedDateRange)) {
      return {
        pharmacyId,
        startDate: toIsoDate(billingRange.start),
        endDate: toIsoDate(billingRange.end),
        splitDates: false,
        ...filters,
      };
    }

    return {
      pharmacyId,
      startDate: toIsoDate(orderedDateRange.start),
      endDate: toIsoDate(orderedDateRange.end),
      splitDates: true,
      billingStartDate: toIsoDate(billingRange.start),
      billingEndDate: toIsoDate(billingRange.end),
      orderedStartDate: toIsoDate(orderedDateRange.start),
      orderedEndDate: toIsoDate(orderedDateRange.end),
      ...filters,
    };
  }, [
    pharmacyId,
    billingDateRange,
    orderedDateRange,
    netQuantityFilter,
    pageParam.page,
    pageParam.pageSize,
    sortParam.sortBy,
    sortParam.sortDirection,
    activeTab,
    selectedNdcs,
    ndcSpecified,
    selectedProductNames,
    selectedPackageSizes,
    selectedInsurances,
  ]);

  const loadReport = useCallback(() => {
    if (!isReportReadyToLoad) {
      dispatch(clearDataAnalytics());
      return;
    }

    const params = buildAnalyticsParams();
    if (!params) {
      dispatch(clearDataAnalytics());
      return;
    }

    dispatch(fetchDataAnalytics(params));
  }, [dispatch, isReportReadyToLoad, buildAnalyticsParams]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const isAdvancedView = activeTab === "Advanced View";

  const columnGroups = useMemo<ColumnGroup[]>(
    () => {
      const hasInsurances = primaryInsuranceColumnNames.length > 0;
      const groups: ColumnGroup[] = [];

      if (isAdvancedView && wholesalerColumnNames.length > 0) {
        groups.push({
          label: "Wholesaler Quantity",
          columns: wholesalerColumnNames.map((name) => `${name} Qty`),
          columnTitles: wholesalerColumnNames,
          getValue: (row, column) => {
            const wholesalerName = column.replace(/ Qty$/, "");
            return row.wholesalerQuantities?.[wholesalerName];
          },
          format: formatPackageNumber,
        });
      }

      if (!hasInsurances) return groups;

      let emphasizeInsuranceSectionStart =
        isAdvancedView && wholesalerColumnNames.length > 0;

      const familyMemberSet = new Set(
        insuranceFamilies.flatMap((family) =>
          family.memberNames.map((name) => name.toLowerCase())
        )
      );
      const standaloneNames = primaryInsuranceColumnNames.filter(
        (name) => !familyMemberSet.has(name.toLowerCase())
      );

      const getActualPackages = (row: DataAnalyticsRowDto, name: string) =>
        row.actualInsurancePackages?.[name] ?? row.primaryInsurancePackages?.[name];

      if (isAdvancedView && insuranceFamilies.length > 0) {
        insuranceFamilies.forEach((family) => {
          const parentName = family.parentName;
          groups.push({
            label: parentName,
            headerClassName: "group-header--family",
            sectionDividerBefore: emphasizeInsuranceSectionStart,
            columns: family.memberNames.map((name) => `${name} Packages`),
            columnTitles: family.memberNames,
            getGroupTotal: (row) =>
              family.memberNames.reduce(
                (sum, name) => sum + (getActualPackages(row, name) ?? 0),
                0
              ),
            getValue: (row, column) => {
              const insuranceName = column.replace(/ Packages$/, "");
              return getActualPackages(row, insuranceName);
            },
            format: formatPackageNumber,
          });
          emphasizeInsuranceSectionStart = false;
        });

        if (standaloneNames.length > 0) {
          groups.push({
            label: "Other Insurance Packages",
            sectionDividerBefore: emphasizeInsuranceSectionStart,
            columns: standaloneNames.map((name) => `${name} Packages`),
            columnTitles: standaloneNames,
            getValue: (row, column) => {
              const insuranceName = column.replace(/ Packages$/, "");
              return getActualPackages(row, insuranceName);
            },
            format: formatPackageNumber,
          });
          emphasizeInsuranceSectionStart = false;
        }

        groups.push({
          label: "Excess quantities",
          sectionDividerBefore: true,
          badge: true,
          columns: primaryInsuranceColumnNames.map((name) => `${name} Net`),
          columnTitles: primaryInsuranceColumnNames,
          getValue: (row, column) => {
            const insuranceName = column.replace(/ Net$/, "");
            return row.primaryInsuranceNet?.[insuranceName];
          },
          format: formatPackageNumber,
        });
      } else {
        groups.push({
          label: "Quantity billed",
          sectionDividerBefore: emphasizeInsuranceSectionStart,
          columns: primaryInsuranceColumnNames.map(
            (name) => `${name} Packages`
          ),
          columnTitles: primaryInsuranceColumnNames,
          getValue: (row, column) => {
            const insuranceName = column.replace(/ Packages$/, "");
            return row.primaryInsurancePackages?.[insuranceName];
          },
          format: formatPackageNumber,
        });

        groups.push({
          label: "Excess quantities",
          sectionDividerBefore: true,
          columns: primaryInsuranceColumnNames.map((name) => `${name} Net`),
          columnTitles: primaryInsuranceColumnNames,
          badge: true,
          getValue: (row, column) => {
            const insuranceName = column.replace(/ Net$/, "");
            return row.primaryInsuranceNet?.[insuranceName];
          },
          format: formatPackageNumber,
        });
      }

      if (metricsConfig.showDollarsBilled && hasInsurances) {
        const columns = primaryInsuranceColumnNames
          .map((name) => `${name} Dollars`)
          .filter((col) => !metricsConfig.hiddenColumns.includes(col));

        if (columns.length > 0) {
          groups.push({
            label: "Dollars Billed",
            sectionDividerBefore: true,
            columns,
            columnTitles: columns.map((col) => col.replace(/ Dollars$/, "")),
            getValue: (row, column) => {
              const insuranceName = column.replace(/ Dollars$/, "");
              return row.primaryInsuranceDollars[insuranceName];
            },
            format: formatDollarAmount,
          });
        }
      }

      return groups;
    },
    [
      primaryInsuranceColumnNames,
      insuranceFamilies,
      wholesalerColumnNames,
      metricsConfig,
      isAdvancedView,
    ]
  );

  const handleDownload = useCallback(() => {
    if (!isReportReadyToLoad) return;

    const params = buildAnalyticsParams();
    if (!params) return;

    const fixedColumns = [
      "NDC",
      "Product Name",
      "Package Size",
      "Verified",
      "Wholesaler",
      "Quantity Ordered",
      "Billed Quantity",
      "Net Quantity",
      "Dollars Billed",
    ];
    const groupColumns = columnGroups.flatMap((g) => g.columns);
    const selectedColumns = [...fixedColumns, ...groupColumns];

    const hiddenColumns: string[] = [];
    if (!metricsConfig.showDollarsBilled) {
      availableInsuranceNames.forEach((name) => {
        hiddenColumns.push(`${name} Dollars`);
      });
    } else {
      metricsConfig.hiddenColumns.forEach((col) => {
        if (!hiddenColumns.includes(col)) {
          hiddenColumns.push(col);
        }
      });
    }

    setExporting(true);
    dispatch(
      exportDataAnalytics({
        ...params,
        selectedColumns,
        hiddenColumns,
      })
    ).finally(() => setExporting(false));
  }, [
    dispatch,
    isReportReadyToLoad,
    buildAnalyticsParams,
    metricsConfig,
    columnGroups,
    availableInsuranceNames,
  ]);

  const handlePharmacyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPharmacyId = event.target.value;
    setPharmacyId(nextPharmacyId);
    clearDependentProductFilters();
    setPageParam((prev) => ({ ...prev, page: 1 }));
  };

  const handleBillingDateRangeChange = (range: DateRange) => {
    setBillingDateRange(range);
    setOrderedDateRange({
      start: range.start.subtract(1, "month").startOf("day"),
      end: range.end.startOf("day"),
    });
    clearDependentProductFilters();
    setPageParam((prev) => ({ ...prev, page: 1 }));
  };

  const handleOrderedDateRangeChange = (range: DateRange) => {
    setOrderedDateRange(range);
    clearDependentProductFilters();
    setPageParam((prev) => ({ ...prev, page: 1 }));
  };

  const emptyTableMessage = !isReportReadyToLoad
    ? "Select a pharmacy and a billing date range to view report data."
    : hasActiveSecondaryFilters || netQuantityFilter !== NET_QUANTITY_FILTER.all
      ? "No records match the selected filters."
      : "No report data found for the selected pharmacy and date range.";

  // While loading or when there are no rows, keep the clean base-column layout
  // (same as the initial empty page). Do not keep previous insurance columns /
  // rows under the spinner — that collapses headers into single-letter columns.
  const showGridData = !loading && list.length > 0;
  const visibleColumnGroups = showGridData ? columnGroups : [];
  const gridTotalRecords = loading ? 0 : totalRecords;
  const { widths, getColumnStyle, beginResize, resetColumn } =
    useResizableColumns();
  const tableHasResizedColumns = Object.keys(widths).length > 0;

  const dynamicColumnCount = useMemo(
    () =>
      visibleColumnGroups.reduce((count, group) => count + group.columns.length, 0),
    [visibleColumnGroups]
  );

  const tableColumnCount = 9 + dynamicColumnCount;
  const hasGroupedHeaderRow = visibleColumnGroups.some(
    (group) => group.columns.length > 0
  );

  const leafColumnKey = (column: string) => `leaf:${column}`;

  return (
    <div className="page-shell report-dashboard">
      <div className="card page-card report-dashboard-card">
        <PageCardHeader
          icon={<AssessmentOutlinedIcon />}
          title="Data Analytics"
          subtitle="Filter, compare, and export pharmacy billing and purchase metrics."
        />

        <div className="report-dashboard-filters-grid">
          <div className="report-dashboard-filter-field">
            <span className="report-dashboard-date-label">
              {isPharmacyEmployee ? "Current Pharmacy" : "Pharmacy List"}
            </span>
            <CustomSelect
              label="Pharmacy"
              name="pharmacyId"
              value={pharmacyId}
              options={pharmacyOptions}
              optionLabel="name"
              optionValue="id"
              onChange={handlePharmacyChange}
              searchable
              disabled={isPharmacyEmployee}
              triggerClassName="report-dashboard-filter-select"
            />
          </div>

          <div className="report-dashboard-filter-field">
            <span className="report-dashboard-date-label">Billing Date Range</span>
            <ReportDateRangePicker
              placeholder="Select billing dates"
              value={billingDateRange}
              defaultDraftRange={getPreviousMonthRange()}
              onChange={handleBillingDateRangeChange}
            />
          </div>

          <div className="report-dashboard-filter-field">
            <span className="report-dashboard-date-label">Purchase Date Range</span>
            <ReportDateRangePicker
              placeholder="Select purchase dates"
              value={orderedDateRange}
              defaultDraftRange={
                billingDateRange
                  ? {
                    start: billingDateRange.start.subtract(1, "month").startOf("day"),
                    end: billingDateRange.end.startOf("day"),
                  }
                  : getLastTwoMonthsRange()
              }
              onChange={handleOrderedDateRangeChange}
            />
          </div>

          <div className="report-dashboard-filter-field report-dashboard-filter-field--ndc">
              <span className="report-dashboard-date-label">NDC</span>
              <div className="report-dashboard-ndc-row">
                <CustomSelect
                  label="NDC"
                  name="selectedNdcs"
                  value={selectedNdcs}
                  options={ndcOptions}
                  optionLabel="label"
                  optionValue="id"
                  multiple
                  searchable
                  disabled={loading || !pharmacyId || ndcOptions.length === 0}
                  onChange={handleNdcFilterChange}
                  triggerClassName="report-dashboard-filter-select"
                />
                <label className="report-dashboard-checkbox-label">
                  <input
                    type="checkbox"
                    checked={ndcSpecified}
                    disabled={loading || !pharmacyId || ndcOptions.length === 0}
                    onChange={(e) => {
                      setNdcSpecified(e.target.checked);
                      setSelectedProductNames([]);
                      setSelectedPackageSizes([]);
                      setPageParam((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
                    }}
                  />
                  <span>NDC Specified</span>
                </label>
              </div>
            </div>

              <div className="report-dashboard-filter-field">
                <span className="report-dashboard-date-label">Product Name</span>
                <CustomSelect
                  label="Product Name"
                  name="selectedProductNames"
                  value={selectedProductNames}
                  options={productNameOptions}
                  optionLabel="label"
                  optionValue="id"
                  multiple
                  searchable
                  disabled={loading || !pharmacyId || productNameOptions.length === 0}
                  onChange={handleProductNameFilterChange}
                  triggerClassName="report-dashboard-filter-select"
                />
              </div>

              <div className="report-dashboard-filter-field">
                <span className="report-dashboard-date-label">Package Size</span>
                <CustomSelect
                  label="Package Size"
                  name="selectedPackageSizes"
                  value={selectedPackageSizes}
                  options={packageSizeOptions}
                  optionLabel="label"
                  optionValue="id"
                  multiple
                  searchable
                  disabled={loading || !pharmacyId || packageSizeOptions.length === 0}
                  onChange={handlePackageSizeFilterChange}
                  triggerClassName="report-dashboard-filter-select"
                />
              </div>

              <div className="report-dashboard-filter-field">
                <span className="report-dashboard-date-label">Insurance</span>
                <CustomSelect
                  label="Insurance"
                  name="selectedInsurances"
                  value={selectedInsurances}
                  options={insuranceOptions}
                  optionLabel="label"
                  optionValue="id"
                  multiple
                  searchable
                  disabled={loading || !pharmacyId || insuranceOptions.length === 0}
                  onChange={handleInsuranceFilterChange}
                  triggerClassName="report-dashboard-filter-select"
                />
              </div>

              <div className="report-dashboard-filter-field">
                <span className="report-dashboard-date-label">Net Quantity</span>
                <CustomSelect
                  label="Net Quantity"
                  name="netQuantityFilter"
                  value={netQuantityFilter}
                  options={NET_QUANTITY_FILTER_OPTIONS}
                  optionLabel="label"
                  optionValue="id"
                  disabled={loading || !pharmacyId || !isReportReadyToLoad}
                  onChange={handleNetQuantityFilterChange}
                  triggerClassName="report-dashboard-filter-select"
                />
              </div>
        </div>

        <p className="report-dashboard-hint">
          Billing Date filters rows by bill date. Purchase Date filters ordered packages by purchase invoice date.
        </p>

        <div className="report-dashboard-toolbar">
          <div className="report-dashboard-tabs" role="tablist" aria-label="Report views">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                className={`report-dashboard-tab${activeTab === tab ? " is-active" : ""}`}
                onClick={() => {
                  setActiveTab(tab);
                  setPageParam((prev) =>
                    prev.page === 1 ? prev : { ...prev, page: 1 }
                  );
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="report-dashboard-actions">
            <button
              type="button"
              className="report-dashboard-icon-btn"
              aria-label="Download"
              title="Download Excel"
              onClick={handleDownload}
              disabled={exporting || !isReportReadyToLoad}
            >
              <DownloadIcon />
            </button>
            <button
              type="button"
              className="report-dashboard-icon-btn"
              aria-label="Refresh"
              title="Refresh Report"
              onClick={loadReport}
              disabled={loading || !isReportReadyToLoad}
            >
              <RefreshIcon />
            </button>
            <button
              type="button"
              className="report-dashboard-clear-filters-btn"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              title="Clear all filters"
            >
              Clear Filters
            </button>
            <button
              type="button"
              className={`report-dashboard-btn report-dashboard-btn--customize${Boolean(customizeAnchorEl) ? " is-active" : ""
                }`}
              aria-label="Customize View"
              title="Customize View"
              onClick={handleOpenCustomize}
            >
              <TuneIcon className="btn-icon" />
              <span>Customize View</span>
            </button>
          </div>
        </div>

        <Popover
          open={Boolean(customizeAnchorEl)}
          anchorEl={customizeAnchorEl}
          onClose={handleCloseCustomize}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              className: "customize-metrics-popover-paper",
              style: {
                borderRadius: 12,
                marginTop: 8,
                boxShadow: "0 12px 32px rgba(16, 24, 40, 0.16)",
              },
            },
          }}
        >
          <div className="customize-metrics-panel">
            <div className="customize-metrics-header">
              <div>
                <h4 className="customize-metrics-title">Customize View</h4>
                <p className="customize-metrics-subtitle">
                  Select columns to display
                </p>
              </div>
              <button
                type="button"
                className="customize-metrics-close-btn"
                onClick={handleCloseCustomize}
                aria-label="Close"
              >
                <CloseIcon fontSize="small" />
              </button>
            </div>

            <div className="customize-metrics-list">
              {/* Dollars Billed */}
              <div className="customize-section">
                <label className="customize-metric-item customize-metric-item--header">
                  <input
                    type="checkbox"
                    className="customize-metric-checkbox"
                    checked={draftConfig.showDollarsBilled}
                    onChange={() => handleToggleGroup("showDollarsBilled")}
                  />
                  <span className="customize-metric-label">Dollars Billed</span>
                </label>
                {draftConfig.showDollarsBilled &&
                  availableInsuranceNames.map((name) => {
                    const colName = `${name} Dollars`;
                    const isChecked = !draftConfig.hiddenColumns.includes(colName);
                    return (
                      <label
                        key={colName}
                        className={`customize-metric-item customize-metric-item--sub${isChecked ? " is-selected" : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="customize-metric-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleColumn(colName)}
                        />
                        <span className="customize-metric-sublabel">{name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="customize-metrics-footer">
              <button
                type="button"
                className="customize-metrics-cancel-btn"
                onClick={handleCancelCustomize}
              >
                Cancel
              </button>
              <button
                type="button"
                className="customize-metrics-apply-btn"
                onClick={handleApplyCustomize}
              >
                Apply
              </button>
            </div>
          </div>
        </Popover>

        <ScrollAreaWithLoading
          loading={loading}
          message="Loading..."
          className={`report-dashboard-table-wrap${
            !showGridData ? " report-dashboard-table-wrap--empty" : ""
          }`}
          viewportClassName="report-dashboard-table-viewport"
        >
            <div className="report-dashboard-table-scroll">
              <table
                className={`report-dashboard-table${
                  tableHasResizedColumns ? " report-dashboard-table--resized" : ""
                }`}
              >
                <thead>
                  <tr>
                    {REPORT_BASE_SORT_COLUMNS.map(({ label, sortKey }) => (
                      <SortableColumnHeader
                        key={sortKey}
                        label={label}
                        rowSpan={hasGroupedHeaderRow ? 2 : undefined}
                        align="center"
                        active={sortParam.sortBy === sortKey}
                        direction={sortParam.sortDirection}
                        onSort={() => handleSortColumn(sortKey)}
                        className={`report-dashboard-sort-header${
                          widths[sortKey] != null ? " is-col-resized" : ""
                        }`}
                        style={getColumnStyle(sortKey)}
                        resizeHandle={
                          <ColumnResizeHandle
                            columnKey={sortKey}
                            onResizeStart={beginResize}
                            onReset={resetColumn}
                          />
                        }
                      />
                    ))}
                    {visibleColumnGroups.map((group) =>
                      group.columns.length > 0 ? (
                        <th
                          key={group.label}
                          colSpan={group.columns.length}
                          title={formatGroupHeaderLabel(group, list[0])}
                          className={`group-header group-start${group.sectionDividerBefore ? " group-section-divider" : ""}${group.headerClassName ? ` ${group.headerClassName}` : ""}`}
                        >
                          {formatGroupHeaderLabel(group, list[0])}
                        </th>
                      ) : null
                    )}
                  </tr>
                  {hasGroupedHeaderRow ? (
                    <tr>
                      {visibleColumnGroups.flatMap((group) =>
                        group.columns.map((column, index) => {
                          const headerTitle =
                            group.columnTitles?.[index] ?? column;
                          const key = leafColumnKey(column);
                          return (
                          <th
                            key={`${group.label}-${column}`}
                            title={headerTitle}
                            style={getColumnStyle(key)}
                            className={`report-dashboard-leaf-header${
                              index === 0
                                ? ` group-start${group.sectionDividerBefore ? " group-section-divider" : ""}`
                                : ""
                            }${widths[key] != null ? " is-col-resized" : ""}`}
                          >
                            {headerTitle}
                            <ColumnResizeHandle
                              columnKey={key}
                              onResizeStart={beginResize}
                              onReset={resetColumn}
                            />
                          </th>
                          );
                        })
                      )}
                    </tr>
                  ) : null}
                </thead>
                <tbody>
                  {!showGridData ? (
                    <tr className="report-dashboard-empty-row">
                      <td
                        colSpan={tableColumnCount}
                        className="report-dashboard-empty-cell"
                      />
                    </tr>
                  ) : (
                    list.map((row) => (
                      <tr key={row.ndc}>
                            {BASE_COLUMN_KEYS.map((key) => {
                              const style = getColumnStyle(key);
                              const resizedClass =
                                widths[key] != null ? " is-col-resized" : "";
                              if (key === "ndc") {
                                return (
                                  <td
                                    key={key}
                                    className={`report-dashboard-ndc-cell${resizedClass}`}
                                    style={style}
                                    title={cellHoverTitle(row.ndc)}
                                  >
                                    {row.ndc}
                                  </td>
                                );
                              }
                              if (key === "productName") {
                                return (
                                  <td
                                    key={key}
                                    className={`report-dashboard-product-name-cell${resizedClass}`}
                                    style={style}
                                    title={cellHoverTitle(row.productName)}
                                  >
                                    {row.productName || <span className="cell-empty">–</span>}
                                  </td>
                                );
                              }
                              if (key === "packageSize") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(row.packageSize)}
                                  >
                                    {row.packageSize || <span className="cell-empty">–</span>}
                                  </td>
                                );
                              }
                              if (key === "verified") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(row.verified)}
                                  >
                                    {row.verified}
                                  </td>
                                );
                              }
                              if (key === "source") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(row.source)}
                                  >
                                    {row.source}
                                  </td>
                                );
                              }
                              if (key === "totalQuantityOrdered") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(
                                      formatPackageNumber(row.totalQuantityOrdered) || "0"
                                    )}
                                  >
                                    {formatPackageNumber(row.totalQuantityOrdered) || "0"}
                                  </td>
                                );
                              }
                              if (key === "totalBilledQuantity") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(
                                      formatPackageNumber(row.totalBilledQuantity) || "0"
                                    )}
                                  >
                                    {formatPackageNumber(row.totalBilledQuantity) || "0"}
                                  </td>
                                );
                              }
                              if (key === "netQuantity") {
                                return (
                                  <td
                                    key={key}
                                    className={resizedClass.trim() || undefined}
                                    style={style}
                                    title={cellHoverTitle(
                                      formatPackageNumber(row.netQuantity) || "0"
                                    )}
                                  >
                                    {renderBadgeCell(
                                      formatPackageNumber(row.netQuantity) || "0",
                                      row.netQuantity
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <td
                                  key={key}
                                  className={resizedClass.trim() || undefined}
                                  style={style}
                                  title={cellHoverTitle(
                                    formatTotalDollars(row.dollarsBilledTotal)
                                  )}
                                >
                                  {formatTotalDollars(row.dollarsBilledTotal)}
                                </td>
                              );
                            })}
                            {visibleColumnGroups.flatMap((group) =>
                              group.columns.map((column, index) => {
                                const raw = group.getValue(row, column);
                                const formatted = group.format
                                  ? group.format(raw)
                                  : formatPackageNumber(raw);
                                const key = leafColumnKey(column);
                                return (
                                  <td
                                    key={`${row.ndc}-${group.label}-${column}`}
                                    title={cellHoverTitle(formatted || "–")}
                                    style={getColumnStyle(key)}
                                    className={`${
                                      index === 0
                                        ? `group-start${group.sectionDividerBefore ? " group-section-divider" : ""}`
                                        : ""
                                    }${widths[key] != null ? " is-col-resized" : ""}`.trim() || undefined}
                                  >
                                    {group.badge
                                      ? renderBadgeCell(formatted, raw)
                                      : renderCell(formatted)}
                                  </td>
                                );
                              })
                            )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loading && !showGridData ? (
                <div className="report-dashboard-empty-message" role="status">
                  {emptyTableMessage}
                </div>
              ) : null}
            </div>
        </ScrollAreaWithLoading>

        <Pagination
            pageParam={pageParam}
            totalRecords={gridTotalRecords}
            onPageChange={(page) =>
              setPageParam((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(size) =>
              setPageParam({ page: 1, pageSize: size })
            }
            recordLabel="records"
          />
      </div>
    </div>
  );
}


