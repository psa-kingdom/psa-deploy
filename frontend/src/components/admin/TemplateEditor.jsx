import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Eye,
  Paperclip,
  UploadCloud,
  Trash2,
  FileText,
  Download,
  Code,
  Smartphone,
  Monitor,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Archive,
  RotateCcw,
  Save,
  Send,
  Sliders,
  HelpCircle,
  Shield,
  Layers,
  AlertOctagon,
  X,
} from "lucide-react";
import {
  SURFACE,
  SURFACE_ALT,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  ACCENT,
  SUCCESS,
  WARNING_DARK,
  WARNING_BG,
  WARNING_BORDER_STRONG,
  RADIUS_MD,
  RADIUS_LG,
  SHADOW_SM,
  SHADOW_MD,
  BTN_PRIMARY_STYLE,
  BTN_SECONDARY_STYLE,
  BTN_SUCCESS_STYLE,
} from "../../utils/adminTheme";

const STANDARD_VARIABLES = [
  { name: "name", desc: "Recipient's full name", sample: "Rajesh Sharma", type: "user", required: false },
  { name: "company", desc: "Recipient's organization", sample: "Bharat Financial Corp", type: "user", required: false },
  { name: "email", desc: "Recipient's email address", sample: "rajesh@example.com", type: "user", required: true },
  { name: "service_of_interest", desc: "Inquiry service requested", sample: "Tax Advisory & Audit", type: "user", required: false },
  { name: "unsubscribe_url", desc: "Secure tokenized unsubscribe link", sample: "https://psumanassociates.com/unsubscribe?token=...", type: "system", required: true },
  { name: "year", desc: "Current calendar year", sample: "2026", type: "system", required: false },
];

