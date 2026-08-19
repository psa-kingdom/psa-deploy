/**
 * AdminInquiries — Inquiries Center
 *
 * Protected by AdminAuthGuard at the route level.
 * Manages website-generated enquiries stored in contact_submissions.
 *
 * Status workflow: new → contacted → qualified → converted → closed
 *
 * Data source: /api/admin/inquiries (authenticated)
 *
 * Visual theme: light/hybrid enterprise SaaS (adminTheme tokens).
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
  Download,
  Copy,
  Check,
  ChevronDown,
  Lock,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import { BACKEND_URL } from "../config";
import {
  SURFACE, SURFACE_ALT, SURFACE_HOVER, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_DISABLED,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  SUCCESS_DARK, SUCCESS_BG, SUCCESS_BORDER_STRONG,
  WARNING_DARK, WARNING_BG, WARNING_BORDER_STRONG,
  DANGER, DANGER_BG, DANGER_BORDER_STRONG,
  SHADOW_SM, SHADOW_MD, RADIUS_MD, RADIUS_LG,
  BTN_SECONDARY_STYLE, CARD_STYLE,
} from "../utils/adminTheme";

const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

/* ─────────────────────── constants ─────────────────────── */

const STATUS_CONFIG = {
  new:       { label: "New",       color: "#38bdf8", bg: "rgba(56,189,248,0.15)",  border: "rgba(56,189,248,0.35)",  dot: "#38bdf8"  },
  contacted: { label: "Contacted", color: "#c084fc", bg: "rgba(192,132,252,0.15)", border: "rgba(192,132,252,0.35)", dot: "#c084fc"  },
  qualified: { label: "Qualified", color: "#34d399", bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.35)",  dot: "#34d399"  },
  converted: { label: "Converted", color: "#4ade80", bg: "rgba(74,222,128,0.18)",  border: "rgba(74,222,128,0.4)",   dot: "#4ade80"  },
  closed:    { label: "Closed",    color: "#94a3b8", bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)",  dot: "#94a3b8"  },
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
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ─────────────────────── sub-components ─────────────────────── */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "11px",
        fontWeight: "600",
        padding: "3.5px 9px",
        borderRadius: "5px",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
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
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 13px",
        borderRadius: "7px",
        border: `1px solid ${active ? color + "70" : BORDER}`,
        background: active ? color + "15" : SURFACE,
        color: active ? color : TEXT_SECONDARY,
        fontSize: "12px",
        fontWeight: active ? "600" : "500",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
        boxShadow: SHADOW_SM,
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color + "50";
          e.currentTarget.style.color = color;
          e.currentTarget.style.background = color + "08";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = BORDER;
          e.currentTarget.style.color = TEXT_SECONDARY;
          e.currentTarget.style.background = SURFACE;
        }
      }}
    >
      {label}
      {count != null && (
        <span
          style={{
            fontSize: "10.5px",
            padding: "1px 6px",
            borderRadius: "4px",
            background: active ? color + "20" : SURFACE_ALT,
            color: active ? color : TEXT_MUTED,
            fontWeight: "700",
            border: `1px solid ${active ? color + "30" : BORDER}`,
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
  const [statusError, setStatusError] = useState(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const notesTimer = useRef(null);

  useEffect(() => {
    setStatus(inquiry.status || "new");
    setNotes(inquiry.notes || "");
    setStatusError(null);
    setNotesSaved(false);
  }, [inquiry.id, inquiry.status, inquiry.notes]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === status) return;
    setSavingStatus(true);
    setStatusError(null);
    try {
      const res = await api.patch(`/api/admin/inquiries/${inquiry.id}/status`, { status: newStatus });
      setStatus(res.data.status);
      onStatusChange(res.data);
    } catch (err) {
      setStatusError("Failed to update status on server. Please try again.");
    } finally {
      setSavingStatus(false);
    }
  };

  const saveNotesNow = async (valToSave) => {
    setSavingNotes(true);
    try {
      const res = await api.patch(`/api/admin/inquiries/${inquiry.id}/notes`, { notes: valToSave });
      onNotesChange(res.data);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2500);
    } catch (err) {
      // Keep local notes intact
    } finally {
      setSavingNotes(false);
    }
  };

  const handleNotesChange = (val) => {
    setNotes(val);
    setNotesSaved(false);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      saveNotesNow(val);
    }, 1000);
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
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
          background: "rgba(10,37,64,0.45)",
          backdropFilter: "blur(3px)",
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
          width: "min(520px, 100vw)",
          background: SURFACE,
          borderLeft: `1px solid ${BORDER}`,
          boxShadow: "-8px 0 40px rgba(10,37,64,0.12), -2px 0 8px rgba(10,37,64,0.06)",
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
            padding: "18px 22px",
            borderBottom: `1px solid ${BORDER}`,
            background: SURFACE_ALT,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: cfg.bg,
                border: `1.5px solid ${cfg.color}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: "700",
                color: cfg.color,
                flexShrink: 0,
              }}
            >
              {(inquiry.name || "?").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  color: TEXT_PRIMARY,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {inquiry.name || "(No name)"}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: inquiry.company ? ACCENT : TEXT_MUTED,
                  fontWeight: inquiry.company ? "500" : "400",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  marginTop: "1px",
                }}
              >
                {inquiry.company ? inquiry.company : inquiry.email}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              cursor: "pointer",
              color: TEXT_MUTED,
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = SURFACE_ALT;
              e.currentTarget.style.color = TEXT_PRIMARY;
              e.currentTarget.style.borderColor = BORDER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = SURFACE;
              e.currentTarget.style.color = TEXT_MUTED;
              e.currentTarget.style.borderColor = BORDER;
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px" }}>

          {/* Status workflow */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Enquiry Status
              </div>
              {savingStatus && (
                <span style={{ fontSize: "11px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "4px" }}>
                  <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> Updating…
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {STATUS_ORDER.map((s) => {
                const c = STATUS_CONFIG[s];
                const isActive = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => !isActive && !savingStatus && handleStatusChange(s)}
                    disabled={savingStatus}
                    style={{
                      padding: "6px 13px",
                      borderRadius: "6px",
                      border: `1px solid ${isActive ? c.color + "80" : "rgba(255,255,255,0.08)"}`,
                      background: isActive ? c.bg : "rgba(255,255,255,0.02)",
                      color: isActive ? c.color : "#94a3b8",
                      fontSize: "12px",
                      fontWeight: isActive ? "700" : "500",
                      cursor: savingStatus || isActive ? "default" : "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s",
                      opacity: savingStatus ? 0.7 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive && !savingStatus) {
                        e.currentTarget.style.color = c.color;
                        e.currentTarget.style.borderColor = c.color + "40";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = "#94a3b8";
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                      }
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: isActive ? c.dot : "rgba(255,255,255,0.2)",
                      }}
                    />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {statusError && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontSize: "11.5px", marginTop: "8px" }}>
                <AlertCircle size={13} />
                {statusError}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: "1px", background: BORDER, marginBottom: "22px" }} />

          {/* Section: Contact Details */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
              Contact Information
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <DetailField icon={User} label="Name" value={inquiry.name} />
              <DetailField icon={Building2} label="Company" value={inquiry.company} />

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <Mail size={11} style={{ color: "#0ea5e9" }} />
                  Email Address
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <a
                    href={`mailto:${inquiry.email}`}
                    style={{ fontSize: "13.5px", fontWeight: "500", color: "#38bdf8", textDecoration: "none", wordBreak: "break-all" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    {inquiry.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(inquiry.email, "email")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(14,165,233,0.08)",
                      border: "1px solid rgba(14,165,233,0.2)",
                      borderRadius: "4px",
                      padding: "2px 7px",
                      color: copiedEmail ? "#34d399" : "#94a3b8",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    {copiedEmail ? <Check size={11} /> : <Copy size={11} />}
                    {copiedEmail ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              {inquiry.phone && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Phone size={11} style={{ color: "#0ea5e9" }} />
                    Phone Number
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <a
                      href={`tel:${inquiry.phone}`}
                      style={{ fontSize: "13.5px", fontWeight: "500", color: "#38bdf8", textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      {inquiry.phone}
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inquiry.phone, "phone")}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "rgba(14,165,233,0.08)",
                        border: "1px solid rgba(14,165,233,0.2)",
                        borderRadius: "4px",
                        padding: "2px 7px",
                        color: copiedPhone ? "#34d399" : "#94a3b8",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      {copiedPhone ? <Check size={11} /> : <Copy size={11} />}
                      {copiedPhone ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {inquiry.designation && (
                <DetailField icon={Briefcase} label="Designation" value={inquiry.designation} />
              )}
              <DetailField icon={Filter} label="Service of Interest" value={inquiry.service_of_interest || "General Inquiry"} />
              <DetailField icon={Clock} label="Received Date" value={absDate(inquiry.created_at)} fullWidth />
              <DetailField icon={ArrowRight} label="Inquiry Source" value={SOURCE_LABELS[inquiry.source] || inquiry.source} />
            </div>
          </div>

          {/* Section: Message */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageSquare size={12} style={{ color: ACCENT }} />
              Enquiry Message
            </div>
            <div
              style={{
                background: SURFACE_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                padding: "14px 16px",
                fontSize: "13.5px",
                color: TEXT_PRIMARY,
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {inquiry.message || "(No message body provided)"}
            </div>
          </div>

          {/* Section: Internal Notes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "6px" }}>
                <Lock size={12} style={{ color: "#f59e0b" }} />
                Internal Admin Notes
              </div>
              <div style={{ fontSize: "11px" }}>
                {savingNotes ? (
                  <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> Saving…
                  </span>
                ) : notesSaved ? (
                  <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CheckCircle2 size={12} /> Saved
                  </span>
                ) : (
                  <span style={{ color: "#64748b" }}>Admin only</span>
                )}
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add confidential internal notes, client follow-up remarks, or next action items (visible only to administrators)…"
              rows={4}
              style={{
                width: "100%",
                background: SURFACE,
                border: `1px solid ${WARNING_BORDER_STRONG}40`,
                borderRadius: RADIUS_MD,
                padding: "12px 14px",
                fontSize: "13px",
                color: TEXT_PRIMARY,
                fontFamily: "inherit",
                lineHeight: "1.6",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = WARNING_BORDER_STRONG;
                e.target.style.boxShadow = `0 0 0 3px ${WARNING_BG}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = `${WARNING_BORDER_STRONG}40`;
                e.target.style.boxShadow = "none";
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => saveNotesNow(notes)}
                disabled={savingNotes}
                style={{
                  padding: "6px 14px",
                  borderRadius: RADIUS_MD,
                  border: `1px solid ${WARNING_BORDER_STRONG}`,
                  background: WARNING_BG,
                  color: WARNING_DARK,
                  fontSize: "11.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <StickyNote size={12} />
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ icon: Icon, label, value, fullWidth }) {
  if (!value) return null;
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <div style={{ fontSize: "10.5px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
        <Icon size={11} style={{ color: ACCENT }} />
        {label}
      </div>
      <div style={{ fontSize: "13px", fontWeight: "500", color: TEXT_PRIMARY, wordBreak: "break-word" }}>
        {value}
      </div>
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
      tabIndex={0}
      role="button"
      className="inquiry-row"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      style={{
        borderBottom: isLast ? "none" : `1px solid ${BORDER}`,
        background: selected
          ? SURFACE_HOVER
          : hovered
          ? "#F8FAFC"
          : SURFACE,
        cursor: "pointer",
        transition: "all 0.15s ease",
        borderLeft: selected ? `3px solid ${ACCENT}` : "3px solid transparent",
        outline: "none",
      }}
    >
      {/* Primary info */}
      <div style={{ minWidth: 0 }}>
        {/* Mobile Top Row (Name + Status Badge on mobile) */}
        <div className="inquiry-row-top" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "3px" }}>
          {/* Name */}
          <div
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {inquiry.name || "(No name)"}
            {inquiry.status === "new" && (
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#38bdf8",
                  boxShadow: "0 0 8px #38bdf8",
                  display: "inline-block",
                  flexShrink: 0,
                }}
                title="New unread enquiry"
              />
            )}
          </div>

          {/* Status Badge in mobile top row */}
          <div className="inquiry-row-mobile-badge" style={{ display: "none" }}>
            <StatusBadge status={inquiry.status || "new"} />
          </div>
        </div>

        {/* Company & Email */}
        <div
          style={{
            fontSize: "12px",
            color: TEXT_MUTED,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {inquiry.company ? (
            <>
              <span style={{ color: ACCENT, fontWeight: "600" }}>{inquiry.company}</span>
              <span style={{ color: TEXT_DISABLED }}>·</span>
            </>
          ) : null}
          <span>{inquiry.email}</span>
        </div>

        {/* Service of Interest */}
        {inquiry.service_of_interest && (
          <div
            style={{
              fontSize: "11.5px",
              color: ACCENT,
              marginTop: "4px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontWeight: "500",
            }}
          >
            <Briefcase size={10} style={{ color: ACCENT }} />
            {inquiry.service_of_interest}
          </div>
        )}

        {/* Mobile Metadata (Source & Date) */}
        <div className="inquiry-row-mobile-meta">
          <span>{SOURCE_LABELS[inquiry.source] || inquiry.source || "Contact Form"}</span>
          <span>·</span>
          <span>{relTime(inquiry.created_at)}</span>
        </div>
      </div>

      {/* Source (Desktop) */}
      <div className="inquiry-row-source" style={{ fontSize: "11.5px", color: TEXT_MUTED, whiteSpace: "nowrap", flexShrink: 0 }}>
        <span
          style={{
            background: SURFACE_ALT,
            border: `1px solid ${BORDER}`,
            padding: "3px 8px",
            borderRadius: "4px",
          }}
        >
          {SOURCE_LABELS[inquiry.source] || inquiry.source || "—"}
        </span>
      </div>

      {/* Status badge (Desktop) */}
      <div className="inquiry-row-desktop-badge">
        <StatusBadge status={inquiry.status || "new"} />
      </div>

      {/* Received Date (Desktop) */}
      <div className="inquiry-row-date" style={{ fontSize: "11.5px", color: TEXT_MUTED, whiteSpace: "nowrap", textAlign: "right" }}>
        {relTime(inquiry.created_at)}
      </div>

      {/* Chevron (Desktop) */}
      <div className="inquiry-row-chevron" style={{ display: "flex", justifyContent: "flex-end" }}>
        <ChevronRight
          size={16}
          style={{
            color: isActive ? "#38bdf8" : "#475569",
            transition: "color 0.15s, transform 0.15s",
            transform: isActive ? "translateX(2px)" : "none",
          }}
        />
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const exportMenuRef = useRef(null);

  // Close export menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            limit: 200,
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

      setStats(statsData);
      setInquiries(items);
      setLastRefresh(new Date());
    } catch (_) {
      // Handled cleanly
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter]);

  // Initial load
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);

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
    // If filtering by a specific status, re-filter
    if (statusFilter) loadAll({ status: statusFilter, q: search });
    showToast(`Status updated to ${STATUS_CONFIG[updatedDoc.status]?.label || updatedDoc.status}`);
  };

  const handleNotesChange = (updatedDoc) => {
    setInquiries((prev) => prev.map((i) => (i.id === updatedDoc.id ? updatedDoc : i)));
    if (selectedInquiry?.id === updatedDoc.id) setSelectedInquiry(updatedDoc);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const generateClientCsv = (records, filename) => {
    const headers = [
      "ID",
      "Received Date (UTC)",
      "Status",
      "Name",
      "Email",
      "Phone",
      "Company",
      "Designation",
      "Service of Interest",
      "Source",
      "Message",
      "Internal Notes",
      "Last Updated",
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map((d) => [
      escapeCsv(d.id || ""),
      escapeCsv(d.created_at || ""),
      escapeCsv((d.status || "new").toUpperCase()),
      escapeCsv(d.name || ""),
      escapeCsv(d.email || ""),
      escapeCsv(d.phone || ""),
      escapeCsv(d.company || ""),
      escapeCsv(d.designation || ""),
      escapeCsv(d.service_of_interest || d.service || "General Inquiry"),
      escapeCsv(d.source || "website_contact"),
      escapeCsv(d.message || ""),
      escapeCsv(d.notes || ""),
      escapeCsv(d.status_updated_at || ""),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async (format, mode) => {
    setExporting(true);
    setShowExportMenu(false);
    const nowStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    try {
      const params = { format };
      if (mode === "current") {
        if (statusFilter) params.status = statusFilter;
        if (search && search.trim()) params.q = search.trim();
      }

      const response = await api.get("/api/admin/inquiries/export", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv;charset=utf-8;",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `psa_enquiries_${mode}_${nowStr}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${mode === "current" ? "current results" : "all enquiries"} (.${format.toUpperCase()})`);
    } catch (err) {
      console.warn("Backend export endpoint unavailable or pending deployment, activating client-side fallback:", err);
      try {
        let exportRecords = inquiries;
        if (mode === "all") {
          try {
            const allRes = await api.get("/api/admin/inquiries", { params: { limit: 1000 } });
            if (allRes.data && Array.isArray(allRes.data)) {
              exportRecords = allRes.data;
            }
          } catch (_) {
            // fallback to currently loaded inquiries
          }
        }
        generateClientCsv(exportRecords, `psa_enquiries_${mode}_${nowStr}.csv`);
        showToast(`Exported ${mode === "current" ? "current results" : "all enquiries"} (.CSV fallback)`);
      } catch (fallbackErr) {
        showToast("Export failed. Please check your network connection.");
      }
    } finally {
      setExporting(false);
    }
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
              marginBottom: "10px",
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: "6px",
              padding: "4px 11px",
            }}
          >
            <Inbox size={12} style={{ color: ACCENT }} />
            <span style={{ fontSize: "11px", color: ACCENT, fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Inquiries Center
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
            Website Enquiries
          </h1>
          <p style={{ fontSize: "12.5px", color: TEXT_MUTED, marginTop: "4px", marginBottom: 0 }}>
            Manage, respond to, and track inbound business enquiries from the PSA website contact form.
          </p>
        </div>

        {/* Top Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Refresh */}
          <button
            type="button"
            onClick={() => loadAll({ refresh: true, status: statusFilter, q: search })}
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
              e.currentTarget.style.color = TEXT_SECONDARY;
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {lastRefresh ? `Updated ${relTime(lastRefresh)}` : "Refresh"}
          </button>

          {/* Export Dropdown */}
          <div style={{ position: "relative" }} ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setShowExportMenu((prev) => !prev)}
              disabled={exporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "8px 14px",
                background: ACCENT_BG,
                border: `1px solid ${ACCENT_BORDER}`,
                borderRadius: "7px",
                cursor: exporting ? "default" : "pointer",
                color: ACCENT,
                fontSize: "12px",
                fontWeight: "600",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!exporting) {
                  e.currentTarget.style.background = `${ACCENT}18`;
                  e.currentTarget.style.borderColor = `${ACCENT}50`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = ACCENT_BG;
                e.currentTarget.style.borderColor = ACCENT_BORDER;
              }}
            >
              <Download size={13} />
              {exporting ? "Exporting…" : "Export"}
              <ChevronDown size={12} />
            </button>

            {showExportMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "6px",
                  width: "220px",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  boxShadow: SHADOW_MD,
                  zIndex: 40,
                  padding: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ padding: "6px 10px", fontSize: "10px", fontWeight: "700", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Current Filtered Results
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("xlsx", "current")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "5px",
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_ALT)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: SUCCESS_DARK, fontWeight: "700" }}>📊</span>
                  Export Current (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv", "current")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "5px",
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_ALT)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: ACCENT, fontWeight: "700" }}>📄</span>
                  Export Current (.csv)
                </button>

                <div style={{ height: "1px", background: BORDER, margin: "4px 0" }} />

                <div style={{ padding: "6px 10px", fontSize: "10px", fontWeight: "700", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  All Database Enquiries
                </div>
                <button
                  type="button"
                  onClick={() => handleExport("xlsx", "all")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "5px",
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_ALT)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: SUCCESS_DARK, fontWeight: "700" }}>📊</span>
                  Export All (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv", "all")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: "5px",
                    color: TEXT_SECONDARY,
                    fontSize: "12px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_ALT)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ color: ACCENT, fontWeight: "700" }}>📄</span>
                  Export All (.csv)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Status summary chips ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "18px" }}>
        <StatChip
          label="All"
          count={stats?.total ?? null}
          active={statusFilter === null}
          onClick={() => setStatusFilter(null)}
          color="#38bdf8"
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

      {/* ─── Search Bar ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "9px 14px",
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_LG,
          marginBottom: "16px",
          boxShadow: SHADOW_SM,
        }}
      >
        <Search size={16} style={{ color: ACCENT, flexShrink: 0 }} />
        <input
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Search by client name, email address, or company…"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "13px",
            color: TEXT_PRIMARY,
            fontFamily: "inherit",
          }}
        />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            style={{
              background: SURFACE_ALT,
              border: `1px solid ${BORDER}`,
              borderRadius: "50%",
              cursor: "pointer",
              color: TEXT_MUTED,
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ─── List panel ─── */}
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_LG,
          overflow: "hidden",
          boxShadow: SHADOW_SM,
        }}
      >
        {/* Panel header */}
        <div className="inquiry-table-header">
          <span style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {loading ? "Loading…" : `${inquiries.length} Enquir${inquiries.length === 1 ? "y" : "ies"}`}
          </span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em" }}>Source</span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</span>
          <span style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "right" }}>Received</span>
          <span />
        </div>

        {loading ? (
          <div style={{ padding: "50px", textAlign: "center", color: TEXT_MUTED, fontSize: "13px" }}>
            <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", color: ACCENT, margin: "0 auto 12px" }} />
            Loading website enquiries…
          </div>
        ) : inquiries.length === 0 ? (
          <div style={{ padding: "54px 20px", textAlign: "center" }}>
            <Inbox size={32} style={{ color: TEXT_DISABLED, margin: "0 auto 14px" }} />
            <div style={{ fontSize: "14px", fontWeight: "600", color: TEXT_PRIMARY, marginBottom: "4px" }}>
              {search || statusFilter ? "No matching enquiries found" : "No website enquiries yet"}
            </div>
            <div style={{ fontSize: "12px", color: TEXT_MUTED }}>
              {search || statusFilter
                ? "Try searching for a different name, email, or clear the active status filter."
                : "New client enquiries submitted through the contact form will appear here automatically."}
            </div>
            {(search || statusFilter) && (
              <button
                type="button"
                onClick={() => { clearSearch(); setStatusFilter(null); }}
                style={{
                  marginTop: "14px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: ACCENT,
                  background: ACCENT_BG,
                  border: `1px solid ${ACCENT_BORDER}`,
                  borderRadius: RADIUS_MD,
                  padding: "6px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Clear all filters
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

      {/* ─── Toast Feedback ─── */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: SURFACE,
            borderLeft: `4px solid ${ACCENT}`,
            border: `1px solid ${BORDER}`,
            boxShadow: SHADOW_MD,
            color: TEXT_PRIMARY,
            padding: "12px 18px",
            borderRadius: RADIUS_MD,
            fontSize: "13px",
            fontWeight: "500",
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            animation: "fadeInUp 0.2s ease-out",
          }}
        >
          <CheckCircle2 size={16} style={{ color: SUCCESS_DARK }} />
          {toastMessage}
        </div>
      )}

      {/* CSS Animations & Responsive Styles */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .inquiry-table-header {
          display: grid;
          grid-template-columns: 1fr 140px 110px 110px 24px;
          gap: 16px;
          padding: 12px 20px;
          border-bottom: 1px solid #DDE3EC;
          background: #F8FAFC;
        }

        .inquiry-row {
          display: grid;
          grid-template-columns: 1fr 140px 110px 110px 24px;
          gap: 16px;
          align-items: center;
          padding: 14px 20px;
        }

        .inquiry-row-mobile-meta {
          display: none;
        }

        @media (max-width: 768px) {
          .inquiry-table-header {
            display: none !important;
          }
          .inquiry-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            padding: 14px 16px !important;
          }
          .inquiry-row-source,
          .inquiry-row-desktop-badge,
          .inquiry-row-date,
          .inquiry-row-chevron {
            display: none !important;
          }
          .inquiry-row-mobile-badge {
            display: block !important;
          }
          .inquiry-row-mobile-meta {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            font-size: 11.5px !important;
            color: #6B8099 !important;
            margin-top: 5px !important;
          }
        }
      `}</style>

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

