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
import CampaignWizard from "../components/admin/CampaignWizard";
import TemplateStudioView from "../components/admin/TemplateStudioView";
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

          <CampaignWizard
            backendUrl={BACKEND_URL}
            sendMode={sendMode}
            setSendMode={setSendMode}
            campaignTitle={campaignTitle}
            setCampaignTitle={setCampaignTitle}
            selectedSource={selectedSource}
            setSelectedSource={setSelectedSource}
            manualEmails={manualEmails}
            setManualEmails={setManualEmails}
            excludedEmails={excludedEmails}
            setExcludedEmails={setExcludedEmails}
            audienceEstimate={audienceEstimate}
            setAudienceEstimate={setAudienceEstimate}
            testRecipient={testRecipient}
            testRecipientInput={testRecipientInput}
            setTestRecipientInput={setTestRecipientInput}
            handleSaveTestRecipient={handleSaveTestRecipient}
            handleRemoveTestRecipient={handleRemoveTestRecipient}
            savingTestRecipient={savingTestRecipient}
            isEditingTestRecipient={isEditingTestRecipient}
            setIsEditingTestRecipient={setIsEditingTestRecipient}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            handleTemplateSelect={handleTemplateSelect}
            fetchTemplates={fetchTemplates}
            subject={subject}
            setSubject={setSubject}
            preheader={preheader}
            setPreheader={setPreheader}
            bodyHtml={bodyHtml}
            setBodyHtml={setBodyHtml}
            applyWrapper={applyWrapper}
            setApplyWrapper={setApplyWrapper}
            senderName={senderName}
            setSenderName={setSenderName}
            senderEmail={senderEmail}
            setSenderEmail={setSenderEmail}
            replyTo={replyTo}
            setReplyTo={setReplyTo}
            cc={cc}
            setCc={setCc}
            bcc={bcc}
            setBcc={setBcc}
            handleTestSend={handleTestSend}
            testSending={testSending}
            handleCreateAndReview={handleCreateAndReview}
            loading={loading}
            showToast={showToast}
          />
        </div>
      )}

      {/* TAB: TEMPLATE STUDIO */}
      {activeTab === "templates" && (
        <TemplateStudioView
          backendUrl={BACKEND_URL}
          templates={templates}
          onTemplatesRefresh={fetchTemplates}
          onCreateNewClick={() => setShowCreateModal(true)}
          testRecipient={testRecipient || testRecipientInput}
          showToast={showToast}
        />
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
