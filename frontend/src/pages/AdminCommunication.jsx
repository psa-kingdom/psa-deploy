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
  RefreshCw,
} from "lucide-react";
import AudienceSelector from "../components/admin/AudienceSelector";
import TemplateEditor from "../components/admin/TemplateEditor";
import CampaignReviewModal from "../components/admin/CampaignReviewModal";
import CampaignProgress from "../components/admin/CampaignProgress";
import DeliveryLogsTable from "../components/admin/DeliveryLogsTable";
import AdminLayout from "../components/admin/AdminLayout";

// When deployed on Vercel, relative path uses /api/* rewrite proxy
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

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
  const [campaignTitle, setCampaignTitle] = useState("Independence Day 2026 Greetings");
  const [selectedSource, setSelectedSource] = useState("newsletter_subscriptions");
  const [manualEmails, setManualEmails] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("independence_day_2026");
  const [subject, setSubject] = useState("Happy Independence Day — P Suman & Associates");
  const [bodyHtml, setBodyHtml] = useState("");
  const [templates, setTemplates] = useState([]);
  const [audienceEstimate, setAudienceEstimate] = useState(null);

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
      const found = res.data.find((t) => t.template_id === "independence_day_2026");
      if (found && !bodyHtml) {
        setSubject(found.published_subject || found.draft_subject || subject);
        setBodyHtml(found.published_body_html || found.draft_body_html || "");
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/communication/campaigns");
      setCampaignsList(res.data);
      const sending = res.data.find(
        (c) => c.status === "sending" || c.status === "reviewing"
      );
      if (sending && !activeCampaign) {
        setActiveCampaign(sending);
      }
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setSubject(found.published_subject || found.draft_subject);
      setBodyHtml(found.published_body_html || found.draft_body_html);
    }
  };

  const buildTargetFilter = () => {
    const filter = { source: selectedSource };
    if (selectedSource === "manual" || selectedSource === "combined") {
      filter.custom_emails = manualEmails;
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
        subject: subject,
        body_html: bodyHtml,
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
        }
      );
      setIsReviewOpen(false);
      setActiveCampaign(res.data);
      fetchCampaigns();
      showToast(
        `Campaign confirmed! Dispatching ${res.data.frozen_recipient_count} emails.`,
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
        subject: subject,
        body_html: bodyHtml,
        // recipient_email is NOT sent — server enforces the configured test recipient
      });
      showToast(res.data.message || `Test email dispatched to ${res.data.recipient}!`, "success");
    } catch (err) {
      console.error("Test send error:", err);
      showToast(err.response?.data?.detail || "Test send failed.", "error");
    } finally {
      setTestSending(false);
    }
  };

  const isTestMode = environment !== "production";

  // ---- Styles ----
  const styles = {
    card: {
      background: "#0d0d14",
      border: "1px solid #1f1f2e",
      borderRadius: "10px",
      padding: "24px",
    },
    testModeCard: {
      background: "#0d1a0d",
      border: "1px solid #166534",
      borderRadius: "10px",
      padding: "20px 24px",
    },
    label: {
      display: "block",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "#6b7280",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      background: "#131320",
      border: "1px solid #252535",
      borderRadius: "8px",
      padding: "10px 12px",
      color: "#f3f4f6",
      fontSize: "13px",
      outline: "none",
      boxSizing: "border-box",
    },
    tab: (active) => ({
      padding: "8px 16px",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      background: "transparent",
      border: "none",
      color: active ? "#a78bfa" : "#6b7280",
      borderBottom: active ? "2px solid #8b5cf6" : "2px solid transparent",
      transition: "all 0.15s",
    }),
    btnPrimary: {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      color: "#fff",
      border: "none",
      borderRadius: "8px",
      padding: "10px 20px",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
    },
    btnSecondary: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "#131320",
      border: "1px solid #252535",
      borderRadius: "8px",
      padding: "8px 14px",
      fontSize: "12px",
      color: "#9ca3af",
      cursor: "pointer",
    },
    btnGreen: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "rgba(22, 163, 74, 0.15)",
      border: "1px solid #166534",
      borderRadius: "8px",
      padding: "8px 14px",
      fontSize: "12px",
      color: "#86efac",
      cursor: "pointer",
      transition: "all 0.15s",
    },
  };

  return (
    <AdminLayout environment={environment}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 9999,
            background:
              toastMsg.type === "error"
                ? "#1a0a0a"
                : toastMsg.type === "info"
                ? "#0a0f1a"
                : "#0a1a0a",
            border: `1px solid ${
              toastMsg.type === "error"
                ? "#dc2626"
                : toastMsg.type === "info"
                ? "#3b82f6"
                : "#16a34a"
            }`,
            color:
              toastMsg.type === "error"
                ? "#fca5a5"
                : toastMsg.type === "info"
                ? "#93c5fd"
                : "#86efac",
            borderRadius: "8px",
            padding: "12px 16px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            maxWidth: "360px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {toastMsg.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {toastMsg.msg}
        </div>
      )}

      {/* Page header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#f9fafb", marginBottom: "4px" }}>
          Communication Center
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Compose, test, review, and dispatch verified email campaigns to your audience.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1f1f2e", marginBottom: "24px" }}>
        <button style={styles.tab(activeTab === "campaigns")} onClick={() => setActiveTab("campaigns")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Send size={13} /> Campaigns
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
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "880px" }}>
          {/* TEST MODE panel — single server-controlled test recipient with tag chip UX */}
          {isTestMode && (
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
                      borderColor: testRecipientSaved ? "#166534" : "#252535",
                      background: "#0a140a",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = testRecipientSaved ? "#166534" : "#252535")
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
                        background: "#131320",
                        border: "1px solid #252535",
                        color: "#9ca3af",
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
            />
          )}

          {/* Composer card */}
          <div style={styles.card}>
            <div style={{ marginBottom: "20px" }}>
              <label style={styles.label}>Campaign Title</label>
              <input
                id="campaign-title"
                type="text"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="e.g. Independence Day 2026 Greetings"
                style={styles.input}
              />
            </div>

            {/* Unified Audience Selection & Chip Recipient Management */}
            <div style={{ borderTop: "1px solid #1f1f2e", paddingTop: "20px", marginBottom: "20px" }}>
              <AudienceSelector
                backendUrl={BACKEND_URL}
                selectedSource={selectedSource}
                onChange={setSelectedSource}
                manualEmails={manualEmails}
                onManualEmailsChange={setManualEmails}
                onEstimateLoaded={setAudienceEstimate}
              />
            </div>

            {/* Template & Content Editor */}
            <div style={{ borderTop: "1px solid #1f1f2e", paddingTop: "20px", marginBottom: "20px" }}>
              <TemplateEditor
                backendUrl={BACKEND_URL}
                templates={templates}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={handleTemplateSelect}
                subject={subject}
                onSubjectChange={setSubject}
                bodyHtml={bodyHtml}
                onBodyHtmlChange={setBodyHtml}
              />
            </div>

            {/* Actions row */}
            <div
              style={{
                borderTop: "1px solid #1f1f2e",
                paddingTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              {/* Test Send (only in test mode) */}
              {isTestMode ? (
                <div>
                  <button
                    id="btn-test-send"
                    onClick={handleTestSend}
                    disabled={testSending || !testRecipient}
                    title={
                      !testRecipient
                        ? "Set a Test Recipient above first"
                        : `Send real test to ${testRecipient}`
                    }
                    style={{
                      ...styles.btnSecondary,
                      opacity: testSending || !testRecipient ? 0.4 : 1,
                      cursor: testSending || !testRecipient ? "not-allowed" : "pointer",
                    }}
                  >
                    <Send size={13} />
                    {testSending
                      ? "Sending…"
                      : `Send Test${testRecipient ? ` → ${testRecipient}` : ""}`}
                  </button>
                  {!testRecipient && (
                    <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                      Set a test recipient above first
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#86efac", fontWeight: "500" }}>
                  ● Production Email Mode Active
                </div>
              )}

              {/* Production dispatch — available in all environments for staging/freezing */}
              <button
                id="btn-review-dispatch"
                onClick={handleCreateAndReview}
                disabled={loading || isTestMode}
                title={
                  isTestMode
                    ? "Production dispatch is disabled in Test Mode"
                    : "Freeze audience snapshot and review campaign"
                }
                style={{
                  ...styles.btnPrimary,
                  opacity: loading || isTestMode ? 0.4 : 1,
                  cursor: loading || isTestMode ? "not-allowed" : "pointer",
                }}
              >
                <Send size={14} />
                {loading ? "Preparing Snapshot…" : "Review & Freeze Audience →"}
              </button>
            </div>

            {isTestMode && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #1f1f2e",
                }}
              >
                Production campaign dispatch is guarded in Test Mode. Set{" "}
                <code style={{ background: "#131320", padding: "1px 4px", borderRadius: "3px" }}>
                  EMAIL_ENVIRONMENT=production
                </code>{" "}
                in Railway to enable live audience broadcast.
              </div>
            )}
          </div>

          {/* Campaign History */}
          {campaignsList.length > 0 && (
            <div style={styles.card}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "#d1d5db",
                  marginBottom: "16px",
                }}
              >
                Campaign History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {campaignsList.slice(0, 10).map((c) => (
                  <div
                    key={c.campaign_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "#131320",
                      borderRadius: "8px",
                      border: "1px solid #1f1f2e",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ color: "#d1d5db", fontWeight: "500" }}>{c.title}</div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ color: "#6b7280" }}>
                        {c.frozen_recipient_count} recipients
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          background:
                            c.status === "completed"
                              ? "rgba(22,163,74,0.15)"
                              : c.status === "sending"
                              ? "rgba(99,102,241,0.15)"
                              : c.status === "cancelled"
                              ? "rgba(239,68,68,0.1)"
                              : "rgba(107,114,128,0.15)",
                          color:
                            c.status === "completed"
                              ? "#86efac"
                              : c.status === "sending"
                              ? "#a5b4fc"
                              : c.status === "cancelled"
                              ? "#fca5a5"
                              : "#9ca3af",
                        }}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: AUDIT LOGS */}
      {activeTab === "logs" && <DeliveryLogsTable backendUrl={BACKEND_URL} />}

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