export default function TemplateEditor({
  backendUrl,
  templates = [],
  selectedTemplateId,
  onTemplateSelect,
  onTemplatesRefresh,
  subject = "",
  onSubjectChange,
  preheader = "",
  onPreheaderChange,
  bodyHtml = "",
  onBodyHtmlChange,
  applyWrapper = true,
  onApplyWrapperChange,
  senderName = "P Suman & Associates",
  onSenderNameChange,
  senderEmail = "",
  onSenderEmailChange,
  replyTo = "",
  onReplyToChange,
  cc = [],
  onCcChange,
  bcc = [],
  onBccChange,
  testRecipient = "",
  onTestSend,
  standaloneStudio = false,
  sendMode = "test",
  manualEmails = [],
  selectedSource = "newsletter_subscriptions",
  audienceEstimate = null,
}) {
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [attachments, setAttachments] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showDeliverySettings, setShowDeliverySettings] = useState(false);
  const [showVariablesPanel, setShowVariablesPanel] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [approvedSenders, setApprovedSenders] = useState([]);
  const [savingAction, setSavingAction] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);

  // Format recipient display name from email address
  const formatRecipientName = (email, fallback = "Valued Client") => {
    if (!email || !email.includes("@")) return fallback;
    const part = email.split("@")[0].replace(/[._-]/g, " ");
    return (
      part
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") || fallback
    );
  };

  // Compute actual recipient information for live preview
  let actualRecipientEmail = "contact@psumanassociates.com";
  let actualRecipientName = "Valued Customer";
  let actualToDisplay = "";

  if (standaloneStudio) {
    if (testRecipient && testRecipient.trim()) {
      actualRecipientEmail = testRecipient.trim();
      actualRecipientName = "Valued Customer";
      actualToDisplay = testRecipient.trim();
    } else {
      actualRecipientEmail = "preview@psumanassociates.com";
      actualRecipientName = "Valued Customer";
      actualToDisplay = "preview@psumanassociates.com";
    }
  } else if (sendMode === "test") {
    if (testRecipient && testRecipient.trim()) {
      actualRecipientEmail = testRecipient.trim();
      actualRecipientName = "Valued Customer";
      actualToDisplay = testRecipient.trim();
    } else {
      actualRecipientEmail = "test@psumanassociates.com";
      actualRecipientName = "Valued Customer";
      actualToDisplay = "(No test recipient configured yet — set in Step 2)";
    }
  } else {
    // Production Mode
    if (selectedSource === "manual") {
      if (manualEmails && manualEmails.length > 0) {
        actualRecipientEmail = manualEmails[0];
        actualRecipientName = "Valued Customer";
        if (manualEmails.length === 1) {
          actualToDisplay = manualEmails[0];
        } else if (manualEmails.length === 2) {
          actualToDisplay = `${manualEmails[0]}, ${manualEmails[1]}`;
        } else {
          actualToDisplay = `${manualEmails[0]}, ${manualEmails[1]} (+${manualEmails.length - 2} more)`;
        }
      } else {
        actualRecipientEmail = "client@domain.com";
        actualRecipientName = "Valued Customer";
        actualToDisplay = "(No manual recipients added yet — add in Step 2)";
      }
    } else if (selectedSource === "newsletter_subscriptions") {
      const count = audienceEstimate?.net_target_count ?? 0;
      actualRecipientEmail = "subscriber@client-domain.com";
      actualRecipientName = "Valued Customer";
      actualToDisplay = count > 0
        ? `Newsletter Subscribers (${count} verified opt-in recipients)`
        : "Newsletter Subscribers (Website Opt-ins)";
    } else {
      // combined
      const count = audienceEstimate?.net_target_count ?? (manualEmails.length || 0);
      actualRecipientEmail = manualEmails[0] || "subscriber@domain.com";
      actualRecipientName = "Valued Customer";
      actualToDisplay = count > 0
        ? `Combined Audience (${count} total verified recipients)`
        : "Subscribers + Manual Recipient List";
    }
  }

  // CC/BCC raw input helpers
  const [rawCc, setRawCc] = useState(Array.isArray(cc) ? cc.join(", ") : "");
  const [rawBcc, setRawBcc] = useState(Array.isArray(bcc) ? bcc.join(", ") : "");

  // Active selected template object
  const activeTemplate = templates.find((t) => t.template_id === selectedTemplateId);

  // Fetch approved senders
  const fetchApprovedSenders = useCallback(async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/communication/templates/senders`, {
        withCredentials: true,
      });
      setApprovedSenders(res.data || []);
    } catch (_) {
      // Fallback
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchApprovedSenders();
  }, [fetchApprovedSenders]);

  // Sync CC/BCC raw inputs when props change
  useEffect(() => {
    setRawCc(Array.isArray(cc) ? cc.join(", ") : "");
  }, [cc]);

  useEffect(() => {
    setRawBcc(Array.isArray(bcc) ? bcc.join(", ") : "");
  }, [bcc]);

  const handleCcBlur = () => {
    if (!onCcChange) return;
    const parts = rawCc
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.includes("@"));
    onCcChange(parts);
  };

  const handleBccBlur = () => {
    if (!onBccChange) return;
    const parts = rawBcc
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s && s.includes("@"));
    onBccChange(parts);
  };

  // Optimized Live preview fetcher with abort controller and smooth background updates
  const previewAbortControllerRef = useRef(null);

  const fetchLivePreview = useCallback(async () => {
    if (!bodyHtml) {
      setPreviewData(null);
      return;
    }

    if (previewAbortControllerRef.current) {
      previewAbortControllerRef.current.abort();
    }
    previewAbortControllerRef.current = new AbortController();

    // Only show full loading placeholder if we don't have any preview data yet
    setPreviewLoading(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/preview`,
        {
          subject: subject || "Subject Line",
          preheader: preheader || "",
          body_html: bodyHtml,
          apply_wrapper: applyWrapper,
          sender_name: senderName || "P Suman & Associates",
          sender_email: senderEmail || "updates@updates.psumanassociates.com",
          reply_to: replyTo || "contact@psumanassociates.com",
          cc: Array.isArray(cc) ? cc : [],
          bcc: Array.isArray(bcc) ? bcc : [],
          recipient_name: actualRecipientName,
          recipient_company: "P Suman & Associates Client",
          recipient_email: actualRecipientEmail,
        },
        {
          withCredentials: true,
          signal: previewAbortControllerRef.current.signal,
        }
      );
      setPreviewData(res.data);
    } catch (err) {
      if (!axios.isCancel(err) && err.name !== "CanceledError") {
        console.error("Preview render failed:", err);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, [
    backendUrl,
    subject,
    preheader,
    bodyHtml,
    applyWrapper,
    senderName,
    senderEmail,
    replyTo,
    cc,
    bcc,
    actualRecipientEmail,
    actualRecipientName,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLivePreview();
    }, 450);
    return () => {
      clearTimeout(timer);
      if (previewAbortControllerRef.current) {
        previewAbortControllerRef.current.abort();
      }
    };
  }, [fetchLivePreview]);

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
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        if (res.data?.attachment) {
          const att = res.data.attachment;
          setAttachments((prev) => [...prev, att]);
          showToast(`Uploaded ${att.filename} to Cloudflare R2`, "success");
        }
      } catch (err) {
        const detail = err?.response?.data?.detail || "Failed to upload file to Cloudflare R2.";
        setUploadError(detail);
        showToast(detail, "error");
      }
    }

    setUploadingAttachment(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveAttachment = async (attId) => {
    try {
      await axios.delete(`${backendUrl}/api/admin/attachments/${attId}`, {
        withCredentials: true,
      });
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attId));
      showToast("Attachment removed", "success");
    } catch (err) {
      setAttachments((prev) => prev.filter((a) => a.attachment_id !== attId));
    }
  };

  const handleInsertDownloadButton = (att) => {
    const buttonHtml = `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 18px 0;">
  <tr>
    <td align="center" style="border-radius: 8px; background: #0A2540;">
      <a href="${att.download_url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 24px; font-family: 'Cabinet Grotesk', -apple-system, sans-serif; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #0284c7; letter-spacing: 0.5px;">
        📥 Download ${att.filename}
      </a>
    </td>
  </tr>
</table>
`;
    onBodyHtmlChange(bodyHtml ? bodyHtml + buttonHtml : buttonHtml);
    showToast(`Added download button for ${att.filename} to email body`, "success");
  };

  const showToast = (msg, type = "success") => {
    setActionNotice({ msg, type });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Apply curated theme and content for a selected occasion / sub-theme
  const handleApplyCuratedVariation = async (occ) => {
    if (!activeTemplate) return;
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/templates/${activeTemplate.template_id}/curated-variation?occasion=${encodeURIComponent(occ)}`,
        { withCredentials: true }
      );
      if (res.data) {
        if (onSubjectChange && res.data.subject) onSubjectChange(res.data.subject);
        if (onPreheaderChange && res.data.preheader) onPreheaderChange(res.data.preheader);
        if (onBodyHtmlChange && res.data.body_html) onBodyHtmlChange(res.data.body_html);
        showToast(`Applied curated theme for: ${occ}`, "success");
      }
    } catch (_) {
      if (onSubjectChange) onSubjectChange(`${occ} — P Suman & Associates`);
      if (onPreheaderChange) onPreheaderChange(`Special corporate update on ${occ} from P Suman & Associates.`);
      showToast(`Applied: ${occ}`, "info");
    }
  };

  // Variable insertion
  const insertVariable = (varName) => {
    const tag = `{{${varName}}}`;
    if (onBodyHtmlChange) {
      onBodyHtmlChange(bodyHtml + tag);
    }
  };

  // Version history loader
  const handleOpenHistory = async () => {
    if (!selectedTemplateId) return;
    setShowHistoryDrawer(true);
    setHistoryLoading(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/history`,
        { withCredentials: true }
      );
      setHistoryList(res.data || []);
    } catch (err) {
      console.error("Failed to load template history:", err);
      showToast("Unable to load version history.", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Restore historical version as draft
  const handleRestoreVersion = async (versionId) => {
    if (!selectedTemplateId || !versionId) return;
    setSavingAction(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/restore/${versionId}`,
        {},
        { withCredentials: true }
      );
      showToast("Historical version restored to draft. Review and test before publishing.", "info");
      setShowHistoryDrawer(false);
      if (onTemplatesRefresh) onTemplatesRefresh();
      // Update form fields to match restored draft
      if (onSubjectChange) onSubjectChange(res.data.draft_subject || "");
      if (onPreheaderChange) onPreheaderChange(res.data.draft_preheader || "");
      if (onBodyHtmlChange) onBodyHtmlChange(res.data.draft_body_html || "");
      if (onApplyWrapperChange) onApplyWrapperChange(res.data.apply_wrapper ?? true);
      if (onSenderNameChange) onSenderNameChange(res.data.sender_name || "P Suman & Associates");
      if (onSenderEmailChange) onSenderEmailChange(res.data.sender_email || "");
      if (onReplyToChange) onReplyToChange(res.data.reply_to || "");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to restore version.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Save Draft action
  const handleSaveDraft = async () => {
    if (!selectedTemplateId) {
      showToast("Please select or create a template first.", "error");
      return;
    }
    setSavingAction(true);
    try {
      await axios.put(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}`,
        {
          subject: subject,
          preheader: preheader,
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
      showToast("Draft saved successfully. Production remains safe until published.", "success");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to save draft.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Publish action
  const handlePublish = async () => {
    if (!selectedTemplateId) {
      showToast("Please select a template to publish.", "error");
      return;
    }
    if (!subject.trim()) {
      showToast("A subject line is required before publishing.", "error");
      return;
    }
    if (!bodyHtml.trim()) {
      showToast("HTML body content is required before publishing.", "error");
      return;
    }

    if (activeTemplate?.is_system_template) {
      const confirmMsg =
        "Warning: This is an automated system template. Publishing changes will affect future automated customer messages immediately. Proceed?";
      if (!window.confirm(confirmMsg)) return;
    }

    setSavingAction(true);
    try {
      // First save the current draft fields
      await axios.put(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}`,
        {
          subject: subject,
          preheader: preheader,
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

      // Then trigger publish
      const pubRes = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/publish`,
        {},
        { withCredentials: true }
      );

      showToast(`Template published live as Version ${pubRes.data.version}!`, "success");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to publish template.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Duplicate Template
  const handleDuplicate = async () => {
    if (!selectedTemplateId) return;
    setSavingAction(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/duplicate`,
        {},
        { withCredentials: true }
      );
      showToast(`Duplicated as "${res.data.name}". Switched to new copy.`, "success");
      if (onTemplatesRefresh) await onTemplatesRefresh();
      if (onTemplateSelect) onTemplateSelect(res.data.template_id);
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to duplicate template.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Archive / Unarchive
  const handleToggleArchive = async () => {
    if (!selectedTemplateId || !activeTemplate) return;
    const isArchived = activeTemplate.is_archived;
    const action = isArchived ? "unarchive" : "archive";

    if (!isArchived && activeTemplate.is_system_template) {
      if (["contact_acknowledgement", "newsletter_welcome"].includes(activeTemplate.system_template_key)) {
        showToast("Active autoresponder system templates cannot be archived.", "error");
        return;
      }
    }

    setSavingAction(true);
    try {
      await axios.post(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/${action}`,
        {},
        { withCredentials: true }
      );
      showToast(`Template successfully ${isArchived ? "restored" : "archived"}.`, "info");
      if (onTemplatesRefresh) onTemplatesRefresh();
    } catch (err) {
      showToast(err.response?.data?.detail || `Failed to ${action} template.`, "error");
    } finally {
      setSavingAction(false);
    }
  };

  // Discard draft
  const handleDiscardDraft = async () => {
    if (!selectedTemplateId) return;
    if (!window.confirm("Discard all pending draft edits and revert to published version?")) return;
    setSavingAction(true);
    try {
      const res = await axios.delete(
        `${backendUrl}/api/admin/communication/templates/${selectedTemplateId}/draft`,
        { withCredentials: true }
      );
      showToast("Draft edits discarded. Reverted to published content.", "info");
      if (onTemplatesRefresh) onTemplatesRefresh();
      if (onSubjectChange) onSubjectChange(res.data.published_subject || "");
      if (onPreheaderChange) onPreheaderChange(res.data.published_preheader || "");
      if (onBodyHtmlChange) onBodyHtmlChange(res.data.published_body_html || "");
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to discard draft.", "error");
    } finally {
      setSavingAction(false);
    }
  };

  const unknownVars = previewData?.variable_analysis?.unknown_variables || [];
  const compatWarnings = previewData?.compatibility_warnings || [];

  return (
    <div className="space-y-6" style={{ position: "relative" }}>
      {/* Toast Notice */}
      {actionNotice && (
        <div
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 9999,
            background: SURFACE,
            borderLeft: `4px solid ${
              actionNotice.type === "error"
                ? "#dc2626"
                : actionNotice.type === "info"
                ? ACCENT
                : SUCCESS
            }`,
            border: `1px solid ${BORDER}`,
            color: actionNotice.type === "error" ? "#dc2626" : TEXT_PRIMARY,
            borderRadius: RADIUS_MD,
            padding: "12px 16px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: SHADOW_MD,
            fontWeight: "500",
          }}
        >
          {actionNotice.type === "error" ? (
            <AlertOctagon size={16} />
          ) : (
            <CheckCircle2 size={16} style={{ color: SUCCESS }} />
          )}
          {actionNotice.msg}
        </div>
      )}

      {/* Top Bar: Selector & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-serif font-bold text-navy">
              {standaloneStudio ? "Template Studio" : "2. Compose Email Content"}
            </h3>
            {activeTemplate?.is_system_template && (
              <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded border border-sky-300 flex items-center gap-1">
                <Shield size={10} /> SYSTEM TEMPLATE
              </span>
            )}
            {activeTemplate?.has_pending_draft && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                <Clock size={10} /> DRAFT CHANGES PENDING
              </span>
            )}
            {activeTemplate && !activeTemplate.has_pending_draft && (
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 size={10} /> LIVE (v{activeTemplate.version})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {standaloneStudio
              ? "Manage templates, draft changes safely, inspect history, and publish production dispatches."
              : "Select a published template or author custom email content."}
          </p>
        </div>

        {/* Template Selector & Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Template:</label>
          <select
            value={selectedTemplateId || ""}
            onChange={(e) => onTemplateSelect && onTemplateSelect(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="">-- Custom (No Template) --</option>
            {templates
              .filter((t) => {
                const name = (t.name || "").toLowerCase();
                const id = (t.template_id || "").toLowerCase();
                const cat = (t.category || "").toLowerCase();

                // Remove standalone Independence Day (already present in Festive Greetings)
                if (name.includes("independence day") || id.includes("independence_day")) return false;

                // Remove legacy duplicate Welcome template
                if (name === "welcome template" || id === "f990c681-48dd-4d64-b17f-790ae0bca3ba") return false;

                // In campaign mode, hide transactional website autoresponders from campaign broadcast dropdown
                if (!standaloneStudio) {
                  if (cat === "transactional") return false;
                  if (id === "contact_acknowledgement" || id === "newsletter_welcome") return false;
                  if (t.subcategory === "Client Inquiries" || t.subcategory === "Subscriber Onboarding") return false;
                }

                return true;
              })
              .map((t) => (
                <option key={t.template_id} value={t.template_id}>
                  {t.name} {t.subcategory ? `[${t.subcategory}]` : `(${t.category})`} {t.has_pending_draft ? "• [Draft]" : `[v${t.version}]`}
                </option>
              ))}
          </select>

          {selectedTemplateId && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={savingAction}
                title="Duplicate this template"
                className="p-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1"
              >
                <Copy size={13} /> Duplicate
              </button>

              <button
                type="button"
                onClick={handleOpenHistory}
                title="View Version History"
                className="p-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1"
              >
                <RotateCcw size={13} /> History
              </button>

              <button
                type="button"
                onClick={handleToggleArchive}
                disabled={savingAction}
                title={activeTemplate?.is_archived ? "Restore template" : "Archive template"}
                className="p-1.5 rounded text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1"
              >
                <Archive size={13} /> {activeTemplate?.is_archived ? "Restore" : "Archive"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* System Template Notice */}
      {activeTemplate?.is_system_template && (
        <div
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.25)",
            borderRadius: RADIUS_MD,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12px",
            color: "#0369a1",
          }}
        >
          <Shield size={16} className="text-sky-600 flex-shrink-0" />
          <span>
            <strong>System Autoresponder Template:</strong> This template is utilized by public automated flows (e.g. inquiry confirmations or newsletter welcome). Edits are saved safely as a draft; only clicking <strong>Publish to Live</strong> updates future dispatches.
          </span>
        </div>
      )}

      {/* Occasion / Subcategory Variation Selector */}
      {activeTemplate?.occasions && activeTemplate.occasions.length > 0 && (
        <div
          className={`rounded-lg p-3 border transition-colors ${
            activeTemplate.category === "compliance"
              ? "bg-sky-50/80 border-sky-200"
              : activeTemplate.category === "taxation"
              ? "bg-emerald-50/80 border-emerald-200"
              : activeTemplate.category === "newsletter"
              ? "bg-rose-50/80 border-rose-200"
              : "bg-amber-50/80 border-amber-200"
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                activeTemplate.category === "compliance"
                  ? "text-sky-900"
                  : activeTemplate.category === "taxation"
                  ? "text-emerald-900"
                  : activeTemplate.category === "newsletter"
                  ? "text-rose-900"
                  : "text-amber-900"
              }`}
            >
              <span>✨ Curated Theme &amp; Subcategory Variations:</span>
              {activeTemplate.subcategory && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    activeTemplate.category === "compliance"
                      ? "bg-sky-200/80 text-sky-800"
                      : activeTemplate.category === "taxation"
                      ? "bg-emerald-200/80 text-emerald-800"
                      : activeTemplate.category === "newsletter"
                      ? "bg-rose-200/80 text-rose-800"
                      : "bg-amber-200/80 text-amber-800"
                  }`}
                >
                  {activeTemplate.subcategory}
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-500">
              Click any variation to apply curated subject, preheader &amp; HTML theme
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeTemplate.occasions.map((occ, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyCuratedVariation(occ)}
                className="text-xs px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:border-sky-500 hover:bg-sky-50/60 text-slate-800 font-medium transition-all shadow-2xs cursor-pointer flex items-center gap-1"
              >
                <span>{occ}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject & Preheader Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Email Subject Line *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange && onSubjectChange(e.target.value)}
            placeholder="e.g. Corporate Tax Advisory & Compliance Notice"
            maxLength={250}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Preheader / Preview Text</span>
            <span className="text-[10px] text-slate-400 lowercase font-normal">inbox snippet text</span>
          </label>
          <input
            type="text"
            value={preheader}
            onChange={(e) => onPreheaderChange && onPreheaderChange(e.target.value)}
            placeholder="e.g. Important regulatory updates regarding FY 2026-27 compliance..."
            maxLength={180}
            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>
      </div>

      {/* Cloudflare R2 Attachments Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky flex items-center justify-center border border-sky-200/60">
              <Paperclip size={15} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Attachments &amp; Downloads (Cloudflare R2)
              </span>
              <span className="text-[11px] text-slate-500">
                Upload documents to Cloudflare R2 and generate 1-click download buttons in your email.
              </span>
            </div>
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttachment}
              className="px-3.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud size={14} className="text-sky" />
              {uploadingAttachment ? "Uploading to R2..." : "Add Attachment"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleAttachmentUpload}
              className="hidden"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.zip,.txt"
            />
          </div>
        </div>

        {uploadError && (
          <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {uploadError}
          </div>
        )}

        {attachments.length === 0 ? (
          <div className="mt-2 text-xs text-slate-400 italic py-2 px-3 bg-white/60 rounded-lg border border-dashed border-slate-200 text-center">
            No files attached yet. Click <strong>"Add Attachment"</strong> to upload reports, PDFs, or spreadsheets to Cloudflare R2.
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {attachments.map((att) => (
              <div
                key={att.attachment_id}
                className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2.5 truncate max-w-[340px]">
                  <FileText size={16} className="text-sky shrink-0" />
                  <span className="truncate font-semibold text-slate-800" title={att.filename}>
                    {att.filename}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono shrink-0">
                    ({(att.size_bytes / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleInsertDownloadButton(att)}
                    className="px-2.5 py-1 text-xs bg-sky/10 hover:bg-sky/20 text-sky font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    title="Insert 📥 Download Button directly into email content"
                  >
                    <Download size={12} />
                    Insert in Email
                  </button>
                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    title="Test Download File"
                  >
                    <Download size={14} />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.attachment_id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    title="Remove Attachment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toolbar: Placeholders, Delivery Settings Toggle, Variables Documentation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs">
        {/* Quick Placeholder Inserter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Sparkles size={13} className="text-amber-500" /> Insert Tag:
          </span>
          {["name", "company", "email", "unsubscribe_url"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="bg-white hover:bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200 text-[11px] transition-colors"
            >
              &#123;&#123;{v}&#125;&#125;
            </button>
          ))}
        </div>

        {/* Action toggles */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDeliverySettings(!showDeliverySettings)}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
              showDeliverySettings
                ? "bg-navy text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
            }`}
          >
            <Sliders size={12} /> Delivery Settings
          </button>
          <button
            type="button"
            onClick={() => setShowVariablesPanel(!showVariablesPanel)}
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
              showVariablesPanel
                ? "bg-navy text-white"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
            }`}
          >
            <HelpCircle size={12} /> Variables Reference
          </button>
        </div>
      </div>

      {/* Delivery Settings Drawer / Panel */}
      {showDeliverySettings && (
        <div className="bg-white border border-slate-300 rounded-lg p-4 space-y-4 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Sliders size={14} className="text-sky-600" /> Advanced Delivery Configuration
            </h4>
            <span className="text-[11px] text-slate-400">Restricted to verified sending identities only</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-600 mb-1">Sender Display Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => onSenderNameChange && onSenderNameChange(e.target.value)}
                placeholder="e.g. P Suman & Associates"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Appears in client inbox header</span>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Approved Sender Email</label>
              <select
                value={senderEmail || ""}
                onChange={(e) => onSenderEmailChange && onSenderEmailChange(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-mono"
              >
                <option value="">Default (updates@updates.psumanassociates.com)</option>
                {approvedSenders.map((s, idx) => (
                  <option key={idx} value={s.email}>
                    {s.name} &lt;{s.email}&gt;
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Arbitrary external domains are blocked by server-side allowlist.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">Reply-To Address</label>
              <input
                type="email"
                value={replyTo}
                onChange={(e) => onReplyToChange && onReplyToChange(e.target.value)}
                placeholder="updates@updates.psumanassociates.com"
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Use an @updates.psumanassociates.com address (or leave empty) to capture inbound replies in the Replies Dashboard.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-600 mb-1">CC / BCC (Separate by commas)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={rawCc}
                  onChange={(e) => setRawCc(e.target.value)}
                  onBlur={handleCcBlur}
                  placeholder="CC: email@domain.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-mono"
                />
                <input
                  type="text"
                  value={rawBcc}
                  onChange={(e) => setRawBcc(e.target.value)}
                  onBlur={handleBccBlur}
                  placeholder="BCC: audit@domain.com"
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-slate-800 font-mono"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                In campaigns, recipients are isolated individually and never exposed via CC.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Variables Documentation Panel */}
      {showVariablesPanel && (
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-4 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HelpCircle size={14} className="text-amber-500" /> Supported Personalization Variables
            </h4>
            <span className="text-[11px] text-slate-400">Click variable tag to insert into cursor</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="py-1.5 px-2">Variable</th>
                  <th className="py-1.5 px-2">Description</th>
                  <th className="py-1.5 px-2">Sample Preview Value</th>
                  <th className="py-1.5 px-2">Classification</th>
                  <th className="py-1.5 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {STANDARD_VARIABLES.map((v) => (
                  <tr key={v.name} className="hover:bg-white transition-colors">
                    <td className="py-1.5 px-2 font-bold text-navy">&#123;&#123;{v.name}&#125;&#125;</td>
                    <td className="py-1.5 px-2 font-sans text-slate-600">{v.desc}</td>
                    <td className="py-1.5 px-2 text-slate-500">{v.sample}</td>
                    <td className="py-1.5 px-2 font-sans">
                      {v.type === "system" ? (
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                          System Controlled
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                          Recipient Data
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => insertVariable(v.name)}
                        className="text-[11px] bg-navy text-white px-2 py-0.5 rounded hover:bg-slate-800"
                      >
                        Insert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Validation Warnings (Unknown Variables & Compatibility Checks) */}
      {unknownVars.length > 0 && (
        <div
          style={{
            background: WARNING_BG,
            border: `1px solid ${WARNING_BORDER_STRONG}`,
            borderRadius: RADIUS_MD,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            color: WARNING_DARK,
          }}
        >
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>
            <strong>Unknown Variables Detected:</strong> {unknownVars.map((v) => `{{${v}}}`).join(", ")}. These will not resolve unless defined. Check for potential typos.
          </span>
        </div>
      )}

      {compatWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 space-y-1.5 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle size={14} /> Email Client Compatibility Notice
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            {compatWarnings.map((w, idx) => (
              <li key={idx}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Email Layout Mode Selector */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
          <Layers size={13} /> Email Layout Shell
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-start gap-2.5 cursor-pointer p-2 bg-white rounded border border-slate-200 hover:border-slate-300">
            <input
              type="radio"
              name="email_layout_mode"
              checked={applyWrapper === true}
              onChange={() => onApplyWrapperChange && onApplyWrapperChange(true)}
              className="mt-0.5 text-navy focus:ring-navy h-4 w-4"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">PSA Corporate Layout (780px)</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
                  Recommended
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically wraps body into PSA's 780px responsive corporate shell with Outlook Word engine conditionals, header, and footer.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer p-2 bg-white rounded border border-slate-200 hover:border-slate-300">
            <input
              type="radio"
              name="email_layout_mode"
              checked={applyWrapper === false}
              onChange={() => onApplyWrapperChange && onApplyWrapperChange(false)}
              className="mt-0.5 text-navy focus:ring-navy h-4 w-4"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Complete Custom HTML</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                  Advanced
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authored HTML sent as-is without outer shell. Entire layout, width, and responsiveness controlled by custom code.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Main Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authoring Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Code size={14} className="text-slate-400" /> HTML Content Body
            </span>
            <span className="text-[11px] text-slate-400">
              {applyWrapper ? "780px corporate fragment mode" : "Raw HTML mode"}
            </span>
          </div>
          <textarea
            rows={22}
            value={bodyHtml}
            onChange={(e) => onBodyHtmlChange && onBodyHtmlChange(e.target.value)}
            placeholder="<h2>Enter HTML message content here...</h2>"
            className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed min-h-[520px] resize-y"
          />

          {/* Action buttons under editor */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingAction || !selectedTemplateId}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save size={13} /> {savingAction ? "Saving…" : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={handlePublish}
                disabled={savingAction || !selectedTemplateId}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 size={13} /> Publish to Live
              </button>

              {activeTemplate?.has_pending_draft && (
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  disabled={savingAction}
                  className="px-2.5 py-1.5 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200"
                >
                  Discard Draft
                </button>
              )}
            </div>

            {/* Test send shortcut if provided */}
            {onTestSend && (
              <button
                type="button"
                onClick={onTestSend}
                disabled={!testRecipient}
                title={testRecipient ? `Send test email to ${testRecipient}` : "Configure test recipient above"}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={13} /> Send Test Email
              </button>
            )}
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Eye size={14} className="text-slate-400" /> Real-time Email Preview
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1 rounded text-xs flex items-center gap-1 ${
                  previewDevice === "desktop"
                    ? "bg-white text-navy font-semibold shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Monitor size={13} /> Desktop (1150px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1 rounded text-xs flex items-center gap-1 ${
                  previewDevice === "mobile"
                    ? "bg-white text-navy font-semibold shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Smartphone size={13} /> Mobile (390px)
              </button>
            </div>
          </div>

          {/* Delivery Metadata Preview Header */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[11px] font-mono text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>
                <strong>From:</strong> {previewData?.metadata?.from || `${senderName || "P Suman & Associates"} <${senderEmail || "updates@updates.psumanassociates.com"}>`}
              </span>
              <span className="text-[10px] text-slate-500 font-sans font-medium px-2 py-0.5 bg-slate-200/70 rounded">
                {applyWrapper ? "PSA Corporate Layout (780px)" : "Raw Custom HTML"}
              </span>
            </div>
            <div>
              <strong>To:</strong>{" "}
              <span className={actualToDisplay.startsWith("(") ? "text-amber-700 italic font-sans" : "text-slate-900 font-semibold font-sans"}>
                {actualToDisplay}
              </span>
            </div>
            <div>
              <strong>Reply-To:</strong> {replyTo || previewData?.metadata?.reply_to || "contact@psumanassociates.com"}
            </div>
            {((cc && cc.length > 0) || previewData?.metadata?.cc?.length > 0) && (
              <div>
                <strong>CC:</strong> {(Array.isArray(cc) && cc.length > 0 ? cc : previewData?.metadata?.cc || []).join(", ")}
              </div>
            )}
            {((bcc && bcc.length > 0) || previewData?.metadata?.bcc?.length > 0) && (
              <div className="text-slate-400">
                <strong>BCC (Admin Only):</strong> {(Array.isArray(bcc) && bcc.length > 0 ? bcc : previewData?.metadata?.bcc || []).join(", ")}
              </div>
            )}
            <div className="truncate text-slate-700 font-bold font-sans">
              <strong>Subject:</strong> {subject ? subject : <span className="text-amber-600 italic font-normal font-sans">(No subject entered yet)</span>}
            </div>
            <div className="truncate text-slate-500 italic font-sans">
              <strong>Preheader:</strong> {preheader ? preheader : <span className="text-slate-400 italic text-[10px] font-sans">(None — inbox preview text will be empty)</span>}
            </div>
          </div>

          {/* Iframe Viewport */}
          <div
            className={`border border-slate-200 rounded-lg bg-slate-100 overflow-hidden relative flex justify-center p-3 h-[520px] transition-all ${
              previewDevice === "mobile" ? "max-w-[390px] mx-auto shadow-inner" : "w-full mx-auto"
            }`}
          >
            {/* Subtle floating sync indicator while typing */}
            {previewLoading && (
              <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1.5 shadow-md animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-sky animate-ping" />
                Updating preview...
              </div>
            )}

            {previewData?.html ? (
              <iframe
                title="Email Preview"
                srcDoc={previewData.html}
                className={`w-full h-full bg-white rounded shadow-sm border-0 transition-opacity duration-200 ${
                  previewLoading ? "opacity-85" : "opacity-100"
                }`}
                sandbox="allow-same-origin"
              />
            ) : previewLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Rendering preview...
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Enter HTML body content to see preview.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History Drawer / Modal */}
      {showHistoryDrawer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,28,46,0.5)",
            backdropFilter: "blur(2px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: SURFACE,
              height: "100%",
              boxShadow: SHADOW_MD,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h4 style={{ fontSize: "16px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                  Version History
                </h4>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "4px 0 0" }}>
                  {activeTemplate?.name || selectedTemplateId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
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

            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: TEXT_MUTED, fontSize: "13px" }}>
                  Loading history…
                </div>
              ) : historyList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: TEXT_MUTED, fontSize: "13px" }}>
                  No historical snapshots recorded yet. Versions are created automatically when you publish.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {historyList.map((h) => (
                    <div
                      key={h.version_id}
                      style={{
                        background: SURFACE_ALT,
                        border: `1px solid ${BORDER}`,
                        borderRadius: RADIUS_MD,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "13px", fontWeight: "700", color: TEXT_PRIMARY }}>
                          Version {h.version_number}
                        </span>
                        <span style={{ fontSize: "11px", color: TEXT_MUTED }}>
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                        <strong>Subject:</strong> {h.subject}
                      </div>

                      {h.preheader && (
                        <div style={{ fontSize: "11px", color: TEXT_MUTED, fontStyle: "italic" }}>
                          <strong>Preheader:</strong> {h.preheader}
                        </div>
                      )}

                      <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
                        <strong>Author:</strong> {h.created_by}
                        {h.change_summary && <span> • {h.change_summary}</span>}
                      </div>

                      <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(h.version_id)}
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
                          <RotateCcw size={12} /> Restore as Draft
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
