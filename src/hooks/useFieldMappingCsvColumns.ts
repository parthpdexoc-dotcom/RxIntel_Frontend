import { useCallback, useEffect, useRef, useState } from "react";
import { sourceColumnsFromEntityById } from "../slice/mappingThunkUtils";
import {
  buildCsvColumnsFromServerData,
  mergeCsvColumnOptions,
} from "../utils/fieldMappingCsvColumns";

export type FieldMappingRowHelpers = {
  destinationFromRow: (row: any) => string;
  csvFieldFromRow: (row: any) => string;
};

export type MappingFetchResult = {
  rows: any[];
  sourceColumns: string[];
};

export type UseFieldMappingCsvColumnsOptions = {
  parentId: string;
  loadParentById: (id: string) => Promise<{ data: unknown }>;
  fetchMappingsByParent: (id: string) => Promise<MappingFetchResult>;
  draftsFromMappingRows: (rows: any[]) => Record<string, string>;
  rowFieldHelpers: FieldMappingRowHelpers;
  list: any[];
  hasMappingRecords: boolean;
  showEditModal: boolean;
  csvPreviewReady: boolean;
  rowsForHydration: any[];
  hasDestinationColumns: boolean;
};

export function useFieldMappingCsvColumns({
  parentId,
  loadParentById,
  fetchMappingsByParent,
  draftsFromMappingRows,
  rowFieldHelpers,
  list,
  hasMappingRecords,
  showEditModal,
  csvPreviewReady,
  rowsForHydration,
  hasDestinationColumns,
}: UseFieldMappingCsvColumnsOptions) {
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [sourceDrafts, setSourceDrafts] = useState<Record<string, string>>({});
  const [dbStoredCsvHeaders, setDbStoredCsvHeaders] = useState<string[]>([]);
  const csvColumnsRef = useRef<string[]>([]);

  const loadStoredCsvHeadersFromDb = useCallback(
    async (entityId: string) => {
      if (!entityId) return [];
      try {
        const res = await loadParentById(entityId);
        const headers = sourceColumnsFromEntityById(res.data);
        setDbStoredCsvHeaders(headers);
        return headers;
      } catch {
        setDbStoredCsvHeaders([]);
        return [];
      }
    },
    [loadParentById]
  );

  const refreshCsvColumnsFromServer = useCallback(
    async (
      entityId: string,
      options?: {
        rows?: any[];
        sourceColumns?: string[];
        drafts?: Record<string, string>;
        dbHeaders?: string[];
      }
    ) => {
      if (!entityId) return [];

      const dbHeaders =
        options?.dbHeaders ?? (await loadStoredCsvHeadersFromDb(entityId));

      let rows = options?.rows;
      let sourceColumns = options?.sourceColumns;
      if (!rows) {
        const fetched = await fetchMappingsByParent(entityId);
        rows = Array.isArray(fetched?.rows) ? fetched.rows : [];
        sourceColumns = Array.isArray(fetched?.sourceColumns)
          ? fetched.sourceColumns
          : [];
      }

      const drafts =
        options?.drafts ??
        draftsFromMappingRows(Array.isArray(rows) ? rows : []);
      const { csvFieldFromRow } = rowFieldHelpers;
      const merged = buildCsvColumnsFromServerData(
        sourceColumns ?? [],
        dbHeaders,
        rows ?? [],
        csvFieldFromRow,
        drafts
      );

      csvColumnsRef.current = merged;
      setCsvColumns(merged);
      return merged;
    },
    [
      draftsFromMappingRows,
      fetchMappingsByParent,
      loadStoredCsvHeadersFromDb,
      rowFieldHelpers,
    ]
  );

  const applyMappingRowsToFormState = useCallback(
    (
      rows: any[],
      knownCsvHeaders?: string[],
      draftsOverride?: Record<string, string>
    ) => {
      const { csvFieldFromRow } = rowFieldHelpers;
      const drafts = draftsOverride ?? draftsFromMappingRows(rows);
      setSourceDrafts(drafts);
      const baseHeaders =
        knownCsvHeaders !== undefined ? knownCsvHeaders : csvColumnsRef.current;
      const mergedHeaders = mergeCsvColumnOptions(
        baseHeaders,
        rows,
        csvFieldFromRow,
        drafts
      );
      csvColumnsRef.current = mergedHeaders;
      setCsvColumns(mergedHeaders);
    },
    [draftsFromMappingRows, rowFieldHelpers]
  );

  const setUploadPreviewColumns = useCallback((columns: string[]) => {
    csvColumnsRef.current = columns;
    setCsvColumns(columns);
    setDbStoredCsvHeaders(columns);
  }, []);

  const loadEditModalServerData = useCallback(
    async (entityId: string) => {
      const dbHeaders = await loadStoredCsvHeadersFromDb(entityId);
      const fetched = await fetchMappingsByParent(entityId);
      const rows = Array.isArray(fetched?.rows) ? fetched.rows : [];
      const sourceColumns = Array.isArray(fetched?.sourceColumns)
        ? fetched.sourceColumns
        : [];
      const drafts = draftsFromMappingRows(rows);
      const headerBase = buildCsvColumnsFromServerData(
        sourceColumns,
        dbHeaders,
        rows,
        rowFieldHelpers.csvFieldFromRow,
        drafts
      );
      csvColumnsRef.current = headerBase;
      setCsvColumns(headerBase);
      return { rows, drafts, headerBase };
    },
    [
      draftsFromMappingRows,
      fetchMappingsByParent,
      loadStoredCsvHeadersFromDb,
      rowFieldHelpers,
    ]
  );

  const resetCsvColumnSession = useCallback(() => {
    setDbStoredCsvHeaders([]);
    csvColumnsRef.current = [];
    setCsvColumns([]);
    setSourceDrafts({});
  }, []);

  useEffect(() => {
    resetCsvColumnSession();
    if (parentId) {
      void loadStoredCsvHeadersFromDb(parentId);
    }
  }, [parentId, loadStoredCsvHeadersFromDb, resetCsvColumnSession]);

  useEffect(() => {
    if (!parentId || !hasMappingRecords || showEditModal) return;
    const { destinationFromRow, csvFieldFromRow } = rowFieldHelpers;
    setSourceDrafts((prev) => {
      const next = { ...prev };
      for (const row of list) {
        const destination = destinationFromRow(row);
        const csv = csvFieldFromRow(row);
        if (destination) next[destination] = csv;
      }
      const mergedHeaders = mergeCsvColumnOptions(
        csvColumnsRef.current,
        list,
        csvFieldFromRow,
        next
      );
      csvColumnsRef.current = mergedHeaders;
      setCsvColumns(mergedHeaders);
      return next;
    });
  }, [parentId, hasMappingRecords, list, rowFieldHelpers, showEditModal]);

  useEffect(() => {
    if (dbStoredCsvHeaders.length === 0 || showEditModal || csvPreviewReady) return;
    const { csvFieldFromRow } = rowFieldHelpers;
    const mergedHeaders = mergeCsvColumnOptions(
      dbStoredCsvHeaders,
      list,
      csvFieldFromRow,
      sourceDrafts
    );
    csvColumnsRef.current = mergedHeaders;
    setCsvColumns(mergedHeaders);
  }, [
    dbStoredCsvHeaders,
    list,
    sourceDrafts,
    showEditModal,
    csvPreviewReady,
    rowFieldHelpers,
  ]);

  useEffect(() => {
    if (!parentId || !hasDestinationColumns) return;
    if (showEditModal || csvPreviewReady) return;

    const { destinationFromRow, csvFieldFromRow } = rowFieldHelpers;

    setSourceDrafts((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of rowsForHydration) {
        const destination = destinationFromRow(item);
        const csv = csvFieldFromRow(item);
        if (!destination) continue;
        if (Object.prototype.hasOwnProperty.call(next, destination)) continue;
        next[destination] = csv;
        changed = true;
      }
      return changed ? next : prev;
    });

    const mergedHeaders = mergeCsvColumnOptions(
      csvColumnsRef.current,
      rowsForHydration,
      csvFieldFromRow,
      sourceDrafts
    );
    if (mergedHeaders.length > 0) {
      csvColumnsRef.current = mergedHeaders;
      setCsvColumns(mergedHeaders);
    }
  }, [
    parentId,
    rowsForHydration,
    hasDestinationColumns,
    rowFieldHelpers,
    sourceDrafts,
    showEditModal,
    csvPreviewReady,
  ]);

  useEffect(() => {
    if (!parentId || !csvPreviewReady) return;
    csvColumnsRef.current = csvColumns;
  }, [parentId, csvPreviewReady, csvColumns]);

  return {
    csvColumns,
    setCsvColumns,
    sourceDrafts,
    setSourceDrafts,
    csvColumnsRef,
    loadStoredCsvHeadersFromDb,
    refreshCsvColumnsFromServer,
    applyMappingRowsToFormState,
    setUploadPreviewColumns,
    loadEditModalServerData,
    resetCsvColumnSession,
  };
}
