/**
 * AdminInsights — Insights CMS
 *
 * Full editorial management for PSA Insights:
 * - List view with search, category and status filters (All, Published, Draft, Archived)
 * - Article Editor with Write / Preview modes, Table of Contents, cover image preview
 * - Status workflow: Draft → Published → Archived
 * - Live connection to /api/admin/insights with resilient fallback to static ARTICLES data
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  FileText,
  Search,
  Plus,
  X,
  ChevronRight,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  Tag,
  User,
  Calendar,
  AlertCircle,
  Archive,
  BookOpen,
  Send,
  Layers,
} from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import TocEditor from "../components/admin/TocEditor";
import { BACKEND_URL } from "../config";
import {
  SURFACE, SURFACE_ALT, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_DISABLED,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  SHADOW_SM, SHADOW_MD, RADIUS_MD, RADIUS_LG,
  BTN_SECONDARY_STYLE,
} from "../utils/adminTheme";
import { CATEGORIES } from "../data/site";

const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

const STATUS_CONFIG = {
  published: { label: "Published", color: "#22c55e", bg: "rgba(34,197,94,0.12)", dot: "#22c55e" },
  draft:     { label: "Draft",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  dot: "#f59e0b" },
  archived:  { label: "Archived",  color: "#64748b", bg: "rgba(100,116,139,0.1)", dot: "#64748b" },
};

const STATUS_ORDER = ["published", "draft", "archived"];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
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
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = BORDER;
          e.currentTarget.style.color = TEXT_SECONDARY;
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

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ─────────────────────── Article Editor Modal ─────────────────────── */

