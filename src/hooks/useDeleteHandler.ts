import { useCallback } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../app/store";
import type { AsyncThunk } from "@reduxjs/toolkit";

interface UseDeleteHandlerOptions<T> {
  list: T[];
  getDisplayName: (row: T) => string;
  deleteThunk: AsyncThunk<any, string, any>;
  onSuccess: () => void;
}

export function useDeleteHandler<T extends Record<string, any>>({
  list,
  getDisplayName,
  deleteThunk,
  onSuccess,
}: UseDeleteHandlerOptions<T>) {
  const dispatch = useDispatch<AppDispatch>();

  const handleDelete = useCallback(
    async (id: string) => {
      const row = list.find((item) => item.id === id);
      if (!row?.id) return;

      // Keep display name access for consumers that may compute names/side-effects.
      getDisplayName(row);

      try {
        await dispatch(deleteThunk(row.id)).unwrap();
        onSuccess();
      } catch {
        // Error toast is shown in the thunk.
      }
    },
    [list, getDisplayName, deleteThunk, onSuccess, dispatch]
  );

  return handleDelete;
}
