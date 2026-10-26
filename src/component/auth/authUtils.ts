import type { TokenDto } from "../../dto/loginDto";

const AUTH_STORAGE_KEY = "admin";

export type StoredAuth = TokenDto & {
  id?: string | null;
  userType?: string | null;
  pharmacyId?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  profileImage?: string | null;
  primaryContactName?: string | null;
  primaryContactTitle?: string | null;
  primaryContactPhone?: string | null;
  isActive?: boolean;
};

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const segment = token.split(".")[1];
    if (!segment) return {};
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function claimString(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return undefined;
}

export function enrichAuthFromToken(tokenDto: TokenDto): StoredAuth {
  if (!tokenDto?.token) return { ...tokenDto };

  const payload = parseJwtPayload(tokenDto.token);
  const role =
    claimString(
      payload,
      "role",
      "Role",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ) ?? null;
  const email = claimString(payload, "email") ?? null;
  const name = claimString(payload, "unique_name", "name") ?? null;
  const id =
    claimString(
      payload,
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
      "nameidentifier",
      "UserId",
      "userId",
      "sub",
      "id"
    ) ?? null;

  return {
    ...tokenDto,
    id,
    userType: claimString(payload, "UserType", "userType") ?? null,
    pharmacyId: claimString(payload, "PharmacyId") ?? null,
    role,
    email,
    name,
  };
}

export const persistAuth = (tokenDto: TokenDto): StoredAuth => {
  const auth = enrichAuthFromToken(tokenDto);
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  return auth;
};

export const getStoredAuth = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
};

export const getTokenExpiresAtMs = (): number | null => {
  const auth = getStoredAuth();
  if (auth?.expiresAt) {
    const expires = new Date(auth.expiresAt).getTime();
    if (!Number.isNaN(expires)) return expires;
  }

  if (auth?.token) {
    const exp = parseJwtPayload(auth.token).exp;
    if (typeof exp === "number") return exp * 1000;
  }

  return null;
};

export const getTokenRemainingSeconds = (): number => {
  const expiresAt = getTokenExpiresAtMs();
  if (expiresAt == null) return 0;
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
};

export const getPostLogoutPath = (): string =>
  isAdminUser() ? "/admin" : "/";

export const endSession = (): void => {
  const path = getPostLogoutPath();
  const basename = (process.env.PUBLIC_URL ?? "").replace(/\/$/, "");
  clearAuth();
  window.location.replace(`${basename}${path}`);
};

export const persistRefreshedToken = (tokenDto: TokenDto): StoredAuth => {
  const current = getStoredAuth();
  return persistAuth({
    ...current,
    ...tokenDto,
  });
};

export const isAuthenticated = (): boolean => {
  const auth = getStoredAuth();
  if (!auth?.token) return false;

  const expiresAt = getTokenExpiresAtMs();
  if (expiresAt != null && Date.now() >= expiresAt) return false;

  return true;
};

export const getAccessToken = (): string | null => {
  const auth = getStoredAuth();
  return auth?.token ?? null;
};

export const isEmployee = (): boolean =>
  getStoredAuth()?.userType?.toLowerCase() === "employee";

export const isAdminUser = (): boolean =>
  getStoredAuth()?.userType?.toLowerCase() === "admin";

export const getPharmacyId = (): string | null =>
  getStoredAuth()?.pharmacyId ?? null;

