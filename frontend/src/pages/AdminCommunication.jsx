/**
 * AdminCommunication — Communication Center
 *
 * Protected by AdminAuthGuard at the route level in App.js.
 * All axios calls use { withCredentials: true } to include the HttpOnly cookie.
 *
 * Audience sources (V1):
 *   - newsletter_subscriptions
 *   - manual (admin-entered emails)
 *   - combined (both)
 *
 * contact_submissions are NOT included.
 *
 * TEST MODE:
 *   When EMAIL_ENVIRONMENT !== "production", all test dispatches are
 *   routed server-side to the configured Test Recipient only.
 *   The backend enforces this — the frontend cannot override it.
 *
 * PRODUCTION MODE:
 *   When EMAIL_ENVIRONMENT === "production", the selected audience
 *   is used for the actual dispatch. Test Recipient UI is hidden.
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
} from "lucide-react";
import AudienceSelector from "../components/admin/AudienceSelector";
import TemplateEditor from "../components/admin/TemplateEditor";
import CampaignReviewModal from "../components/admin/CampaignReviewModal";
import CampaignProgress from "../components/admin/CampaignProgress";
import DeliveryLogsTable from "../components/admin/DeliveryLogsTable";
import AdminLayout from "../components/admin/AdminLayout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

// Axios instance that always sends the HttpOnly session cookie
const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

export default function AdminCommunication() {
  const [activeTab, setActiveTab] = useState("campaigns");

  // Environment state
  const [environment, setEnvironment] = useState("development");

  // Test recipient state (Test Mode only)
  const [testRecipient, setTestRecipient] = useState("");
  const [testRecipientInput, setTestRecipientInput] = useState("");
  const [savingTestRecipient, setSavingTestRecipient] = useState(false);
  const [testRecipientSaved, setTestRecipientSaved] = useState(false);

  // Campaign Composer State
  const [campaignTitle, setCampaignTitle] = useState("Independence Day 2026 Greetings");
  const [selectedSource, setSelectedSource] = useState("newsletter_subscriptions");
  const [manualEmails, setManualEmails] = useState("");
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
        test_recipient: testRecipientInput,
      });
      setTestRecipient(res.data.test_recipient);
      setTestRecipientInput(res.data.test_recipient);
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
      const emails = manualEmails
        .split(/[,;\n\r\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      filter.custom_emails = emails;
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
      !manualEmails.trim()
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
      showToast("Configure a Test Recipient below before sending a test.", "error");
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
    textarea: {
      width: "100%",
      background: "#131320",
      border: "1px solid #252535",
      borderRadius: "8px",
      padding: "10px 12px",
      color: "#f3f4f6",
      fontSize: "12px",
      fontFamily: "monospace",
      outline: "none",
      boxSizing: "border-box",
      resize: "vertical",
      minHeight: "90px",
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
      background: "rgba(22, 163, 74, 0.12)",
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
        <div style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 9999,
          background: toastMsg.type === "error" ? "#1a0a0a" : toastMsg.type === "info" ? "#0a0f1a" : "#0a1a0a",
          border: `1px solid ${toastMsg.type === "error" ? "#dc2626" : toastMsg.type === "info" ? "#3b82f6" : "#16a34a"}`,
          color: toastMsg.type === "error" ? "#fca5a5" : toastMsg.type === "info" ? "#93c5fd" : "#86efac",
          borderRadius: "8px",
          padding: "12px 16px",
          fontSize: "13px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          maxWidth: "360px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
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
          Compose, review, and send email campaigns to your audience.
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
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "860px" }}>

          {/* TEST MODE panel — only shown in non-production */}
          {isTestMode && (
            <div style={styles.testModeCard}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Mail size={14} style={{ color: "#86efac" }} />
                <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.06em", color: "#86efac", textTransform: "uppercase" }}>
                  TEST MODE
                </span>
              </div>

              <label style={{ ...styles.label, color: "#4ade80" }}>Test Recipient</label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  id="test-recipient-input"
                  type="email"
                  value={testRecipientInput}
                  onChange={(e) => setTestRecipientInput(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    ...styles.input,
                    flex: 1,
                    borderColor: testRecipientSaved ? "#166534" : "#252535",
                    background: "#0a140a",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#22c55e"}
                  onBlur={(e) => e.target.style.borderColor = testRecipientSaved ? "#166534" : "#252535"}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTestRecipient()}
                />
                <button
                  id="btn-save-test-recipient"
                  onClick={handleSaveTestRecipient}
                  disabled={savingTestRecipient}
                  style={{
                    ...styles.btnGreen,
                    opacity: savingTestRecipient ? 0.6 : 1,
                    cursor: savingTestRecipient ? "not-allowed" : "pointer",
                  }}
                >
                  <Save size={13} />
                  {savingTestRecipient ? "Saving…" : testRecipientSaved ? "Saved ✓" : "Save"}
                </button>
              </div>

              <p style={{ fontSize: "12px", color: "#4ade80", opacity: 0.7, marginTop: "10px", lineHeight: "1.5" }}>
                In Test Mode, campaign emails are sent <strong>ONLY</strong> to the configured Test Recipient above —
                regardless of the selected audience. The backend enforces this restriction.
                {!testRecipient && (
                  <span style={{ color: "#fbbf24", display: "block", marginTop: "6px" }}>
                    ⚠ No test recipient set. Test sends will fail until you save a valid email above.
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

            <div style={{ borderTop: "1px solid #1f1f2e", paddingTop: "20px", marginBottom: "20px" }}>
              {/* Audience Source Selector */}
              <label style={styles.label}>Recipient Audience</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                {[
                  { value: "newsletter_subscriptions", label: "Newsletter Subscribers" },
                  { value: "manual", label: "Manual Recipients" },
                  { value: "combined", label: "Both" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedSource(opt.value)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "500",
                      border: selectedSource === opt.value ? "1px solid #6366f1" : "1px solid #252535",
                      background: selectedSource === opt.value ? "rgba(99,102,241,0.15)" : "#131320",
                      color: selectedSource === opt.value ? "#a5b4fc" : "#9ca3af",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Manual emails textarea */}
              {(selectedSource === "manual" || selectedSource === "combined") && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ ...styles.label, marginTop: "8px" }}>
                    Manual Recipients (one per line, or comma-separated)
                  </label>
                  <textarea
                    id="manual-emails"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    placeholder={"example@domain.com\nanother@domain.com"}
                    style={styles.textarea}
                  />
                  <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "4px" }}>
                    {manualEmails.split(/[,;\n\r\s]+/).filter(e => e.trim()).length} entered
                  </div>
                </div>
              )}

              {/* Audience estimate */}
              <AudienceSelector
                backendUrl={BACKEND_URL}
                selectedSource={selectedSource}
                onChange={setSelectedSource}
                onEstimateLoaded={setAudienceEstimate}
              />
            </div>

            <div style={{ borderTop: "1px solid #1f1f2e", paddingTop: "20px", marginBottom: "20px" }}>
              {/* Template & Content Editor */}
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
            <div style={{
              borderTop: "1px solid #1f1f2e",
              paddingTop: "20px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}>
              {/* Test Send (only in test mode) */}
              {isTestMode && (
                <div>
                  <button
                    id="btn-test-send"
                    onClick={handleTestSend}
                    disabled={testSending || !testRecipient}
                    title={!testRecipient ? "Set a Test Recipient above first" : `Send test to ${testRecipient}`}
                    style={{
                      ...styles.btnSecondary,
                      opacity: testSending || !testRecipient ? 0.5 : 1,
                      cursor: testSending || !testRecipient ? "not-allowed" : "pointer",
                    }}
                  >
                    <Send size={13} />
                    {testSending ? "Sending…" : `Send Test${testRecipient ? ` → ${testRecipient}` : ""}`}
                  </button>
                  {!testRecipient && (
                    <div style={{ fontSize: "11px", color: "#f59e0b", marginTop: "4px" }}>
                      Set a test recipient above first
                    </div>
                  )}
                </div>
              )}

              {/* Production dispatch — available in all environments for staging/freezing */}
              <button
                id="btn-review-dispatch"
                onClick={handleCreateAndReview}
                disabled={loading || (isTestMode)}
                title={isTestMode ? "Production dispatch is disabled in Test Mode" : "Freeze audience and review campaign"}
                style={{
                  ...styles.btnPrimary,
                  opacity: loading || isTestMode ? 0.4 : 1,
                  cursor: loading || isTestMode ? "not-allowed" : "pointer",
                }}
              >
                <Send size={14} />
                {loading ? "Creating…" : "Review & Freeze Audience →"}
              </button>
            </div>

            {isTestMode && (
              <div style={{ fontSize: "11px", color: "#4b5563", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #1f1f2e" }}>
                Production dispatch is disabled in Test Mode. Switch to{" "}
                <code style={{ background: "#131320", padding: "1px 4px", borderRadius: "3px" }}>EMAIL_ENVIRONMENT=production</code>{" "}
                on Railway to enable production campaigns.
              </div>
            )}
          </div>

          {/* Campaign History */}
          {campaignsList.length > 0 && (
            <div style={styles.card}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#d1d5db", marginBottom: "16px" }}>
                Campaign History
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {campaignsList.slice(0, 10).map((c) => (
                  <div key={c.campaign_id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#131320",
                    borderRadius: "8px",
                    border: "1px solid #1f1f2e",
                    fontSize: "12px",
                  }}>
                    <div style={{ color: "#d1d5db", fontWeight: "500" }}>{c.title}</div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ color: "#6b7280" }}>
                        {c.frozen_recipient_count} recipients
                      </span>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        background: c.status === "completed"
                          ? "rgba(22,163,74,0.15)"
                          : c.status === "sending"
                          ? "rgba(99,102,241,0.15)"
                          : c.status === "cancelled"
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(107,114,128,0.15)",
                        color: c.status === "completed"
                          ? "#86efac"
                          : c.status === "sending"
                          ? "#a5b4fc"
                          : c.status === "cancelled"
                          ? "#fca5a5"
                          : "#9ca3af",
                      }}>
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
      {activeTab === "logs" && (
        <DeliveryLogsTable backendUrl={BACKEND_URL} />
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
