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
  FileText,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import { BACKEND_URL } from "../config";
import {
  SURFACE,
  SURFACE_ALT,
  SURFACE_HOVER,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  TEXT_DISABLED,
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
  CARD_STYLE,
  SHADOW_SM,
  RADIUS_LG,
  RADIUS_MD,
  BTN_SECONDARY_STYLE,
} from "../utils/adminTheme";

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
    draft:     { label: "Draft",     color: "#6B8099",  bg: "rgba(107,128,153,0.1)",  border: "rgba(107,128,153,0.25)" },
    sent:      { label: "Sent",      color: "#15803D",  bg: "rgba(22,163,74,0.08)",   border: "rgba(22,163,74,0.25)"  },
    sending:   { label: "Sending",   color: "#D97706",  bg: "rgba(217,119,6,0.08)",   border: "rgba(217,119,6,0.25)"  },
    failed:    { label: "Failed",    color: "#DC2626",  bg: "rgba(220,38,38,0.08)",   border: "rgba(220,38,38,0.25)"  },
    cancelled: { label: "Cancelled", color: "#6B8099",  bg: "rgba(107,128,153,0.08)", border: "rgba(107,128,153,0.2)" },
  };
  const s = map[status] || { label: status, color: "#6B8099", bg: "rgba(107,128,153,0.08)", border: "rgba(107,128,153,0.2)" };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: "600",
        padding: "2px 8px",
        borderRadius: "4px",
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
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
        background: SURFACE,
        border: `1px solid ${hovered ? accent + "50" : BORDER}`,
        borderRadius: RADIUS_LG,
        padding: "20px 22px",
        cursor: "default",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: hovered
          ? `0 4px 16px ${accent}14, ${SHADOW_SM}`
          : SHADOW_SM,
      }}
    >
      {/* Subtle top-right radial accent */}
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
          pointerEvents: "none",
          opacity: hovered ? 1 : 0.6,
          transition: "opacity 0.3s",
        }}
      />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "14px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: `${accent}12`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `1px solid ${accent}25`,
          }}
        >
          <Icon size={16} style={{ color: accent }} />
        </div>
      </div>

      <div style={{ fontSize: "28px", fontWeight: "700", color: TEXT_PRIMARY, letterSpacing: "-0.03em", lineHeight: 1 }}>
        {loading ? (
          <div
            style={{
              width: "52px",
              height: "28px",
              borderRadius: "4px",
              background: "linear-gradient(90deg, #E2E8F0 0%, #F0F4F8 50%, #E2E8F0 100%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }}
          />
        ) : (
          value ?? "—"
        )}
      </div>

      <div style={{ marginTop: "6px", fontSize: "12px", color: TEXT_SECONDARY, fontWeight: "500" }}>
        {label}
      </div>
      {sublabel && (
        <div style={{ marginTop: "2px", fontSize: "10.5px", color: TEXT_MUTED }}>
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
          padding: "11px 16px",
          borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
          background: hovered ? SURFACE_HOVER : "transparent",
          transition: "background 0.15s",
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "500",
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "2px",
            }}
          >
            {campaign.subject || "(No subject)"}
          </div>
          <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
            {relTime(campaign.created_at)}
          </div>
        </div>
        <div>{statusBadge(campaign.status)}</div>
        <ChevronRight size={13} style={{ color: hovered ? ACCENT : TEXT_DISABLED, transition: "color 0.15s" }} />
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
        padding: "11px 16px",
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        background: hovered ? SURFACE_HOVER : "transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "500",
            color: TEXT_PRIMARY,
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
            color: TEXT_MUTED,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {enquiry.email || ""}{(enquiry.service_of_interest || enquiry.service) ? ` · ${enquiry.service_of_interest || enquiry.service}` : ""}
        </div>
      </div>
      <div style={{ fontSize: "11px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
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
        ...CARD_STYLE,
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
          borderBottom: `1px solid ${BORDER}`,
          background: SURFACE_ALT,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              background: ACCENT_BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${ACCENT_BORDER}`,
            }}
          >
            <Icon size={12} style={{ color: ACCENT }} />
          </div>
          <span style={{ fontSize: "12.5px", fontWeight: "600", color: TEXT_PRIMARY, letterSpacing: "0.01em" }}>
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
              fontSize: "11.5px",
              color: ACCENT,
              textDecoration: "none",
              fontWeight: "500",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#0284C7")}
            onMouseLeave={(e) => (e.currentTarget.style.color = ACCENT)}
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

      // Handle Inquiries with graceful fallback to /api/contact if /api/admin/inquiries is not yet deployed on backend
      let inqList = [];
      let inqCount = null;

      if (enquiriesRes.status === "fulfilled" && Array.isArray(enquiriesRes.value.data)) {
        inqList = enquiriesRes.value.data.slice(0, 5);
      }
      if (inqStatsRes.status === "fulfilled" && inqStatsRes.value.data?.total != null) {
        inqCount = inqStatsRes.value.data.total;
      }

      // If dedicated admin route failed (e.g. 404 on preview environment), fall back to public /api/contact
      if (enquiriesRes.status !== "fulfilled" || inqStatsRes.status !== "fulfilled") {
        try {
          const contactFallback = await axios.get(`${BACKEND_URL}/api/contact`, { withCredentials: true });
          const rawItems = contactFallback.data || [];
          if (inqList.length === 0) {
            inqList = rawItems.slice(0, 5);
          }
          if (inqCount === null) {
            inqCount = rawItems.length;
          }
        } catch (_) {}
      }

      if (statsRes.status === "fulfilled") {
        setStats({ ...statsRes.value.data, inqTotal: inqCount });
      } else {
        setStats((prev) => ({ ...(prev || {}), inqTotal: inqCount }));
      }

      if (campaignsRes.status === "fulfilled") {
        const all = campaignsRes.value.data || [];
        setCampaigns(all.slice(0, 5));
      }

      setEnquiries(inqList);

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
      accent: "#0EA5E9",
      sublabel: "All time",
    },
    {
      label: "Total Enquiries",
      value: stats?.inqTotal ?? null,
      icon: Inbox,
      accent: "#8B5CF6",
      sublabel: "Website enquiries",
    },
    {
      label: "Emails Sent",
      value: stats?.sent_count ?? null,
      icon: CheckCircle2,
      accent: "#16A34A",
      sublabel: "All time deliveries",
    },
    {
      label: "Failed Deliveries",
      value: stats?.failed_count ?? null,
      icon: XCircle,
      accent: "#DC2626",
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ marginBottom: "28px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "8px",
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: "6px",
              padding: "3px 10px",
            }}
          >
            <div
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#22C55E",
                boxShadow: "0 0 5px rgba(34,197,94,0.5)",
              }}
            />
            <span style={{ fontSize: "10px", color: ACCENT, fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Admin Portal
            </span>
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: TEXT_PRIMARY,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Dashboard Overview
          </h1>
          <p style={{ fontSize: "12.5px", color: TEXT_MUTED, marginTop: "4px", marginBottom: 0 }}>
            P Suman &amp; Associates — administrative overview
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={() => loadAll(true)}
          disabled={refreshing}
          style={{
            ...BTN_SECONDARY_STYLE,
            opacity: refreshing ? 0.6 : 1,
            cursor: refreshing ? "default" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!refreshing) {
              e.currentTarget.style.borderColor = ACCENT;
              e.currentTarget.style.color = ACCENT;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BORDER;
            e.currentTarget.style.color = "#3D5A78";
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
          gap: "16px",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {/* Recent Campaigns */}
        <Panel title="Recent Campaigns" icon={Mail} action="/admin/communication" actionLabel="Open center">
          {dataLoading ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: TEXT_MUTED, fontSize: "12px" }}>
              Loading…
            </div>
          ) : campaigns.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
              }}
            >
              <Mail size={22} style={{ color: TEXT_DISABLED, marginBottom: "8px" }} />
              <div style={{ fontSize: "12px", color: TEXT_MUTED }}>No campaigns yet</div>
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
            <div style={{ padding: "32px 16px", textAlign: "center", color: TEXT_MUTED, fontSize: "12px" }}>
              Loading…
            </div>
          ) : enquiries.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
              }}
            >
              <Inbox size={22} style={{ color: TEXT_DISABLED, marginBottom: "8px" }} />
              <div style={{ fontSize: "12px", color: TEXT_MUTED }}>No enquiries yet</div>
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
            fontWeight: "700",
            color: TEXT_MUTED,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
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
            to="/admin/insights"
            icon={FileText}
            label="Insights CMS"
            description="Author, edit, and publish editorial thought leadership."
            accent="#0EA5E9"
          />
          <QuickAction
            to="/admin/inquiries"
            icon={Inbox}
            label="Inquiries Center"
            description="Review and track inbound client consultation requests."
            accent="#8B5CF6"
          />
          <QuickAction
            to="/admin/communication"
            icon={Send}
            label="Communication Center"
            description="Manage campaigns and send emails to subscribers."
            accent="#0EA5E9"
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
          background: SURFACE,
          border: `1px solid ${hovered ? accent + "45" : BORDER}`,
          borderRadius: RADIUS_LG,
          padding: "18px 20px",
          cursor: "pointer",
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
          boxShadow: hovered ? `0 4px 16px ${accent}12, ${SHADOW_SM}` : SHADOW_SM,
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
            background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
            pointerEvents: "none",
            opacity: hovered ? 1 : 0.5,
            transition: "opacity 0.3s",
          }}
        />

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              background: `${accent}12`,
              border: `1px solid ${accent}25`,
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
              color: hovered ? accent : TEXT_DISABLED,
              transition: "color 0.2s, transform 0.2s",
              transform: hovered ? "translateX(2px)" : "none",
            }}
          />
        </div>

        <div style={{ fontSize: "13px", fontWeight: "600", color: TEXT_PRIMARY, marginBottom: "4px" }}>
          {label}
        </div>
        <div style={{ fontSize: "11.5px", color: TEXT_SECONDARY, lineHeight: "1.5" }}>
          {description}
        </div>
      </div>
    </Link>
  );
}
