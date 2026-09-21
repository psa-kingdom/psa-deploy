/**
 * AdminCommunication — Communication Center
 *
 * Protected by AdminAuthGuard at the route level in App.js.
 * All axios calls use { withCredentials: true } to include the HttpOnly cookie.
 *
 * Audience sources (V1):
 *   - newsletter_subscriptions (Opted-in via website)
 *   - manual (Admin-entered / bulk-pasted verified recipient chips)
 *   - combined (Both sources deduplicated)
 *
 * TEST MODE:
 *   When EMAIL_ENVIRONMENT !== "production", all test dispatches are
 *   routed server-side to the single configured Test Recipient only.
 *   The backend enforces this.
 *
 * PRODUCTION MODE:
 *   When EMAIL_ENVIRONMENT === "production", the selected audience
 *   is frozen and dispatched via the Outbox system.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import {
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  Save,
  Mail,
  X,
  FileText,
  BarChart3,
  Plus,
  MessageSquare,
} from "lucide-react";
import AudienceSelector from "../components/admin/AudienceSelector";
import TemplateEditor from "../components/admin/TemplateEditor";
import AdminAnalyticsCards from "../components/admin/AdminAnalyticsCards";
import CampaignReviewModal from "../components/admin/CampaignReviewModal";
import CampaignProgress from "../components/admin/CampaignProgress";
import DeliveryLogsTable from "../components/admin/DeliveryLogsTable";
import RepliesDashboard from "../components/admin/RepliesDashboard";
import AdminLayout from "../components/admin/AdminLayout";

import { BACKEND_URL } from "../config";
import {
  SURFACE, SURFACE_ALT, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
  WARNING_DARK, WARNING_BG, WARNING_BORDER_STRONG,
  SHADOW_SM, SHADOW_MD, RADIUS_MD, RADIUS_LG,
  BTN_PRIMARY_STYLE, BTN_SECONDARY_STYLE, BTN_SUCCESS_STYLE, CARD_STYLE,
} from "../utils/adminTheme";

// Axios instance that always sends the HttpOnly session cookie
const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

export default function AdminCommunication() {
  const [activeTab, setActiveTab] = useState("campaigns");
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["campaigns", "templates", "analytics", "logs", "replies"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Environment state
  const [environment, setEnvironment] = useState("development");

  // Test recipient state (Test Mode only)
  const [testRecipient, setTestRecipient] = useState("");
  const [testRecipientInput, setTestRecipientInput] = useState("");
  const [isEditingTestRecipient, setIsEditingTestRecipient] = useState(false);
  const [savingTestRecipient, setSavingTestRecipient] = useState(false);
  const [testRecipientSaved, setTestRecipientSaved] = useState(false);

  // Campaign Composer State
  const [sendMode, setSendMode] = useState("test"); // "test" | "production"
  const [campaignTitle, setCampaignTitle] = useState("");
  const [selectedSource, setSelectedSource] = useState("newsletter_subscriptions");
  const [manualEmails, setManualEmails] = useState([]);
  const [excludedEmails, setExcludedEmails] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [applyWrapper, setApplyWrapper] = useState(true);
  const [senderName, setSenderName] = useState("P Suman & Associates");
  const [senderEmail, setSenderEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [audienceEstimate, setAudienceEstimate] = useState(null);

  // Standalone Template Studio Tab State
  const [studioSelectedTemplateId, setStudioSelectedTemplateId] = useState("");
  const [studioSubject, setStudioSubject] = useState("");
  const [studioPreheader, setStudioPreheader] = useState("");
  const [studioBodyHtml, setStudioBodyHtml] = useState("");
  const [studioApplyWrapper, setStudioApplyWrapper] = useState(true);
  const [studioSenderName, setStudioSenderName] = useState("P Suman & Associates");
  const [studioSenderEmail, setStudioSenderEmail] = useState("");
  const [studioReplyTo, setStudioReplyTo] = useState("");
  const [studioCc, setStudioCc] = useState([]);
  const [studioBcc, setStudioBcc] = useState([]);

  // Create Template Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTplId, setNewTplId] = useState("");
  const [newTplName, setNewTplName] = useState("");
  const [newTplCategory, setNewTplCategory] = useState("announcement");
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  // Review Modal & Active Campaign State
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [pendingCampaign, setPendingCampaign] = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [campaignsList, setCampaignsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Test Send State
  const [testSending, setTestSending] = useState(false);
  const [hoveredCategoryTemplateId, setHoveredCategoryTemplateId] = useState(null);

  const fetchEnvironment = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/communication/campaigns/environment");
      setEnvironment(res.data.email_environment || "development");
      const recipient = res.data.test_recipient || "";
      setTestRecipient(recipient);
      setTestRecipientInput(recipient);
      setIsEditingTestRecipient(!recipient);
    } catch (_) {
      // Non-critical — default to development if endpoint not available
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/communication/templates");
      const list = res.data || [];
      setTemplates(list);      // Default selection: automatically select the clean Blank Corporate Template if none is selected yet
      if (list.length > 0) {
        const cleanList = list.filter((t) => {
          const name = (t.name || "").toLowerCase();
          const id = (t.template_id || "").toLowerCase();
          if (name.includes("independence day") || id.includes("independence_day")) return false;
          if (name === "welcome template" || id === "f990c681-48dd-4d64-b17f-790ae0bca3ba") return false;
          if (t.category === "transactional" || id === "contact_acknowledgement" || id === "newsletter_welcome") return false;
          return true;
        });

        const defaultTpl =
          cleanList.find((t) => t.template_id === "blank_corporate_template" || t.name?.toLowerCase().includes("blank corporate")) ||
          cleanList[0] ||
          list[0];

        if (defaultTpl) {
          setSelectedTemplateId((prev) => {
            if (!prev) {
              setSubject(defaultTpl.published_subject || defaultTpl.draft_subject || "");
              setPreheader(defaultTpl.published_preheader || defaultTpl.draft_preheader || "");
              setBodyHtml(defaultTpl.published_body_html || defaultTpl.draft_body_html || "");
              if (defaultTpl.apply_wrapper !== undefined && defaultTpl.apply_wrapper !== null) {
                setApplyWrapper(defaultTpl.apply_wrapper);
              } else {
                setApplyWrapper(true);
              }
              if (defaultTpl.sender_name) setSenderName(defaultTpl.sender_name);
              if (defaultTpl.sender_email) setSenderEmail(defaultTpl.sender_email);
              if (defaultTpl.reply_to) setReplyTo(defaultTpl.reply_to);
              if (defaultTpl.cc) setCc(defaultTpl.cc);
              if (defaultTpl.bcc) setBcc(defaultTpl.bcc);
              return defaultTpl.template_id;
            }
            return prev;
          });

          setStudioSelectedTemplateId((prev) => {
            if (!prev) {
              setStudioSubject(defaultTpl.draft_subject || defaultTpl.published_subject || "");
              setStudioPreheader(defaultTpl.draft_preheader || defaultTpl.published_preheader || "");
              setStudioBodyHtml(defaultTpl.draft_body_html || defaultTpl.published_body_html || "");
              setStudioApplyWrapper(defaultTpl.apply_wrapper ?? true);
              if (defaultTpl.sender_name) setStudioSenderName(defaultTpl.sender_name);
              if (defaultTpl.sender_email) setStudioSenderEmail(defaultTpl.sender_email);
              if (defaultTpl.reply_to) setStudioReplyTo(defaultTpl.reply_to);
              if (defaultTpl.cc) setStudioCc(defaultTpl.cc);
              if (defaultTpl.bcc) setStudioBcc(defaultTpl.bcc);
              return defaultTpl.template_id;
            }
            return prev;
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/communication/campaigns");
      setCampaignsList(res.data);
      const sending = res.data.find((c) => c.status === "sending");
      if (sending) {
        setActiveCampaign(sending);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchCampaigns();
    fetchEnvironment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling for active campaign progress
  useEffect(() => {
    if (
      !activeCampaign ||
      activeCampaign.status === "completed" ||
      activeCampaign.status === "cancelled"
    ) {
      return;
    }
    const interval = setInterval(async () => {
      try {
        const res = await api.get(
          `/api/admin/communication/campaigns/${activeCampaign.campaign_id}`
        );
        setActiveCampaign(res.data);
        if (res.data.status === "completed" || res.data.status === "cancelled") {
          fetchCampaigns();
        }
      } catch (err) {
        console.error("Progress poll failed:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCampaign]);

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const handleSaveTestRecipient = async () => {
    setSavingTestRecipient(true);
    setTestRecipientSaved(false);
    try {
      const res = await api.put("/api/admin/communication/settings", {
        test_recipient: testRecipientInput.trim(),
      });
      setTestRecipient(res.data.test_recipient);
      setTestRecipientInput(res.data.test_recipient);
      setIsEditingTestRecipient(false);
      setTestRecipientSaved(true);
      showToast(
        res.data.test_recipient
          ? `Test recipient saved: ${res.data.test_recipient}`
          : "Test recipient cleared.",
        "success"
      );
      setTimeout(() => setTestRecipientSaved(false), 3000);
    } catch (err) {
      showToast(
        err.response?.data?.detail || "Failed to save test recipient.",
        "error"
      );
    } finally {
      setSavingTestRecipient(false);
    }
  };

  const handleRemoveTestRecipient = async () => {
    setSavingTestRecipient(true);
    try {
      const res = await api.put("/api/admin/communication/settings", {
        test_recipient: "",
      });
      setTestRecipient("");
      setTestRecipientInput("");
      setIsEditingTestRecipient(true);
      showToast("Test recipient removed.", "info");
    } catch (err) {
      showToast("Failed to remove test recipient.", "error");
    } finally {
      setSavingTestRecipient(false);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const found = templates.find((t) => t.template_id === templateId);
    if (found) {
      setSubject(found.published_subject || found.draft_subject || "");
      setPreheader(found.published_preheader || found.draft_preheader || "");
      setBodyHtml(found.published_body_html || found.draft_body_html || "");
      if (found.apply_wrapper !== undefined && found.apply_wrapper !== null) {
        setApplyWrapper(found.apply_wrapper);
      } else {
        setApplyWrapper(true);
      }
      if (found.sender_name) setSenderName(found.sender_name);
      if (found.sender_email) setSenderEmail(found.sender_email);
      if (found.reply_to) setReplyTo(found.reply_to);
      if (found.cc) setCc(found.cc);
      if (found.bcc) setBcc(found.bcc);
    }
  };

  const handleStudioTemplateSelect = (templateId) => {
    setStudioSelectedTemplateId(templateId);
    if (!templateId) {
      setStudioSubject("");
      setStudioPreheader("");
      setStudioBodyHtml("");
      setStudioApplyWrapper(true);
      return;
    }
    const found = templates.find((t) => t.template_id === templateId);
    if (found) {
      setStudioSubject(found.draft_subject || found.published_subject || "");
      setStudioPreheader(found.draft_preheader || found.published_preheader || "");
      setStudioBodyHtml(found.draft_body_html || found.published_body_html || "");
      setStudioApplyWrapper(found.apply_wrapper ?? true);
      setStudioSenderName(found.sender_name || "P Suman & Associates");
      setStudioSenderEmail(found.sender_email || "");
      setStudioReplyTo(found.reply_to || "");
      setStudioCc(found.cc || []);
      setStudioBcc(found.bcc || []);
    }
  };

  const handleCreateTemplateSubmit = async (e) => {
    e.preventDefault();
    if (!newTplId.trim() || !newTplName.trim()) {
      showToast("Template ID and Name are required.", "error");
      return;
    }
    setCreatingTemplate(true);
    try {
      const cleanId = newTplId.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
      const res = await api.post("/api/admin/communication/templates", {
        template_id: cleanId,
        name: newTplName.trim(),
        category: newTplCategory,
        subject: "Draft Subject",
        body_html: "<h2>New Template Content</h2>\n<p>Author your message body here...</p>",
        preheader: "",
        apply_wrapper: true,
        publish_immediately: false,
      });
      showToast(`Template "${res.data.name}" created!`, "success");
      setShowCreateModal(false);
      setNewTplId("");
      setNewTplName("");
      await fetchTemplates();
      handleStudioTemplateSelect(res.data.template_id);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to create template.", "error");
    } finally {
      setCreatingTemplate(false);
    }
  };

  const buildTargetFilter = () => {
    const filter = { source: selectedSource };
    if (selectedSource === "manual" || selectedSource === "combined") {
      filter.custom_emails = manualEmails;
    }
    if (excludedEmails.length > 0) {
      filter.excluded_emails = excludedEmails;
    }
    return filter;
  };

  const handleCreateAndReview = async () => {
    const effectiveTitle = (campaignTitle && campaignTitle.trim()) || (subject && subject.trim()) || `Campaign ${new Date().toLocaleDateString()}`;
    if (!subject || !bodyHtml) {
      showToast("Please enter an email Subject and Content before sending.", "error");
      return;
    }
    if (
      (selectedSource === "manual" || selectedSource === "combined") &&
      manualEmails.length === 0
    ) {
      showToast("Please enter at least one recipient email address.", "error");
      return;
    }

    if (!campaignTitle.trim()) {
      setCampaignTitle(effectiveTitle);
    }

    setLoading(true);
    try {
      const res = await api.post("/api/admin/communication/campaigns", {
        title: effectiveTitle,
        campaign_type: "announcement",
        template_id: selectedTemplateId || null,
        send_mode: sendMode,
        subject: subject,
        body_html: bodyHtml,
        apply_wrapper: applyWrapper,
        target_filter: buildTargetFilter(),
      });
      setPendingCampaign(res.data);
      setIsReviewOpen(true);
    } catch (err) {
      console.error("Campaign creation failed:", err);
      showToast(
        err.response?.data?.detail || "Failed to create campaign draft",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDispatch = async (idempotencyKey) => {
    if (!pendingCampaign) return;
    setLoading(true);
    try {
      const res = await api.post(
        `/api/admin/communication/campaigns/${pendingCampaign.campaign_id}/confirm`,
        {
          exact_recipient_count: pendingCampaign.frozen_recipient_count,
          idempotency_key: idempotencyKey,
          send_mode: sendMode,
        }
      );
      setIsReviewOpen(false);
      setActiveCampaign(res.data);
      fetchCampaigns();
      showToast(
        `Campaign confirmed! Dispatching ${res.data.frozen_recipient_count} emails in ${sendMode.toUpperCase()} mode.`,
        "success"
      );
    } catch (err) {
      console.error("Confirm failed:", err);
      showToast(
        err.response?.data?.detail || "Dispatch confirmation failed",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCampaign = async (campaignId) => {
    try {
      const res = await api.post(
        `/api/admin/communication/campaigns/${campaignId}/cancel`,
        {}
      );
      setActiveCampaign(res.data);
      fetchCampaigns();
      showToast("Remaining outbox jobs successfully cancelled.", "info");
    } catch (err) {
      console.error("Cancel failed:", err);
      showToast("Failed to cancel campaign.", "error");
    }
  };

  const handleTestSend = async () => {
    if (!subject || !bodyHtml) {
      showToast("Please fill in Subject and HTML Content before sending a test.", "error");
      return;
    }
    if (!testRecipient) {
      showToast("Configure a Test Recipient above before sending a test.", "error");
      return;
    }
    setTestSending(true);
    try {
      const res = await api.post("/api/admin/communication/campaigns/test-send", {
        recipient_email: testRecipient,
        subject: subject,
        preheader: preheader,
        body_html: bodyHtml,
        apply_wrapper: applyWrapper,
        sender_name: senderName,
        sender_email: senderEmail || null,
        reply_to: replyTo || null,
        cc: cc,
        bcc: bcc,
        template_id: selectedTemplateId || null,
        is_draft: true,
      });
      showToast(res.data.message || `Test email dispatched to ${res.data.recipient}!`, "success");
    } catch (err) {
      console.error("Test send error:", err);
      showToast(err.response?.data?.detail || "Test send failed.", "error");
    } finally {
      setTestSending(false);
    }
  };

  const handleStudioTestSend = async () => {
    if (!studioSubject || !studioBodyHtml) {
      showToast("Please enter a Subject and HTML content before testing.", "error");
      return;
    }
    if (!testRecipient) {
      showToast("Configure a Test Recipient in the top panel before testing.", "error");
      return;
    }
    setTestSending(true);
    try {
      const res = await api.post("/api/admin/communication/campaigns/test-send", {
        recipient_email: testRecipient,
        subject: studioSubject,
        preheader: studioPreheader,
        body_html: studioBodyHtml,
        apply_wrapper: studioApplyWrapper,
        sender_name: studioSenderName,
        sender_email: studioSenderEmail || null,
        reply_to: studioReplyTo || null,
        cc: studioCc,
        bcc: studioBcc,
        template_id: studioSelectedTemplateId || null,
        is_draft: true,
      });
      showToast(res.data.message || `Test email dispatched to ${res.data.recipient}!`, "success");
    } catch (err) {
      showToast(err.response?.data?.detail || "Test send failed.", "error");
    } finally {
      setTestSending(false);
    }
  };

  const isTestMode = environment !== "production";

  // ---- Styles ----
  const styles = {
    card: {
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: RADIUS_LG,
      padding: "24px",
      boxShadow: SHADOW_SM,
    },
    // TEST MODE card: intentionally green — critical safety indicator, DO NOT change
    testModeCard: {
      background: "#F0FDF4",
      border: "1px solid #BBF7D0",
      borderRadius: RADIUS_LG,
      padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(10, 37, 64, 0.04)",
    },
    label: {
      display: "block",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: TEXT_SECONDARY,
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      background: SURFACE,
      border: `1px solid ${BORDER}`,
      borderRadius: RADIUS_MD,
      padding: "10px 12px",
      color: TEXT_PRIMARY,
      fontSize: "13px",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.15s, box-shadow 0.15s",
    },
    tab: (active) => ({
      padding: "8px 16px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      background: "transparent",
      border: "none",
      color: active ? ACCENT : TEXT_MUTED,
      borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
      transition: "all 0.15s",
      fontFamily: "inherit",
    }),
    // Primary action: PSA blue — replaces old indigo/purple gradient
    btnPrimary: {
      ...BTN_PRIMARY_STYLE,
      padding: "10px 20px",
      fontSize: "13px",
    },
    btnSecondary: BTN_SECONDARY_STYLE,
    // Green send button: intentionally green — test-mode safety action, DO NOT change
    btnGreen: BTN_SUCCESS_STYLE,
  };

  // Live Readiness Checks for layman clarity
  const hasSubject = Boolean(subject && subject.trim());
  const hasContent = Boolean(bodyHtml && bodyHtml.trim() && bodyHtml !== "<p></p>");
  const hasTestRecipient = Boolean(testRecipient && testRecipient.trim());

  const hasAudience =
    selectedSource === "newsletter_subscriptions"
      ? true
      : manualEmails.length > 0;

  const isTestReady = hasTestRecipient && hasSubject && hasContent;
  const isProdReady = hasAudience && hasSubject && hasContent;

  return (
    <AdminLayout>
      {/* Toast — light-themed with colored left border accent */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 9999,
            background: SURFACE,
            borderLeft: `4px solid ${
              toastMsg.type === "error" ? "#dc2626"
              : toastMsg.type === "info" ? ACCENT
              : "#16a34a"
            }`,
            border: `1px solid ${BORDER}`,
            color:
              toastMsg.type === "error" ? "#dc2626"
              : toastMsg.type === "info" ? ACCENT
              : "#15803d",
            borderRadius: RADIUS_MD,
            padding: "12px 16px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "380px",
            boxShadow: SHADOW_MD,
            fontWeight: "500",
          }}
        >
          {toastMsg.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {toastMsg.msg}
        </div>
      )}

      {/* Page header with Reactive Send Mode Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", color: TEXT_PRIMARY, marginBottom: "4px", letterSpacing: "-0.02em" }}>
            Communication Center
          </h1>
          <p style={{ fontSize: "12.5px", color: TEXT_MUTED }}>
            Compose, test, review, and dispatch verified email campaigns to your audience.
          </p>
        </div>

        {/* Reactive Campaign Send Mode Indicator Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: sendMode === "production" ? "var(--admin-warning-bg, #FFFBEB)" : "var(--admin-success-bg, #F0FDF4)",
            border: `1px solid ${sendMode === "production" ? "var(--admin-warning-border, #FCD34D)" : "var(--admin-success-border, #86EFAC)"}`,
            borderRadius: "8px",
            padding: "6px 14px",
            boxShadow: sendMode === "production" ? "0 1px 3px rgba(217, 119, 6, 0.08)" : "0 1px 3px rgba(22, 163, 74, 0.08)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: sendMode === "production" ? "#D97706" : "#16A34A",
              boxShadow: sendMode === "production" ? "0 0 6px rgba(217, 119, 6, 0.4)" : "0 0 6px rgba(22, 163, 74, 0.4)",
              animation: sendMode === "production" ? "pulse 2s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              color: sendMode === "production" ? "var(--admin-warning-text, #78350F)" : "var(--admin-success-text, #14532D)",
              textTransform: "uppercase",
            }}
          >
            {sendMode === "production" ? "PRODUCTION" : "TEST MODE"}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, marginBottom: "24px" }}>
        <button style={styles.tab(activeTab === "campaigns")} onClick={() => setActiveTab("campaigns")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Send size={13} /> Campaigns
          </span>
        </button>
        <button style={styles.tab(activeTab === "templates")} onClick={() => setActiveTab("templates")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FileText size={13} /> Template Studio
          </span>
        </button>
        <button style={styles.tab(activeTab === "analytics")} onClick={() => setActiveTab("analytics")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <BarChart3 size={13} /> Deliverability &amp; Analytics
          </span>
        </button>
        <button style={styles.tab(activeTab === "logs")} onClick={() => setActiveTab("logs")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={13} /> Audit Logs
          </span>
        </button>
        <button style={styles.tab(activeTab === "replies")} onClick={() => setActiveTab("replies")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquare size={13} /> Replies &amp; Inbound
          </span>
        </button>
      </div>

      {/* TAB: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "100%" }}>
          {/* Active campaign progress monitor */}
          {activeCampaign && (
            <CampaignProgress
              campaign={activeCampaign}
              onCancel={() => handleCancelCampaign(activeCampaign.campaign_id)}
              onDismiss={() => setActiveCampaign(null)}
            />
          )}

          {/* STEP 1: Choose Sending Goal */}
          <div style={{ ...styles.card, borderTop: "4px solid #0EA5E9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#0EA5E9",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Choose What You Want to Do
                </h2>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "2px 0 0" }}>
                  Select whether you are sending a test sample to yourself or broadcasting live to clients &amp; subscribers.
                </p>
              </div>
            </div>

            {/* Mode selection cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {/* Option A: Test Mode */}
              <div
                id="btn-mode-test"
                onClick={() => setSendMode("test")}
                style={{
                  padding: "16px",
                  borderRadius: RADIUS_MD,
                  border: sendMode === "test" ? "2px solid #16A34A" : `1px solid ${BORDER}`,
                  background: sendMode === "test" ? "#F0FDF4" : SURFACE_ALT,
                  cursor: "pointer",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  transition: "all 0.15s ease",
                  boxShadow: sendMode === "test" ? "0 2px 6px rgba(22,163,74,0.12)" : "none",
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: sendMode === "test" ? "#16A34A" : "#CBD5E1",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Mail size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <strong style={{ fontSize: "13.5px", color: sendMode === "test" ? "#14532D" : TEXT_PRIMARY }}>
                      🧪 Send a Test Email
                    </strong>
                    {sendMode === "test" && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#16A34A",
                          background: "#DCFCE7",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: sendMode === "test" ? "#166534" : TEXT_MUTED,
                      margin: "4px 0 0",
                      lineHeight: "1.4",
                    }}
                  >
                    Send a sample email to yourself or a colleague to check formatting. Safe sandbox — no real audience receives this.
                  </p>
                </div>
              </div>

              {/* Option B: Production Mode */}
              <div
                id="btn-mode-production"
                onClick={() => setSendMode("production")}
                style={{
                  padding: "16px",
                  borderRadius: RADIUS_MD,
                  border: sendMode === "production" ? "2px solid #D97706" : `1px solid ${BORDER}`,
                  background: sendMode === "production" ? "#FFFBEB" : SURFACE_ALT,
                  cursor: "pointer",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                  transition: "all 0.15s ease",
                  boxShadow: sendMode === "production" ? "0 2px 6px rgba(217,119,6,0.12)" : "none",
                }}
              >
                <div
                  style={{
                    padding: "8px",
                    borderRadius: "8px",
                    background: sendMode === "production" ? "#D97706" : "#CBD5E1",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Send size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <strong style={{ fontSize: "13.5px", color: sendMode === "production" ? "#78350F" : TEXT_PRIMARY }}>
                      🚀 Send Live Campaign
                    </strong>
                    {sendMode === "production" && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          color: "#D97706",
                          background: "#FEF3C7",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        SELECTED
                      </span>
                    )}
                  </div>
                  <p
                    style={{
                      fontSize: "11.5px",
                      color: sendMode === "production" ? "#92400E" : TEXT_MUTED,
                      margin: "4px 0 0",
                      lineHeight: "1.4",
                    }}
                  >
                    Broadcast this email to your real audience (newsletter subscribers, manual recipient list, or both).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: Choose Recipients */}
          <div style={{ ...styles.card, borderTop: "4px solid #0EA5E9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#0EA5E9",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  {sendMode === "test" ? "Where Should We Send Your Test Email?" : "Choose Who Receives Your Campaign"}
                </h2>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "2px 0 0" }}>
                  {sendMode === "test"
                    ? "Enter your own email address to receive a sample copy of this email."
                    : "Select the verified recipients for this broadcast."}
                </p>
              </div>
            </div>

            {sendMode === "test" ? (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: RADIUS_MD, padding: "16px" }}>
                <label style={{ ...styles.label, color: "#166534", marginBottom: "6px" }}>
                  Your Test Email Address
                </label>
                {testRecipient && !isEditingTestRecipient ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#FFFFFF",
                        border: "1px solid #86EFAC",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontFamily: "monospace",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#0A2540",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}
                    >
                      <span>{testRecipient}</span>
                      <button
                        type="button"
                        onClick={handleRemoveTestRecipient}
                        disabled={savingTestRecipient}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#9ca3af",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Remove test recipient"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestRecipientInput(testRecipient);
                        setIsEditingTestRecipient(true);
                      }}
                      style={{
                        background: "#FFFFFF",
                        border: `1px solid ${BORDER}`,
                        borderRadius: "6px",
                        padding: "6px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: TEXT_SECONDARY,
                        cursor: "pointer",
                      }}
                    >
                      Change Address
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="email"
                      value={testRecipientInput}
                      onChange={(e) => setTestRecipientInput(e.target.value)}
                      placeholder="e.g. yourname@domain.com"
                      style={{ ...styles.input, flex: 1, background: "#FFFFFF" }}
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTestRecipient()}
                    />
                    <button
                      onClick={handleSaveTestRecipient}
                      disabled={savingTestRecipient || !testRecipientInput.trim()}
                      style={{
                        ...styles.btnGreen,
                        opacity: savingTestRecipient || !testRecipientInput.trim() ? 0.6 : 1,
                        cursor: savingTestRecipient || !testRecipientInput.trim() ? "not-allowed" : "pointer",
                      }}
                    >
                      <Save size={13} />
                      {savingTestRecipient ? "Saving…" : "Save Test Address"}
                    </button>
                    {testRecipient && isEditingTestRecipient && (
                      <button
                        type="button"
                        onClick={() => setIsEditingTestRecipient(false)}
                        style={{
                          background: "#FFFFFF",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                <p style={{ fontSize: "11.5px", color: "#15803d", marginTop: "10px", lineHeight: "1.4" }}>
                  🛡️ In Test Mode, emails are dispatched <strong>ONLY</strong> to this address. Real subscribers and client lists are 100% blocked.
                </p>
              </div>
            ) : (
              <div>
                {/* Explicit Reassurance Banner in Production Mode */}
                <div
                  style={{
                    background: "#FFFBEB",
                    border: "1px solid #FCD34D",
                    borderRadius: RADIUS_MD,
                    padding: "12px 16px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "12.5px",
                    color: "#78350F",
                  }}
                >
                  <CheckCircle2 size={16} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span>
                    <strong>Live Broadcast Active:</strong> The test email address is completely bypassed. Emails will only be sent to your verified audience selected below.
                  </span>
                </div>

                <AudienceSelector
                  backendUrl={BACKEND_URL}
                  selectedSource={selectedSource}
                  onChange={setSelectedSource}
                  manualEmails={manualEmails}
                  onManualEmailsChange={setManualEmails}
                  excludedEmails={excludedEmails}
                  onExcludedEmailsChange={setExcludedEmails}
                  onEstimateLoaded={setAudienceEstimate}
                />
              </div>
            )}
          </div>

          {/* STEP 3: Compose Your Email */}
          <div style={{ ...styles.card, borderTop: "4px solid #0EA5E9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "#0EA5E9",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Compose Your Email
                </h2>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "2px 0 0" }}>
                  Give your campaign an internal title, select a template (optional), and author your subject and message.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={styles.label}>
                Internal Campaign Title{" "}
                <span style={{ color: TEXT_MUTED, textTransform: "none", fontWeight: "normal" }}>
                  (for your records)
                </span>
              </label>
              <input
                id="campaign-title"
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Q3 Advisory & Regulatory Update"
                style={styles.input}
              />
            </div>

            <TemplateEditor
              backendUrl={BACKEND_URL}
              templates={templates}
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={handleTemplateSelect}
              onTemplatesRefresh={fetchTemplates}
              subject={subject}
              onSubjectChange={setSubject}
              preheader={preheader}
              onPreheaderChange={setPreheader}
              bodyHtml={bodyHtml}
              onBodyHtmlChange={setBodyHtml}
              applyWrapper={applyWrapper}
              onApplyWrapperChange={setApplyWrapper}
              senderName={senderName}
              onSenderNameChange={setSenderName}
              senderEmail={senderEmail}
              onSenderEmailChange={setSenderEmail}
              replyTo={replyTo}
              onReplyToChange={setReplyTo}
              cc={cc}
              onCcChange={setCc}
              bcc={bcc}
              onBccChange={setBcc}
              testRecipient={testRecipient || testRecipientInput}
              onTestSend={sendMode === "test" ? handleTestSend : null}
              standaloneStudio={false}
              sendMode={sendMode}
              manualEmails={manualEmails}
              selectedSource={selectedSource}
              audienceEstimate={audienceEstimate}
            />
          </div>

          {/* STEP 4: Review & Send */}
          <div
            style={{
              ...styles.card,
              borderTop: sendMode === "production" ? "4px solid #D97706" : "4px solid #16A34A",
              background: sendMode === "production" ? "#FFFCF5" : "#FAFFFA",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: sendMode === "production" ? "#D97706" : "#16A34A",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "13px",
                  flexShrink: 0,
                }}
              >
                4
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Review &amp; Send
                </h2>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "2px 0 0" }}>
                  {sendMode === "test"
                    ? "Verify your test address and dispatch a sample email."
                    : "Review readiness, freeze the audience snapshot, and authorize live delivery."}
                </p>
              </div>
            </div>

            {/* Live Readiness Checklist */}
            <div
              style={{
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                padding: "14px 16px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: TEXT_MUTED,
                  marginBottom: "10px",
                }}
              >
                Pre-Flight Readiness Checklist
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "10px",
                }}
              >
                {/* 1. Mode */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                  <span>
                    Mode:{" "}
                    <strong>{sendMode === "test" ? "🧪 Test Mode (Sandbox)" : "🚀 Production Mode"}</strong>
                  </span>
                </div>

                {/* 2. Recipient */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  {sendMode === "test" ? (
                    hasTestRecipient ? (
                      <>
                        <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                        <span style={{ color: "#15803d" }}>
                          Test Address: <strong>{testRecipient}</strong>
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} style={{ color: "#DC2626" }} />
                        <span style={{ color: "#DC2626", fontWeight: "600" }}>Test email missing</span>
                      </>
                    )
                  ) : hasAudience ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                      <span style={{ color: "#15803d" }}>
                        Audience:{" "}
                        <strong>
                          {selectedSource === "newsletter_subscriptions"
                            ? "Newsletter Subscribers"
                            : `${audienceEstimate?.net_target_count ?? manualEmails.length} recipients ready`}
                        </strong>
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} style={{ color: "#DC2626" }} />
                      <span style={{ color: "#DC2626", fontWeight: "600" }}>No recipients added yet</span>
                    </>
                  )}
                </div>

                {/* 3. Subject */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  {hasSubject ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                      <span style={{ color: "#15803d" }}>Subject line filled</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} style={{ color: "#DC2626" }} />
                      <span style={{ color: "#DC2626", fontWeight: "600" }}>Subject line missing</span>
                    </>
                  )}
                </div>

                {/* 4. Content */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  {hasContent ? (
                    <>
                      <CheckCircle2 size={14} style={{ color: "#16A34A" }} />
                      <span style={{ color: "#15803d" }}>Message content ready</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={14} style={{ color: "#DC2626" }} />
                      <span style={{ color: "#DC2626", fontWeight: "600" }}>Message content empty</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Single Action Row */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                {sendMode === "test" ? (
                  !isTestReady ? (
                    <span style={{ fontSize: "12px", color: "#B45309" }}>
                      ⚠ Please enter a test email address, subject, and content above to enable test sending.
                    </span>
                  ) : (
                    <span style={{ fontSize: "12px", color: "#15803d", fontWeight: "500" }}>
                      Ready! Click the button to dispatch a test email to <strong>{testRecipient}</strong>.
                    </span>
                  )
                ) : !isProdReady ? (
                  <span style={{ fontSize: "12px", color: "#B45309" }}>
                    ⚠ Please add at least 1 recipient, an email subject, and content above to enable broadcast.
                  </span>
                ) : (
                  <span style={{ fontSize: "12px", color: "#92400E", fontWeight: "500" }}>
                    Ready! Click to freeze audience and review the 2-step confirmation.
                  </span>
                )}
              </div>

              {sendMode === "test" ? (
                <button
                  id="btn-test-send"
                  onClick={handleTestSend}
                  disabled={testSending || !isTestReady}
                  style={{
                    ...styles.btnGreen,
                    padding: "12px 24px",
                    fontSize: "13.5px",
                    opacity: testSending || !isTestReady ? 0.5 : 1,
                    cursor: testSending || !isTestReady ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={15} />
                  {testSending ? "Sending Test…" : `Send Test Email Now →`}
                </button>
              ) : (
                <button
                  id="btn-review-dispatch"
                  onClick={handleCreateAndReview}
                  disabled={loading || !isProdReady}
                  style={{
                    ...styles.btnPrimary,
                    background: "#D97706",
                    padding: "12px 24px",
                    fontSize: "13.5px",
                    opacity: loading || !isProdReady ? 0.5 : 1,
                    cursor: loading || !isProdReady ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={15} />
                  {loading
                    ? "Preparing Audience…"
                    : `Review & Send to ${
                        selectedSource === "newsletter_subscriptions"
                          ? "Subscribers"
                          : `${audienceEstimate?.net_target_count ?? manualEmails.length} Recipients`
                      } →`}
                </button>
              )}
            </div>

            {environment !== "production" && (
              <div
                style={{
                  fontSize: "11px",
                  color: TEXT_MUTED,
                  marginTop: "14px",
                  paddingTop: "12px",
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                Production campaign dispatch is guarded in Test Mode. Set{" "}
                <code
                  style={{
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    padding: "1px 4px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: TEXT_SECONDARY,
                  }}
                >
                  EMAIL_ENVIRONMENT=production
                </code>{" "}
                in Railway to enable live audience broadcast.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: TEMPLATE STUDIO */}
      {activeTab === "templates" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
          <div style={styles.card}>
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
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Corporate Email Template Studio
                </h3>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "4px 0 0" }}>
                  Select an email template to author drafts, configure delivery settings, and manage version lifecycles safely.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                style={{
                  ...BTN_PRIMARY_STYLE,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  padding: "8px 14px",
                }}
              >
                <Plus size={14} /> Create Template
              </button>
            </div>

            {/* Template cards catalog */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {templates.map((t) => {
                const isSelected =
                  (studioSelectedTemplateId || selectedTemplateId) === t.template_id;
                const isCategoryHovered = hoveredCategoryTemplateId === t.template_id;
                const hasOccasions = Array.isArray(t.occasions) && t.occasions.length > 0;

                return (
                  <div
                    key={t.template_id}
                    onClick={() => handleStudioTemplateSelect(t.template_id)}
                    style={{
                      position: "relative",
                      background: isSelected ? "rgba(14,165,233,0.06)" : SURFACE_ALT,
                      border: isSelected ? "2px solid #0ea5e9" : `1px solid ${BORDER}`,
                      borderRadius: RADIUS_MD,
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Category Badge with Hover Subcategory Popover */}
                      <div
                        style={{ position: "relative", display: "inline-block" }}
                        onMouseEnter={() => setHoveredCategoryTemplateId(t.template_id)}
                        onMouseLeave={() => setHoveredCategoryTemplateId(null)}
                      >
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            color: isCategoryHovered ? "#0284c7" : ACCENT,
                            background: isCategoryHovered ? "rgba(14,165,233,0.14)" : "rgba(14,165,233,0.08)",
                            border: `1px solid ${isCategoryHovered ? "rgba(14,165,233,0.35)" : "rgba(14,165,233,0.18)"}`,
                            padding: "2px 7px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {t.category}
                          {t.subcategory && (
                            <span
                              style={{
                                fontSize: "9px",
                                opacity: 0.7,
                                transform: isCategoryHovered ? "rotate(180deg)" : "none",
                                transition: "transform 0.15s ease",
                              }}
                            >
                              ▼
                            </span>
                          )}
                        </span>

                        {/* Floating Subcategory & Occasions Popover (revealed on hovering category) */}
                        {isCategoryHovered && t.subcategory && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: "0",
                              paddingTop: "6px",
                              zIndex: 250,
                              minWidth: "270px",
                              maxWidth: "340px",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 6px 12px -4px rgba(0, 0, 0, 0.08)",
                                padding: "12px 14px",
                                animation: "fadeIn 0.15s ease-out",
                              }}
                            >
                              {/* Subcategory Name & Details */}
                              <div
                                style={{
                                  marginBottom: hasOccasions ? "10px" : "0",
                                  borderBottom: hasOccasions ? "1px solid #f1f5f9" : "none",
                                  paddingBottom: hasOccasions ? "8px" : "0",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "9.5px",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                    color: "#64748b",
                                    marginBottom: "3px",
                                  }}
                                >
                                  Subcategory
                                </div>
                                <div
                                  style={{
                                    fontSize: "12.5px",
                                    fontWeight: "700",
                                    color: "#0f172a",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}
                                >
                                  <span style={{ color: ACCENT }}>📁</span>
                                  <span>{t.subcategory}</span>
                                </div>
                              </div>

                              {/* If occasions exist, display interactive occasion variation selector */}
                              {hasOccasions && (
                                <div>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: "700",
                                        color:
                                          t.category === "compliance"
                                            ? "#0369a1"
                                            : t.category === "taxation"
                                            ? "#047857"
                                            : t.category === "newsletter"
                                            ? "#9d174d"
                                            : "#92400e",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                    >
                                      <span>✨ Curated Variations ({t.occasions.length})</span>
                                    </span>
                                    <span
                                      style={{
                                        fontSize: "9px",
                                        color: "#94a3b8",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                      }}
                                    >
                                      Click to load theme
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "4px",
                                      maxHeight: "190px",
                                      overflowY: "auto",
                                    }}
                                  >
                                    {t.occasions.map((occ, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleStudioTemplateSelect(t.template_id);
                                          setHoveredCategoryTemplateId(null);
                                          try {
                                            const res = await api.get(
                                              `/api/admin/communication/templates/${t.template_id}/curated-variation?occasion=${encodeURIComponent(occ)}`
                                            );
                                            if (res.data) {
                                              setStudioSubject(res.data.subject);
                                              setStudioPreheader(res.data.preheader);
                                              setStudioBodyHtml(res.data.body_html);
                                              showToast(`Loaded ${t.name} with curated theme for: ${occ}`, "success");
                                            }
                                          } catch (_) {
                                            setStudioSubject(`${occ} — P Suman & Associates`);
                                            setStudioPreheader(
                                              `Special corporate update on ${occ} from P Suman & Associates.`
                                            );
                                            showToast(`Loaded ${t.name} for: ${occ}`, "info");
                                          }
                                        }}
                                        style={{
                                          textAlign: "left",
                                          padding: "7px 9px",
                                          borderRadius: "5px",
                                          fontSize: "11px",
                                          fontWeight: "500",
                                          color: "#1e293b",
                                          background: "#f8fafc",
                                          border: "1px solid #e2e8f0",
                                          cursor: "pointer",
                                          transition: "all 0.12s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "#eff6ff";
                                          e.currentTarget.style.borderColor = "#93c5fd";
                                          e.currentTarget.style.color = "#1d4ed8";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "#f8fafc";
                                          e.currentTarget.style.borderColor = "#e2e8f0";
                                          e.currentTarget.style.color = "#1e293b";
                                        }}
                                      >
                                        • {occ}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {t.is_system_template ? (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "rgba(14,165,233,0.1)",
                            color: "#0369a1",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: "600",
                          }}
                        >
                          System
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "10px",
                            background: "#f1f5f9",
                            color: "#475569",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: "600",
                          }}
                        >
                          Custom
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: TEXT_PRIMARY,
                        marginBottom: "4px",
                      }}
                    >
                      {t.name}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: TEXT_MUTED }}>
                      <div>
                        {t.has_pending_draft ? (
                          <span style={{ color: "#d97706", fontWeight: "600" }}>
                            ● Pending Draft (v{t.version})
                          </span>
                        ) : (
                          <span style={{ color: "#16a34a", fontWeight: "600" }}>
                            ✓ Live (v{t.version})
                          </span>
                        )}
                      </div>
                      {hasOccasions && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#92400e",
                            background: "#fef3c7",
                            border: "1px solid #fde68a",
                            borderRadius: "4px",
                            padding: "1px 6px",
                            fontWeight: "600",
                          }}
                        >
                          ✨ {t.occasions.length} Occasions
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Standalone Template Studio Editor */}
            <TemplateEditor
              backendUrl={BACKEND_URL}
              templates={templates}
              selectedTemplateId={studioSelectedTemplateId || selectedTemplateId}
              onTemplateSelect={handleStudioTemplateSelect}
              onTemplatesRefresh={fetchTemplates}
              subject={studioSubject}
              onSubjectChange={setStudioSubject}
              preheader={studioPreheader}
              onPreheaderChange={setStudioPreheader}
              bodyHtml={studioBodyHtml}
              onBodyHtmlChange={setStudioBodyHtml}
              applyWrapper={studioApplyWrapper}
              onApplyWrapperChange={setStudioApplyWrapper}
              senderName={studioSenderName}
              onSenderNameChange={setStudioSenderName}
              senderEmail={studioSenderEmail}
              onSenderEmailChange={setStudioSenderEmail}
              replyTo={studioReplyTo}
              onReplyToChange={setStudioReplyTo}
              cc={studioCc}
              onCcChange={setStudioCc}
              bcc={studioBcc}
              onBccChange={setStudioBcc}
              testRecipient={testRecipient || testRecipientInput}
              onTestSend={handleStudioTestSend}
              standaloneStudio={true}
            />
          </div>
        </div>
      )}

      {/* TAB: DELIVERABILITY & ANALYTICS */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
          <AdminAnalyticsCards
            backendUrl={BACKEND_URL}
            onNavigateToReplies={() => setActiveTab("replies")}
          />
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === "logs" && (
        <DeliveryLogsTable
          backendUrl={BACKEND_URL}
          campaigns={campaignsList}
          onRefreshCampaigns={fetchCampaigns}
        />
      )}

      {/* TAB: REPLIES & INBOUND */}
      {activeTab === "replies" && (
        <RepliesDashboard
          backendUrl={BACKEND_URL}
          campaigns={campaignsList}
        />
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
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
              maxWidth: "460px",
              padding: "24px",
              boxShadow: SHADOW_MD,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h4 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                Create New Email Template
              </h4>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: TEXT_MUTED,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={styles.label}>Template Name</label>
                <input
                  type="text"
                  value={newTplName}
                  onChange={(e) => {
                    setNewTplName(e.target.value);
                    if (!newTplId) {
                      setNewTplId(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, "_"));
                    }
                  }}
                  placeholder="e.g. Q3 Advisory Briefing"
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Template ID (Slug)</label>
                <input
                  type="text"
                  value={newTplId}
                  onChange={(e) => setNewTplId(e.target.value)}
                  placeholder="e.g. q3_advisory_briefing"
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Category</label>
                <select
                  value={newTplCategory}
                  onChange={(e) => setNewTplCategory(e.target.value)}
                  style={styles.input}
                >
                  <option value="announcement">Announcement</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="advisory">Advisory</option>
                  <option value="greeting">Greeting / Festive</option>
                  <option value="transactional">Transactional</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={styles.btnSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTemplate}
                  style={styles.btnPrimary}
                >
                  {creatingTemplate ? "Creating…" : "Create Draft Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review & Confirmation Modal */}
      <CampaignReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        campaign={pendingCampaign}
        frozenCount={pendingCampaign?.frozen_recipient_count || 0}
        onConfirm={handleConfirmDispatch}
        confirming={loading}
      />
    </AdminLayout>
  );
}
