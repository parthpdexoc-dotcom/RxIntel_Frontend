import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_PARAM_NAME = "search";

function readParamFromLocation(search: string, paramName: string) {
  return new URLSearchParams(search).get(paramName) ?? "";
}

export type UseDebouncedSearchQueryOptions = {
  debounceMs?: number;
  paramName?: string;
  syncToUrl?: boolean;
  /** If set, debounced value updates only when empty or length >= minLength */
  minLength?: number;
  onSearchInputChange?: () => void;
};

export function useDebouncedSearchQuery(
  options: UseDebouncedSearchQueryOptions = {}
) {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    paramName = DEFAULT_PARAM_NAME,
    syncToUrl = true,
    minLength,
    onSearchInputChange,
  } = options;

  const navigate = useNavigate();
  const routeLocation = useLocation();

  const [searchText, setSearchText] = useState(() =>
    readParamFromLocation(routeLocation.search, paramName)
  );
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    readParamFromLocation(routeLocation.search, paramName)
  );

  useEffect(() => {
    const urlSearch = readParamFromLocation(routeLocation.search, paramName);
    setSearchText((prev) => (prev === urlSearch ? prev : urlSearch));
    setDebouncedSearch((prev) => (prev === urlSearch ? prev : urlSearch));
  }, [routeLocation.search, paramName]);

  useEffect(() => {
    const trimmed = searchText.trim();
    const timer = setTimeout(() => {
      if (
        minLength !== undefined &&
        trimmed.length > 0 &&
        trimmed.length < minLength
      ) {
        return;
      }
      setDebouncedSearch(trimmed);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchText, debounceMs, minLength]);

  useEffect(() => {
    if (!syncToUrl) return;

    const current = readParamFromLocation(routeLocation.search, paramName);
    if (current === debouncedSearch) return;

    const params = new URLSearchParams(routeLocation.search);
    if (debouncedSearch) params.set(paramName, debouncedSearch);
    else params.delete(paramName);
    const qs = params.toString();

    navigate(
      { pathname: routeLocation.pathname, search: qs ? `?${qs}` : "" },
      { replace: true }
    );
  }, [
    debouncedSearch,
    routeLocation.pathname,
    routeLocation.search,
    navigate,
    paramName,
    syncToUrl,
  ]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      onSearchInputChange?.();
    },
    [onSearchInputChange]
  );

  return {
    searchText,
    debouncedSearch,
    handleSearchChange,
    setSearchText,
  };
}
