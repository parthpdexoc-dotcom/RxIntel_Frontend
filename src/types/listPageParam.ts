export type ListSortDirection = "asc" | "desc";

export type ListPageParam = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: ListSortDirection;
};
export const DEFAULT_LIST_PAGE_PARAM = { page: 1, pageSize: 10 } as const;
export function listPageParamRowOffset(pageParam: {
  page: number;
  pageSize: number;
}): number {
  return (pageParam.page - 1) * pageParam.pageSize;
}
export function appendListPageQuery(
  query: URLSearchParams,
  params?: ListPageParam
): void {
  if (typeof params?.page === "number") query.set("page", String(params.page));
  if (typeof params?.pageSize === "number")
    query.set("pageSize", String(params.pageSize));
  if (params?.sortBy?.trim()) query.set("sortBy", params.sortBy.trim());
  if (params?.sortDirection) query.set("sortDirection", params.sortDirection);
}
export function appendSearchTextQuery(
  query: URLSearchParams,
  searchText?: string
): void {
  const trimmed = searchText?.trim();
  if (trimmed) query.set("searchText", trimmed);
}

