/**
 * AdminDashboard
 *
 * Premium overview for the PSA admin portal.
 * - KPI cards backed by real data from /api/admin/communication/logs/stats
 * - Recent campaigns from /api/admin/communication/campaigns
 * - Recent enquiries from /api/admin/inquiries (authenticated, Phase 03)
 * - Quick actions
 *
 * Rules: Only real data. No fabricated analytics. No placeholder modules.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Send,
  ArrowRight,
  Mail,
  CheckCircle2,
  XCircle,
  Ban,
  LayoutGrid,
  RefreshCw,
  Clock,
  MessageSquare,
  ChevronRight,
  Inbox,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import { BACKEND_URL } from "../config";

/* ─────────────────────────── helpers ─────────────────────────── */

function relTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status) {
  const map = {
    draft: { label: "Draft", color: "#94a3b8", bg: "rgba(148,163,184,0.08)" },
    sent: { label: "Sent", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    sending: { label: "Sending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    failed: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
    cancelled: { label: "Cancelled", color: "#64748b", bg: "rgba(100,116,139,0.08)" },
  };
  const s = map[status] || { label: status, color: "#6b7280", bg: "rgba(107,114,128,0.08)" };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "500",
        padding: "2px 7px",
        borderRadius: "4px",
        color: s.color,
        background: s.bg,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
      }}
    >
      {s.label}
    </span>
  );
}

/* ─────────────────────────── sub-components ─────────────────────────── */

