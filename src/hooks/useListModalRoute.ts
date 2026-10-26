import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function isListAddRoute(pathname: string, listPath: string) {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  return normalized === `${listPath.toLowerCase()}/add`;
}

export function getEditIdFromPath(pathname: string, listPath: string): string | null {
  const normalized = pathname.toLowerCase().replace(/\/$/, "");
  const prefix = `${listPath.toLowerCase()}/edit/`;
  if (!normalized.startsWith(prefix)) return null;
  const id = pathname.slice(listPath.length).replace(/^\/edit\//i, "");
  return id || null;
}

function findRowById<T>(
  list: readonly T[],
  id: string,
  getRowId: (row: T) => string | number | null | undefined
): T | undefined {
  const normalizedId = id.toLowerCase();
  return list.find((row) => String(getRowId(row)).toLowerCase() === normalizedId);
}

type UseListModalRouteOptions<T> = {
  listPath: string;
  showDrawer: boolean;
  setShowDrawer: (open: boolean) => void;
  formId: string | number | null | undefined;
  onEnterAdd: () => void;
  list?: readonly T[];
  getRowId?: (row: T) => string | number | null | undefined;
  onLoadRow?: (row: T) => void;
};

export function useListModalRoute<T>({
  listPath,
  showDrawer,
  setShowDrawer,
  formId,
  onEnterAdd,
  list,
  getRowId,
  onLoadRow,
}: UseListModalRouteOptions<T>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname, search } = location;

  const isAddRoute = isListAddRoute(pathname, listPath);
  const editId = getEditIdFromPath(pathname, listPath);
  const isEditRoute = editId != null;
  const isAddForm = formId == null;
  const isEditForm = formId != null;

  const loadEditById = (id: string, row?: T) => {
    if (row && onLoadRow) {
      onLoadRow(row);
      return;
    }
    if (!list || !getRowId || !onLoadRow) return;
    const found = findRowById(list, id, getRowId);
    if (found) onLoadRow(found);
  };

  useEffect(() => {
    if (isAddRoute) {
      onEnterAdd();
      setShowDrawer(true);
    } else if (isEditRoute && editId) {
      loadEditById(editId);
      setShowDrawer(true);
    } else if (showDrawer && (isAddForm || isEditForm)) {
      setShowDrawer(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync modal with URL only
  }, [isAddRoute, isEditRoute, editId]);

  useEffect(() => {
    if (!isEditRoute || !editId || !list?.length || !getRowId || !onLoadRow) return;
    // Already bound to this edit record (including after Reset kept the id)
    if (formId != null && String(formId).toLowerCase() === editId.toLowerCase()) {
      return;
    }
    const found = findRowById(list, editId, getRowId);
    if (found) onLoadRow(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load edit row when list arrives
  }, [isEditRoute, editId, list, formId]);

  const navigateToList = () => {
    const params = new URLSearchParams(search);
    params.delete("mode");
    const qs = params.toString();
    navigate({ pathname: listPath, search: qs ? `?${qs}` : "" });
  };

  const openAdd = (routeSearch?: string) => {
    onEnterAdd();
    setShowDrawer(true);
    navigate({ pathname: `${listPath}/add`, search: routeSearch ?? search });
  };

  const openEdit = (id: string | number, row?: T) => {
    loadEditById(String(id), row);
    setShowDrawer(true);
    navigate({ pathname: `${listPath}/edit/${id}`, search });
  };

  const closeModal = () => {
    setShowDrawer(false);
    if (isAddRoute || isEditRoute) navigateToList();
  };

  const leaveAddRoute = () => {
    if (isAddRoute) navigateToList();
  };

  const leaveEditRoute = () => {
    if (isEditRoute) navigateToList();
  };

  return {
    isAddRoute,
    isEditRoute,
    editId,
    openAdd,
    openEdit,
    closeModal,
    leaveAddRoute,
    leaveEditRoute,
  };
}