function ArticleEditorModal({ article, onClose, onSave, onDelete }) {
  const isNew = !article?.id;
  const [formData, setFormData] = useState({
    title: article?.title || "",
    slug: article?.slug || "",
    category: article?.category || "Audit & Assurance",
    excerpt: article?.excerpt || "",
    image: article?.image || "https://images.unsplash.com/photo-1762427354051-a9bdb181ae3b?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
    date: article?.date || new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    read_time: article?.read_time || article?.readTime || "8 min read",
    author: article?.author || "CA Prem Suman",
    body: article?.body || "",
    toc: article?.toc || [],
    status: article?.status || "published",
  });

  const [activeTab, setActiveTab] = useState("write"); // write | preview
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSlug, setAutoSlug] = useState(isNew);

  const handleTitleChange = (val) => {
    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: autoSlug ? slugify(val) : prev.slug,
    }));
  };

  const handleSave = async (targetStatus) => {
    setError("");
    if (!formData.title.trim()) {
      setError("Please provide an article title.");
      return;
    }
    if (!formData.excerpt.trim()) {
      setError("Please provide a brief excerpt/summary.");
      return;
    }

    const payload = {
      ...formData,
      toc: formData.toc || [],
      status: targetStatus || formData.status,
      slug: formData.slug.trim() || slugify(formData.title),
    };

    setSaving(true);
    try {
      let savedDoc;
      if (isNew) {
        const res = await api.post("/api/admin/insights", payload);
        savedDoc = res.data;
      } else {
        const res = await api.put(`/api/admin/insights/${article.id}`, payload);
        savedDoc = res.data;
      }
      onSave(savedDoc);
      onClose();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Failed to save insight to the database. Please verify your connection or session."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,37,64,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "32px 16px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_LG,
          width: "min(960px, 98vw)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: SHADOW_MD,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: `1px solid ${BORDER}`,
            background: SURFACE_ALT,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: ACCENT_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={14} style={{ color: ACCENT }} />
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                {isNew ? "Create New Insight" : "Edit Insight Article"}
              </h2>
              <span style={{ fontSize: "11px", color: TEXT_MUTED }}>
                {formData.slug ? `/insights/${formData.slug}` : "Draft article"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {!isNew && formData.status === "published" && (
              <a
                href={`/insights/${formData.slug}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: ACCENT,
                  textDecoration: "none",
                  padding: "5px 9px",
                  borderRadius: "5px",
                  border: `1px solid ${ACCENT_BORDER}`,
                  background: ACCENT_BG,
                }}
              >
                View Public <ExternalLink size={11} />
              </a>
            )}

            <button
              onClick={onClose}
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                cursor: "pointer",
                color: TEXT_MUTED,
                padding: "6px",
                borderRadius: RADIUS_MD,
                display: "flex",
                alignItems: "center",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = TEXT_PRIMARY; e.currentTarget.style.background = SURFACE_ALT; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = TEXT_MUTED; e.currentTarget.style.background = SURFACE; }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "24px", overflowY: "auto" }}>
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "6px",
                color: "#f87171",
                fontSize: "12px",
                marginBottom: "20px",
              }}
            >
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "16px", marginBottom: "20px" }}>
            {/* Title */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Title *
              </label>
              <input
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. Internal Controls in the Age of Rapid Automotive Expansion"
                style={{
                  width: "100%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "13.5px",
                  color: TEXT_PRIMARY,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Slug */}
            <div>
              <label style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                <span>Slug / URL Path</span>
                <span
                  onClick={() => setAutoSlug(!autoSlug)}
                  style={{ cursor: "pointer", color: autoSlug ? ACCENT : TEXT_SECONDARY, textTransform: "none", fontWeight: "400" }}
                >
                  {autoSlug ? "Auto-sync ON" : "Custom"}
                </span>
              </label>
              <input
                value={formData.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder="url-friendly-slug"
                style={{
                  width: "100%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: TEXT_SECONDARY,
                  fontFamily: "monospace",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Category */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: "100%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: TEXT_PRIMARY,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              >
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Author */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Author
              </label>
              <input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="CA Prem Suman"
                style={{
                  width: "100%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: TEXT_PRIMARY,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Read Time & Date */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Publication Date & Read Time
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <input
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="March 2026"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                <input
                  value={formData.read_time}
                  onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                  placeholder="8 min read"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "6px",
                    padding: "8px 10px",
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Excerpt */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Excerpt / Summary *
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                rows={2}
                placeholder="A compelling executive overview of the article…"
                style={{
                  width: "100%",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "12.5px",
                  color: TEXT_PRIMARY,
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Image URL & Thumbnail Preview */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                Cover Image URL
              </label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  style={{
                    flex: 1,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    color: TEXT_SECONDARY,
                    fontFamily: "inherit",
                    outline: "none",
                  }}
                />
                {formData.image && (
                  <img
                    src={formData.image}
                    alt="Preview"
                    style={{
                      width: "64px",
                      height: "40px",
                      objectFit: "cover",
                      borderRadius: "4px",
                      border: `1px solid ${BORDER}`,
                    }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Article Body Editor with Tabs */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: "600", color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Article Body (HTML / Formatted Content)
              </label>

              <div style={{ display: "flex", gap: "4px", background: SURFACE_ALT, padding: "2px", borderRadius: "5px" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("write")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "write" ? ACCENT : "transparent",
                    color: activeTab === "write" ? "#fff" : TEXT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    border: "none",
                    background: activeTab === "preview" ? ACCENT : "transparent",
                    color: activeTab === "preview" ? "#fff" : TEXT_SECONDARY,
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {activeTab === "write" ? (
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={14}
                placeholder="<h2 id='intro'>Introduction</h2>\n<p>Your editorial article content here...</p>"
                style={{
                  width: "100%",
                  background: "#f8fafc",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  padding: "14px",
                  fontSize: "13px",
                  color: "#1e293b",
                  fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
                  lineHeight: "1.6",
                  outline: "none",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            ) : (
              <div
                style={{
                  background: "#fff",
                  color: "#0a1118",
                  padding: "24px 32px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "8px",
                  maxHeight: "360px",
                  overflowY: "auto",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <div
                  className="article-body-preview"
                  dangerouslySetInnerHTML={{ __html: formData.body || "<p style='color:#94a3b8'>No content written yet.</p>" }}
                />
              </div>
            )}

            {/* Table of Contents Section */}
            <TocEditor
              toc={formData.toc || []}
              onChange={(newToc) => setFormData((prev) => ({ ...prev, toc: newToc }))}
              body={formData.body}
              onUpdateBody={(newBody) => setFormData((prev) => ({ ...prev, body: newBody }))}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: `1px solid ${BORDER}`,
            background: SURFACE_ALT,
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            {!isNew && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this article?")) {
                    onDelete(article.id);
                    onClose();
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "1px solid rgba(239,68,68,0.2)",
                  background: "rgba(239,68,68,0.06)",
                  color: "#f87171",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} /> Delete Article
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: `1px solid ${BORDER}`,
                background: SURFACE,
                color: TEXT_SECONDARY,
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("draft")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #fbbf24",
                background: "rgba(251,191,36,0.1)",
                color: "#b45309",
                fontSize: "12px",
                fontWeight: "600",
                cursor: saving ? "default" : "pointer",
              }}
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("published")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                background: ACCENT,
                color: "#fff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: saving ? "default" : "pointer",
              }}
            >
              <Send size={13} />
              {saving ? "Publishing…" : "Publish Live"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function AdminInsights() {
  const [insights, setInsights] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [editingArticle, setEditingArticle] = useState(null); // null | object (empty for new)
  const [lastRefresh, setLastRefresh] = useState(null);
  const searchTimer = useRef(null);

  const loadAll = useCallback(async (opts = {}) => {
    if (opts.refresh) setRefreshing(true);
    try {
      const targetQ = opts.q !== undefined ? opts.q : search;
      const targetStatus = opts.status !== undefined ? opts.status : statusFilter;
      const targetCategory = opts.category !== undefined ? opts.category : categoryFilter;

      const [statsRes, listRes] = await Promise.allSettled([
        api.get("/api/admin/insights/stats"),
        api.get("/api/admin/insights", {
          params: {
            q: targetQ,
            status: targetStatus !== "all" ? targetStatus : undefined,
            category: targetCategory !== "All" ? targetCategory : undefined,
            limit: 100,
          },
        }),
      ]);

      if (listRes.status === "fulfilled" && Array.isArray(listRes.value.data)) {
        setInsights(listRes.value.data);
      } else {
        setInsights([]);
      }
      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
      setLastRefresh(new Date());
    } catch (_) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, categoryFilter]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadAll();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!loading) loadAll({ status: statusFilter, category: categoryFilter, q: search });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      loadAll({ q: val, status: statusFilter, category: categoryFilter });
    }, 300);
  };

  const handleSaveArticle = (savedDoc) => {
    setInsights((prev) => {
      const exists = prev.some((item) => item.id === savedDoc.id || item.slug === savedDoc.slug);
      if (exists) {
        return prev.map((item) =>
          item.id === savedDoc.id || item.slug === savedDoc.slug ? savedDoc : item
        );
      }
      return [savedDoc, ...prev];
    });
    // Refresh list
    loadAll({ q: search, status: statusFilter, category: categoryFilter });
  };

  const handleDeleteArticle = async (id) => {
    try {
      await api.delete(`/api/admin/insights/${id}`);
      setInsights((prev) => prev.filter((i) => i.id !== id));
      loadAll({ q: search, status: statusFilter, category: categoryFilter });
    } catch (err) {
      alert("Failed to delete insight: " + (err?.response?.data?.detail || err.message));
    }
  };

  const handleQuickStatusToggle = async (insight) => {
    const nextStatus = insight.status === "published" ? "draft" : "published";
    try {
      const res = await api.patch(`/api/admin/insights/${insight.id}/status`, { status: nextStatus });
      handleSaveArticle(res.data);
    } catch (err) {
      alert("Failed to update status: " + (err?.response?.data?.detail || err.message));
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
              marginBottom: "8px",
              background: ACCENT_BG,
              border: `1px solid ${ACCENT_BORDER}`,
              borderRadius: "6px",
              padding: "3px 10px",
            }}
          >
            <BookOpen size={11} style={{ color: ACCENT }} />
            <span style={{ fontSize: "10px", color: ACCENT, fontWeight: "500", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Insights CMS
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
            Editorial Insights Management
          </h1>
          <p style={{ fontSize: "12.5px", color: TEXT_MUTED, marginTop: "4px", marginBottom: 0 }}>
            Publish and curate thought leadership articles for India&apos;s senior finance leaders.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => loadAll({ refresh: true })}
            disabled={refreshing}
            style={{ ...BTN_SECONDARY_STYLE, opacity: refreshing ? 0.6 : 1, cursor: refreshing ? "default" : "pointer" }}
            onMouseEnter={(e) => { if (!refreshing) { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = ACCENT; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = TEXT_SECONDARY; }}
          >
            <RefreshCw size={12} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            {lastRefresh ? "Refresh" : "Reload"}
          </button>

          <button
            onClick={() => setEditingArticle({})}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
              border: "none",
              borderRadius: "7px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(14,165,233,0.3)",
            }}
          >
            <Plus size={14} /> New Insight
          </button>
        </div>
      </div>

      {/* ─── Status summary chips ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginBottom: "18px" }}>
        <StatChip
          label="All Articles"
          count={stats?.total ?? null}
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
          color="#0ea5e9"
        />
        <StatChip
          label="Published"
          count={stats?.published_count ?? null}
          active={statusFilter === "published"}
          onClick={() => setStatusFilter(statusFilter === "published" ? "all" : "published")}
          color={STATUS_CONFIG.published.color}
        />
        <StatChip
          label="Drafts"
          count={stats?.draft_count ?? null}
          active={statusFilter === "draft"}
          onClick={() => setStatusFilter(statusFilter === "draft" ? "all" : "draft")}
          color={STATUS_CONFIG.draft.color}
        />
        <StatChip
          label="Archived"
          count={stats?.archived_count ?? null}
          active={statusFilter === "archived"}
          onClick={() => setStatusFilter(statusFilter === "archived" ? "all" : "archived")}
          color={STATUS_CONFIG.archived.color}
        />
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: "240px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "8px 14px",
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_MD,
            boxShadow: SHADOW_SM,
          }}
        >
          <Search size={14} style={{ color: ACCENT, flexShrink: 0 }} />
          <input
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search insights by title, summary, or author…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "12.5px",
              color: TEXT_PRIMARY,
              fontFamily: "inherit",
            }}
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearch("");
                loadAll({ q: "" });
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category selector */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_MD,
            padding: "8px 12px",
            fontSize: "12px",
            color: TEXT_SECONDARY,
            fontFamily: "inherit",
            outline: "none",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Articles List Table ─── */}
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_LG,
          overflowX: "auto",
          boxShadow: SHADOW_SM,
        }}
      >
        {/* Table Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 140px 100px 120px 100px",
            gap: "16px",
            padding: "12px 18px",
            borderBottom: `1px solid ${BORDER}`,
            fontSize: "10px",
            fontWeight: "600",
            color: TEXT_SECONDARY,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            minWidth: "700px",
            background: SURFACE_ALT,
          }}
        >
          <span>Cover</span>
          <span>Article</span>
          <span>Category</span>
          <span>Status</span>
          <span>Date</span>
          <span style={{ textAlign: "right" }}>Actions</span>
        </div>

        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: TEXT_MUTED, fontSize: "12px", minWidth: "700px" }}>
            Loading editorial insights…
          </div>
        ) : insights.length === 0 ? (
          <div style={{ padding: "54px", textAlign: "center", minWidth: "700px" }}>
            <BookOpen size={30} style={{ color: TEXT_DISABLED, margin: "0 auto 12px" }} />
            <div style={{ fontSize: "13px", color: TEXT_MUTED }}>
              {search || statusFilter !== "all" || categoryFilter !== "All"
                ? "No articles match the selected filters."
                : "No insights found. Click '+ New Insight' to publish your first piece."}
            </div>
          </div>
        ) : (
          insights.map((item, idx) => (
            <div
              key={item.id || item.slug || idx}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 140px 100px 120px 100px",
                gap: "16px",
                alignItems: "center",
                padding: "13px 18px",
                borderBottom: idx === insights.length - 1 ? "none" : `1px solid ${BORDER}`,
                background: "transparent",
                transition: "background 0.12s",
                minWidth: "700px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = SURFACE_ALT)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: "52px",
                  height: "34px",
                  borderRadius: "4px",
                  overflow: "hidden",
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <ImageIcon size={14} style={{ color: "#334155" }} />
                  </div>
                )}
              </div>

              {/* Title & Excerpt */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: TEXT_PRIMARY,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: "3px",
                  }}
                >
                  {item.title}
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
                  {item.excerpt}
                </div>
              </div>

              {/* Category */}
              <div style={{ fontSize: "11px", color: ACCENT, whiteSpace: "nowrap", fontWeight: "500" }}>
                {item.category}
              </div>

              {/* Status */}
              <div>
                <StatusBadge status={item.status || "published"} />
              </div>

              {/* Date */}
              <div style={{ fontSize: "11px", color: TEXT_MUTED, whiteSpace: "nowrap" }}>
                {item.date || "—"}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                <button
                  onClick={() => setEditingArticle(item)}
                  title="Edit article"
                  style={{
                    background: ACCENT_BG,
                    border: `1px solid ${ACCENT_BORDER}`,
                    borderRadius: "5px",
                    padding: "5px 7px",
                    color: ACCENT,
                    cursor: "pointer",
                  }}
                >
                  <Edit3 size={12} />
                </button>

                <a
                  href={`/insights/${item.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="View live"
                  style={{
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "5px",
                    padding: "5px 7px",
                    color: TEXT_MUTED,
                    display: "inline-flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <Eye size={12} />
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Editor Modal */}
      {editingArticle && (
        <ArticleEditorModal
          article={editingArticle}
          onClose={() => setEditingArticle(null)}
          onSave={handleSaveArticle}
          onDelete={handleDeleteArticle}
        />
      )}

      {/* Keyframe spin */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