/** Spotlight KPI card — single metric */
function KPICard({ label, value, icon: Icon, accent, loading, sublabel }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#07101f",
        border: `1px solid ${hovered ? accent + "30" : "rgba(14,165,233,0.08)"}`,
        borderRadius: "12px",
        padding: "20px 22px",
        cursor: "default",
        transition: "border-color 0.25s ease, box-shadow 0.25s ease",
        boxShadow: hovered ? `0 0 28px ${accent}14` : "none",
      }}
    >
      {/* Subtle spotlight radial */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0.5,
          transition: "opacity 0.3s",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "8px",
            background: `${accent}14`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${accent}20`,
          }}
        >
          <Icon size={15} style={{ color: accent }} />
        </div>
      </div>

      <div style={{ fontSize: "24px", fontWeight: "700", color: "#e2e8f0", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {loading ? (
          <div
            style={{
              width: "52px",
              height: "24px",
              borderRadius: "4px",
              background: "linear-gradient(90deg, #0f1e35 0%, #162032 50%, #0f1e35 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        ) : (
          value ?? "—"
        )}
      </div>

      <div style={{ marginTop: "6px", fontSize: "11.5px", color: "#475569", fontWeight: "400" }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ marginTop: "2px", fontSize: "10px", color: "#334155" }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

/** Campaign row for the recent table */
function CampaignRow({ campaign, isLast }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to="/admin/communication"
      style={{ textDecoration: "none" }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: "16px",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: isLast ? "none" : "1px solid rgba(14,165,233,0.05)",
          background: hovered ? "rgba(14,165,233,0.03)" : "transparent",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "12.5px",
              fontWeight: "500",
              color: "#94a3b8",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "2px",
            }}
          >
            {campaign.subject || "(No subject)"}
          </div>
          <div style={{ fontSize: "11px", color: "#334155" }}>
            {relTime(campaign.created_at)}
          </div>
        </div>
        <div>{statusBadge(campaign.status)}</div>
        <ChevronRight size={13} style={{ color: hovered ? "#0ea5e9" : "#1e293b", transition: "color 0.15s" }} />
      </div>
    </Link>
  );
}

/** Enquiry row */
function EnquiryRow({ enquiry, isLast }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "16px",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid rgba(14,165,233,0.05)",
        background: hovered ? "rgba(14,165,233,0.03)" : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "12.5px",
            fontWeight: "500",
            color: "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "2px",
          }}
        >
          {enquiry.name || "(Anonymous)"}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#475569",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {enquiry.email || ""}{enquiry.service ? ` · ${enquiry.service}` : ""}
        </div>
      </div>
      <div style={{ fontSize: "10px", color: "#334155", whiteSpace: "nowrap" }}>
        {relTime(enquiry.created_at)}
      </div>
    </div>
  );
}

/* Panel wrapper */
function Panel({ title, icon: Icon, children, action, actionLabel }) {
  return (
    <div
      style={{
        background: "#07101f",
        border: "1px solid rgba(14,165,233,0.08)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          borderBottom: "1px solid rgba(14,165,233,0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "5px",
              background: "rgba(14,165,233,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={12} style={{ color: "#0ea5e9" }} />
          </div>
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.02em" }}>
            {title}
          </span>
        </div>
        {action && (
          <Link
            to={action}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              color: "#334155",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0ea5e9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
          >
            {actionLabel || "View all"}
            <ArrowRight size={11} />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────── page ─────────────────────────── */

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const [statsRes, campaignsRes, enquiriesRes, inqStatsRes] = await Promise.allSettled([
        axios.get(`${BACKEND_URL}/api/admin/communication/logs/stats`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/communication/campaigns`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/inquiries?limit=5`, { withCredentials: true }),
        axios.get(`${BACKEND_URL}/api/admin/inquiries/stats`, { withCredentials: true }),
      ]);

      if (statsRes.status === "fulfilled") {
        setStats({ ...statsRes.value.data, inqTotal: inqStatsRes.status === "fulfilled" ? inqStatsRes.value.data.total : null });
      }
      if (campaignsRes.status === "fulfilled") {
        const all = campaignsRes.value.data || [];
        setCampaigns(all.slice(0, 5));
      }
      if (enquiriesRes.status === "fulfilled") {
        const all = enquiriesRes.value.data || [];
        setEnquiries(all.slice(0, 5));
      }

      setLastRefresh(new Date());
    } catch (_) {
      // partial failures handled above
    } finally {
      setStatsLoading(false);
      setDataLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const kpiCards = [
    {
      label: "Total Campaigns",
      value: stats?.total_campaigns ?? null,
      icon: LayoutGrid,
      accent: "#0ea5e9",
      sublabel: "All time",
    },
    {
      label: "Total Enquiries",
      value: stats?.inqTotal ?? null,
      icon: Inbox,
      accent: "#a78bfa",
      sublabel: "Website enquiries",
    },
    {
      label: "Emails Sent",
      value: stats?.sent_count ?? null,
      icon: CheckCircle2,
      accent: "#22c55e",
      sublabel: "All time deliveries",
    },
    {
      label: "Failed Deliveries",
      value: stats?.failed_count ?? null,
      icon: XCircle,
      accent: "#ef4444",
      sublabel: "All time failures",
    },
  ];

  return (
    <AdminLayout>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
              background: "rgba(14,165,233,0.06)",
              border: "1px solid rgba(14,165,233,0.15)",
              borderRadius: "6px",
              padding: "3px 10px",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 5px rgba(34,197,94,0.6)",
              }}
            />
            <span style={{ fontSize: "10px", color: "#0ea5e9", fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Admin Portal
            </span>
          </div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#e2e8f0",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Dashboard Overview
          </h1>
          <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px", marginBottom: 0 }}>
            P Suman &amp; Associates — administrative overview
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 13px",
            background: "rgba(14,165,233,0.05)",
            border: "1px solid rgba(14,165,233,0.12)",
            borderRadius: "7px",
            cursor: refreshing ? "default" : "pointer",
            color: "#475569",
            fontSize: "11.5px",
            fontFamily: "inherit",
            transition: "border-color 0.15s, color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)";
              e.currentTarget.style.color = "#94a3b8";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(14,165,233,0.12)";
            e.currentTarget.style.color = "#475569";
          }}
        >
          <RefreshCw
            size={12}
            style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }}
          />
          {lastRefresh ? `Updated ${relTime(lastRefresh)}` : "Refresh"}
        </button>
      </div>

      {/* ─── KPI Cards ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        {kpiCards.map((card) => (
          <KPICard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
            sublabel={card.sublabel}
            loading={statsLoading}
          />
        ))}
      </div>

      {/* ─── Activity Panels ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Recent Campaigns */}
        <Panel title="Recent Campaigns" icon={Mail} action="/admin/communication" actionLabel="Open center">
          {dataLoading ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#334155", fontSize: "12px" }}>
              Loading…
            </div>
          ) : campaigns.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
              }}
            >
              <Mail size={20} style={{ color: "#1e293b", marginBottom: "8px" }} />
              <div style={{ fontSize: "12px", color: "#334155" }}>No campaigns yet</div>
            </div>
          ) : (
            campaigns.map((c, i) => (
              <CampaignRow key={c.campaign_id} campaign={c} isLast={i === campaigns.length - 1} />
            ))
          )}
        </Panel>

        {/* Recent Enquiries */}
        <Panel title="Recent Enquiries" icon={MessageSquare} action="/admin/inquiries" actionLabel="View all">
          {dataLoading ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#334155", fontSize: "12px" }}>
              Loading…
            </div>
          ) : enquiries.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
              }}
            >
              <Inbox size={20} style={{ color: "#1e293b", marginBottom: "8px" }} />
              <div style={{ fontSize: "12px", color: "#334155" }}>No enquiries yet</div>
            </div>
          ) : (
            enquiries.map((e, i) => (
              <EnquiryRow key={e.id || e.submission_id || i} enquiry={e} isLast={i === enquiries.length - 1} />
            ))
          )}
        </Panel>
      </div>

      {/* ─── Quick Actions ─── */}
      <div>
        <div
          style={{
            fontSize: "10px",
            fontWeight: "600",
            color: "#334155",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "12px",
          }}
        >
          Quick Actions
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          <QuickAction
            to="/admin/communication"
            icon={Send}
            label="Communication Center"
            description="Manage campaigns and send emails to subscribers."
            accent="#0ea5e9"
          />
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickAction({ to, icon: Icon, label, description, accent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: "relative",
          overflow: "hidden",
          background: "#07101f",
          border: `1px solid ${hovered ? accent + "35" : "rgba(14,165,233,0.08)"}`,
          borderRadius: "10px",
          padding: "18px 20px",
          cursor: "pointer",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: hovered ? `0 0 22px ${accent}12` : "none",
        }}
      >
        {/* Spotlight */}
        <div
          style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}16 0%, transparent 70%)`,
            pointerEvents: "none",
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.3s",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              background: `${accent}12`,
              border: `1px solid ${accent}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} style={{ color: accent }} />
          </div>
          <ArrowRight
            size={13}
            style={{
              color: hovered ? accent : "#1e293b",
              transition: "color 0.2s, transform 0.2s",
              transform: hovered ? "translateX(2px)" : "none",
            }}
          />
        </div>

        <div style={{ fontSize: "13px", fontWeight: "600", color: "#94a3b8", marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ fontSize: "11.5px", color: "#334155", lineHeight: "1.5" }}>
          {description}
        </div>
      </div>
    </Link>
  );
}
