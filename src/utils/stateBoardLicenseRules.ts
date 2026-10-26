/**
 * Rule definitions for state board license numbers.
 * Per-state assignment comes from the State API (`stateBoardLicenseRuleId`).
 * Keep in sync with backend StateBoardLicenseRules.cs
 */

export type StateBoardLicenseSanitizeMode =
  | "digitsOnly"
  | "lettersAndDigits"
  | "alphanumericHyphen";

export type StateBoardLicenseRuleDefinition = {
  ruleId: string;
  pattern: RegExp;
  sanitizeMode: StateBoardLicenseSanitizeMode;
  maxInputLength: number;
  errorMessage: string;
};

export const STATE_BOARD_LICENSE_RULE_IDS = {
  NUM_5_10: "NUM_5_10",
  NUM_5_6: "NUM_5_6",
  NUM_6: "NUM_6",
  NUM_8_10: "NUM_8_10",
  PREFIX_2L_D: "PREFIX_2L_D",
  ALNUM_ANY: "ALNUM_ANY",
  ALNUM_BOTH: "ALNUM_BOTH",
} as const;

const MSG_NUM_5_10 =
  "License number must contain numbers only. Length must be between 5 and 10 digits.";
const MSG_NUM_5_6 =
  "License number must contain numbers only. Length must be 5 or 6 digits.";
const MSG_NUM_6 =
  "License number must be exactly 6 digits (numbers only).";
const MSG_NUM_8_10 =
  "License number must contain numbers only. Length must be between 8 and 10 digits.";
const MSG_PREFIX_2L_D =
  "License number must be 2 letters followed by 4 to 8 digits (e.g. PH12345).";
const MSG_ALNUM_ANY =
  "License number may contain letters, numbers, and hyphens. Length must be between 5 and 20 characters.";
const MSG_ALNUM_BOTH =
  "License number must contain both letters and numbers and may contain hyphens. Length must be between 5 and 20 characters.";

const RULES_BY_ID: Record<string, StateBoardLicenseRuleDefinition> = {
  [STATE_BOARD_LICENSE_RULE_IDS.NUM_5_10]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.NUM_5_10,
    pattern: /^\d{5,10}$/,
    sanitizeMode: "digitsOnly",
    maxInputLength: 10,
    errorMessage: MSG_NUM_5_10,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.NUM_5_6]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.NUM_5_6,
    pattern: /^\d{5,6}$/,
    sanitizeMode: "digitsOnly",
    maxInputLength: 6,
    errorMessage: MSG_NUM_5_6,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.NUM_6]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.NUM_6,
    pattern: /^\d{6}$/,
    sanitizeMode: "digitsOnly",
    maxInputLength: 6,
    errorMessage: MSG_NUM_6,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.NUM_8_10]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.NUM_8_10,
    pattern: /^\d{8,10}$/,
    sanitizeMode: "digitsOnly",
    maxInputLength: 10,
    errorMessage: MSG_NUM_8_10,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.PREFIX_2L_D]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.PREFIX_2L_D,
    pattern: /^[A-Za-z]{2}\d{4,8}$/,
    sanitizeMode: "lettersAndDigits",
    maxInputLength: 10,
    errorMessage: MSG_PREFIX_2L_D,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.ALNUM_ANY]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.ALNUM_ANY,
    pattern: /^[A-Za-z0-9-]{5,20}$/,
    sanitizeMode: "alphanumericHyphen",
    maxInputLength: 20,
    errorMessage: MSG_ALNUM_ANY,
  },
  [STATE_BOARD_LICENSE_RULE_IDS.ALNUM_BOTH]: {
    ruleId: STATE_BOARD_LICENSE_RULE_IDS.ALNUM_BOTH,
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9-]{5,20}$/,
    sanitizeMode: "alphanumericHyphen",
    maxInputLength: 20,
    errorMessage: MSG_ALNUM_BOTH,
  },
};

export type StateLicenseContext = {
  stateCode?: string | null;
  stateName?: string | null;
  stateBoardLicenseRuleId?: string | null;
};

export function getStateBoardLicenseRule(
  context?: StateLicenseContext | null
): StateBoardLicenseRuleDefinition {
  const ruleId =
    context?.stateBoardLicenseRuleId?.trim() ||
    STATE_BOARD_LICENSE_RULE_IDS.NUM_5_10;
  return (
    RULES_BY_ID[ruleId] ??
    RULES_BY_ID[STATE_BOARD_LICENSE_RULE_IDS.NUM_5_10]
  );
}

export function sanitizeStateBoardLicenseValue(
  value: string,
  context?: StateLicenseContext | null
): string {
  const rule = getStateBoardLicenseRule(context);
  let filtered = value;

  if (rule.sanitizeMode === "digitsOnly") {
    filtered = value.replace(/\D/g, "");
  } else if (rule.sanitizeMode === "lettersAndDigits") {
    filtered = value.replace(/[^A-Za-z0-9]/g, "");
  } else {
    filtered = value.replace(/[^A-Za-z0-9-]/g, "");
  }

  return filtered.slice(0, rule.maxInputLength);
}

export function isValidStateBoardLicenseValue(
  value: string,
  context?: StateLicenseContext | null
): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return getStateBoardLicenseRule(context).pattern.test(trimmed);
}

export function getStateBoardLicenseFormatMessage(
  context?: StateLicenseContext | null
): string {
  return getStateBoardLicenseRule(context).errorMessage;
}
