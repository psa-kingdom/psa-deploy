/**
 * CampaignWizard.jsx
 *
 * An ultra-friendly, clutter-free, 4-step wizard for composing and dispatching email campaigns.
 * Designed to be so simple and intuitive that anyone can understand it instantly,
 * while maintaining enterprise-grade power, safety guards, and live previews.
 *
 * Steps:
 * 1. Purpose (🧪 Send a Test vs 🚀 Send to Real Audience)
 * 2. Audience (Who gets this email?)
 * 3. Design & Message (Pick a template, customize subject & content with live preview)
 * 4. Review & Send (Pre-flight checks, final preview, and 1-click dispatch)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  Code,
  Paperclip,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Sliders,
  HelpCircle,
  Monitor,
  Smartphone,
  Check,
  ShieldCheck,
  Plus,
  X,
  FileSpreadsheet,
  ClipboardPaste,
  Search,
  Filter,
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

export default function CampaignWizard({
  backendUrl,
  sendMode,
  setSendMode,
  campaignTitle,
  setCampaignTitle,
  selectedSource,
  setSelectedSource,
  manualEmails,
  setManualEmails,
  excludedEmails,
  setExcludedEmails,
  audienceEstimate,
  setAudienceEstimate,
  testRecipient,
  testRecipientInput,
  setTestRecipientInput,
  handleSaveTestRecipient,
  handleRemoveTestRecipient,
  savingTestRecipient,
  isEditingTestRecipient,
  setIsEditingTestRecipient,
  templates,
  selectedTemplateId,
  handleTemplateSelect,
  fetchTemplates,
  subject,
  setSubject,
  preheader,
  setPreheader,
  bodyHtml,
  setBodyHtml,
  applyWrapper,
  setApplyWrapper,
  senderName,
  setSenderName,
  senderEmail,
  setSenderEmail,
  replyTo,
  setReplyTo,
  cc,
  setCc,
  bcc,
  setBcc,
  handleTestSend,
  testSending,
  handleCreateAndReview,
  loading,
  showToast,
}) {
  // Current wizard step: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = useState(1);

  // Editor mode in Step 3: 'preview' (visual friendly) vs 'code' (raw HTML)
  const [editorMode, setEditorMode] = useState("preview");
  const [previewDevice, setPreviewDevice] = useState("desktop"); // 'desktop' | 'mobile'
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [approvedSenders, setApprovedSenders] = useState([]);

  // Audience input helpers
  const [singleEmailInput, setSingleEmailInput] = useState("");
  const [showBulkPasteModal, setShowBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [showExclusions, setShowExclusions] = useState(false);
  const [exclusionInput, setExclusionInput] = useState("");

  // Live preview state
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewAbortRef = useRef(null);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // CC / BCC raw strings for inputs
  const [rawCc, setRawCc] = useState(Array.isArray(cc) ? cc.join(", ") : "");
  const [rawBcc, setRawBcc] = useState(Array.isArray(bcc) ? bcc.join(", ") : "");

  // Active selected template object
  const activeTemplate = templates.find((t) => t.template_id === selectedTemplateId);

  // Filter templates for broadcast picker
  const broadcastTemplates = templates.filter((t) => {
    const name = (t.name || "").toLowerCase();
    const id = (t.template_id || "").toLowerCase();
    const cat = (t.category || "").toLowerCase();
    if (name.includes("independence day") || id.includes("independence_day")) return false;
    if (name === "welcome template" || id === "f990c681-48dd-4d64-b17f-790ae0bca3ba") return false;
    if (cat === "transactional" || id === "contact_acknowledgement" || id === "newsletter_welcome") return false;
    return true;
  });

  // Fetch approved senders
  useEffect(() => {
    const fetchSenders = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/admin/communication/templates/senders`, {
          withCredentials: true,
        });
        setApprovedSenders(res.data || []);
      } catch (_) {}
    };
    fetchSenders();
  }, [backendUrl]);

  // Fetch audience estimate when source, manual, or exclusions change
  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const res = await axios.post(
          `${backendUrl}/api/admin/communication/campaigns/estimate`,
          {
            source: selectedSource,
            custom_emails: manualEmails || [],
            excluded_emails: excludedEmails || [],
          },
          { withCredentials: true }
        );
        setAudienceEstimate(res.data);
      } catch (err) {
        console.error("Audience estimate error:", err);
      }
    };
    const t = setTimeout(fetchEstimate, 250);
    return () => clearTimeout(t);
  }, [backendUrl, selectedSource, manualEmails, excludedEmails, setAudienceEstimate]);

  // Fetch live preview
  const fetchLivePreview = useCallback(async () => {
    if (!bodyHtml) {
      setPreviewData(null);
      return;
    }
    if (previewAbortRef.current) {
      previewAbortRef.current.abort();
    }
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
    const timer = setTimeout(fetchLivePreview, 400);
    return () => {
      clearTimeout(timer);
      if (previewAbortRef.current) previewAbortRef.current.abort();
    };
  }, [fetchLivePreview]);

  // Handle adding manual email
  const handleAddEmail = (e) => {
    if (e) e.preventDefault();
    const clean = singleEmailInput.trim().toLowerCase();
    if (!clean) return;

    const parts = clean
      .split(/[,;\s]+/)
      .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim())
      .filter((p) => p && p.includes("@"));

    if (parts.length > 0) {
      const newItems = parts.filter((p) => !manualEmails.includes(p));
      if (newItems.length > 0) {
        setManualEmails([...manualEmails, ...newItems]);
      }
    }
    setSingleEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove) => {
    setManualEmails(manualEmails.filter((e) => e !== emailToRemove));
  };

  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim()) {
      setShowBulkPasteModal(false);
      return;
    }
    const parts = bulkPasteText
      .split(/[,;\n\r\t\s]+/)
      .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim().toLowerCase())
      .filter((p) => p && p.includes("@"));

    const newItems = parts.filter((p) => !manualEmails.includes(p));
    setManualEmails([...manualEmails, ...newItems]);
    setBulkPasteText("");
    setShowBulkPasteModal(false);
    showToast(`Added ${newItems.length} emails!`, "success");
  };

  const handleAddExclusion = (e) => {
    if (e) e.preventDefault();
    const clean = exclusionInput.trim().toLowerCase();
    if (!clean || !clean.includes("@")) return;
    if (!excludedEmails.includes(clean)) {
      setExcludedEmails([...excludedEmails, clean]);
    }
    setExclusionInput("");
  };

  const handleRemoveExclusion = (emailToRemove) => {
    setExcludedEmails(excludedEmails.filter((e) => e !== emailToRemove));
  };

  // Curated variation applicator
  const handleApplyCuratedTheme = async (occasionName) => {
    if (!selectedTemplateId) return;
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/curated-variation?occasion=${encodeURIComponent(occasionName)}`,
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
      showToast(`Applied: ${occasionName}`, "info");
    }
  };

  // Variable inserter
  const insertVariable = (varName) => {
    const tag = `{{${varName}}}`;
    setBodyHtml((prev) => prev + ` ${tag} `);
    showToast(`Added ${tag} to email content!`, "info");
  };

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
            headers: { "Content-Type": "multipart/form-data" },
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

  // Readiness conditions
  const hasSubject = Boolean(subject && subject.trim());
  const hasContent = Boolean(bodyHtml && bodyHtml.trim() && bodyHtml !== "<p></p>");
  const hasTestRecipient = Boolean(testRecipient && testRecipient.trim());
  const hasAudience =
    sendMode === "test"
      ? hasTestRecipient
      : selectedSource === "newsletter_subscriptions"
      ? (audienceEstimate?.net_target_count ?? 1) > 0
      : manualEmails.length > 0;

  const isStep1Complete = sendMode === "test" ? hasTestRecipient : true;
  const isStep2Complete = hasAudience;
  const isStep3Complete = hasSubject && hasContent;

  const steps = [
    { number: 1, title: "Purpose", subtitle: sendMode === "test" ? "Test Sandbox" : "Live Broadcast" },
    { number: 2, title: "Audience", subtitle: sendMode === "test" ? "Yourself" : `${audienceEstimate?.net_target_count ?? manualEmails.length} recipients` },
    { number: 3, title: "Design & Content", subtitle: activeTemplate?.name || "Custom Design" },
    { number: 4, title: "Review & Send", subtitle: "Pre-flight Check" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
      {/* ─── Sleek Progress Stepper Bar ─── */}
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_LG,
          padding: "16px 20px",
          boxShadow: SHADOW_SM,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {steps.map((st) => {
            const isActive = currentStep === st.number;
            const isCompleted =
              (st.number === 1 && isStep1Complete && currentStep > 1) ||
              (st.number === 2 && isStep2Complete && currentStep > 2) ||
              (st.number === 3 && isStep3Complete && currentStep > 3);

            return (
              <div
                key={st.number}
                onClick={() => {
                  // Allow jumping back to earlier steps or next if valid
                  if (st.number <= currentStep || (st.number === 2 && isStep1Complete) || (st.number === 3 && isStep2Complete)) {
                    setCurrentStep(st.number);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: RADIUS_MD,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: isActive
                    ? "rgba(14, 165, 233, 0.08)"
                    : isCompleted
                    ? "rgba(22, 163, 74, 0.06)"
                    : "transparent",
                  border: isActive
                    ? "1.5px solid #0EA5E9"
                    : isCompleted
                    ? "1px solid rgba(22, 163, 74, 0.3)"
                    : `1px solid transparent`,
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: "700",
                    flexShrink: 0,
                    background: isCompleted
                      ? "#16A34A"
                      : isActive
                      ? "#0EA5E9"
                      : "#E2E8F0",
                    color: isCompleted || isActive ? "#FFFFFF" : TEXT_MUTED,
                    transition: "all 0.2s ease",
                  }}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : st.number}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: isActive ? "700" : "600",
                      color: isActive ? "#0284C7" : isCompleted ? "#15803D" : TEXT_SECONDARY,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {st.title}
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
                    {st.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── STEP 1: PURPOSE (Test vs Live) ─── */}
      {currentStep === 1 && (
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_LG,
            padding: "28px",
            boxShadow: SHADOW_SM,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
              Step 1: What do you want to do?
            </h2>
            <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: "4px 0 0" }}>
              Choose whether you are sending a quick test email to yourself or broadcasting to your audience.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "18px",
              marginBottom: "24px",
            }}
          >
            {/* Card 1: Test Mode */}
            <div
              id="card-mode-test"
              onClick={() => setSendMode("test")}
              style={{
                borderRadius: RADIUS_LG,
                padding: "20px",
                border: sendMode === "test" ? "2px solid #16A34A" : `1px solid ${BORDER}`,
                background: sendMode === "test" ? "#F0FDF4" : SURFACE_ALT,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: sendMode === "test" ? "0 4px 14px rgba(22, 163, 74, 0.12)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: sendMode === "test" ? "#16A34A" : "#CBD5E1",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Mail size={22} />
                  </div>
                  {sendMode === "test" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#16A34A",
                        background: "#DCFCE7",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      SELECTED
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: sendMode === "test" ? "#14532D" : TEXT_PRIMARY, margin: "0 0 6px" }}>
                  🧪 Send a Test Email
                </h3>
                <p style={{ fontSize: "12.5px", color: sendMode === "test" ? "#166534" : TEXT_MUTED, margin: 0, lineHeight: "1.5" }}>
                  Safe sandbox. Delivers a sample email directly to your own inbox so you can check how it looks on mobile and desktop. <strong>Zero risk — no client ever receives this.</strong>
                </p>
              </div>

              {/* In-card Test Recipient Config */}
              {sendMode === "test" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #BBF7D0",
                    borderRadius: RADIUS_MD,
                    padding: "14px",
                    marginTop: "6px",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label style={{ fontSize: "11px", fontWeight: "700", color: "#166534", display: "block", marginBottom: "6px" }}>
                    Your Test Email Address:
                  </label>
                  {testRecipient && !isEditingTestRecipient ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0A2540", fontFamily: "monospace" }}>
                        {testRecipient}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTestRecipientInput(testRecipient);
                          setIsEditingTestRecipient(true);
                        }}
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#16A34A",
                          background: "#F0FDF4",
                          border: "1px solid #86EFAC",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          cursor: "pointer",
                        }}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="email"
                        value={testRecipientInput}
                        onChange={(e) => setTestRecipientInput(e.target.value)}
                        placeholder="you@psumanassociates.com"
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: "12px",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          outline: "none",
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveTestRecipient()}
                      />
                      <button
                        type="button"
                        onClick={handleSaveTestRecipient}
                        disabled={savingTestRecipient || !testRecipientInput.trim()}
                        style={{
                          ...BTN_SUCCESS_STYLE,
                          padding: "8px 12px",
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                      >
                        {savingTestRecipient ? "Saving..." : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Live Campaign */}
            <div
              id="card-mode-production"
              onClick={() => setSendMode("production")}
              style={{
                borderRadius: RADIUS_LG,
                padding: "20px",
                border: sendMode === "production" ? "2px solid #D97706" : `1px solid ${BORDER}`,
                background: sendMode === "production" ? "#FFFBEB" : SURFACE_ALT,
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: sendMode === "production" ? "0 4px 14px rgba(217, 119, 6, 0.12)" : "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: sendMode === "production" ? "#D97706" : "#CBD5E1",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Send size={22} />
                  </div>
                  {sendMode === "production" && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#D97706",
                        background: "#FEF3C7",
                        padding: "3px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      SELECTED
                    </span>
                  )}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: sendMode === "production" ? "#78350F" : TEXT_PRIMARY, margin: "0 0 6px" }}>
                  🚀 Send to Real Audience
                </h3>
                <p style={{ fontSize: "12.5px", color: sendMode === "production" ? "#92400E" : TEXT_MUTED, margin: 0, lineHeight: "1.5" }}>
                  Official live broadcast. Delivers to your opted-in newsletter subscribers or client contact list. Includes unsubscribe links and audit tracking.
                </p>
              </div>

              {sendMode === "production" && (
                <div
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #FCD34D",
                    borderRadius: RADIUS_MD,
                    padding: "12px",
                    fontSize: "12px",
                    color: "#92400E",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ShieldCheck size={16} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span>Includes 2-step confirmation and frozen snapshot protection before sending.</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 1 Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => {
                if (sendMode === "test" && !hasTestRecipient) {
                  showToast("Please save your test email address above first.", "error");
                  return;
                }
                setCurrentStep(2);
              }}
              style={{
                ...BTN_PRIMARY_STYLE,
                padding: "12px 24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Continue to Step 2: Audience <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: AUDIENCE (Who receives this?) ─── */}
      {currentStep === 2 && (
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_LG,
            padding: "28px",
            boxShadow: SHADOW_SM,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
              Step 2: Who gets this email?
            </h2>
            <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: "4px 0 0" }}>
              {sendMode === "test"
                ? "In Test Mode, your email is sent strictly to you."
                : "Select which subscribers or clients should receive this live broadcast."}
            </p>
          </div>

          {sendMode === "test" ? (
            /* Test Mode Audience Notice */
            <div
              style={{
                background: "#F0FDF4",
                border: "1.5px solid #86EFAC",
                borderRadius: RADIUS_LG,
                padding: "24px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "#16A34A",
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#14532D", margin: "0 0 6px" }}>
                  Destination: {testRecipient || "Your Test Email"}
                </h4>
                <p style={{ fontSize: "13px", color: "#166534", margin: "0 0 12px", lineHeight: "1.5" }}>
                  This email is going to <strong>{testRecipient}</strong> only. All public subscribers and real client emails are completely blocked and safe.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #86EFAC",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontFamily: "monospace",
                      fontWeight: "700",
                      fontSize: "13px",
                      color: "#0A2540",
                    }}
                  >
                    {testRecipient}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestRecipientInput(testRecipient);
                      setIsEditingTestRecipient(true);
                      setCurrentStep(1);
                    }}
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#16A34A",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Change Address
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live Broadcast Audience Selector */
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "24px" }}>
              {/* 3 Simple Source Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* Option 1: Newsletter Subscribers */}
                <div
                  onClick={() => setSelectedSource("newsletter_subscriptions")}
                  style={{
                    borderRadius: RADIUS_MD,
                    padding: "18px",
                    border: selectedSource === "newsletter_subscriptions" ? "2px solid #0EA5E9" : `1px solid ${BORDER}`,
                    background: selectedSource === "newsletter_subscriptions" ? "rgba(14, 165, 233, 0.06)" : SURFACE_ALT,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Mail size={18} style={{ color: "#0EA5E9" }} />
                      <strong style={{ fontSize: "14px", color: TEXT_PRIMARY }}>Newsletter Subscribers</strong>
                    </div>
                    {selectedSource === "newsletter_subscriptions" && (
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "#0EA5E9", background: "#E0F2FE", padding: "2px 6px", borderRadius: "4px" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "0 0 10px", lineHeight: "1.4" }}>
                    All verified people who opted in to receive insights from your website.
                  </p>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0284C7" }}>
                    {audienceEstimate?.net_target_count !== undefined
                      ? `👥 ${audienceEstimate.net_target_count} active subscribers ready`
                      : "Loading subscribers count..."}
                  </div>
                </div>

                {/* Option 2: Custom Email List */}
                <div
                  onClick={() => setSelectedSource("manual")}
                  style={{
                    borderRadius: RADIUS_MD,
                    padding: "18px",
                    border: selectedSource === "manual" ? "2px solid #0EA5E9" : `1px solid ${BORDER}`,
                    background: selectedSource === "manual" ? "rgba(14, 165, 233, 0.06)" : SURFACE_ALT,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Users size={18} style={{ color: "#0EA5E9" }} />
                      <strong style={{ fontSize: "14px", color: TEXT_PRIMARY }}>Custom Email List</strong>
                    </div>
                    {selectedSource === "manual" && (
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "#0EA5E9", background: "#E0F2FE", padding: "2px 6px", borderRadius: "4px" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "0 0 10px", lineHeight: "1.4" }}>
                    Enter or paste specific email addresses manually for a targeted campaign.
                  </p>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0284C7" }}>
                    📋 {manualEmails.length} custom recipients added
                  </div>
                </div>

                {/* Option 3: Both Combined */}
                <div
                  onClick={() => setSelectedSource("combined")}
                  style={{
                    borderRadius: RADIUS_MD,
                    padding: "18px",
                    border: selectedSource === "combined" ? "2px solid #0EA5E9" : `1px solid ${BORDER}`,
                    background: selectedSource === "combined" ? "rgba(14, 165, 233, 0.06)" : SURFACE_ALT,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Sparkles size={18} style={{ color: "#0EA5E9" }} />
                      <strong style={{ fontSize: "14px", color: TEXT_PRIMARY }}>Everyone (Combined)</strong>
                    </div>
                    {selectedSource === "combined" && (
                      <span style={{ fontSize: "10px", fontWeight: "700", color: "#0EA5E9", background: "#E0F2FE", padding: "2px 6px", borderRadius: "4px" }}>
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "0 0 10px", lineHeight: "1.4" }}>
                    Subscribers + custom emails. Duplicates are filtered out automatically.
                  </p>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#0284C7" }}>
                    🌐 {audienceEstimate?.net_target_count ?? (manualEmails.length + 24)} total reach
                  </div>
                </div>
              </div>

              {/* If Manual or Combined, show the clean email adder */}
              {(selectedSource === "manual" || selectedSource === "combined") && (
                <div
                  style={{
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    padding: "18px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY }}>
                      Add Email Addresses:
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBulkPasteModal(true)}
                      style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#0284C7",
                        background: "#E0F2FE",
                        border: "none",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ClipboardPaste size={13} /> Paste Multiple Emails
                    </button>
                  </div>

                  {/* Add single email input */}
                  <form onSubmit={handleAddEmail} style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      type="email"
                      value={singleEmailInput}
                      onChange={(e) => setSingleEmailInput(e.target.value)}
                      placeholder="e.g. client@company.com"
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        fontSize: "13px",
                        border: `1px solid ${BORDER}`,
                        borderRadius: RADIUS_MD,
                        background: "#FFFFFF",
                        outline: "none",
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        ...BTN_PRIMARY_STYLE,
                        padding: "10px 18px",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Plus size={15} /> Add
                    </button>
                  </form>

                  {/* Added Email Chips */}
                  {manualEmails.length > 0 ? (
                    <div>
                      <div style={{ fontSize: "11px", color: TEXT_MUTED, marginBottom: "8px" }}>
                        Added recipients ({manualEmails.length}):
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", maxHeight: "140px", overflowY: "auto" }}>
                        {manualEmails.map((email, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              background: "#FFFFFF",
                              border: `1px solid ${BORDER}`,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontFamily: "monospace",
                              color: TEXT_PRIMARY,
                            }}
                          >
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(email)}
                              style={{ background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", padding: 0 }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: TEXT_MUTED, fontStyle: "italic" }}>
                      No custom emails added yet. Type an email address above or click "Paste Multiple Emails".
                    </div>
                  )}
                </div>
              )}

              {/* Collapsible Exclusions link */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowExclusions(!showExclusions)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: TEXT_MUTED,
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showExclusions ? "▲ Hide Exclusion List" : "⚙️ Need to exclude someone from this broadcast?"}
                </button>

                {showExclusions && (
                  <div
                    style={{
                      background: SURFACE_ALT,
                      border: `1px solid ${BORDER}`,
                      borderRadius: RADIUS_MD,
                      padding: "14px",
                      marginTop: "10px",
                    }}
                  >
                    <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_MUTED, display: "block", marginBottom: "6px" }}>
                      Exclude specific email addresses:
                    </label>
                    <form onSubmit={handleAddExclusion} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                      <input
                        type="email"
                        value={exclusionInput}
                        onChange={(e) => setExclusionInput(e.target.value)}
                        placeholder="exclude@company.com"
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: "12px",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          background: "#FFFFFF",
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          background: "#EF4444",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Exclude
                      </button>
                    </form>
                    {excludedEmails.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {excludedEmails.map((ex, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#FEE2E2",
                              color: "#991B1B",
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {ex}
                            <button
                              type="button"
                              onClick={() => handleRemoveExclusion(ex)}
                              style={{ background: "transparent", border: "none", cursor: "pointer", color: "#991B1B", padding: 0 }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2 Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              style={{
                ...BTN_SECONDARY_STYLE,
                padding: "10px 18px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (sendMode !== "test" && !hasAudience) {
                  showToast("Please add at least 1 recipient before continuing.", "error");
                  return;
                }
                setCurrentStep(3);
              }}
              style={{
                ...BTN_PRIMARY_STYLE,
                padding: "12px 24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Next: Design Email <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: DESIGN & CONTENT ─── */}
      {currentStep === 3 && (
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_LG,
            padding: "28px",
            boxShadow: SHADOW_SM,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
              Step 3: Design &amp; Write Your Email
            </h2>
            <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: "4px 0 0" }}>
              Pick a layout template, write your subject line, and personalize your message.
            </p>
          </div>

          {/* Internal Title Input */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY, display: "block", marginBottom: "6px" }}>
              Internal Campaign Name{" "}
              <span style={{ fontSize: "11px", color: TEXT_MUTED, fontWeight: "normal" }}>
                (only for your records, clients don't see this)
              </span>
            </label>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              placeholder="e.g. Q3 Advisory & Regulatory Update"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                outline: "none",
              }}
            />
          </div>

          {/* Visual Template Gallery Picker */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY }}>
                Choose Email Template:
              </label>
              <span style={{ fontSize: "11px", color: TEXT_MUTED }}>
                Click any template to auto-load its layout
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {broadcastTemplates.map((t) => {
                const isSelected = selectedTemplateId === t.template_id;
                return (
                  <div
                    key={t.template_id}
                    onClick={() => handleTemplateSelect(t.template_id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: RADIUS_MD,
                      border: isSelected ? "2px solid #0EA5E9" : `1px solid ${BORDER}`,
                      background: isSelected ? "rgba(14, 165, 233, 0.08)" : SURFACE_ALT,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          color: "#0284C7",
                          background: "#E0F2FE",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {t.category}
                      </span>
                      {isSelected && <CheckCircle2 size={14} style={{ color: "#0EA5E9" }} />}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: TEXT_PRIMARY, margin: "2px 0" }}>
                      {t.name}
                    </div>
                    {t.subcategory && (
                      <div style={{ fontSize: "11px", color: TEXT_MUTED }}>{t.subcategory}</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Curated Theme Variations (if template has occasions) */}
            {activeTemplate?.occasions && activeTemplate.occasions.length > 0 && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 16px",
                  background: "#FEF3C7",
                  border: "1px solid #FDE68A",
                  borderRadius: RADIUS_MD,
                }}
              >
                <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#92400E", marginBottom: "8px" }}>
                  ✨ Curated Seasonal Occasions for this template (1-click auto-fill):
                </div>
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
          </div>

          {/* Subject & Preheader Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY }}>
                  Email Subject Line *
                </label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setSubject((prev) => `${prev} {{name}}`.trim())}
                    style={{ fontSize: "10.5px", color: "#0284C7", background: "#E0F2FE", border: "none", borderRadius: "4px", padding: "2px 6px", cursor: "pointer" }}
                  >
                    + Add Name
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Corporate Tax Advisory FY 2026-27"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY, display: "block", marginBottom: "6px" }}>
                Inbox Preview Text (Preheader){" "}
                <span style={{ fontSize: "11px", color: TEXT_MUTED, fontWeight: "normal" }}>
                  (teaser in recipient's inbox)
                </span>
              </label>
              <input
                type="text"
                value={preheader}
                onChange={(e) => setPreheader(e.target.value)}
                placeholder="e.g. Key compliance deadlines and regulatory advisories for clients"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontSize: "13px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Quick Insert Tags Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "12px",
              padding: "10px 14px",
              background: SURFACE_ALT,
              borderRadius: RADIUS_MD,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11.5px", fontWeight: "700", color: TEXT_MUTED, display: "flex", alignItems: "center", gap: "4px" }}>
                <Sparkles size={13} style={{ color: "#F59E0B" }} /> Insert Personalized Tag:
              </span>
              {["name", "company", "email", "year"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  style={{
                    fontSize: "11px",
                    fontFamily: "monospace",
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                    padding: "3px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    color: TEXT_PRIMARY,
                  }}
                >
                  &#123;&#123;{tag}&#125;&#125;
                </button>
              ))}
            </div>

            {/* View Mode Toggle: Visual Live Preview vs HTML Code */}
            <div style={{ display: "flex", background: "#E2E8F0", padding: "2px", borderRadius: "6px" }}>
              <button
                type="button"
                onClick={() => setEditorMode("preview")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  background: editorMode === "preview" ? "#FFFFFF" : "transparent",
                  color: editorMode === "preview" ? TEXT_PRIMARY : TEXT_MUTED,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: editorMode === "preview" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Eye size={12} /> Live Preview
              </button>
              <button
                type="button"
                onClick={() => setEditorMode("code")}
                style={{
                  padding: "4px 10px",
                  fontSize: "11.5px",
                  fontWeight: "600",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer",
                  background: editorMode === "code" ? "#FFFFFF" : "transparent",
                  color: editorMode === "code" ? TEXT_PRIMARY : TEXT_MUTED,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: editorMode === "code" ? "0 1px 2px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <Code size={12} /> HTML Code
              </button>
            </div>
          </div>

          {/* Body Editor / Live Preview Display */}
          {editorMode === "preview" ? (
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
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
                    <Monitor size={12} /> Desktop (1150px)
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
                    <Smartphone size={12} /> Mobile (390px)
                  </button>
                </div>
              </div>

              <div
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  background: "#F8FAFC",
                  padding: "16px",
                  minHeight: "440px",
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
                    Updating preview...
                  </div>
                )}
                {previewData?.html ? (
                  <iframe
                    title="Live Preview"
                    srcDoc={previewData.html}
                    style={{
                      width: previewDevice === "mobile" ? "390px" : "100%",
                      maxWidth: "100%",
                      height: "480px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      boxShadow: SHADOW_SM,
                    }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: TEXT_MUTED, fontSize: "13px" }}>
                    Select a template above to see the live rendered email preview.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* HTML Code Editor */
            <div style={{ marginBottom: "20px" }}>
              <textarea
                rows={16}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="<h2>Author your email content...</h2>"
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "12.5px",
                  padding: "16px",
                  background: "#0F172A",
                  color: "#F1F5F9",
                  borderRadius: RADIUS_MD,
                  border: "1px solid #1E293B",
                  outline: "none",
                  lineHeight: "1.6",
                }}
              />
            </div>
          )}

          {/* File Attachments (Cloudflare R2) */}
          <div
            style={{
              background: SURFACE_ALT,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_MD,
              padding: "16px",
              marginBottom: "20px",
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
                        }}
                      >
                        + Insert Button in Email
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.attachment_id)}
                        style={{ background: "transparent", border: "none", color: "#EF4444", cursor: "pointer" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "11.5px", color: TEXT_MUTED, fontStyle: "italic" }}>
                No attachments added yet.
              </div>
            )}
          </div>

          {/* Advanced Settings Accordion (Closed by default) */}
          <div style={{ marginBottom: "24px" }}>
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "12px",
                fontWeight: "600",
                color: TEXT_MUTED,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Sliders size={13} />
              {showAdvancedSettings ? "▲ Hide Advanced Settings" : "⚙️ Advanced Settings (Sender Name, Reply-To, CC/BCC)"}
            </button>

            {showAdvancedSettings && (
              <div
                style={{
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  padding: "16px",
                  marginTop: "10px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: "14px",
                }}
              >
                <div>
                  <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, display: "block", marginBottom: "4px" }}>
                    Sender Display Name
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
                  <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, display: "block", marginBottom: "4px" }}>
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
                  <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, display: "block", marginBottom: "4px" }}>
                    Reply-To Address
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
                  <label style={{ fontSize: "11px", fontWeight: "700", color: TEXT_SECONDARY, display: "block", marginBottom: "4px" }}>
                    Email Wrapper Shell
                  </label>
                  <select
                    value={applyWrapper ? "yes" : "no"}
                    onChange={(e) => setApplyWrapper(e.target.value === "yes")}
                    style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: `1px solid ${BORDER}`, borderRadius: "6px" }}
                  >
                    <option value="yes">PSA Corporate 780px Shell (Recommended)</option>
                    <option value="no">Raw Custom HTML Only (Advanced)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Step 3 Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              style={{
                ...BTN_SECONDARY_STYLE,
                padding: "10px 18px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={15} /> Back to Audience
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasSubject) {
                  showToast("Please enter an email subject line.", "error");
                  return;
                }
                if (!hasContent) {
                  showToast("Please enter or select message content.", "error");
                  return;
                }
                setCurrentStep(4);
              }}
              style={{
                ...BTN_PRIMARY_STYLE,
                padding: "12px 24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              Next: Review &amp; Send <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 4: REVIEW & SEND ─── */}
      {currentStep === 4 && (
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_LG,
            padding: "28px",
            boxShadow: SHADOW_SM,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
              Step 4: Review &amp; Send Your Email
            </h2>
            <p style={{ fontSize: "13px", color: TEXT_MUTED, margin: "4px 0 0" }}>
              Double check your email summary. Everything is verified before dispatching.
            </p>
          </div>

          {/* Summary Card */}
          <div
            style={{
              background: sendMode === "test" ? "#F0FDF4" : "#FFFBEB",
              border: `1.5px solid ${sendMode === "test" ? "#86EFAC" : "#FCD34D"}`,
              borderRadius: RADIUS_LG,
              padding: "20px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: TEXT_MUTED }}>
                Mode
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: sendMode === "test" ? "#14532D" : "#78350F", marginTop: "2px" }}>
                {sendMode === "test" ? "🧪 Test Sandbox" : "🚀 Live Production"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: TEXT_MUTED }}>
                Recipient / Audience
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: TEXT_PRIMARY, marginTop: "2px" }}>
                {sendMode === "test"
                  ? testRecipient
                  : selectedSource === "newsletter_subscriptions"
                  ? `${audienceEstimate?.net_target_count ?? 24} Subscribers`
                  : `${audienceEstimate?.net_target_count ?? manualEmails.length} Recipients`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: TEXT_MUTED }}>
                Subject Line
              </div>
              <div style={{ fontSize: "14px", fontWeight: "700", color: TEXT_PRIMARY, marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {subject}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: TEXT_MUTED }}>
                Sender
              </div>
              <div style={{ fontSize: "13px", color: TEXT_SECONDARY, marginTop: "2px" }}>
                {senderName} &lt;{senderEmail || "updates@updates.psumanassociates.com"}&gt;
              </div>
            </div>
          </div>

          {/* Pre-Flight Checklist */}
          <div
            style={{
              background: SURFACE_ALT,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_MD,
              padding: "16px 20px",
              marginBottom: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#15803D" }}>
              <CheckCircle2 size={16} /> Mode Verified
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#15803D" }}>
              <CheckCircle2 size={16} /> Audience Verified
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#15803D" }}>
              <CheckCircle2 size={16} /> Subject Line Set
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#15803D" }}>
              <CheckCircle2 size={16} /> Email Content Ready
            </div>
          </div>

          {/* Mini Email Preview Card */}
          <div style={{ marginBottom: "28px" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: TEXT_PRIMARY, marginBottom: "8px" }}>
              Final Email Mockup:
            </div>
            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                background: "#F8FAFC",
                padding: "16px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              {previewData?.html ? (
                <iframe
                  title="Final Preview"
                  srcDoc={previewData.html}
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    height: "400px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#FFFFFF",
                    boxShadow: SHADOW_SM,
                  }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div style={{ color: TEXT_MUTED, fontSize: "13px", padding: "40px" }}>
                  Generating preview...
                </div>
              )}
            </div>
          </div>

          {/* Step 4 Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              style={{
                ...BTN_SECONDARY_STYLE,
                padding: "12px 20px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={15} /> Edit Content
            </button>

            {sendMode === "test" ? (
              <button
                type="button"
                id="btn-test-send-wizard"
                onClick={handleTestSend}
                disabled={testSending || !hasTestRecipient}
                style={{
                  ...BTN_SUCCESS_STYLE,
                  padding: "14px 28px",
                  fontSize: "15px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: testSending || !hasTestRecipient ? 0.6 : 1,
                  cursor: testSending || !hasTestRecipient ? "not-allowed" : "pointer",
                }}
              >
                <Send size={16} />
                {testSending ? "Sending Test Email..." : `Send Test Email to ${testRecipient} →`}
              </button>
            ) : (
              <button
                type="button"
                id="btn-review-dispatch-wizard"
                onClick={handleCreateAndReview}
                disabled={loading || !hasAudience}
                style={{
                  ...BTN_PRIMARY_STYLE,
                  background: "#D97706",
                  padding: "14px 28px",
                  fontSize: "15px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  opacity: loading || !hasAudience ? 0.6 : 1,
                  cursor: loading || !hasAudience ? "not-allowed" : "pointer",
                }}
              >
                <Send size={16} />
                {loading
                  ? "Preparing Audience..."
                  : `Review & Authorize Live Broadcast (${
                      selectedSource === "newsletter_subscriptions"
                        ? "Subscribers"
                        : `${audienceEstimate?.net_target_count ?? manualEmails.length} Recipients`
                    }) →`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Paste Modal */}
      {showBulkPasteModal && (
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
              maxWidth: "500px",
              padding: "24px",
              boxShadow: SHADOW_MD,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <h4 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                Paste Recipient Emails
              </h4>
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: TEXT_MUTED }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "0 0 12px" }}>
              Paste a list of emails separated by commas, semicolons, spaces, or line breaks.
            </p>
            <textarea
              rows={8}
              value={bulkPasteText}
              onChange={(e) => setBulkPasteText(e.target.value)}
              placeholder="alex@company.com&#10;sarah@enterprise.org&#10;vikram@finance.in"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "13px",
                fontFamily: "monospace",
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                outline: "none",
                marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowBulkPasteModal(false)}
                style={BTN_SECONDARY_STYLE}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkPaste}
                style={BTN_PRIMARY_STYLE}
              >
                Add Emails
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