export const mergeStoredAuth = (updates: Partial<StoredAuth>): StoredAuth | null => {
  const current = getStoredAuth();
  if (!current) return null;
  const next = { ...current, ...updates };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const getAuthRole = (): string | null => {
  const stored = getStoredAuth()?.role;
  if (stored?.trim()) return stored.trim();

  const token = getStoredAuth()?.token;
  if (!token) return null;

  const payload = parseJwtPayload(token);
  return (
    claimString(
      payload,
      "role",
      "Role",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ) ?? null
  );
};

const normalizeRoleValue = (role: string): string =>
  role.toLowerCase().replace(/\s+/g, "");

/** Matches backend TermsService / TokenParser.IsSuperAdmin — only these admins may edit terms. */
export const hasSuperAdminRole = (): boolean => {
  if (!isAdminUser()) return false;

  const role = getAuthRole();
  if (!role) return true;

  const normalized = normalizeRoleValue(role);
  return (
    normalized === "superadmin" ||
    normalized === "admin" ||
    role === "Super Admin"
  );
};

export const hasPharmacyAdminRole = (): boolean => {
  const role = getAuthRole();
  if (!role) return false;
  return normalizeRoleValue(role) === "pharmacyadmin" || role === "2";
};

export const MANAGER_MENU_PATHS: string[] = [
  "/billing",
  "/purchase",
  "/reportdashboard",
  "/erx-audit",
];
export const PHARMACY_ADMIN_MENU_PATHS: string[] = [
  "/pharmacy",
  "/wholesaler",
  "/billing",
  "/purchase",
  "/reportdashboard",
  "/erx-audit",
];
export const PHARMACIST_MENU_PATHS: string[] = [
  "/billing",
  "/purchase",
  "/reportdashboard",
  "/erx-audit",
];
export const PHARMACY_TECH_MENU_PATHS: string[] = [
  "/billing",
  "/purchase",
  "/reportdashboard",
  "/erx-audit",
];

const EMPLOYEE_COMMON_PATHS = ["/home", "/editprofile", "/terms"] as const;

const RXINTEL_MENU_PATHS = [
  "/pharmacy",
  "/insurance",
  "/medicinemaster",
  "/wholesaler",
  "/billing",
  "/purchase",
  "/primerx",
  "/reportdashboard",
  "/erx-audit",
] as const;

const normalizeAuthPath = (pathname: string): string =>
  pathname.toLowerCase().replace(/\/$/, "") || "/";

const getEmployeeAllowedMenuPaths = (): string[] => {
  if (hasPharmacyAdminRole()) return PHARMACY_ADMIN_MENU_PATHS;
  if (hasManagerRole()) return MANAGER_MENU_PATHS;
  if (hasPharmacistRole()) return PHARMACIST_MENU_PATHS;
  if (hasPharmacyTechRole()) return PHARMACY_TECH_MENU_PATHS;
  return RXINTEL_MENU_PATHS.filter((path) => path !== "/pharmacy");
};

const isMenuPathAllowedForEmployee = (menuPath: string): boolean =>
  getEmployeeAllowedMenuPaths().includes(menuPath);

const resolveEmployeeMenuPath = (
  pathname: string,
  search: string = ""
): string | null => {
  const path = normalizeAuthPath(pathname);

  if (path.startsWith("/pharmacyuser")) return "/pharmacyuser";
  if (path.startsWith("/pharmacywholesaler")) return "/pharmacy";
  if (path.startsWith("/billingfieldmapping")) {
    return new URLSearchParams(search).get("pharmacySoftwareId")
      ? "/primerx"
      : "/billing";
  }
  if (path.startsWith("/wholesalerfieldmapping")) return "/wholesaler";
  if (path.startsWith("/ndcgroup")) return "/medicinemaster";

  const matches = RXINTEL_MENU_PATHS.filter(
    (item) => path === item || path.startsWith(`${item}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, item) =>
    item.length > longest.length ? item : longest
  );
};

export const isEmployeeRouteAllowed = (
  pathname: string,
  search: string = ""
): boolean => {
  const path = normalizeAuthPath(pathname);

  if (
    EMPLOYEE_COMMON_PATHS.some(
      (allowed) => path === allowed || path.startsWith(`${allowed}/`)
    )
  ) {
    return true;
  }

  if (isEmployeePharmacyListRoute(pathname)) {
    return false;
  }

  const menuPath = resolveEmployeeMenuPath(pathname, search);
  if (!menuPath) return true;

  if (menuPath === "/pharmacyuser") {
    return hasPharmacyAdminRole();
  }

  return isMenuPathAllowedForEmployee(menuPath);
};

export const hasManagerRole = (): boolean => {
  const role = getAuthRole();
  if (!role) return false;
  return normalizeRoleValue(role) === "manager" || role === "1";
};

export const hasPharmacistRole = (): boolean => {
  const role = getAuthRole();
  if (!role) return false;
  return normalizeRoleValue(role) === "pharmacist" || role === "3";
};

export const hasPharmacyTechRole = (): boolean => {
  const role = getAuthRole();
  if (!role) return false;
  return normalizeRoleValue(role) === "pharmacytech" || role === "4";
};

export const getPostLoginPath = (_auth?: StoredAuth | null): string => "/home";

/** Employee may not open the pharmacy master list (Pharmacy Admin may open /pharmacy and edit own record). */
export const isEmployeePharmacyListRoute = (pathname: string): boolean => {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/";
  if (hasPharmacyAdminRole()) {
    if (path === "/pharmacy") return false;
    if (path.startsWith("/pharmacy/edit/")) {
      const editId = path.slice("/pharmacy/edit/".length);
      const myId = getPharmacyId()?.toLowerCase();
      return !myId || editId !== myId;
    }
  }
  if (path === "/pharmacy" || path === "/pharmacy/add" || path.startsWith("/pharmacy/edit/")) {
    return true;
  }
  if (path.startsWith("/pharmacy/")) {
    return !path.startsWith("/pharmacyuser") && !path.startsWith("/pharmacywholesaler");
  }
  return false;
};

export const isEmployeePharmacyUserRoute = (pathname: string): boolean => {
  const path = pathname.toLowerCase().replace(/\/$/, "") || "/";
  return path === "/pharmacyuser" || path.startsWith("/pharmacyuser/");
};

export const clearAuth = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};
