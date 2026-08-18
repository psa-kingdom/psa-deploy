/**
 * AdminLayout
 *
 * Shared shell for all admin portal pages:
 * - Sidebar navigation (expandable on hover)
 * - Top bar with global search and logout
 * - Main content area
 *
 * Only renders the modules that exist in V1. Future modules are added here.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Send,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Search,
  X,
  ArrowRight,
  FileText,
  Users,
  MessageSquare,
  Inbox,
} from "lucide-react";
import { BACKEND_URL } from "../../config";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Inquiries",
    path: "/admin/inquiries",
    icon: Inbox,
  },
  {
    label: "Communication",
    path: "/admin/communication",
    icon: Send,
  },
];

// Search suggestions — prepared for future connections, not wired to real search yet
const SEARCH_SUGGESTIONS = [
  { group: "Navigation", label: "Dashboard Overview", path: "/admin", icon: LayoutDashboard },
  { group: "Navigation", label: "Inquiries Center", path: "/admin/inquiries", icon: Inbox },
  { group: "Navigation", label: "Communication Center", path: "/admin/communication", icon: Send },
  { group: "Coming Soon", label: "Search Insights…", path: null, icon: FileText, disabled: true },
  { group: "Coming Soon", label: "Search Contacts…", path: null, icon: Users, disabled: true },
];

function AdminSearch({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = query.trim().length === 0
    ? SEARCH_SUGGESTIONS
    : SEARCH_SUGGESTIONS.filter((s) =>
        s.label.toLowerCase().includes(query.toLowerCase())
      );

  const handleOpen = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        open ? handleClose() : handleOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleOpen, handleClose]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, handleClose]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={handleOpen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "6px",
          cursor: "pointer",
          color: "#6b7280",
          fontSize: "12px",
          fontFamily: "inherit",
          transition: "border-color 0.15s, color 0.15s",
          minWidth: "200px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
          e.currentTarget.style.color = "#9ca3af";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          e.currentTarget.style.color = "#6b7280";
        }}
      >
        <Search size={13} />
        <span style={{ flex: 1, textAlign: "left" }}>Search admin…</span>
        <span
          style={{
            fontSize: "10px",
            padding: "1px 5px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "3px",
            color: "#4b5563",
            fontFamily: "monospace",
          }}
        >
          ⌘K
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            right: 0,
            minWidth: "320px",
            background: "#0d1117",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(14,165,233,0.08)",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {/* Search input inside dropdown */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <Search size={14} style={{ color: "#0ea5e9", flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search admin resources…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "13px",
                color: "#e5e7eb",
                fontFamily: "inherit",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#4b5563", padding: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Results */}
          <div style={{ padding: "8px", maxHeight: "320px", overflowY: "auto" }}>
            {(() => {
              const groups = [...new Set(filtered.map((s) => s.group))];
              return groups.map((group) => (
                <div key={group}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "600",
                      color: "#4b5563",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      padding: "6px 8px 4px",
                    }}
                  >
                    {group}
                  </div>
                  {filtered
                    .filter((s) => s.group === group)
                    .map((s) => {
                      const Icon = s.icon;
                      return s.disabled ? (
                        <div
                          key={s.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            color: "#374151",
                            fontSize: "12px",
                            cursor: "default",
                          }}
                        >
                          <Icon size={13} />
                          <span>{s.label}</span>
                        </div>
                      ) : (
                        <Link
                          key={s.label}
                          to={s.path}
                          onClick={() => {
                            handleClose();
                            onNavigate?.();
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px 10px",
                            borderRadius: "6px",
                            color: "#9ca3af",
                            fontSize: "12px",
                            textDecoration: "none",
                            transition: "background 0.1s, color 0.1s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(14,165,233,0.08)";
                            e.currentTarget.style.color = "#e5e7eb";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#9ca3af";
                          }}
                        >
                          <Icon size={13} style={{ color: "#0ea5e9" }} />
                          <span style={{ flex: 1 }}>{s.label}</span>
                          <ArrowRight size={11} style={{ color: "#374151" }} />
                        </Link>
                      );
                    })}
                </div>
              ));
            })()}
            {filtered.length === 0 && (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#4b5563",
                  fontSize: "12px",
                }}
              >
                No results for &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const activePage =
    NAV_ITEMS.find((i) => location.pathname.startsWith(i.path) && !i.exact)?.label ||
    NAV_ITEMS.find((i) => i.exact && location.pathname === i.path)?.label ||
    "Admin";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await axios.post(`${BACKEND_URL}/api/admin/auth/logout`, {}, { withCredentials: true });
    } catch (_) {
      // ignore errors — proceed to redirect
    }
    navigate("/admin/login", { replace: true });
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#07101f",
        fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif",
        color: "#cbd5e1",
        position: "relative",
      }}
    >
      {/* Mobile Backdrop Overlay */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(2px)",
            zIndex: 35,
          }}
          className="md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? "216px" : "58px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "#050d1a",
          borderRight: "1px solid rgba(14,165,233,0.1)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 40,
          alignSelf: "flex-start",
        }}
      >
        {/* Logo / Brand */}
        <div
          onClick={() => setExpanded((prev) => !prev)}
          style={{
            height: "58px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "15px",
            borderBottom: "1px solid rgba(14,165,233,0.08)",
            gap: "11px",
            flexShrink: 0,
            cursor: "pointer",
          }}
        >
          {/* PSA mark */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "700",
              color: "#fff",
              letterSpacing: "0.04em",
              flexShrink: 0,
            }}
          >
            P
          </div>
          {expanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#e2e8f0", whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                PSA Admin
              </span>
              <span style={{ fontSize: "9.5px", color: "#475569", whiteSpace: "nowrap", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Portal
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) setExpanded(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 15px",
                  textDecoration: "none",
                  color: active ? "#38bdf8" : "#64748b",
                  background: active ? "rgba(14,165,233,0.08)" : "transparent",
                  borderLeft: active ? "2px solid #0ea5e9" : "2px solid transparent",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon size={15} style={{ flexShrink: 0 }} />
                {expanded && (
                  <span style={{ fontSize: "12.5px", fontWeight: active ? "500" : "400" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: "10px 0", borderTop: "1px solid rgba(14,165,233,0.08)", flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "9px 15px",
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#374151",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#374151")}
            title="Logout"
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            {expanded && (
              <span style={{ fontSize: "12.5px" }}>{loggingOut ? "Logging out…" : "Logout"}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: "58px",
            borderBottom: "1px solid rgba(14,165,233,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
            background: "#07101f",
            position: "sticky",
            top: 0,
            zIndex: 30,
            gap: "16px",
          }}
        >
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", color: "#334155", fontWeight: "500", letterSpacing: "0.02em" }}>
              PSA Admin
            </span>
            <ChevronRight size={11} style={{ color: "#1e293b" }} />
            <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>
              {activePage}
            </span>
          </div>

          {/* Search */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <AdminSearch onNavigate={() => {}} />
          </div>

          {/* Right side — firm badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: "10px",
                color: "#334155",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: "600",
              }}
            >
              P Suman &amp; Associates
            </div>
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px rgba(34,197,94,0.5)",
              }}
              title="Portal operational"
            />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "28px 24px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
