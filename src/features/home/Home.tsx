import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaThLarge,
  FaCapsules,
  FaFileMedical,
  FaPills,
  FaTruck,
  FaFileInvoice,
  FaShoppingCart,
  FaUserCircle,
  FaLaptopMedical,
  FaChartBar,
  FaBalanceScale,
  FaDatabase,
  FaLayerGroup,
  FaSlidersH,
  FaBookMedical,
  FaChevronDown,
} from "react-icons/fa";

import Tooltip from "@mui/material/Tooltip";
import { useDispatch } from "react-redux";
import {
  clearAuth,
  getPostLogoutPath,
  getStoredAuth,
  hasManagerRole,
  hasPharmacistRole,
  hasPharmacyAdminRole,
  hasPharmacyTechRole,
  isEmployee,
  mergeStoredAuth,
  MANAGER_MENU_PATHS,
  PHARMACY_ADMIN_MENU_PATHS,
  PHARMACIST_MENU_PATHS,
  PHARMACY_TECH_MENU_PATHS,
} from "../../component/auth/authUtils";
import { getPharmacyUserByIdApi } from "../../service/PharmacyUserService";
import { getAdminApi } from "../../service/AdminProfileService";
import type { PharmacyUserDto } from "../../dto/pharmacyUserDto";
import {
  resolveAdminProfileImageSrc,
  resolvePharmacyUserProfileImageSrc,
} from "../../utils/pharmacyUserProfileImage";
import { logout } from "../../slice/LoginSlice";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getPharmacyUserRoleLabel } from "../../enums/PharmacyUserRole";
import type { AppDispatch } from "../../app/store";
import ERX_AUDIT_LABELS from "../erxaudit/erxAuditLabels";
import "./Home.css";

type SidebarTooltipProps = {
  title: string;
  show: boolean;
  children: React.ReactElement;
};

function SidebarTooltip({ title, show, children }: SidebarTooltipProps) {
  if (!show) return children;
  return (
    <Tooltip title={title} placement="right" arrow enterDelay={300}>
      {children}
    </Tooltip>
  );
}

export interface SubMenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: readonly SubMenuItem[];
}

const RXINTEL_MENU: readonly MenuItem[] = [
  { path: "/pharmacy", label: "Pharmacy", icon: FaCapsules },
  { path: "/insurance", label: "Insurance", icon: FaFileMedical },
  { path: "/medicinemaster", label: "Medicine Master", icon: FaPills },
  { path: "/wholesaler", label: "Wholesaler", icon: FaTruck },
  { path: "/billing", label: "Billing", icon: FaFileInvoice },
  { path: "/purchase", label: "Purchase", icon: FaShoppingCart },
  { path: "/primerx", label: "Pharmacy Billing Software", icon: FaLaptopMedical },
  { path: "/reportdashboard", label: "Report Dashboard", icon: FaChartBar },
  {
    path: "/erx-audit",
    label: ERX_AUDIT_LABELS.MODULE_NAME,
    icon: FaBalanceScale,
    subItems: [
      {
        path: "/erx-audit/data",
        label: ERX_AUDIT_LABELS.SECTIONS.DATA.label,
        icon: FaDatabase,
      },
      {
        path: "/erx-audit/batches",
        label: ERX_AUDIT_LABELS.SECTIONS.BATCHES.label,
        icon: FaLayerGroup,
      },
      {
        path: "/erx-audit/rules",
        label: ERX_AUDIT_LABELS.SECTIONS.RULES.label,
        icon: FaSlidersH,
      },
      {
        path: "/erx-audit/sig-dictionary",
        label: ERX_AUDIT_LABELS.SECTIONS.SIG_DICTIONARY.label,
        icon: FaBookMedical,
      },
    ],
  },
] as const;

const normalizePath = (pathname: string) =>
  pathname.toLowerCase().replace(/\/$/, "") || "/";

const isParentMenuActive = (item: MenuItem, pathname: string): boolean => {
  const path = normalizePath(pathname);
  if (path === item.path || path.startsWith(`${item.path}/`)) {
    return true;
  }
  if (item.subItems) {
    return item.subItems.some(
      (sub) => path === sub.path || path.startsWith(`${sub.path}/`)
    );
  }
  return false;
};

