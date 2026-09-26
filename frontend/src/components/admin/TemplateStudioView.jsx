/**
 * TemplateStudioView.jsx
 *
 * A beautifully revamped Template Studio that makes browsing, creating,
 * and editing corporate email templates effortless and delightful.
 *
 * Provides two clear views:
 * 1. Library Gallery: Clean cards with search, category filtering, and 1-click theme variations.
 * 2. Focused Studio Workspace: Distraction-free editor with live real-time split preview,
 *    safe drafting, 1-click publishing, and version history.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  FileText,
  Search,
  Plus,
  Copy,
  RotateCcw,
  Archive,
  Save,
  CheckCircle2,
  Send,
  Eye,
  Code,
  Sparkles,
  Paperclip,
  UploadCloud,
  Trash2,
  Download,
  Sliders,
  HelpCircle,
  Monitor,
  Smartphone,
  ArrowLeft,
  Clock,
  Shield,
  X,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import {
  SURFACE,
  SURFACE_ALT,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  ACCENT,
  RADIUS_MD,
  RADIUS_LG,
  SHADOW_SM,
  SHADOW_MD,
  BTN_PRIMARY_STYLE,
  BTN_SECONDARY_STYLE,
  BTN_SUCCESS_STYLE,
} from "../../utils/adminTheme";

export default function TemplateStudioView({
  backendUrl,
  templates = [],
  onTemplatesRefresh,
  onCreateNewClick,
  testRecipient = "",
  showToast,
}) {
  // Navigation: 'gallery' | 'editor'
  const [currentView, setCurrentView] = useState("gallery");
  const [activeTemplateId, setActiveTemplateId] = useState("");

  // Search & category filtering in gallery
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Editor fields
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [applyWrapper, setApplyWrapper] = useState(true);
  const [senderName, setSenderName] = useState("P Suman & Associates");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);

  // Editor mode & preview settings
  const [editorMode, setEditorMode] = useState("preview"); // 'preview' | 'code'
  const [previewDevice, setPreviewDevice] = useState("desktop"); // 'desktop' | 'mobile'
  const [showDeliverySettings, setShowDeliverySettings] = useState(false);
  const [approvedSenders, setApprovedSenders] = useState([]);

  // Live preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAbortRef = useRef(null);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Version history state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Action states
  const [savingAction, setSavingAction] = useState(false);
  const [testSending, setTestSending] = useState(false);

  // Active template object
  const activeTemplate = templates.find((t) => t.template_id === activeTemplateId);

  // Categories list for filter pills
  const categories = [
    { id: "all", label: "All Templates" },
    { id: "announcement", label: "📢 Announcements" },
    { id: "advisory", label: "📊 Advisory" },
    { id: "greeting", label: "🎉 Festive" },
    { id: "newsletter", label: "📰 Newsletters" },
    { id: "transactional", label: "⚙️ System Autoresponders" },
  ];

  // Fetch approved senders
  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/communication/templates/senders/approved`, {
          withCredentials: true,
        });
        setApprovedSenders(res.data || []);
      } catch (_) {}
    };
    fetchSenders();
  }, [backendUrl]);

  // Fetch existing uploaded attachments on mount
  const fetchAttachments = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/attachments`, {
        withCredentials: true,
      });
      if (res.data?.attachments) {
        setAttachments(res.data.attachments);
      }
    } catch (_) {}
  }, [backendUrl]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  // Attachment upload & insertion
  const handleAttachmentUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError("");
    setUploadingAttachment(true);

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds 25MB limit.`);
        continue;
      }
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axios.post(
          `${backendUrl}/api/admin/attachments/upload`,
          formData,
          {
            withCredentials: true,
          }
        );
        if (res.data?.attachment) {
          const att = res.data.attachment;
          setAttachments((prev) => [att, ...prev.filter((a) => a.attachment_id !== att.attachment_id)]);
          showToast(`Uploaded: ${att.filename} to Cloudflare R2`, "success");
        } else if (res.data?.filename) {
          setAttachments((prev) => [res.data, ...prev]);
          showToast(`Uploaded: ${res.data.filename}`, "success");
        }
      } catch (err) {
        const msg = err.response?.data?.detail || `Failed to upload ${file.name}`;
        setUploadError(msg);
        showToast(msg, "error");
      }
    }
    setUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleInsertDownloadButton = (att) => {
    const buttonHtml = `
<div style="margin: 24px 0; text-align: center;">
  <a href="${att.download_url}" target="_blank" style="background-color: #0EA5E9; color: #FFFFFF; font-family: sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
    📥 Download ${att.filename}
  </a>
</div>`;
    setBodyHtml((prev) => prev + "\n" + buttonHtml);
    showToast(`Download button inserted for ${att.filename}!`, "success");
  };

  const handleRemoveAttachment = async (attId) => {
    try {
      await axios.delete(`${backendUrl}/api/admin/attachments/${attId}`, {
        withCredentials: true,
      });
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attId));
      showToast("Attachment removed.", "info");
    } catch (_) {
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attId));
    }
  };

  // Load template into editor
  const handleOpenTemplate = (template) => {
    setActiveTemplateId(template.template_id);
    setSubject(template.draft_subject || template.published_subject || "");
    setPreheader(template.draft_preheader || template.published_preheader || "");
    setBodyHtml(template.draft_body_html || template.published_body_html || "");
    setApplyWrapper(template.apply_wrapper ?? true);
    setSenderName(template.sender_name || "P Suman & Associates");
    setSenderEmail(template.sender_email || "");
    setReplyTo(template.reply_to || "");
    setCc(template.cc || []);
    setBcc(template.bcc || []);
    setCurrentView("editor");
  };

  // Live preview fetcher
  const fetchLivePreview = useCallback(async () => {
    if (!bodyHtml) {
      setPreviewData(null);
      return;
    }
    if (previewAbortRef.current) previewAbortRef.current.abort();
    previewAbortRef.current = new AbortController();
    setPreviewLoading(true);

    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/preview`,
        {
          subject: subject || "Sample Subject Line",
          preheader: preheader || "",
          body_html: bodyHtml,
          apply_wrapper: applyWrapper,
          sender_name: senderName || "P Suman & Associates",
          sender_email: senderEmail || "updates@updates.psumanassociates.com",
          reply_to: replyTo || "updates@updates.psumanassociates.com",
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          recipient_name: "Valued Client",
          recipient_company: "Bharat Financial Corp",
          recipient_email: testRecipient || "client@example.com",
        },
        {
          withCredentials: true,
          signal: previewAbortRef.current.signal,
        }
      );
      setPreviewData(res.data);
    } catch (err) {
      if (!axios.isCancel(err) && err.name !== "CanceledError") {
        console.error("Live preview error:", err);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [backendUrl, subject, preheader, bodyHtml, applyWrapper, senderName, senderEmail, replyTo, cc, bcc, testRecipient]);

  useEffect(() => {
    if (currentView === "editor") {
      const timer = setTimeout(fetchLivePreview, 400);
      return () => {
        clearTimeout(timer);
        if (previewAbortRef.current) previewAbortRef.current.abort();
      };
    }
  }, [fetchLivePreview, currentView]);

  // Save Draft
  const handleSaveDraft = async () => {
    if (!activeTemplateId) return;
    setSavingAction(true);
    try {
      await axios.put(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}`,
        {
          subject,
          preheader,
          body_html: bodyHtml,
          apply_wrapper: applyWrapper,
          sender_name: senderName,
          sender_email: senderEmail || null,
          reply_to: replyTo || null,
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          publish_immediately: false,
        },
        { withCredentials: true }
      );
      showToast("Draft saved successfully!", "success");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to save draft.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Publish to Live
  const handlePublishLive = async () => {
    if (!activeTemplateId) return;
    if (!subject.trim() || !bodyHtml.trim()) {
      showToast("Subject and message content are required before publishing.", "error");
      return;
    }

    if (activeTemplate?.is_system_template) {
      if (!window.confirm("Notice: This is an automated system template. Publishing will affect future automated client emails immediately. Proceed?")) {
        return;
      }
    }

    setSavingAction(true);
    try {
      // Save draft first
      await axios.put(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}`,
        {
          subject,
          preheader,
          body_html: bodyHtml,
          apply_wrapper: applyWrapper,
          sender_name: senderName,
          sender_email: senderEmail || null,
          reply_to: replyTo || null,
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          publish_immediately: false,
        },
        { withCredentials: true }
      );

      // Trigger publish
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}/publish`,
        {},
        { withCredentials: true }
      );
      showToast(`Template published live as Version ${res.data.version}!`, "success");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to publish template.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = async () => {
    if (!activeTemplateId) return;
    if (!window.confirm("Discard all pending draft edits and revert to published version?")) return;
    setSavingAction(true);
    try {
      const res = await axios.delete(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}/draft`,
        { withCredentials: true }
      );
      showToast("Draft edits discarded. Reverted to published content.", "info");
      setSubject(res.data.published_subject || "");
      setPreheader(res.data.published_preheader || "");
      setBodyHtml(res.data.published_body_html || "");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to discard draft.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!subject || !bodyHtml) {
      showToast("Please enter a subject and body content before testing.", "error");
      return;
    }
    if (!testRecipient) {
      showToast("Please set a test recipient email address in Campaigns first.", "error");
      return;
    }
    setTestSending(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/campaigns/test-send`,
        {
          recipient_email: testRecipient,
          subject,
          preheader,
          body_html: bodyHtml,
          apply_wrapper: applyWrapper,
          sender_name: senderName,
          sender_email: senderEmail || null,
          reply_to: replyTo || null,
          cc,
          bcc,
          template_id: activeTemplateId,
          is_draft: true,
        },
        { withCredentials: true }
      );
      showToast(res.data.message || `Test email dispatched to ${testRecipient}!`, "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to send test email.", "error");
    } finally {
      setTestSending(false);
    }
  };

  // Open Version History
  const handleOpenHistory = async () => {
    if (!activeTemplateId) return;
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}/versions`,
        { withCredentials: true }
      );
      setHistoryList(res.data || []);
    } catch (err) {
      showToast("Failed to load version history.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Restore Version
  const handleRestoreVersion = async (versionId) => {
    setSavingAction(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}/restore`,
        { version_id: versionId },
        { withCredentials: true }
      );
      showToast(`Restored version into active draft!`, "success");
      setSubject(res.data.draft_subject || res.data.published_subject || "");
      setPreheader(res.data.draft_preheader || res.data.published_preheader || "");
      setBodyHtml(res.data.draft_body_html || res.data.published_body_html || "");
      setShowHistoryModal(false);
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to restore version.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Duplicate Template
  const handleDuplicate = async (templateId) => {
    setSavingAction(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${templateId}/duplicate`,
        {},
        { withCredentials: true }
      );
      showToast(`Duplicated as "${res.data.name}".`, "success");
      if (onTemplatesRefresh) await onTemplatesRefresh();
      handleOpenTemplate(res.data);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to duplicate template.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async (template) => {
    const isArchived = template.is_archived;
    const action = isArchived ? "unarchive" : "archive";
    setSavingAction(true);
    try {
      await axios.post(
        `${backendUrl}/api/admin/communication/templates/${template.template_id}/${action}`,
        {},
        { withCredentials: true }
      );
      showToast(`Template ${isArchived ? "restored" : "archived"}.`, "info");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || `Failed to ${action} template.`, "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Apply curated theme
  const handleApplyCuratedTheme = async (occasionName) => {
    if (!activeTemplateId) return;
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/templates/${activeTemplateId}/curated-variation?occasion=${encodeURIComponent(occasionName)}`,
        { withCredentials: true }
      );
      if (res.data) {
        setSubject(res.data.subject);
        setPreheader(res.data.preheader);
        setBodyHtml(res.data.body_html);
        showToast(`Theme loaded: ${occasionName}!`, "success");
      }
    } catch (_) {
      setSubject(`${occasionName} Greetings — P Suman & Associates`);
      setPreheader(`Warm wishes on ${occasionName} from P Suman & Associates.`);
      showToast(`Applied theme for ${occasionName}`, "info");
    }
  };

  // Filter templates for gallery
  const filteredTemplates = templates.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (t.name || "").toLowerCase().includes(q);
    const subMatch = (t.subcategory || "").toLowerCase().includes(q);
    const catMatch = (t.category || "").toLowerCase().includes(q);

    if (q && !nameMatch && !subMatch && !catMatch) return false;
    if (selectedCategoryFilter !== "all" && t.category !== selectedCategoryFilter) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: TEMPLATE LIBRARY GALLERY
          ═══════════════════════════════════════════════════════════════ */}
      {currentView === "gallery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Header & Search Bar */}
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_LG,
              padding: "24px",
              boxShadow: SHADOW_SM,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Email Template Library
                </h2>
                <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: "4px 0 0" }}>
                  Browse, customize, and create branded email layouts for corporate updates, tax advisories, and greetings.
                </p>
              </div>

              <button
                type="button"
                onClick={onCreateNewClick}
                style={{
                  ...BTN_PRIMARY_STYLE,
                  padding: "10px 18px",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Plus size={16} /> Create New Template
              </button>
            </div>

            {/* Search Input & Category Filters */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: TEXT_MUTED,
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates by title, theme, or category..."
                  style={{
                    width: "100%",
                    padding: "10px 14px 10px 40px",
                    fontSize: "13px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    background: SURFACE_ALT,
                    outline: "none",
                  }}
                />
              </div>

              {/* Category Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {categories.map((cat) => {
                  const isActive = selectedCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat.id)}
                      style={{
                        padding: "6px 14px",
                        fontSize: "12px",
                        fontWeight: "600",
                        borderRadius: "20px",
                        border: isActive ? "1.5px solid #0EA5E9" : `1px solid ${BORDER}`,
                        background: isActive ? "rgba(14, 165, 233, 0.1)" : SURFACE,
                        color: isActive ? "#0284C7" : TEXT_SECONDARY,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Template Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredTemplates.map((t) => {
              const hasDraft = Boolean(t.has_pending_draft);
              const hasOccasions = Array.isArray(t.occasions) && t.occasions.length > 0;

              return (
                <div
                  key={t.template_id}
                  style={{
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_LG,
                    padding: "20px",
                    boxShadow: SHADOW_SM,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div>
                    {/* Top Row: Category Badge & Status */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span
                        style={{
                          fontSize: "10.5px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          color: "#0284C7",
                          background: "#E0F2FE",
                        }}
                      >
                        {t.category}
                      </span>

                      <div>
                        {hasDraft ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#D97706",
                              background: "#FEF3C7",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Clock size={11} /> Draft Pending
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#16A34A",
                              background: "#DCFCE7",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <CheckCircle2 size={11} /> Live v{t.version}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Subcategory */}
                    <h3 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: "0 0 6px" }}>
                      {t.name}
                    </h3>
                    {t.subcategory && (
                      <div style={{ fontSize: "12px", color: TEXT_MUTED, marginBottom: "8px" }}>
                        📁 {t.subcategory}
                      </div>
                    )}

                    {/* Curated Theme Variations */}
                    {hasOccasions && (
                      <div style={{ marginTop: "10px", padding: "10px", background: "#FEF3C7", borderRadius: RADIUS_MD, border: "1px solid #FDE68A" }}>
                        <div style={{ fontSize: "11px", fontWeight: "700", color: "#92400E", marginBottom: "6px" }}>
                          ✨ Curated Themes ({t.occasions.length}):
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {t.occasions.slice(0, 4).map((occ, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: "10.5px",
                                background: "#FFFFFF",
                                color: "#78350F",
                                border: "1px solid #FCD34D",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontWeight: "600",
                              }}
                            >
                              {occ}
                            </span>
                          ))}
                          {t.occasions.length > 4 && (
                            <span style={{ fontSize: "10.5px", color: "#92400E", padding: "2px" }}>
                              +{t.occasions.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: `1px solid ${BORDER}`,
                      paddingTop: "14px",
                      gap: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenTemplate(t)}
                      style={{
                        ...BTN_PRIMARY_STYLE,
                        flex: 1,
                        padding: "8px 14px",
                        fontSize: "12.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      Open &amp; Edit ✏️
                    </button>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(t.template_id)}
                        disabled={savingAction}
                        title="Duplicate Template"
                        style={{
                          background: SURFACE_ALT,
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          padding: "8px",
                          cursor: "pointer",
                          color: TEXT_MUTED,
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleArchive(t)}
                        disabled={savingAction}
                        title={t.is_archived ? "Restore Template" : "Archive Template"}
                        style={{
                          background: SURFACE_ALT,
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          padding: "8px",
                          cursor: "pointer",
                          color: TEXT_MUTED,
                        }}
                      >
                        <Archive size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 2: FOCUSED STUDIO WORKSPACE (EDITOR)
          ═══════════════════════════════════════════════════════════════ */}
      {currentView === "editor" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Bar with Breadcrumb & Primary Actions */}
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_LG,
              padding: "16px 20px",
              boxShadow: SHADOW_SM,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setCurrentView("gallery")}
                style={{
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: TEXT_SECONDARY,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <ArrowLeft size={14} /> Back to Library
              </button>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                    {activeTemplate?.name || "Template Editor"}
                  </h3>
                  {activeTemplate?.has_pending_draft ? (
                    <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#D97706", background: "#FEF3C7", padding: "2px 8px", borderRadius: "10px" }}>
                      Draft Pending
                    </span>
                  ) : (
                    <span style={{ fontSize: "10.5px", fontWeight: "700", color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: "10px" }}>
                      Live v{activeTemplate?.version || 1}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={handleOpenHistory}
                style={{
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: TEXT_SECONDARY,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={13} /> History
              </button>

              {activeTemplate?.has_pending_draft && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  disabled={savingAction}
                  style={{
                    background: "#FEE2E2",
                    border: "1px solid #FECACA",
                    borderRadius: RADIUS_MD,
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#991B1B",
                    cursor: "pointer",
                  }}
                >
                  Discard Draft
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingAction}
                style={{
                  ...BTN_SECONDARY_STYLE,
                  padding: "8px 14px",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Save size={14} /> {savingAction ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={handlePublishLive}
                disabled={savingAction}
                style={{
                  ...BTN_SUCCESS_STYLE,
                  padding: "8px 16px",
                  fontSize: "12.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={14} /> Publish to Live
              </button>

              {testRecipient && (
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={testSending}
                  style={{
                    ...BTN_PRIMARY_STYLE,
                    padding: "8px 14px",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={14} /> {testSending ? "Sending..." : "Send Test"}
                </button>
              )}
            </div>
          </div>

          {/* System Template Guard Notice */}
          {activeTemplate?.is_system_template && (
            <div
              style={{
                background: "rgba(14, 165, 233, 0.08)",
                border: "1px solid rgba(14, 165, 233, 0.25)",
                borderRadius: RADIUS_MD,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12.5px",
                color: "#0369A1",
              }}
            >
              <Shield size={18} style={{ flexShrink: 0 }} />
              <span>
                <strong>System Autoresponder:</strong> This template sends automated responses when visitors submit website inquiries or join the newsletter. Edits are saved safely as a draft until you click <strong>Publish to Live</strong>.
              </span>
            </div>
          )}

          {/* Curated Theme Variations Bar (if applicable) */}
          {activeTemplate?.occasions && activeTemplate.occasions.length > 0 && (
            <div
              style={{
                background: "#FEF3C7",
                border: "1px solid #FDE68A",
                borderRadius: RADIUS_MD,
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#92400E", display: "flex", alignItems: "center", gap: "6px" }}>
                ✨ Load Curated Occasion Theme:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {activeTemplate.occasions.map((occ, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyCuratedTheme(occ)}
                    style={{
                      fontSize: "11.5px",
                      fontWeight: "600",
                      color: "#78350F",
                      background: "#FFFFFF",
                      border: "1px solid #FCD34D",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    • {occ}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2-Column Split Workspace: Left = Form & Body, Right = Live Preview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: "24px",
              alignItems: "start",
            }}
          >
            {/* Left Column: Form & Editor */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_LG,
                padding: "20px",
                boxShadow: SHADOW_SM,
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              {/* Subject Line */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY }}>
                    Email Subject Line *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSubject((prev) => `${prev} {{name}}`.trim())}
                    style={{ fontSize: "10.5px", color: "#0284C7", background: "#E0F2FE", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
                  >
                    + Add Name Tag
                  </button>
                </div>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Corporate Tax Advisory & Compliance Notice"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "13px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    outline: "none",
                  }}
                />
              </div>

              {/* Preheader */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY, display: "block", marginBottom: "6px" }}>
                  Inbox Preview Text (Preheader)
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="e.g. Important regulatory updates regarding FY 2026-27 compliance..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "13px",
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    outline: "none",
                  }}
                />
              </div>

              {/* Quick Tag Helper & Editor Mode Switcher */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                  padding: "8px 12px",
                  background: SURFACE_ALT,
                  borderRadius: RADIUS_MD,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED }}>
                    Tags:
                  </span>
                  {["name", "company", "email", "year"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const t = `{{${tag}}}`;
                        setBodyHtml((prev) => prev + ` ${t} `);
                        showToast(`Inserted ${t}!`, "info");
                      }}
                      style={{
                        fontSize: "10.5px",
                        fontFamily: "monospace",
                        background: "#FFFFFF",
                        border: `1px solid ${BORDER}`,
                        padding: "2px 6px",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    >
                      &#123;&#123;{tag}&#125;&#125;
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", background: "#E2E8F0", padding: "2px", borderRadius: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setEditorMode("preview")}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: editorMode === "preview" ? "#FFFFFF" : "transparent",
                      color: editorMode === "preview" ? TEXT_PRIMARY : TEXT_MUTED,
                    }}
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("code")}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: editorMode === "code" ? "#FFFFFF" : "transparent",
                      color: editorMode === "code" ? TEXT_PRIMARY : TEXT_MUTED,
                    }}
                  >
                    HTML Code
                  </button>
                </div>
              </div>

              {/* Message Content Textarea */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY, display: "block", marginBottom: "6px" }}>
                  Message Content Body (HTML / Formatted Text)
                </label>
                <textarea
                  rows={14}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  placeholder="<h2>Enter message content here...</h2>"
                  style={{
                    width: "100%",
                    fontFamily: editorMode === "code" ? "monospace" : "inherit",
                    fontSize: editorMode === "code" ? "12px" : "13px",
                    padding: "14px",
                    background: editorMode === "code" ? "#0F172A" : "#FFFFFF",
                    color: editorMode === "code" ? "#F1F5F9" : TEXT_PRIMARY,
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    outline: "none",
                    lineHeight: "1.6",
                  }}
                />
              </div>

              {/* File Attachments (Cloudflare R2) */}
              <div
                style={{
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Paperclip size={16} style={{ color: "#0EA5E9" }} />
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: TEXT_PRIMARY }}>
                      Attach Files (PDFs, Reports, Documents):
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${BORDER}`,
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <UploadCloud size={14} style={{ color: "#0EA5E9" }} />
                    {uploadingAttachment ? "Uploading..." : "Add File"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleAttachmentUpload}
                    style={{ display: "none" }}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
                  />
                </div>

                {uploadError && (
                  <div style={{ fontSize: "11px", color: "#DC2626", marginBottom: "8px" }}>
                    {uploadError}
                  </div>
                )}

                {attachments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {attachments.map((att) => (
                      <div
                        key={att.attachment_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#FFFFFF",
                          border: `1px solid ${BORDER}`,
                          padding: "8px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <FileText size={14} style={{ color: "#0EA5E9" }} />
                          <strong>{att.filename}</strong>
                          <span style={{ fontSize: "10.5px", color: TEXT_MUTED }}>
                            ({(att.size_bytes / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleInsertDownloadButton(att)}
                            style={{
                              background: "#E0F2FE",
                              color: "#0284C7",
                              border: "none",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: "600",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Download size={12} />
                            Insert Button
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.attachment_id)}
                            style={{
                              background: "transparent",
                              color: "#EF4444",
                              border: "none",
                              padding: "4px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: TEXT_MUTED, fontStyle: "italic", textAlign: "center", padding: "10px 0" }}>
                    No attachments added yet.
                  </div>
                )}
              </div>

              {/* Collapsible Delivery Settings Drawer */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowDeliverySettings(!showDeliverySettings)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: TEXT_MUTED,
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Sliders size={13} />
                  {showDeliverySettings ? "▲ Hide Delivery Configuration" : "⚙️ Advanced Delivery Settings (From Name, Reply-To, CC)"}
                </button>

                {showDeliverySettings && (
                  <div
                    style={{
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: RADIUS_MD,
                      padding: "16px",
                      marginTop: "10px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, display: "block", marginBottom: "4px" }}>
                        Sender Name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="P Suman & Associates"
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "6px" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, display: "block", marginBottom: "4px" }}>
                        Approved Sender Email
                      </label>
                      <select
                        value={senderEmail || ""}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "6px" }}
                      >
                        <option value="">Default (updates@updates.psumanassociates.com)</option>
                        {approvedSenders.map((s, idx) => (
                          <option key={idx} value={s.email}>{s.name} &lt;{s.email}&gt;</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, display: "block", marginBottom: "4px" }}>
                        Reply-To
                      </label>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        placeholder="updates@updates.psumanassociates.com"
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "6px" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, display: "block", marginBottom: "4px" }}>
                        Corporate Wrapper Shell
                      </label>
                      <select
                        value={applyWrapper ? "yes" : "no"}
                        onChange={(e) => setApplyWrapper(e.target.value === "yes")}
                        style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "6px" }}
                      >
                        <option value="yes">780px Corporate Shell (Recommended)</option>
                        <option value="no">Raw HTML Only</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Real-time Device Preview */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_LG,
                padding: "20px",
                boxShadow: SHADOW_SM,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: TEXT_PRIMARY, display: "flex", alignItems: "center", gap: "6px" }}>
                  <Eye size={15} style={{ color: "#0EA5E9" }} /> Live Email Preview
                </span>

                <div style={{ display: "flex", gap: "6px", background: SURFACE_ALT, padding: "2px", borderRadius: "6px", border: `1px solid ${BORDER}` }}>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: previewDevice === "desktop" ? "#FFFFFF" : "transparent",
                      color: previewDevice === "desktop" ? "#0EA5E9" : TEXT_MUTED,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: previewDevice === "desktop" ? "700" : "500",
                    }}
                  >
                    <Monitor size={12} /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    style={{
                      padding: "4px 8px",
                      fontSize: "11px",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: previewDevice === "mobile" ? "#FFFFFF" : "transparent",
                      color: previewDevice === "mobile" ? "#0EA5E9" : TEXT_MUTED,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: previewDevice === "mobile" ? "700" : "500",
                    }}
                  >
                    <Smartphone size={12} /> Mobile
                  </button>
                </div>
              </div>

              {/* Delivery Metadata Preview Header */}
              <div
                style={{
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  padding: "10px 14px",
                  fontSize: "11.5px",
                  fontFamily: "monospace",
                  color: TEXT_SECONDARY,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div>
                  <strong>From:</strong> {senderName} &lt;{senderEmail || "updates@updates.psumanassociates.com"}&gt;
                </div>
                <div>
                  <strong>To:</strong> Valued Client &lt;{testRecipient || "client@example.com"}&gt;
                </div>
                <div>
                  <strong>Subject:</strong> {subject || "(No subject entered yet)"}
                </div>
              </div>

              {/* Live Preview Viewport */}
              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  background: "#F8FAFC",
                  padding: "16px",
                  minHeight: "500px",
                  display: "flex",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {previewLoading && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      background: "#0A2540",
                      color: "#FFFFFF",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "10px",
                      fontWeight: "600",
                      zIndex: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#38BDF8" }} />
                    Syncing preview...
                  </div>
                )}

                {previewData?.html ? (
                  <iframe
                    title="Live Studio Preview"
                    srcDoc={previewData.html}
                    style={{
                      width: previewDevice === "mobile" ? "390px" : "100%",
                      maxWidth: "100%",
                      height: "520px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      boxShadow: SHADOW_SM,
                    }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: "13px" }}>
                    Enter content to see real-time preview.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,28,46,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: SURFACE,
              borderRadius: RADIUS_LG,
              width: "100%",
              maxWidth: "540px",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: SHADOW_MD,
            }}
          >
            <div style={{ padding: "20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Version History
                </h4>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "2px 0 0" }}>
                  {activeTemplate?.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: "30px", color: TEXT_MUTED }}>Loading history...</div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: TEXT_MUTED }}>
                  No historical snapshots recorded yet. Versions are created when you publish.
                </div>
              ) : (
                historyList.map((ver) => (
                  <div
                    key={ver.version_id}
                    style={{
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: RADIUS_MD,
                      padding: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT_PRIMARY }}>
                        Version {ver.version_number}
                      </div>
                      <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
                        {new Date(ver.created_at).toLocaleString()} by {ver.created_by}
                      </div>
                      <div style={{ fontSize: "12px", color: TEXT_SECONDARY, marginTop: "4px" }}>
                        <strong>Subject:</strong> {ver.subject}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver.version_id)}
                      disabled={savingAction}
                      style={{
                        ...BTN_SECONDARY_STYLE,
                        padding: "6px 12px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <RotateCcw size={12} /> Restore Draft
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
