import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  RefreshCw,
  Clock,
  Info,
  XCircle,
} from "lucide-react";
import {
  SURFACE,
  SURFACE_ALT,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  ACCENT,
  SUCCESS,
  RADIUS_MD,
  RADIUS_LG,
  SHADOW_SM,
} from "../../utils/adminTheme";

export default function AdminAnalyticsCards({ backendUrl }) {
  const [period, setPeriod] = useState("7d");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMetrics = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(
          `${backendUrl}/api/admin/communication/analytics?period=${period}&refresh=${forceRefresh}`,
          { withCredentials: true }
        );
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load metrics:", err);
        setError("Unable to load deliverability metrics.");
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, period]
  );

  useEffect(() => {
    fetchMetrics(false);
  }, [fetchMetrics]);

  const cards = [
    {
      title: "Emails Sent",
      value: metrics?.sent ?? "—",
      subtext: `Total outgoing (${period})`,
      icon: Send,
      color: "#0284c7",
      bg: "rgba(14, 165, 233, 0.08)",
    },
    {
      title: "Delivered",
      value: metrics?.delivered ?? "—",
      subtext:
        metrics?.delivery_rate !== undefined
          ? `${metrics.delivery_rate}% delivery rate`
          : "—",
      icon: CheckCircle2,
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.08)",
    },
    {
      title: "Bounced",
      value: metrics?.bounced ?? 0,
      subtext:
        metrics?.bounce_rate !== undefined
          ? `${metrics.bounce_rate}% bounce rate`
          : "0.0%",
      icon: AlertTriangle,
      color: metrics?.bounced > 0 ? "#dc2626" : "#64748b",
      bg: metrics?.bounced > 0 ? "rgba(220, 38, 38, 0.08)" : "rgba(100, 116, 139, 0.08)",
    },
    {
      title: "Complaints",
      value: metrics?.complained ?? 0,
      subtext:
        metrics?.complaint_rate !== undefined
          ? `${metrics.complaint_rate}% complaint rate`
          : "0.0%",
      icon: AlertOctagon,
      color: metrics?.complained > 0 ? "#ea580c" : "#64748b",
      bg: metrics?.complained > 0 ? "rgba(234, 88, 12, 0.08)" : "rgba(100, 116, 139, 0.08)",
    },
    {
      title: "Suppressed",
      value: metrics?.suppressed ?? 0,
      subtext: "Unsubscribed / blocked",
      icon: ShieldCheck,
      color: "#475569",
      bg: "rgba(71, 85, 105, 0.08)",
    },
    {
      title: "Failed / Blocked",
      value: metrics?.failed ?? 0,
      subtext: "Send failures & test guards",
      icon: XCircle,
      color: metrics?.failed > 0 ? "#dc2626" : "#64748b",
      bg: metrics?.failed > 0 ? "rgba(220, 38, 38, 0.08)" : "rgba(100, 116, 139, 0.08)",
    },
  ];

  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: RADIUS_LG,
        padding: "24px",
        boxShadow: SHADOW_SM,
        marginBottom: "24px",
      }}
    >
      {/* Header bar with controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          borderBottom: `1px solid ${BORDER}`,
          paddingBottom: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: TEXT_PRIMARY,
                margin: 0,
                fontFamily: "inherit",
              }}
            >
              Email Deliverability &amp; Analytics Summary
            </h3>
            {metrics?.source === "resend" ? (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(22,163,74,0.1)",
                  color: "#15803d",
                  border: "1px solid rgba(22,163,74,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: SUCCESS,
                  }}
                />
                Resend Live Metrics
              </span>
            ) : (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "rgba(100,116,139,0.1)",
                  color: "#475569",
                  border: "1px solid rgba(100,116,139,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#64748b",
                  }}
                />
                Local Audit Logs
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: "12px",
              color: TEXT_MUTED,
              margin: "4px 0 0",
            }}
          >
            Real-time deliverability counts, bounce rates, and health signals.
          </p>
        </div>

        {/* Period toggle and refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              display: "inline-flex",
              borderRadius: RADIUS_MD,
              border: `1px solid ${BORDER}`,
              background: SURFACE_ALT,
              padding: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setPeriod("7d")}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: "600",
                borderRadius: "4px",
                border: "none",
                background: period === "7d" ? SURFACE : "transparent",
                color: period === "7d" ? ACCENT : TEXT_MUTED,
                cursor: "pointer",
                boxShadow: period === "7d" ? SHADOW_SM : "none",
              }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setPeriod("30d")}
              style={{
                padding: "4px 10px",
                fontSize: "11px",
                fontWeight: "600",
                borderRadius: "4px",
                border: "none",
                background: period === "30d" ? SURFACE : "transparent",
                color: period === "30d" ? ACCENT : TEXT_MUTED,
                cursor: "pointer",
                boxShadow: period === "30d" ? SHADOW_SM : "none",
              }}
            >
              Last 30 Days
            </button>
          </div>

          <button
            type="button"
            onClick={() => fetchMetrics(true)}
            disabled={loading}
            title="Refresh Metrics"
            style={{
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: RADIUS_MD,
              border: `1px solid ${BORDER}`,
              background: SURFACE,
              color: TEXT_SECONDARY,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw
              size={12}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: RADIUS_MD,
            padding: "10px 14px",
            color: "#dc2626",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
        }}
      >
        {cards.map((c, idx) => {
          const IconComp = c.icon;
          return (
            <div
              key={idx}
              style={{
                background: SURFACE_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: TEXT_MUTED,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {c.title}
                </span>
                <div
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: c.bg,
                    color: c.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconComp size={14} />
                </div>
              </div>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: TEXT_PRIMARY,
                  marginTop: "4px",
                }}
              >
                {c.value}
              </div>

              <span
                style={{
                  fontSize: "11px",
                  color: TEXT_MUTED,
                  marginTop: "2px",
                }}
              >
                {c.subtext}
              </span>
            </div>
          );
        })}
      </div>

      {/* Privacy Notice & Metadata */}
      <div
        style={{
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "11px",
          color: TEXT_MUTED,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Info size={13} style={{ color: ACCENT }} />
          <span>
            <strong>Privacy Preserved:</strong> Open and click tracking are intentionally disabled to respect client confidentiality.
          </span>
        </div>
        {metrics?.cached_at && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} />
            <span>Updated: {new Date(metrics.cached_at).toLocaleTimeString()}</span>
          </div>
        )}
      </div>
    </div>
  );
}
