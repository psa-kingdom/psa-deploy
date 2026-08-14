/**
 * AdminDashboard
 *
 * Shell dashboard — the landing page after login.
 * In V1 this is minimal: just shows the active module cards.
 * Do not add placeholder modules here. Only list what's real.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Send, ArrowRight } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";

const MODULES = [
  {
    id: "communication",
    label: "Communication Center",
    description: "Send campaign emails to newsletter subscribers and manual recipient lists.",
    path: "/admin/communication",
    icon: Send,
    status: "active",
  },
];

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div style={{ maxWidth: "760px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#f9fafb", marginBottom: "6px" }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "32px" }}>
          P Suman &amp; Associates admin portal.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.id}
                to={mod.path}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#0d0d14",
                    border: "1px solid #1f1f2e",
                    borderRadius: "12px",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = "#3730a3";
                    e.currentTarget.style.background = "#0f0f1a";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#1f1f2e";
                    e.currentTarget.style.background = "#0d0d14";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "rgba(99, 102, 241, 0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <Icon size={16} style={{ color: "#818cf8" }} />
                    </div>
                    <ArrowRight size={14} style={{ color: "#374151", marginTop: "2px" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#e5e7eb", marginBottom: "4px" }}>
                      {mod.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
                      {mod.description}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
