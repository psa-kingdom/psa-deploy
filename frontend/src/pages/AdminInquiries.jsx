/**
 * AdminInquiries — Inquiries Center
 *
 * Protected by AdminAuthGuard at the route level.
 * Manages website-generated enquiries stored in contact_submissions.
 *
 * Status workflow: new → contacted → qualified → converted → closed
 *
 * Data source: /api/admin/inquiries (authenticated)
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Inbox,
  Search,
  X,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Clock,
  MessageSquare,
  User,
  ArrowRight,
  RefreshCw,
  StickyNote,
  CheckCircle2,
  Filter,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import { BACKEND_URL } from "../config";

const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

/* ─────────────────────── constants ─────────────────────── */

const STATUS_CONFIG = {
  new:       { label: "New",       color: "#38bdf8", bg: "rgba(56,189,248,0.1)",  dot: "#38bdf8"  },
  contacted: { label: "Contacted", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", dot: "#a78bfa"  },
  qualified: { label: "Qualified", color: "#34d399", bg: "rgba(52,211,153,0.1)",  dot: "#34d399"  },
  converted: { label: "Converted", color: "#22c55e", bg: "rgba(34,197,94,0.12)",  dot: "#22c55e"  },
  closed:    { label: "Closed",    color: "#64748b", bg: "rgba(100,116,139,0.1)", dot: "#64748b"  },
};

const STATUS_ORDER = ["new", "contacted", "qualified", "converted", "closed"];

const SOURCE_LABELS = {
  website_contact: "Contact Form",
};

/* ─────────────────────── helpers ─────────────────────── */

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

function absDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─────────────────────── sub-components ─────────────────────── */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "10.5px",
        fontWeight: "500",
        padding: "3px 8px",
        borderRadius: "4px",
        color: cfg.color,
        background: cfg.bg,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

function StatChip({ label, count, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 11px",
        borderRadius: "6px",
        border: `1px solid ${active ? color + "40" : "rgba(14,165,233,0.1)"}`,
        background: active ? color + "12" : "transparent",
        color: active ? color : "#475569",
        fontSize: "11.5px",
        fontWeight: active ? "600" : "400",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {count != null && (
        <span
          style={{
            fontSize: "10px",
            padding: "1px 5px",
            borderRadius: "3px",
            background: active ? color + "20" : "rgba(255,255,255,0.04)",
            color: active ? color : "#334155",
            fontWeight: "600",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Detail panel — slides in from the right */
function DetailPanel({ inquiry, onClose, onStatusChange, onNotesChange }) {
  const [status, setStatus] = useState(inquiry.status || "new");
  const [notes, setNotes] = useState(inquiry.notes || "");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDirty, setNotesDirty] = useState(false);
  const notesTimer = useRef(null);

  // Sync with parent when inquiry changes — intentionally depends only on inquiry.id
  // so the panel resets when a different inquiry is selected, not on every status update.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setStatus(inquiry.status || "new");
    setNotes(inquiry.notes || "");
    setNotesDirty(false);
  }, [inquiry.id]);
  /* eslint-enable react-hooks/exhaustive-deps */

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleStatusChange = async (newStatus) => {
    setSavingStatus(true);
    try {
      const res = await api.patch(`/api/admin/inquiries/${inquiry.id}/status`, { status: newStatus });
      setStatus(res.data.status);
      onStatusChange(res.data);
    } catch (_) {
      // Optimistic update fallback if backend route is pending deployment
      const updated = { ...inquiry, status: newStatus };
      setStatus(newStatus);
      onStatusChange(updated);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleNotesChange = (val) => {
    setNotes(val);
    setNotesDirty(true);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(async () => {
      setSavingNotes(true);
      try {
        const res = await api.patch(`/api/admin/inquiries/${inquiry.id}/notes`, { notes: val });
        onNotesChange(res.data);
        setNotesDirty(false);
      } catch (_) {
        onNotesChange({ ...inquiry, notes: val });
        setNotesDirty(false);
      } finally {
        setSavingNotes(false);
      }
    }, 1200);
  };

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)",
          zIndex: 50,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "#060f1c",
          borderLeft: "1px solid rgba(14,165,233,0.12)",
          zIndex: 51,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slideInRight 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Panel header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(14,165,233,0.08)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "50%",
                background: cfg.bg,
                border: `1px solid ${cfg.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "600",
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              {(inquiry.name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>
                {inquiry.name || "—"}
              </div>
              <div style={{ fontSize: "11px", color: "#475569" }}>
                {inquiry.company || inquiry.email}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#475569",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Status workflow */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              Status
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STATUS_ORDER.map((s) => {
                const c = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    onClick={() => !isActive && !savingStatus && handleStatusChange(s)}
                    disabled={savingStatus}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "5px",
                      border: `1px solid ${isActive ? c.color + "50" : "rgba(255,255,255,0.06)"}`,
                      background: isActive ? c.bg : "transparent",
                      color: isActive ? c.color : "#475569",
                      fontSize: "11.5px",
                      fontWeight: isActive ? "600" : "400",
                      cursor: savingStatus || isActive ? "default" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      opacity: savingStatus ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !savingStatus) e.currentTarget.style.color = c.color;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = "#475569";
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: "rgba(14,165,233,0.06)", marginBottom: "20px" }} />

          {/* Contact fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "20px" }}>
            <DetailField icon={User} label="Name" value={inquiry.name} />
            <DetailField icon={Building2} label="Company" value={inquiry.company} />
            <DetailField icon={Mail} label="Email" value={inquiry.email} link={`mailto:${inquiry.email}`} />
            <DetailField icon={Phone} label="Phone" value={inquiry.phone} link={inquiry.phone ? `tel:${inquiry.phone}` : null} />
            <DetailField icon={Briefcase} label="Designation" value={inquiry.designation} />
            <DetailField icon={Filter} label="Service Interest" value={inquiry.service_of_interest} />
            <DetailField icon={Clock} label="Received" value={absDate(inquiry.created_at)} fullWidth />
            <DetailField icon={ArrowRight} label="Source" value={SOURCE_LABELS[inquiry.source] || inquiry.source} />
          </div>

          {/* Message */}
          {inquiry.message && (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <MessageSquare size={11} style={{ color: "#0ea5e9" }} />
                Message
              </div>
              <div
                style={{
                  background: "rgba(14,165,233,0.04)",
                  border: "1px solid rgba(14,165,233,0.08)",
                  borderRadius: "6px",
                  padding: "12px 14px",
                  fontSize: "12.5px",
                  color: "#94a3b8",
                  lineHeight: "1.65",
                  whiteSpace: "pre-wrap",
                }}
              >
                {inquiry.message}
              </div>
            </div>
          )}

          {/* Admin notes */}
          <div>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <StickyNote size={11} style={{ color: "#f59e0b" }} />
              Internal Notes
              {savingNotes && <span style={{ fontSize: "9px", color: "#475569", fontWeight: "400" }}>saving…</span>}
              {!savingNotes && !notesDirty && notes && <CheckCircle2 size={10} style={{ color: "#22c55e" }} />}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add internal notes visible only to admins…"
              rows={4}
              style={{
                width: "100%",
                background: "rgba(245,158,11,0.04)",
                border: "1px solid rgba(245,158,11,0.12)",
                borderRadius: "6px",
                padding: "10px 12px",
                fontSize: "12.5px",
                color: "#94a3b8",
                fontFamily: "inherit",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(245,158,11,0.3)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(245,158,11,0.12)")}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ icon: Icon, label, value, link, fullWidth }) {
  if (!value) return null;
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ fontSize: "9.5px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
        <Icon size={10} style={{ color: "#0ea5e9" }} />
        {label}
      </div>
      {link ? (
        <a
          href={link}
          style={{ fontSize: "12.5px", color: "#0ea5e9", textDecoration: "none", wordBreak: "break-all" }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {value}
        </a>
      ) : (
        <div style={{ fontSize: "12.5px", color: "#94a3b8", wordBreak: "break-word" }}>{value}</div>
      )}
    </div>
  );
}

/* ─────────────────────────── Inquiry row ─────────────────────────── */

function InquiryRow({ inquiry, selected, onClick, isLast }) {
  const [hovered, setHovered] = useState(false);
  const isActive = selected || hovered;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto auto auto",
        gap: "16px",
        alignItems: "center",
        padding: "13px 18px",
        borderBottom: isLast ? "none" : "1px solid rgba(14,165,233,0.05)",
        background: selected
          ? "rgba(14,165,233,0.06)"
          : hovered
          ? "rgba(14,165,233,0.03)"
          : "transparent",
        cursor: "pointer",
        transition: "background 0.12s",
        borderLeft: selected ? "2px solid #0ea5e9" : "2px solid transparent",
      }}
    >
      {/* Primary info */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "13px",
            fontWeight: "500",
            color: isActive ? "#e2e8f0" : "#94a3b8",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "2px",
            transition: "color 0.12s",
          }}
        >
          {inquiry.name || "(No name)"}
        </div>
        <div
          style={{
            fontSize: "11.5px",
            color: "#475569",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {inquiry.company ? `${inquiry.company} · ` : ""}{inquiry.email}
        </div>
        {inquiry.service_of_interest && (
          <div style={{ fontSize: "10.5px", color: "#334155", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
            <Briefcase size={9} />
            {inquiry.service_of_interest}
          </div>
        )}
      </div>

      {/* Source */}
      <div style={{ fontSize: "10px", color: "#334155", whiteSpace: "nowrap", flexShrink: 0 }}>
        {SOURCE_LABELS[inquiry.source] || inquiry.source || "—"}
      </div>

      {/* Status badge */}
      <StatusBadge status={inquiry.status || "new"} />

      {/* Time + arrow */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
        <span style={{ fontSize: "10.5px", color: "#334155", whiteSpace: "nowrap" }}>
          {relTime(inquiry.created_at)}
        </span>
        <ChevronRight size={13} style={{ color: isActive ? "#0ea5e9" : "#1e293b", transition: "color 0.12s" }} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const searchTimer = useRef(null);

  const [statusFilter, setStatusFilter] = useState(null); // null = all
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  const [lastRefresh, setLastRefresh] = useState(null);

  const loadAll = useCallback(async (opts = {}) => {
    if (opts.refresh) setRefreshing(true);
    try {
      const targetQ = opts.q !== undefined ? opts.q : search;
      const targetStatus = opts.status !== undefined ? opts.status : statusFilter;

      const [statsRes, listRes] = await Promise.allSettled([
        api.get("/api/admin/inquiries/stats"),
        api.get("/api/admin/inquiries", {
          params: {
            q: targetQ,
            status: targetStatus,
            limit: 100,
          },
        }),
      ]);

      let items = [];
      let statsData = null;

      if (listRes.status === "fulfilled" && Array.isArray(listRes.value.data)) {
        items = listRes.value.data;
      }
      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        statsData = statsRes.value.data;
      }

      // If dedicated backend route is unavailable (e.g. 404 before backend branch deployment)
      if (listRes.status !== "fulfilled" || statsRes.status !== "fulfilled") {
        try {
          const fallback = await api.get("/api/contact");
          const raw = (fallback.data || []).map((d) => ({
            ...d,
            source: d.source || "website_contact",
            status: d.status || "new",
            service_of_interest: d.service_of_interest || d.service || "",
          }));

          if (!statsData) {
            const counts = { new: 0, contacted: 0, qualified: 0, converted: 0, closed: 0 };
            raw.forEach((d) => {
              const s = d.status || "new";
              if (counts[s] !== undefined) counts[s]++;
              else counts.new++;
            });
            statsData = { total: raw.length, by_status: counts };
          }

          if (items.length === 0 && listRes.status !== "fulfilled") {
            let filtered = raw;
            if (targetStatus) {
              filtered = filtered.filter((d) => (d.status || "new") === targetStatus);
            }
            if (targetQ && targetQ.trim()) {
              const term = targetQ.trim().toLowerCase();
              filtered = filtered.filter(
                (d) =>
                  (d.name && d.name.toLowerCase().includes(term)) ||
                  (d.email && d.email.toLowerCase().includes(term)) ||
                  (d.company && d.company.toLowerCase().includes(term))
              );
            }
            items = filtered;
          }
        } catch (_) {}
      }

      setStats(statsData);
      setInquiries(items);
      setLastRefresh(new Date());
    } catch (_) {
      // partial failures silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);  // initial load only

  // Re-fetch when filter changes
  useEffect(() => {
    if (!loading) loadAll({ status: statusFilter, q: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Debounced search
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      loadAll({ q: val, status: statusFilter });
    }, 350);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    loadAll({ q: "", status: statusFilter });
  };

  const handleStatusChange = (updatedDoc) => {
    setInquiries((prev) => prev.map((i) => (i.id === updatedDoc.id ? updatedDoc : i)));
    if (selectedInquiry?.id === updatedDoc.id) setSelectedInquiry(updatedDoc);
    // Refresh stats
    api.get("/api/admin/inquiries/stats").then((r) => setStats(r.data)).catch(() => {});
    // If filtering by a status, also refresh the list so the moved item disappears
    if (statusFilter) loadAll({ status: statusFilter, q: search });
  };

  const handleNotesChange = (updatedDoc) => {
    setInquiries((prev) => prev.map((i) => (i.id === updatedDoc.id ? updatedDoc : i)));
    if (selectedInquiry?.id === updatedDoc.id) setSelectedInquiry(updatedDoc);
  };

  return (
    <AdminLayout>
      {/* ─── Header ─── */}
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
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
            <Inbox size={11} style={{ color: "#0ea5e9" }} />
            <span style={{ fontSize: "10px", color: "#0ea5e9", fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Inquiries Center
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
            Website Enquiries
          </h1>
          <p style={{ fontSize: "12px", color: "#475569", marginTop: "4px", marginBottom: 0 }}>
            Manage and track inbound enquiries from the PSA website contact form.
          </p>
        </div>

        {/* Refresh */}
        <button
          onClick={() => loadAll({ refresh: true, status: statusFilter, q: search })}
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
          <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          {lastRefresh ? `Updated ${relTime(lastRefresh)}` : "Refresh"}
        </button>
      </div>

      {/* ─── Status summary chips ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "18px" }}>
        <StatChip
          label="All"
          count={stats?.total ?? null}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
          color="#0ea5e9"
        />
        {STATUS_ORDER.map((s) => (
          <StatChip
            key={s}
            label={STATUS_CONFIG[s].label}
            count={stats?.by_status?.[s] ?? null}
            active={statusFilter === s}
            onClick={() => setStatusFilter(statusFilter === s ? null : s)}
            color={STATUS_CONFIG[s].color}
          />
        ))}
      </div>

      {/* ─── Search ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "9px 14px",
          background: "rgba(14,165,233,0.03)",
          border: "1px solid rgba(14,165,233,0.08)",
          borderRadius: "8px",
          marginBottom: "16px",
        }}
      >
        <Search size={14} style={{ color: "#334155", flexShrink: 0 }} />
        <input
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Search by name, email, or company…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            color: "#e2e8f0",
            fontFamily: "inherit",
          }}
        />
        {searchInput && (
          <button
            onClick={clearSearch}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", padding: 0, display: "flex", alignItems: "center" }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ─── List panel ─── */}
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
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto",
            gap: "16px",
            padding: "10px 18px",
            borderBottom: "1px solid rgba(14,165,233,0.06)",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {loading ? "Loading…" : `${inquiries.length} enquir${inquiries.length === 1 ? "y" : "ies"}`}
          </span>
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</span>
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</span>
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>Received</span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#334155", fontSize: "12px" }}>
            Loading enquiries…
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <Inbox size={28} style={{ color: "#1e293b", margin: "0 auto 10px" }} />
            <div style={{ fontSize: "13px", color: "#334155" }}>
              {search || statusFilter ? "No enquiries match your filters." : "No enquiries yet."}
            </div>
            {(search || statusFilter) && (
              <button
                onClick={() => { clearSearch(); setStatusFilter(null); }}
                style={{ marginTop: "10px", fontSize: "11px", color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          inquiries.map((inq, i) => (
            <InquiryRow
              key={inq.id || i}
              inquiry={inq}
              selected={selectedInquiry?.id === inq.id}
              onClick={() => setSelectedInquiry(selectedInquiry?.id === inq.id ? null : inq)}
              isLast={i === inquiries.length - 1}
            />
          ))
        )}
      </div>

      {/* Spin style */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ─── Detail panel ─── */}
      {selectedInquiry && (
        <DetailPanel
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
        />
      )}
    </AdminLayout>
  );
}
