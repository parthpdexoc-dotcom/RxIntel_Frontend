import type { StateLicenseContext } from "../utils/stateBoardLicenseRules";

/** State lookup (GET /State). API uses camelCase. */
export interface StateDto {
  stateId: string;
  stateName: string;
  stateCode?: string;
  stateBoardLicenseRuleId?: string;
}

export function normalizeStateDto(raw: unknown): StateDto | null {
  if (!raw || typeof raw !== "object") return null;

  const row = raw as Record<string, unknown>;
  const stateId = String(row.stateId ?? row.StateId ?? "").trim();
  if (!stateId) return null;

  const stateName = String(row.stateName ?? row.StateName ?? "").trim();
  if (!stateName) return null;

  const stateCodeRaw = String(row.stateCode ?? row.StateCode ?? "").trim();
  const ruleIdRaw = String(
    row.stateBoardLicenseRuleId ?? row.StateBoardLicenseRuleId ?? ""
  ).trim();

  return {
    stateId,
    stateName,
    ...(stateCodeRaw ? { stateCode: stateCodeRaw.toUpperCase() } : {}),
    ...(ruleIdRaw ? { stateBoardLicenseRuleId: ruleIdRaw } : {}),
  };
}

export function normalizeStateList(data: unknown): StateDto[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return rows
    .map((row) => normalizeStateDto(row))
    .filter((row): row is StateDto => row !== null);
}

/** Dropdown / table label — full state name (e.g. Indiana). */
export function getStateNameLabel(state: StateDto): string {
  return state.stateName?.trim() ?? "";
}

/** States sorted alphabetically by name. */
export function getStatesWithName(states: StateDto[]): StateDto[] {
  return [...states].sort((a, b) =>
    getStateNameLabel(a).localeCompare(getStateNameLabel(b))
  );
}

export function getStateLicenseContext(
  states: StateDto[],
  stateId?: string | null
): StateLicenseContext | null {
  if (!stateId?.trim()) {
    return null;
  }
  const match = states.find(
    (state) => state.stateId.toLowerCase() === stateId.trim().toLowerCase()
  );
  if (!match) {
    return null;
  }
  return {
    stateCode: match.stateCode,
    stateName: match.stateName,
    stateBoardLicenseRuleId: match.stateBoardLicenseRuleId,
  };
}
