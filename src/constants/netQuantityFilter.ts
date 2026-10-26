export const NET_QUANTITY_FILTER = {
  all: "all",
  surplus: "surplus",
  shortage: "shortage",
} as const;

export type NetQuantityFilterValue =
  (typeof NET_QUANTITY_FILTER)[keyof typeof NET_QUANTITY_FILTER];

/** Query/body value for API (PascalCase enum names). */
export function toApiNetQuantityFilter(
  value: NetQuantityFilterValue
): "Surplus" | "Shortage" | undefined {
  if (value === NET_QUANTITY_FILTER.surplus) return "Surplus";
  if (value === NET_QUANTITY_FILTER.shortage) return "Shortage";
  return undefined;
}

/** Client-side row filter (matches backend ApplyNetQuantityFilter). */
export function rowMatchesNetQuantityFilter(
  netQuantity: number,
  filter: NetQuantityFilterValue
): boolean {
  if (filter === NET_QUANTITY_FILTER.surplus) return netQuantity >= 0;
  if (filter === NET_QUANTITY_FILTER.shortage) return netQuantity < 0;
  return true;
}

export const NET_QUANTITY_FILTER_OPTIONS: {
  id: NetQuantityFilterValue;
  label: string;
}[] = [
  { id: NET_QUANTITY_FILTER.all, label: "All" },
  { id: NET_QUANTITY_FILTER.surplus, label: "Surplus (green)" },
  { id: NET_QUANTITY_FILTER.shortage, label: "Shortage (red)" },
];
