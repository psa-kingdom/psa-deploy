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
} from "lucide-react";
import AudienceSelector from "../components/admin/AudienceSelector";
import TemplateEditor from "../components/admin/TemplateEditor";
import AdminAnalyticsCards from "../components/admin/AdminAnalyticsCards";
import CampaignReviewModal from "../components/admin/CampaignReviewModal";
import CampaignProgress from "../components/admin/CampaignProgress";
import DeliveryLogsTable from "../components/admin/DeliveryLogsTable";
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
      setTemplates(res.data);
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
    if (!campaignTitle || !subject || !bodyHtml) {
      showToast("Please fill in Title, Subject, and HTML Content.", "error");
      return;
    }
    if (
      (selectedSource === "manual" || selectedSource === "combined") &&
      manualEmails.length === 0
    ) {
      showToast("Please enter at least one manual recipient email.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/api/admin/communication/campaigns", {
        title: campaignTitle,
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
      background: "rgba(22,163,74,0.06)",
      border: "1px solid #16a34a",
      borderRadius: RADIUS_LG,
      padding: "20px 24px",
      boxShadow: "0 0 0 1px rgba(22,163,74,0.1)",
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
            background: sendMode === "production" ? "rgba(234, 179, 8, 0.15)" : "rgba(34, 197, 94, 0.12)",
            border: `1px solid ${sendMode === "production" ? "#eab308" : "#22c55e"}`,
            borderRadius: "8px",
            padding: "6px 14px",
            boxShadow: sendMode === "production" ? "0 0 16px rgba(234, 179, 8, 0.1)" : "0 0 16px rgba(34, 197, 94, 0.1)",
            transition: "all 0.2s ease",
          }}
        >
          <div
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: sendMode === "production" ? "#eab308" : "#22c55e",
              boxShadow: `0 0 8px ${sendMode === "production" ? "#eab308" : "#22c55e"}`,
              animation: sendMode === "production" ? "pulse 2s infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              color: sendMode === "production" ? "#fde047" : "#86efac",
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
      </div>

      {/* TAB: CAMPAIGNS */}
      {activeTab === "campaigns" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%", maxWidth: "100%" }}>
          {/* TEST MODE panel — single server-controlled test recipient with tag chip UX */}
          {sendMode === "test" && (
            <div style={styles.testModeCard}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Mail size={14} style={{ color: "#86efac" }} />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "0.06em",
                      color: "#86efac",
                      textTransform: "uppercase",
                    }}
                  >
                    TEST MODE ACTIVE
                  </span>
                </div>
                <span style={{ fontSize: "11px", color: "#4ade80", opacity: 0.8 }}>
                  Safety Layer 1 & 2 Enforced
                </span>
              </div>

              <label style={{ ...styles.label, color: "#4ade80" }}>Configured Test Recipient</label>

              {testRecipient && !isEditingTestRecipient ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(22, 163, 74, 0.2)",
                      border: "1px solid #166534",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      color: "#86efac",
                      fontFamily: "monospace",
                      fontSize: "13px",
                      fontWeight: "600",
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
                        color: "#86efac",
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
                      background: "transparent",
                      border: "1px solid #22c55e",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      color: "#86efac",
                      fontSize: "11px",
                      cursor: "pointer",
                    }}
                  >
                    Change Recipient
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    id="test-recipient-input"
                    type="email"
                    value={testRecipientInput}
                    onChange={(e) => setTestRecipientInput(e.target.value)}
                    placeholder="e.g. yourname@domain.com"
                    style={{
                      ...styles.input,
                      flex: 1,
                      // Green border on saved: intentional safety indicator, do not change
                      borderColor: testRecipientSaved ? "#16a34a" : BORDER,
                      background: SURFACE,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = testRecipientSaved ? "#16a34a" : BORDER)
                    }
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTestRecipient()}
                  />
                  <button
                    id="btn-save-test-recipient"
                    onClick={handleSaveTestRecipient}
                    disabled={savingTestRecipient || !testRecipientInput.trim()}
                    style={{
                      ...styles.btnGreen,
                      opacity: savingTestRecipient || !testRecipientInput.trim() ? 0.6 : 1,
                      cursor: savingTestRecipient || !testRecipientInput.trim() ? "not-allowed" : "pointer",
                    }}
                  >
                    <Save size={13} />
                    {savingTestRecipient ? "Saving…" : "Save Test Recipient"}
                  </button>
                  {testRecipient && isEditingTestRecipient && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTestRecipient(false)}
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        color: TEXT_MUTED,
                        borderRadius: RADIUS_MD,
                        padding: "6px 10px",
                        fontSize: "11px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              <p
                style={{
                  fontSize: "12px",
                  color: "#4ade80",
                  opacity: 0.75,
                  marginTop: "10px",
                  lineHeight: "1.5",
                }}
              >
                In Test Mode, emails are dispatched <strong>ONLY</strong> to the single server-controlled test recipient above.
                {!testRecipient && (
                  <span style={{ color: "#fbbf24", display: "block", marginTop: "4px" }}>
                    ⚠ No test recipient configured. Save an address above before testing.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Active campaign progress monitor */}
          {activeCampaign && (
            <CampaignProgress
              campaign={activeCampaign}
              onCancel={() => handleCancelCampaign(activeCampaign.campaign_id)}
              onDismiss={() => setActiveCampaign(null)}
            />
          )}

          {/* Composer card */}
          <div style={styles.card}>
            {/* Runtime Send Mode Switcher */}
            <div style={{ marginBottom: "20px" }}>
              <label style={styles.label}>Campaign Send Mode</label>
              {/* Test Mode / Production Mode option cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "10px",
                  marginTop: "6px",
                  marginBottom: "12px",
                }}
              >
                {/* Test Mode Option — green selected state is intentional safety indicator */}
                <div
                  id="btn-mode-test"
                  onClick={() => setSendMode("test")}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: RADIUS_MD,
                    cursor: "pointer",
                    border: sendMode === "test" ? "1px solid #10b981" : `1px solid ${BORDER}`,
                    background: sendMode === "test" ? "rgba(16,185,129,0.08)" : SURFACE_ALT,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      padding: "6px",
                      borderRadius: "6px",
                      background: sendMode === "test" ? "#10b981" : "#e2e8f0",
                      color: sendMode === "test" ? "#fff" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mail size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: sendMode === "test" ? "#059669" : TEXT_PRIMARY,
                      }}
                    >
                      TEST MODE (Sandbox)
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: sendMode === "test" ? "#10b981" : TEXT_MUTED,
                        marginTop: "2px",
                      }}
                    >
                      Strictly delivers only to configured test recipient
                    </div>
                  </div>
                </div>

                {/* Production Mode Option — amber selected state is intentional safety indicator */}
                <div
                  id="btn-mode-production"
                  onClick={() => setSendMode("production")}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: RADIUS_MD,
                    cursor: "pointer",
                    border: sendMode === "production" ? "1px solid #f59e0b" : `1px solid ${BORDER}`,
                    background: sendMode === "production" ? "rgba(245,158,11,0.08)" : SURFACE_ALT,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      padding: "6px",
                      borderRadius: "6px",
                      background: sendMode === "production" ? "#f59e0b" : "#e2e8f0",
                      color: sendMode === "production" ? "#fff" : "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Send size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: sendMode === "production" ? "#b45309" : TEXT_PRIMARY,
                      }}
                    >
                      PRODUCTION MODE
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: sendMode === "production" ? "#d97706" : TEXT_MUTED,
                        marginTop: "2px",
                      }}
                    >
                      Live broadcast — requires 2-step verification &amp; freeze
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Banner Description */}
              {sendMode === "test" ? (
                <div
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#6ee7b7",
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    <strong>Test Mode Active:</strong> All test emails will only be delivered to the configured test recipient (<strong>{testRecipient || "not set"}</strong>). Audience broadcasts are safely blocked.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "#fde68a",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>
                    <strong>Production Mode Active:</strong> This campaign will freeze an immutable recipient snapshot and dispatch to the verified final audience ({audienceEstimate?.net_target_count ?? 0} recipients).
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={styles.label}>Campaign Title</label>
              <input
                id="campaign-title"
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Q3 Advisory & Regulatory Update"
                style={styles.input}
              />
            </div>

            {/* Unified Audience Selection & Chip Recipient Management */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px", marginBottom: "20px" }}>
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

            {/* Template & Content Editor */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "20px", marginBottom: "20px" }}>
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
                testRecipient={testRecipient}
                onTestSend={handleTestSend}
                standaloneStudio={false}
              />
            </div>

            {/* Actions row */}
            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                paddingTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              {/* Test Send Button (Always available for pre-flight testing) */}
              <div>
                <button
                  id="btn-test-send"
                  onClick={handleTestSend}
                  disabled={testSending || !testRecipient}
                  title={
                    !testRecipient
                      ? "Set a Test Recipient above first"
                      : `Send test email to ${testRecipient}`
                  }
                  style={{
                    ...styles.btnSecondary,
                    opacity: testSending || !testRecipient ? 0.4 : 1,
                    cursor: testSending || !testRecipient ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={13} />
                  {testSending
                    ? "Sending Test…"
                    : `Send Test Email${testRecipient ? ` → ${testRecipient}` : ""}`}
                </button>
                {!testRecipient && (
                  <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                    Configure a test recipient above to enable test sending
                  </div>
                )}
              </div>

              {/* Production Review & Freeze Action */}
              {sendMode === "production" ? (
                <button
                  id="btn-review-dispatch"
                  onClick={handleCreateAndReview}
                  disabled={loading}
                  title="Freeze audience snapshot and review campaign confirmation"
                  style={{
                    ...styles.btnPrimary,
                    opacity: loading ? 0.4 : 1,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={14} />
                  {loading ? "Preparing Snapshot…" : "Review & Freeze Audience →"}
                </button>
              ) : (
                <div style={{ fontSize: "11px", color: TEXT_MUTED, fontStyle: "italic" }}>
                  Switch Send Mode to Production above to freeze &amp; broadcast to the full audience.
                </div>
              )}
            </div>

            {environment !== "production" && (
              <div
                style={{
                  fontSize: "11px",
                  color: TEXT_MUTED,
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: `1px solid ${BORDER}`,
                }}
              >
                Production campaign dispatch is guarded in Test Mode. Set{" "}
                <code style={{ background: SURFACE_ALT, border: `1px solid ${BORDER}`, padding: "1px 4px", borderRadius: "3px", fontFamily: "monospace", fontSize: "11px", color: TEXT_SECONDARY }}>
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
                return (
                  <div
                    key={t.template_id}
                    onClick={() => handleStudioTemplateSelect(t.template_id)}
                    style={{
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
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: ACCENT,
                        }}
                      >
                        {t.category}
                      </span>
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
                    <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
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
              testRecipient={testRecipient}
              onTestSend={handleStudioTestSend}
              standaloneStudio={true}
            />
          </div>
        </div>
      )}

      {/* TAB: DELIVERABILITY & ANALYTICS */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "100%" }}>
          <AdminAnalyticsCards backendUrl={BACKEND_URL} />
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