const resolveActiveMenuPath = (
  pathname: string,
  search: string = ""
): string | null => {
  const path = normalizePath(pathname);
  const pharmacySoftwareId = new URLSearchParams(search).get("pharmacySoftwareId");

  if (path.startsWith("/pharmacyuser")) {
    return isEmployee() && !hasPharmacyAdminRole() ? "/pharmacyuser" : "/pharmacy";
  }
  if (path.startsWith("/pharmacywholesaler")) return "/pharmacy";
  if (path.startsWith("/billingfieldmapping")) {
    return pharmacySoftwareId ? "/primerx" : "/billing";
  }
  if (path.startsWith("/wholesalerfieldmapping")) {
    return "/wholesaler";
  }
  if (path.startsWith("/ndcgroup")) return "/medicinemaster";

  // ERx Audit sub-route mapping:
  if (path === "/erx-audit" || path === "/erx-audit/data") {
    return "/erx-audit/data";
  }
  if (path === "/erx-audit/batches" || path.startsWith("/erx-audit/batch/")) {
    return "/erx-audit/batches";
  }
  if (path === "/erx-audit/rules") {
    return "/erx-audit/rules";
  }
  if (path === "/erx-audit/sig-dictionary" || path === "/erx-audit/sig") {
    return "/erx-audit/sig-dictionary";
  }

  const matches = RXINTEL_MENU.filter(
    (item) => path === item.path || path.startsWith(`${item.path}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, item) =>
    item.path.length > longest.path.length ? item : longest
  ).path;
};

function getEmployeeRoleLabel(role?: string | null): string {
  if (!role) return "Employee";
  const roleNumber = Number(role);
  return !Number.isNaN(roleNumber) ? getPharmacyUserRoleLabel(roleNumber) : role;
}

const EXPANDED_STORAGE_KEY = "rxintel_sidebar_expanded_groups";

const getStoredExpandedGroups = (currentPath: string): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (normalizePath(currentPath).startsWith("/erx-audit")) {
      parsed["/erx-audit"] = true;
    } else if (parsed["/erx-audit"] === undefined) {
      parsed["/erx-audit"] = true; // default open
    }
    return parsed;
  } catch {
    return { "/erx-audit": true };
  }
};

interface HomeProps {
  children?: React.ReactNode;
}

export default function Home({ children }: HomeProps) {
  const isMobileViewport = () => window.innerWidth <= 900;

  const [sidebarOpen, setSidebarOpen] = useState(!isMobileViewport());
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const profileRef = useRef<any>(null);
  const pharmacyPath = normalizePath(location.pathname);
  const isPharmacyPage =
    pharmacyPath === "/home" ||
    pharmacyPath === "/pharmacy" ||
    pharmacyPath.startsWith("/pharmacy/add") ||
    pharmacyPath.startsWith("/pharmacy/edit/") ||
    pharmacyPath.startsWith("/pharmacywholesaler") ||
    pharmacyPath.startsWith("/pharmacyuser") ||
    pharmacyPath.startsWith("/insurance") ||
    pharmacyPath.startsWith("/medicinemaster") ||
    pharmacyPath === "/wholesaler" ||
    pharmacyPath.startsWith("/wholesaler/") ||
    pharmacyPath.startsWith("/wholesalerfieldmapping") ||
    pharmacyPath.startsWith("/billingfieldmapping") ||
    pharmacyPath === "/billing" ||
    pharmacyPath.startsWith("/billing/") ||
    pharmacyPath === "/purchase" ||
    pharmacyPath.startsWith("/purchase/") ||
    pharmacyPath === "/primerx" ||
    pharmacyPath.startsWith("/primerx/") ||
    pharmacyPath === "/reportdashboard" ||
    pharmacyPath.startsWith("/reportdashboard/");

  const isErxAuditScreen =
    pharmacyPath === "/erx-audit" ||
    pharmacyPath === "/erx-audit/data" ||
    pharmacyPath.startsWith("/erx-audit");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() =>
    getStoredExpandedGroups(location.pathname)
  );

  // Auto-expand parent if user is on any of its sub-pages
  useEffect(() => {
    const norm = normalizePath(location.pathname);
    if (norm.startsWith("/erx-audit")) {
      setExpandedGroups((prev) => {
        if (prev["/erx-audit"]) return prev;
        const updated = { ...prev, "/erx-audit": true };
        try {
          localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [location.pathname]);

  const toggleGroup = (groupPath: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedGroups((prev) => {
      const updated = { ...prev, [groupPath]: !prev[groupPath] };
      try {
        localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleParentItemClick = (item: MenuItem) => {
    if (item.subItems && item.subItems.length > 0) {
      const isOpen = !!expandedGroups[item.path];
      const isInSection = isParentMenuActive(item, location.pathname);

      // Toggle open/closed state
      toggleGroup(item.path);

      // If opening and not currently inside this section, navigate to first sub-item
      if (!isOpen && !isInSection) {
        navigate(item.subItems[0].path);
      }
    } else {
      navigateMenuItem(item.path);
    }
  };

  const admin = getStoredAuth() ?? {};
  const employeeSession = isEmployee();
  const resolveStoredProfileImage = useCallback(
    (value?: string | null) =>
      employeeSession
        ? resolvePharmacyUserProfileImageSrc(value ?? null)
        : resolveAdminProfileImageSrc(value ?? null),
    [employeeSession]
  );

  const [headerProfileImage, setHeaderProfileImage] = useState<string | null>(
    resolveStoredProfileImage(admin.profileImage ?? null)
  );
  const isPharmacyAdminEmployee = employeeSession && hasPharmacyAdminRole();
  const isManagerEmployee = employeeSession && hasManagerRole();
  const isPharmacistEmployee = employeeSession && hasPharmacistRole();
  const isPharmacyTechEmployee = employeeSession && hasPharmacyTechRole();

  const visibleMenuItems = employeeSession
    ? isPharmacyAdminEmployee
      ? RXINTEL_MENU.filter((item) =>
          PHARMACY_ADMIN_MENU_PATHS.includes(item.path)
        )
      : isManagerEmployee
        ? RXINTEL_MENU.filter((item) =>
            MANAGER_MENU_PATHS.includes(item.path)
          )
        : isPharmacistEmployee
          ? RXINTEL_MENU.filter((item) =>
              PHARMACIST_MENU_PATHS.includes(item.path)
            )
          : isPharmacyTechEmployee
            ? RXINTEL_MENU.filter((item) =>
                PHARMACY_TECH_MENU_PATHS.includes(item.path)
              )
            : [
                ...RXINTEL_MENU.filter(
                  (item) => item.path !== "/pharmacy"
                ),
              ]
    : [...RXINTEL_MENU];

  const navigateMenuItem = (path: string) => {
    if (path === "/pharmacyuser" && employeeSession && admin.pharmacyId) {
      navigate(`/pharmacyuser?pharmacyId=${admin.pharmacyId}`);
      return;
    }
    navigate(path);
  };

  const isDashboardActive = normalizePath(location.pathname) === "/home";
  const activeMenuPath = resolveActiveMenuPath(
    location.pathname,
    location.search
  );
  const showSidebarTooltip = !sidebarOpen && !isMobileViewport();

  useEffect(() => {
    const handleResize = () => {
      if (isMobileViewport()) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!isMobileViewport()) return;
      setSidebarOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

   useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const auth = getStoredAuth();
    setHeaderProfileImage(resolveStoredProfileImage(auth?.profileImage ?? null));
  }, [location.pathname, resolveStoredProfileImage]);



  useEffect(() => {
    if (!employeeSession || !admin.id) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await getPharmacyUserByIdApi(admin.id!);
        const user = (response.data?.data ?? response.data) as PharmacyUserDto;
        if (cancelled || !user) return;

        mergeStoredAuth({ profileImage: user.profileImage ?? null });
        setHeaderProfileImage(
          resolvePharmacyUserProfileImageSrc(user.profileImage ?? null)
        );
      } catch {
        // Header falls back to default avatar when profile cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeSession, admin.id]);

  useEffect(() => {
    if (employeeSession || !admin.id) return;

    let cancelled = false;

    void (async () => {
      try {
        const response = await getAdminApi(admin.id!);
        const user = (response.data?.data ?? response.data) as {
          profileImage?: string | null;
        };
        if (cancelled || !user) return;

        mergeStoredAuth({ profileImage: user.profileImage ?? null });
        setHeaderProfileImage(
          resolveAdminProfileImageSrc(user.profileImage ?? null)
        );
      } catch {
        // Header falls back to default avatar when profile cannot be loaded.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeSession, admin.id]);

  const displayProfileImage =
    headerProfileImage ?? resolveStoredProfileImage(admin.profileImage ?? null);

  return (
    <div className={`layout home-layout${isPharmacyPage ? " layout--pharmacy" : ""}`}>
      {/* SIDEBAR */}
       <div className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>

        <div className="logo">
          <button
            type="button"
            className="logo-collapsed-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Expand sidebar"
          >
            <img
              src={`${process.env.PUBLIC_URL || ""}/assets/rxintel-logo.png`}
              alt="RxIntel"
              className="logo-collapsed-mark"
            />
          </button>
          <span className="logo-text" aria-label="RxIntel">
            <span className="logo-rx">Rx</span>
            <span className="logo-intel">Intel</span>
          </span>
          <button
            type="button"
            className="logo-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <span className="logo-hamburger-bar" />
            <span className="logo-hamburger-bar" />
            <span className="logo-hamburger-bar" />
          </button>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* MENU */}
        <div className="menu">

          <SidebarTooltip title="Dashboard" show={showSidebarTooltip}>
            <div
              className={`menu-item${isDashboardActive ? " active" : ""}`}
              onClick={() => navigate("/home")}
            >
              <FaThLarge className="icon" />
              <span className="menu-text">Dashboard</span>
            </div>
          </SidebarTooltip>

          {visibleMenuItems.map((item) => {
            const hasSub = !!(item.subItems && item.subItems.length > 0);
            const isParentActive = isParentMenuActive(item, location.pathname);
            const isExpanded = !!expandedGroups[item.path];
            const Icon = item.icon;

            if (hasSub) {
              return (
                <div
                  key={item.path}
                  className={`rxintel-group ${isExpanded ? "open" : "closed"} ${
                    isParentActive ? "group-active" : ""
                  }`}
                >
                  <SidebarTooltip
                    title={isExpanded ? `${item.label} (Click to collapse)` : `${item.label} (Click to expand)`}
                    show={showSidebarTooltip}
                  >
                    <div
                      className={`menu-item has-dropdown ${
                        isParentActive ? "parent-active" : ""
                      }`}
                      onClick={() => handleParentItemClick(item)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                    >
                      <Icon className="icon menu-primary-icon" />
                      <span className="menu-text">{item.label}</span>
                      <span
                        className={`menu-dropdown-arrow ${
                          isExpanded ? "expanded" : ""
                        }`}
                        onClick={(e) => toggleGroup(item.path, e)}
                        title={isExpanded ? "Collapse submenu" : "Expand submenu"}
                        aria-label={isExpanded ? "Collapse submenu" : "Expand submenu"}
                      >
                        <FaChevronDown className="dropdown-arrow-icon" />
                      </span>
                    </div>
                  </SidebarTooltip>

                  {/* Nested Submenu */}
                  {isExpanded && (
                    <div className="submenu" role="menu">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeMenuPath === sub.path;
                        return (
                          <SidebarTooltip
                            key={sub.path}
                            title={sub.label}
                            show={showSidebarTooltip}
                          >
                            <div
                              className={`submenu-item ${
                                isSubActive ? "active" : ""
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(sub.path);
                              }}
                              role="menuitem"
                              tabIndex={0}
                            >
                              <SubIcon className="submenu-icon" />
                              <span className="submenu-label">{sub.label}</span>
                            </div>
                          </SidebarTooltip>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <SidebarTooltip key={item.path} title={item.label} show={showSidebarTooltip}>
                <div
                  className={`menu-item${activeMenuPath === item.path ? " active" : ""}`}
                  onClick={() => navigateMenuItem(item.path)}
                >
                  <Icon className="icon" />
                  <span className="menu-text">{item.label}</span>
                </div>
              </SidebarTooltip>
            );
          })}

        </div>
      </div>

      {/* Backdrop (mobile only) */}
      {sidebarOpen && isMobileViewport() && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN AREA */}
      <div className="main">
        {/* NAVBAR */}
        <div className="navbar">
          <button
            type="button"
            className="navbar-menu-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>

          <div className="nav-right">
             <div className="profile-wrapper" ref={profileRef}>

              <div className="profile" onClick={() => setProfileOpen(!profileOpen)}>
                {displayProfileImage ? (
                  <img
                    src={displayProfileImage}
                    alt="profile"
                    className="profile-avatar"
                  />
                ) : (
                  <FaUserCircle size={40}/>
                )}
                <div>
                  <div className="admin-name">
                    {admin?.name || admin?.email || "User"}
                  </div>
                  <div className="admin-role">
                    {employeeSession
                      ? getEmployeeRoleLabel(admin?.role)
                      : admin?.role || "Admin"}
                  </div>
                </div>
                {isPharmacyPage ? (
                  <span className="profile-chevron" aria-hidden>
                    ▾
                  </span>
                ) : null}
              </div>

              {profileOpen && (
                <div className="profile-dropdown">
                  <div
                    className="dropdown-item"
                    onClick={() => navigate("/editprofile")}
                  >
                    Edit Profile
                  </div>

                  <div
                    className="dropdown-item logout"
                    onClick={() => {
                      dispatch(logout());
                      clearAuth();
                      navigate(getPostLogoutPath(), { replace: true });
                    }}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right content */}
        <div className={`main-content ${sidebarOpen ? "" : "full"}`}>
          <div className="main-content-scroll">
            {children ?? <Outlet />}
          </div>
          <footer className="app-site-footer">
            <span>© 2026 RxIntel. All rights reserved.</span>
            <span className="app-site-footer-sep" aria-hidden="true">
              ·
            </span>
            <Link to="/terms" target="_blank" rel="noopener noreferrer">
              Terms and Conditions
            </Link>
          </footer>
        </div>

      </div>
    </div>
  );
}