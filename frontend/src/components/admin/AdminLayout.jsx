/**
 * AdminLayout
 *
 * Shared shell for all admin portal pages:
 * - Sidebar navigation (expandable on hover)
 * - Top bar with environment banner and logout
 * - Main content area
 *
 * Only renders the modules that exist in V1. Future modules are added here.
 */

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { Send, LayoutDashboard, LogOut, ChevronRight } from "lucide-react";
import { BACKEND_URL } from "../../config";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Communication",
    path: "/admin/communication",
    icon: Send,
  },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

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
        background: "#0a0a0f",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#e5e7eb",
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
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(2px)",
            zIndex: 35,
          }}
          className="md:hidden"
        />
      )}

      {/* Fixed Viewport Sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        style={{
          width: expanded ? "210px" : "58px",
          height: "100vh",
          position: "sticky",
          top: 0,
          background: "#0d0d14",
          borderRight: "1px solid #1f1f2e",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease, transform 0.2s ease",
          overflow: "hidden",
          flexShrink: 0,
          zIndex: 40,
          alignSelf: "flex-start",
        }}
      >
        {/* Logo & Mobile Toggle Area */}
        <div
          onClick={() => setExpanded((prev) => !prev)}
          style={{
            height: "58px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "16px",
            borderBottom: "1px solid #1f1f2e",
            gap: "10px",
            flexShrink: 0,
            cursor: "pointer",
          }}
          title={expanded ? "Collapse panel" : "Expand panel"}
        >
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: "700",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            P
          </div>
          {expanded && (
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#d1d5db", whiteSpace: "nowrap" }}>
              PSA Admin
            </span>
          )}
        </div>

        {/* Navigation items */}
        <nav style={{ flex: 1, padding: "12px 0", overflowY: "auto" }}>
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
                  padding: "10px 16px",
                  textDecoration: "none",
                  color: active ? "#a78bfa" : "#9ca3af",
                  background: active ? "rgba(139, 92, 246, 0.08)" : "transparent",
                  borderLeft: active ? "2px solid #8b5cf6" : "2px solid transparent",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                {expanded && (
                  <span style={{ fontSize: "13px", fontWeight: active ? "500" : "400" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Fixed Logout Button at bottom of Sidebar */}
        <div style={{ padding: "12px 0", borderTop: "1px solid #1f1f2e", marginTop: "auto", flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              width: "100%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
            title="Logout"
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            {expanded && <span style={{ fontSize: "13px" }}>{loggingOut ? "Logging out…" : "Logout"}</span>}
          </button>
        </div>
      </aside>

      {/* Main content viewport */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <header
          style={{
            height: "58px",
            borderBottom: "1px solid #1f1f2e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            flexShrink: 0,
            background: "#0a0a0f",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#4b5563" }}>PSA Admin Portal</span>
            <ChevronRight size={12} style={{ color: "#374151" }} />
            <span style={{ fontSize: "12px", color: "#9ca3af", fontWeight: "500" }}>
              {NAV_ITEMS.find((i) => location.pathname.startsWith(i.path) && !i.exact)?.label ||
                NAV_ITEMS.find((i) => i.exact && location.pathname === i.path)?.label ||
                "Admin"}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
