import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Users,
  Mail,
  ListFilter,
  AlertCircle,
  CheckCircle2,
  Plus,
  X,
  ClipboardPaste,
  FileSpreadsheet,
  Trash2,
  Search,
  UserX,
  UploadCloud,
  FileText,
  AlertTriangle,
  RotateCcw,
  Eye,
  RefreshCw,
  UserCheck
} from "lucide-react";
import {
  SURFACE, SURFACE_ALT, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_DISABLED,
  ACCENT, ACCENT_DARK, ACCENT_LIGHT, ACCENT_BG, ACCENT_BORDER,
  SUCCESS, SUCCESS_BG, SUCCESS_BORDER, SUCCESS_DARK,
  WARNING, WARNING_BG, WARNING_BORDER, WARNING_DARK,
  DANGER, DANGER_BG, DANGER_BORDER, DANGER_DARK,
  SHADOW_SM, SHADOW_MD, RADIUS_MD, RADIUS_LG,
  INPUT_STYLE, LABEL_STYLE,
} from "../../utils/adminTheme";

export default function AudienceSelector({
  backendUrl = "",
  selectedSource = "newsletter_subscriptions",
  onChange,
  manualEmails = [],
  onManualEmailsChange,
  excludedEmails = [],
  onExcludedEmailsChange,
  onEstimateLoaded,
}) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // File Import State
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileImportResult, setFileImportResult] = useState(null);
  const [fileError, setFileError] = useState(null);

  // Exclusions Search State
  const [excludeSearch, setExcludeSearch] = useState("");
  const [showExcludeSearch, setShowExcludeSearch] = useState(false);

  // Newsletter Subscribers State
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);
  const [newSubscriberInput, setNewSubscriberInput] = useState("");
  const [addingSubscriber, setAddingSubscriber] = useState(false);
  const [subscriberFeedback, setSubscriberFeedback] = useState(null);

  // Unified Recipient List Modal State
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [audienceRecipients, setAudienceRecipients] = useState([]);
  const [loadingAudienceRecipients, setLoadingAudienceRecipients] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState("all"); // 'all' | 'active' | 'excluded'
  const [modalNewEmail, setModalNewEmail] = useState("");
  const [modalTargetSource, setModalTargetSource] = useState("newsletter"); // 'newsletter' | 'manual'
  const [modalAddingRecipient, setModalAddingRecipient] = useState(false);
  const [modalFeedback, setModalFeedback] = useState(null);
  const [actionLoadingEmail, setActionLoadingEmail] = useState(null);

  const sources = [
    {
      id: "newsletter_subscriptions",
      title: "Newsletter Subscribers",
      desc: "Explicit website opt-ins via PSA Insights subscription forms",
      icon: Mail,
      badge: "Opted-In",
    },
    {
      id: "manual",
      title: "Manual Recipients",
      desc: "Admin-entered verified email list (chips / bulk paste / Excel import)",
      icon: Users,
      badge: "Targeted",
    },
    {
      id: "combined",
      title: "Both Sources",
      desc: "Newsletter subscribers + manual recipient list, deduplicated",
      icon: ListFilter,
      badge: "Full Reach",
    },
  ];

  const fetchEstimate = useCallback(
    async (source, emailsList, exclusionsList) => {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          source,
          custom_emails: emailsList || [],
          excluded_emails: exclusionsList || [],
        };
        const res = await axios.post(
          `${backendUrl}/api/admin/communication/campaigns/estimate`,
          payload,
          { withCredentials: true }
        );
        setEstimate(res.data);
        if (onEstimateLoaded) onEstimateLoaded(res.data);
      } catch (err) {
        console.error("Failed to fetch audience estimate:", err);
        setError("Unable to compute audience count from backend");
      } finally {
        setLoading(false);
      }
    },
    [backendUrl, onEstimateLoaded]
  );

  // Debounced estimate refresh on source, manual list, or exclusions change
  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchEstimate(selectedSource, manualEmails, excludedEmails);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedSource, manualEmails, excludedEmails, fetchEstimate]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    // Auto-split if user typed or pasted comma, semicolon, newline, or multiple space-separated emails
    if (val.includes(",") || val.includes(";") || val.includes("\n") || (val.includes(" ") && val.trim().includes("@"))) {
      const parts = val
        .split(/[,;\s]+/)
        .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim().toLowerCase())
        .filter(Boolean);

      const newItems = parts.filter((p) => !manualEmails.includes(p));
      if (newItems.length > 0) {
        const updated = [...manualEmails, ...newItems];
        if (onManualEmailsChange) onManualEmailsChange(updated);
      }
      setNewEmailInput("");
    } else {
      setNewEmailInput(val);
    }
  };

  const handleAddSingleEmail = (e) => {
    if (e) e.preventDefault();
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed) return;

    // Split if user pasted comma/spaces into single input
    const parts = trimmed
      .split(/[,;\s]+/)
      .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim().toLowerCase())
      .filter(Boolean);

    const newItems = parts.filter((p) => !manualEmails.includes(p));
    if (newItems.length === 0) {
      setNewEmailInput("");
      return;
    }

    const updated = [...manualEmails, ...newItems];
    if (onManualEmailsChange) onManualEmailsChange(updated);
    setNewEmailInput("");
  };

  const handleRemoveEmail = (indexToRemove) => {
    const updated = manualEmails.filter((_, idx) => idx !== indexToRemove);
    if (onManualEmailsChange) onManualEmailsChange(updated);
  };

  const handleClearAllManual = () => {
    if (window.confirm("Are you sure you want to clear all manual recipients?")) {
      if (onManualEmailsChange) onManualEmailsChange([]);
    }
  };

  const handleApplyBulk = () => {
    if (!bulkText.trim()) {
      setShowBulkModal(false);
      return;
    }
    const parts = bulkText
      .split(/[,;\n\r\t\s]+/)
      .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim().toLowerCase())
      .filter(Boolean);

    const updated = [...manualEmails, ...parts];
    if (onManualEmailsChange) onManualEmailsChange(updated);
    setBulkText("");
    setShowBulkModal(false);
  };

  // CSV / XLSX File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFileError(null);
      setFileImportResult(null);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    setUploadingFile(true);
    setFileError(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await axios.post(
        `${backendUrl}/api/admin/communication/recipients/parse-file`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );
      setFileImportResult(res.data);
    } catch (err) {
      console.error("File parse error:", err);
      setFileError(err.response?.data?.detail || "Failed to parse file. Ensure it is a valid CSV or XLSX.");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleApplyImportedEmails = () => {
    if (fileImportResult?.valid_emails?.length > 0) {
      const updated = [...manualEmails, ...fileImportResult.valid_emails];
      if (onManualEmailsChange) onManualEmailsChange(updated);
    }
    setShowFileModal(false);
    setSelectedFile(null);
    setFileImportResult(null);
  };

  // Exclude / Include Recipient Handlers
  const handleExcludeEmail = (email) => {
    const clean = email.trim().toLowerCase();
    if (!clean) return;
    if (!excludedEmails.includes(clean)) {
      const updated = [...excludedEmails, clean];
      if (onExcludedEmailsChange) onExcludedEmailsChange(updated);
    }
  };

  const handleRestoreEmail = (email) => {
    const clean = email.trim().toLowerCase();
    const updated = excludedEmails.filter((e) => e.toLowerCase() !== clean);
    if (onExcludedEmailsChange) onExcludedEmailsChange(updated);
  };

  // Subscriber Management Handlers
  const fetchSubscribers = useCallback(async () => {
    setLoadingSubscribers(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/subscribers`,
        { withCredentials: true }
      );
      setSubscribers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch subscribers:", err);
    } finally {
      setLoadingSubscribers(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    if (selectedSource === "newsletter_subscriptions" || selectedSource === "combined") {
      fetchSubscribers();
    }
  }, [selectedSource, fetchSubscribers]);

  const handleAddSubscriber = async (e) => {
    if (e) e.preventDefault();
    const email = newSubscriberInput.trim().toLowerCase();
    if (!email) return;
    setAddingSubscriber(true);
    setSubscriberFeedback(null);
    try {
      await axios.post(
        `${backendUrl}/api/admin/communication/subscribers`,
        { email },
        { withCredentials: true }
      );
      setNewSubscriberInput("");
      setSubscriberFeedback({ type: "success", text: `Subscriber '${email}' added successfully!` });
      await fetchSubscribers();
      fetchEstimate(selectedSource, manualEmails, excludedEmails);
    } catch (err) {
      console.error("Failed to add subscriber:", err);
      setSubscriberFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to add subscriber"
      });
    } finally {
      setAddingSubscriber(false);
    }
  };

  const handleDeleteSubscriber = async (email) => {
    if (!window.confirm(`Are you sure you want to delete subscriber '${email}' from database?`)) {
      return;
    }
    setActionLoadingEmail(email);
    try {
      await axios.delete(
        `${backendUrl}/api/admin/communication/subscribers/${encodeURIComponent(email)}`,
        { withCredentials: true }
      );
      setSubscriberFeedback({ type: "success", text: `Subscriber '${email}' deleted.` });
      await fetchSubscribers();
      fetchEstimate(selectedSource, manualEmails, excludedEmails);
      if (showRecipientModal) {
        fetchAudienceRecipients();
      }
    } catch (err) {
      console.error("Failed to delete subscriber:", err);
      alert(err.response?.data?.detail || "Failed to delete subscriber");
    } finally {
      setActionLoadingEmail(null);
    }
  };

  // Full Audience Recipients for Modal
  const fetchAudienceRecipients = useCallback(async () => {
    setLoadingAudienceRecipients(true);
    try {
      const payload = {
        source: selectedSource,
        custom_emails: manualEmails || [],
        excluded_emails: excludedEmails || [],
      };
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/audience/recipients`,
        payload,
        { withCredentials: true }
      );
      setAudienceRecipients(res.data?.recipients || []);
    } catch (err) {
      console.error("Failed to fetch audience recipients:", err);
    } finally {
      setLoadingAudienceRecipients(false);
    }
  }, [backendUrl, selectedSource, manualEmails, excludedEmails]);

  useEffect(() => {
    if (showRecipientModal) {
      fetchAudienceRecipients();
    }
  }, [showRecipientModal, fetchAudienceRecipients]);

  const handleModalAddRecipient = async (e) => {
    if (e) e.preventDefault();
    const email = modalNewEmail.trim().toLowerCase();
    if (!email) return;

    setModalAddingRecipient(true);
    setModalFeedback(null);
    try {
      if (modalTargetSource === "newsletter" || selectedSource === "newsletter_subscriptions") {
        await axios.post(
          `${backendUrl}/api/admin/communication/subscribers`,
          { email },
          { withCredentials: true }
        );
        setModalNewEmail("");
        setModalFeedback({ type: "success", text: `Added '${email}' to newsletter subscribers!` });
        await fetchSubscribers();
        await fetchAudienceRecipients();
        fetchEstimate(selectedSource, manualEmails, excludedEmails);
      } else {
        // Manual list
        if (!manualEmails.includes(email)) {
          const updated = [...manualEmails, email];
          if (onManualEmailsChange) onManualEmailsChange(updated);
          setModalNewEmail("");
          setModalFeedback({ type: "success", text: `Added '${email}' to manual list!` });
          setTimeout(() => fetchAudienceRecipients(), 100);
        } else {
          setModalFeedback({ type: "error", text: `'${email}' is already in the manual list.` });
        }
      }
    } catch (err) {
      setModalFeedback({
        type: "error",
        text: err.response?.data?.detail || "Failed to add recipient"
      });
    } finally {
      setModalAddingRecipient(false);
    }
  };

  const handleModalDeleteRecipient = async (recipient) => {
    const email = recipient.email;
    if (recipient.source === "newsletter_subscriptions") {
      await handleDeleteSubscriber(email);
    } else {
      // Manual recipient
      const updated = manualEmails.filter((e) => e.toLowerCase() !== email.toLowerCase());
      if (onManualEmailsChange) onManualEmailsChange(updated);
      setTimeout(() => fetchAudienceRecipients(), 100);
    }
  };

  const handleOpenRecipientModal = () => {
    if (estimate?.sample_recipients?.length > 0 && audienceRecipients.length === 0) {
      setAudienceRecipients(
        estimate.sample_recipients.map((r) => ({
          ...r,
          status: excludedEmails.includes(r.email?.toLowerCase()) ? "excluded" : "active",
          is_excluded: excludedEmails.includes(r.email?.toLowerCase()),
        }))
      );
    }
    setShowRecipientModal(true);
    fetchAudienceRecipients();
  };

  const isManualActive = selectedSource === "manual" || selectedSource === "combined";
  const isNewsletterActive = selectedSource === "newsletter_subscriptions" || selectedSource === "combined";

  const displayRecipients = audienceRecipients.length > 0
    ? audienceRecipients
    : (estimate?.sample_recipients || []).map((r) => ({
        ...r,
        status: excludedEmails.includes(r.email?.toLowerCase()) ? "excluded" : "active",
        is_excluded: excludedEmails.includes(r.email?.toLowerCase()),
      }));

  const filteredModalRecipients = displayRecipients.filter((rec) => {
    if (modalStatusFilter === "active" && rec.is_excluded) return false;
    if (modalStatusFilter === "excluded" && !rec.is_excluded) return false;
    if (modalSearch) {
      const q = modalSearch.toLowerCase().trim();
      return rec.email?.toLowerCase().includes(q) || rec.name?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 1. Recipient Audience Source */}
      <div>
        <label style={LABEL_STYLE}>
          Recipient Audience Source
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "10px",
          }}
        >
          {sources.map((src) => {
            const Icon = src.icon;
            const isSelected = selectedSource === src.id;
            return (
              <div
                key={src.id}
                onClick={() => onChange(src.id)}
                style={{
                  position: "relative",
                  cursor: "pointer",
                  borderRadius: RADIUS_MD,
                  padding: "14px 16px",
                  border: isSelected ? `1.5px solid ${ACCENT}` : `1px solid ${BORDER}`,
                  background: isSelected ? ACCENT_BG : SURFACE,
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  boxShadow: isSelected ? SHADOW_SM : "none",
                }}
              >
                <div
                  style={{
                    padding: "7px",
                    borderRadius: "6px",
                    background: isSelected ? ACCENT : SURFACE_ALT,
                    color: isSelected ? "#fff" : TEXT_SECONDARY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: "2px",
                    border: isSelected ? "none" : `1px solid ${BORDER}`,
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: isSelected ? TEXT_PRIMARY : TEXT_PRIMARY,
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                      }}
                    >
                      {src.title}
                    </span>
                    {src.badge && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: "700",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isSelected ? "rgba(14,165,233,0.15)" : SURFACE_ALT,
                          color: isSelected ? ACCENT : TEXT_MUTED,
                          border: `1px solid ${isSelected ? ACCENT_BORDER : BORDER}`,
                          flexShrink: 0,
                        }}
                      >
                        {src.badge}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: isSelected ? TEXT_SECONDARY : TEXT_MUTED,
                      lineHeight: "1.4",
                    }}
                  >
                    {src.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1.5 Newsletter Subscribers Management (Shown when newsletter_subscriptions or combined) */}
      {isNewsletterActive && (
        <div
          style={{
            background: SURFACE_ALT,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_MD,
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Mail size={16} style={{ color: ACCENT }} />
              <span style={{ fontSize: "12.5px", fontWeight: "600", color: TEXT_PRIMARY }}>
                Newsletter Subscribers
              </span>
              <span style={{ fontSize: "11px", color: TEXT_MUTED }}>
                ({loadingSubscribers ? "Loading..." : `${subscribers.length} registered in database`})
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={handleOpenRecipientModal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: ACCENT_BG,
                  border: `1px solid ${ACCENT_BORDER}`,
                  color: ACCENT,
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 10px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <Eye size={12} /> View Full List & Manage
              </button>

              <button
                type="button"
                onClick={fetchSubscribers}
                title="Refresh subscriber list"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: TEXT_SECONDARY,
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={11} className={loadingSubscribers ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {/* Add single subscriber input */}
          <form
            onSubmit={handleAddSubscriber}
            style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
          >
            <input
              type="email"
              placeholder="Add a new newsletter subscriber email (e.g. client@domain.com)"
              value={newSubscriberInput}
              onChange={(e) => setNewSubscriberInput(e.target.value)}
              style={{
                flex: 1,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: TEXT_PRIMARY,
                fontSize: "12px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!newSubscriberInput.trim() || addingSubscriber}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: newSubscriberInput.trim() ? ACCENT : SURFACE_ALT,
                color: newSubscriberInput.trim() ? "#fff" : TEXT_DISABLED,
                border: newSubscriberInput.trim() ? "none" : `1px solid ${BORDER}`,
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: newSubscriberInput.trim() && !addingSubscriber ? "pointer" : "not-allowed",
              }}
            >
              <Plus size={13} /> {addingSubscriber ? "Adding..." : "Add Subscriber"}
            </button>
          </form>

          {subscriberFeedback && (
            <div
              style={{
                fontSize: "11.5px",
                marginBottom: "10px",
                padding: "6px 10px",
                borderRadius: "5px",
                background: subscriberFeedback.type === "success" ? SUCCESS_BG : DANGER_BG,
                color: subscriberFeedback.type === "success" ? SUCCESS_DARK : DANGER,
                border: `1px solid ${subscriberFeedback.type === "success" ? SUCCESS_BORDER : DANGER_BORDER}`,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {subscriberFeedback.type === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {subscriberFeedback.text}
            </div>
          )}

          {/* Subscriber chips container with individual delete controls */}
          {subscribers.length > 0 ? (
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  maxHeight: "150px",
                  overflowY: "auto",
                  padding: "10px",
                  background: SURFACE,
                  borderRadius: "6px",
                  border: `1px solid ${BORDER}`,
                }}
              >
                {subscribers.slice(0, 30).map((sub) => {
                  const subEmail = sub.email;
                  return (
                    <span
                      key={sub.id || subEmail}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(14,165,233,0.08)",
                        border: "1px solid rgba(14,165,233,0.2)",
                        color: TEXT_PRIMARY,
                        fontSize: "12px",
                        fontFamily: "monospace",
                        padding: "4px 10px",
                        borderRadius: "5px",
                      }}
                    >
                      <span>{subEmail}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubscriber(subEmail)}
                        disabled={actionLoadingEmail === subEmail}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#64748b",
                          cursor: "pointer",
                          padding: "2px",
                          display: "flex",
                          alignItems: "center",
                          borderRadius: "3px",
                        }}
                        title={`Delete ${subEmail} from database`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
              {subscribers.length > 30 && (
                <div style={{ fontSize: "11px", color: TEXT_MUTED, marginTop: "6px", textAlign: "right" }}>
                  Showing 30 of {subscribers.length} subscribers.{" "}
                  <button
                    type="button"
                    onClick={handleOpenRecipientModal}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: ACCENT,
                      cursor: "pointer",
                      fontWeight: "600",
                      padding: 0,
                    }}
                  >
                    View all & search →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                background: SURFACE,
                borderRadius: "6px",
                border: `1px dashed ${BORDER}`,
                textAlign: "center",
                fontSize: "12px",
                color: TEXT_MUTED,
              }}
            >
              {loadingSubscribers
                ? "Loading subscribers from database..."
                : "No newsletter subscribers in database yet. Add subscribers above or select Manual Recipients."}
            </div>
          )}
        </div>
      )}

      {/* 2. Manual Recipient Management (Shown when manual or combined) */}
      {isManualActive && (
        <div
          style={{
            background: SURFACE_ALT,
            border: `1px solid ${BORDER}`,
            borderRadius: RADIUS_MD,
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div>
              <span style={{ fontSize: "12.5px", fontWeight: "600", color: TEXT_PRIMARY }}>
                Manual Recipients List
              </span>
              <span style={{ fontSize: "11px", color: TEXT_MUTED, marginLeft: "8px" }}>
                ({manualEmails.length} entered)
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setShowFileModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: SUCCESS_BG,
                  border: `1px solid ${SUCCESS_BORDER}`,
                  color: SUCCESS_DARK,
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <FileSpreadsheet size={12} /> Import CSV / Excel
              </button>

              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: ACCENT_BG,
                  border: `1px solid ${ACCENT_BORDER}`,
                  color: ACCENT,
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                <ClipboardPaste size={12} /> Bulk Paste
              </button>

              {manualEmails.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllManual}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: DANGER_BG,
                    border: `1px solid ${DANGER_BORDER}`,
                    color: DANGER,
                    fontSize: "11px",
                    fontWeight: "600",
                    padding: "4px 8px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>
          </div>

          {/* Add single input */}
          <form
            onSubmit={handleAddSingleEmail}
            style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
          >
            <input
              type="text"
              placeholder="Type an email address or paste multiple (e.g. client@domain.com, user@domain.com)"
              value={newEmailInput}
              onChange={handleInputChange}
              onBlur={() => {
                if (newEmailInput.trim()) {
                  handleAddSingleEmail();
                }
              }}
              style={{
                flex: 1,
                background: SURFACE,
                border: `1px solid ${BORDER}`,
                borderRadius: "6px",
                padding: "8px 12px",
                color: TEXT_PRIMARY,
                fontSize: "12px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!newEmailInput.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: newEmailInput.trim() ? ACCENT : SURFACE_ALT,
                color: newEmailInput.trim() ? "#fff" : TEXT_DISABLED,
                border: newEmailInput.trim() ? "none" : `1px solid ${BORDER}`,
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: newEmailInput.trim() ? "pointer" : "not-allowed",
              }}
            >
              <Plus size={13} /> Add
            </button>
          </form>
          <div style={{ fontSize: "11px", color: TEXT_MUTED, marginBottom: "12px" }}>
            💡 <em>Tip: You can paste a comma-separated or space-separated list of emails here. They are added automatically.</em>
          </div>

          {/* Chips container with individual [x] removal controls */}
          {manualEmails.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                maxHeight: "160px",
                overflowY: "auto",
                padding: "10px",
                background: SURFACE,
                borderRadius: "6px",
                border: `1px solid ${BORDER}`,
              }}
            >
              {manualEmails.map((email, idx) => (
                <span
                  key={`${email}-${idx}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(14,165,233,0.08)",
                    border: "1px solid rgba(14,165,233,0.2)",
                    color: TEXT_PRIMARY,
                    fontSize: "12px",
                    fontFamily: "monospace",
                    padding: "4px 10px",
                    borderRadius: "5px",
                  }}
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(idx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      padding: "2px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "3px",
                    }}
                    title="Remove recipient"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "16px",
                background: SURFACE,
                borderRadius: "6px",
                border: `1px dashed ${BORDER}`,
                textAlign: "center",
                fontSize: "12px",
                color: TEXT_MUTED,
              }}
            >
              No manual recipients added yet. Type an email above, paste a list, or import a spreadsheet.
            </div>
          )}
        </div>
      )}

      {/* 3. CSV / Excel Import Modal */}
      {showFileModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10,37,64,0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_LG,
              padding: "24px",
              color: TEXT_PRIMARY,
              boxShadow: SHADOW_MD,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileSpreadsheet className="text-emerald-600" size={18} />
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: TEXT_PRIMARY, margin: 0 }}>Import CSV / Excel Spreadsheet</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFileModal(false);
                  setSelectedFile(null);
                  setFileImportResult(null);
                }}
                style={{ background: "transparent", border: "none", color: TEXT_MUTED, cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {!fileImportResult ? (
              <>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, marginBottom: "16px" }}>
                  Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file. The system will automatically detect the email column, normalize addresses, and deduplicate entries.
                </p>

                <div
                  style={{
                    border: `2px dashed ${ACCENT_BORDER}`,
                    borderRadius: "8px",
                    padding: "24px",
                    textAlign: "center",
                    background: SURFACE_ALT,
                    marginBottom: "16px",
                    cursor: "pointer",
                  }}
                  onClick={() => document.getElementById("csv-file-input")?.click()}
                >
                  <UploadCloud size={32} style={{ margin: "0 auto 8px auto", color: ACCENT }} />
                  <div style={{ fontSize: "13px", fontWeight: "500", color: TEXT_PRIMARY }}>
                    {selectedFile ? selectedFile.name : "Click to select or drag & drop CSV/XLSX file"}
                  </div>
                  <div style={{ fontSize: "11px", color: TEXT_MUTED, marginTop: "4px" }}>
                    Supports CSV, Excel (.xlsx, .xls) up to 10MB
                  </div>
                  <input
                    id="csv-file-input"
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                  />
                </div>

                {fileError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: DANGER, fontSize: "12px", marginBottom: "14px" }}>
                    <AlertCircle size={14} /> {fileError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setShowFileModal(false)}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadFile}
                    disabled={!selectedFile || uploadingFile}
                    style={{
                      background: SUCCESS_DARK,
                      border: "none",
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: selectedFile && !uploadingFile ? "pointer" : "not-allowed",
                      opacity: selectedFile && !uploadingFile ? 1 : 0.6,
                    }}
                  >
                    {uploadingFile ? "Analyzing File..." : "Analyze & Parse"}
                  </button>
                </div>
              </>
            ) : (
              <div>
                <div style={{ background: SUCCESS_BG, border: `1px solid ${SUCCESS_BORDER}`, borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: SUCCESS_DARK, fontWeight: "600", fontSize: "13px", marginBottom: "10px" }}>
                    <CheckCircle2 size={16} /> Import Summary for {fileImportResult.filename}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", color: TEXT_PRIMARY }}>
                    <div>Total Rows: <strong>{fileImportResult.total_rows}</strong></div>
                    <div>Detected Column: <strong>{fileImportResult.email_column || "N/A"}</strong></div>
                    <div>Valid Addresses: <strong style={{ color: SUCCESS_DARK }}>{fileImportResult.valid_count}</strong></div>
                    <div>Duplicates Filtered: <strong>{fileImportResult.duplicate_count}</strong></div>
                    <div>Invalid Tokens: <strong style={{ color: DANGER }}>{fileImportResult.invalid_count}</strong></div>
                    <div>Suppressed Filtered: <strong>{fileImportResult.suppressed_count}</strong></div>
                  </div>
                  <div style={{ borderTop: `1px solid ${SUCCESS_BORDER}`, marginTop: "10px", paddingTop: "8px", fontSize: "13px", color: TEXT_PRIMARY }}>
                    Net Unique Recipients to Add: <strong style={{ color: SUCCESS_DARK, fontSize: "15px" }}>{fileImportResult.net_count}</strong>
                  </div>
                </div>

                {fileImportResult.invalid_samples?.length > 0 && (
                  <div style={{ marginBottom: "14px", fontSize: "11px", color: DANGER }}>
                    <strong>Invalid samples:</strong> {fileImportResult.invalid_samples.join(", ")}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => { setFileImportResult(null); setSelectedFile(null); }}
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT_MUTED, borderRadius: "6px", padding: "8px 14px", fontSize: "12px", cursor: "pointer" }}
                  >
                    Select Another
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImportedEmails}
                    style={{ background: SUCCESS_DARK, border: "none", color: "#fff", borderRadius: "6px", padding: "8px 18px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}
                  >
                    Add {fileImportResult.net_count} Recipients to Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Bulk Paste Modal */}
      {showBulkModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10,37,64,0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_LG,
              padding: "24px",
              boxShadow: SHADOW_MD,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: TEXT_PRIMARY, margin: 0 }}>
                Bulk Paste Recipients
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: TEXT_MUTED,
                  cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: "12px", color: TEXT_MUTED, marginBottom: "12px" }}>
              Paste a list of email addresses separated by commas, semicolons, spaces, or newlines.
            </p>
            <textarea
              rows={8}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"partner1@domain.com\npartner2@domain.com, partner3@domain.com"}
              style={{
                width: "100%",
                background: SURFACE_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: "6px",
                padding: "10px",
                color: TEXT_PRIMARY,
                fontSize: "12px",
                fontFamily: "monospace",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: TEXT_MUTED,
                  borderRadius: "6px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulk}
                style={{
                  background: ACCENT,
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Authoritative Audience Estimation Card with Detailed Metrics */}
      <div
        style={{
          background: SURFACE,
          border: `1px solid ${BORDER}`,
          borderRadius: RADIUS_MD,
          padding: "16px 20px",
          boxShadow: SHADOW_SM,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "6px",
                background: ACCENT_BG,
                color: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${ACCENT_BORDER}`,
              }}
            >
              <ListFilter size={18} />
            </div>
            <div>
              <span
                style={{
                  fontSize: "10.5px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: TEXT_MUTED,
                  fontWeight: "700",
                  display: "block",
                }}
              >
                Authoritative Audience Calculation
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "22px",
                      fontWeight: "800",
                      color: TEXT_PRIMARY,
                      fontFamily: "monospace",
                    }}
                  >
                    {loading ? "…" : estimate ? estimate.net_target_count : 0}
                  </span>
                  <span style={{ fontSize: "12px", color: ACCENT, fontWeight: "600" }}>
                    Net Verified Recipients
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenRecipientModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: ACCENT_BG,
                    border: `1.5px solid ${ACCENT}`,
                    color: ACCENT_DARK,
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "4px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    boxShadow: SHADOW_SM,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Eye size={12} /> View & Manage Recipients ({estimate ? estimate.net_target_count : 0})
                </button>
              </div>
            </div>
          </div>

          {estimate && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11px" }}>
              <div
                style={{
                  background: SURFACE_ALT,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${BORDER}`,
                  color: TEXT_SECONDARY,
                }}
              >
                Raw Tokens: <strong style={{ color: TEXT_PRIMARY }}>{estimate.raw_count}</strong>
              </div>

              {estimate.invalid_count > 0 && (
                <div
                  style={{
                    background: DANGER_BG,
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${DANGER_BORDER}`,
                    color: DANGER,
                  }}
                  title={estimate.sample_recipients ? "Invalid syntax addresses filtered out" : ""}
                >
                  Invalid: <strong>{estimate.invalid_count}</strong>
                </div>
              )}

              {estimate.duplicate_count > 0 && (
                <div
                  style={{
                    background: WARNING_BG,
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${WARNING_BORDER}`,
                    color: WARNING_DARK,
                  }}
                >
                  Duplicates: <strong>{estimate.duplicate_count}</strong>
                </div>
              )}

              <div
                style={{
                  background: SURFACE_ALT,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${BORDER}`,
                  color: TEXT_SECONDARY,
                }}
              >
                Suppressed: <strong style={{ color: TEXT_PRIMARY }}>{estimate.suppressed_count}</strong>
              </div>

              {estimate.excluded_count > 0 && (
                <div
                  style={{
                    background: DANGER_BG,
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border: `1px solid ${DANGER_BORDER}`,
                    color: DANGER,
                  }}
                >
                  Campaign Excluded: <strong>{estimate.excluded_count}</strong>
                </div>
              )}

              <div
                style={{
                  background: SUCCESS_BG,
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: `1px solid ${SUCCESS_BORDER}`,
                  color: SUCCESS_DARK,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontWeight: "600",
                }}
              >
                <CheckCircle2 size={12} />
                Final: {estimate.net_target_count}
              </div>
            </div>
          )}
        </div>

        {/* 6. Recipient Exclusion / Search Panel */}
        <div style={{ marginTop: "14px", borderTop: `1px solid ${BORDER}`, paddingTop: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setShowExcludeSearch(!showExcludeSearch)}
              style={{
                background: "transparent",
                border: "none",
                color: ACCENT,
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: 0,
              }}
            >
              <UserX size={12} />
              {showExcludeSearch ? "Hide Exclusions Manager" : `Manage Campaign Exclusions (${excludedEmails.length} excluded)`}
            </button>

            {excludedEmails.length > 0 && !showExcludeSearch && (
              <span style={{ fontSize: "11px", color: DANGER, fontWeight: "500" }}>
                {excludedEmails.length} email(s) excluded from this send
              </span>
            )}
          </div>

          {showExcludeSearch && (
            <div style={{ marginTop: "10px", background: SURFACE_ALT, border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "12px" }}>
              <div style={{ fontSize: "11px", color: TEXT_MUTED, marginBottom: "8px" }}>
                Exclude specific recipients from this campaign without deleting them permanently from subscribers or raw lists:
              </div>

              <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="Enter email to exclude (e.g. partner@example.com)"
                  value={excludeSearch}
                  onChange={(e) => setExcludeSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleExcludeEmail(excludeSearch);
                      setExcludeSearch("");
                    }
                  }}
                  style={{
                    flex: 1,
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "4px",
                    padding: "6px 10px",
                    color: TEXT_PRIMARY,
                    fontSize: "11px",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    handleExcludeEmail(excludeSearch);
                    setExcludeSearch("");
                  }}
                  disabled={!excludeSearch.trim()}
                  style={{
                    background: DANGER,
                    border: "none",
                    color: "#fff",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: excludeSearch.trim() ? "pointer" : "not-allowed",
                    opacity: excludeSearch.trim() ? 1 : 0.6,
                  }}
                >
                  Exclude
                </button>
              </div>

              {/* Excluded chips */}
              {excludedEmails.length > 0 ? (
                <div>
                  <div style={{ fontSize: "10px", textTransform: "uppercase", color: DANGER, fontWeight: "700", marginBottom: "6px" }}>
                    Currently Excluded:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {excludedEmails.map((email) => (
                      <span
                        key={email}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: DANGER_BG,
                          border: `1px solid ${DANGER_BORDER}`,
                          color: DANGER,
                          fontSize: "11px",
                          fontFamily: "monospace",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRestoreEmail(email)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: DANGER,
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title="Restore into audience"
                        >
                          <RotateCcw size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "11px", color: TEXT_MUTED, fontStyle: "italic" }}>
                  No recipients excluded.
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              color: DANGER,
            }}
          >
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* 6. Unified Recipient List Modal (View, Add, Delete, Search) */}
      {showRecipientModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(10,37,64,0.45)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "720px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: RADIUS_LG,
              padding: "24px",
              color: TEXT_PRIMARY,
              boxShadow: SHADOW_MD,
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} style={{ color: ACCENT }} />
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: TEXT_PRIMARY, margin: 0 }}>
                    Recipient Audience List & Management
                  </h3>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: ACCENT_BG,
                      color: ACCENT,
                      border: `1px solid ${ACCENT_BORDER}`,
                    }}
                  >
                    {sources.find((s) => s.id === selectedSource)?.title || selectedSource}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: TEXT_MUTED, margin: "4px 0 0 0" }}>
                  View, search, add, or delete recipients that make up your target campaign audience.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRecipientModal(false);
                  setModalFeedback(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: TEXT_MUTED,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Add Recipient Bar */}
            <div
              style={{
                background: SURFACE_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                padding: "12px 14px",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: "600", color: TEXT_SECONDARY, marginBottom: "8px" }}>
                ➕ Add New Recipient
              </div>
              <form
                onSubmit={handleModalAddRecipient}
                style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
              >
                <input
                  type="email"
                  placeholder="Enter email address (e.g. client@domain.com)"
                  value={modalNewEmail}
                  onChange={(e) => setModalNewEmail(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: "220px",
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "6px",
                    padding: "7px 12px",
                    color: TEXT_PRIMARY,
                    fontSize: "12px",
                    outline: "none",
                  }}
                />

                {selectedSource === "combined" && (
                  <select
                    value={modalTargetSource}
                    onChange={(e) => setModalTargetSource(e.target.value)}
                    style={{
                      background: SURFACE,
                      border: `1px solid ${BORDER}`,
                      borderRadius: "6px",
                      padding: "7px 10px",
                      color: TEXT_PRIMARY,
                      fontSize: "12px",
                      outline: "none",
                    }}
                  >
                    <option value="newsletter">To Newsletter Subscribers</option>
                    <option value="manual">To Manual Recipients</option>
                  </select>
                )}

                <button
                  type="submit"
                  disabled={!modalNewEmail.trim() || modalAddingRecipient}
                  style={{
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "7px 14px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: modalNewEmail.trim() && !modalAddingRecipient ? "pointer" : "not-allowed",
                    opacity: modalNewEmail.trim() && !modalAddingRecipient ? 1 : 0.6,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Plus size={13} /> {modalAddingRecipient ? "Adding..." : "Add Recipient"}
                </button>
              </form>

              {modalFeedback && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    background: modalFeedback.type === "success" ? SUCCESS_BG : DANGER_BG,
                    color: modalFeedback.type === "success" ? SUCCESS_DARK : DANGER,
                    border: `1px solid ${modalFeedback.type === "success" ? SUCCESS_BORDER : DANGER_BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {modalFeedback.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {modalFeedback.text}
                </div>
              )}
            </div>

            {/* Search & Filter Toolbar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: TEXT_MUTED,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search recipients by email..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "6px 10px 6px 30px",
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    outline: "none",
                  }}
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: TEXT_MUTED,
                      cursor: "pointer",
                      padding: "2px",
                    }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status filter tabs */}
              <div style={{ display: "flex", gap: "4px" }}>
                {[
                  { id: "all", label: `All (${displayRecipients.length})` },
                  { id: "active", label: `Active (${displayRecipients.filter((r) => !r.is_excluded).length})` },
                  { id: "excluded", label: `Excluded (${displayRecipients.filter((r) => r.is_excluded).length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setModalStatusFilter(tab.id)}
                    style={{
                      background: modalStatusFilter === tab.id ? ACCENT_BG : "transparent",
                      border: `1px solid ${modalStatusFilter === tab.id ? ACCENT_BORDER : BORDER}`,
                      color: modalStatusFilter === tab.id ? ACCENT : TEXT_MUTED,
                      padding: "5px 10px",
                      borderRadius: "5px",
                      fontSize: "11px",
                      fontWeight: modalStatusFilter === tab.id ? "700" : "500",
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient List Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                background: SURFACE,
                minHeight: "180px",
              }}
            >
              {loadingAudienceRecipients ? (
                <div style={{ padding: "40px", textAlign: "center", color: TEXT_MUTED, fontSize: "13px" }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: "0 auto 10px auto", color: ACCENT }} />
                  Loading audience recipient details...
                </div>
              ) : filteredModalRecipients.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: TEXT_MUTED, fontSize: "12.5px" }}>
                  {modalSearch ? (
                    <>No recipients match "{modalSearch}".</>
                  ) : (
                    <>No recipients found in this audience. You can add one using the input above.</>
                  )}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: SURFACE_ALT, borderBottom: `1px solid ${BORDER}`, textAlign: "left" }}>
                      <th style={{ padding: "8px 12px", width: "36px", color: TEXT_MUTED, fontWeight: "600" }}>#</th>
                      <th style={{ padding: "8px 12px", color: TEXT_SECONDARY, fontWeight: "600" }}>Email Address</th>
                      <th style={{ padding: "8px 12px", width: "110px", color: TEXT_SECONDARY, fontWeight: "600" }}>Source</th>
                      <th style={{ padding: "8px 12px", width: "90px", color: TEXT_SECONDARY, fontWeight: "600" }}>Status</th>
                      <th style={{ padding: "8px 12px", width: "150px", textAlign: "right", color: TEXT_SECONDARY, fontWeight: "600" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalRecipients.map((rec, idx) => {
                      const isEx = rec.is_excluded;
                      const isNewsletter = rec.source === "newsletter_subscriptions";
                      return (
                        <tr
                          key={`${rec.email}-${idx}`}
                          style={{
                            borderBottom: `1px solid ${BORDER}`,
                            background: isEx ? "rgba(239,68,68,0.03)" : "transparent",
                            opacity: isEx ? 0.75 : 1,
                          }}
                        >
                          <td style={{ padding: "8px 12px", color: TEXT_MUTED, fontFamily: "monospace", fontSize: "11px" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace", color: TEXT_PRIMARY, wordBreak: "break-all" }}>
                            {rec.email}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: isNewsletter ? "rgba(14,165,233,0.1)" : "rgba(16,185,129,0.1)",
                                color: isNewsletter ? ACCENT : SUCCESS_DARK,
                                border: `1px solid ${isNewsletter ? ACCENT_BORDER : SUCCESS_BORDER}`,
                              }}
                            >
                              {isNewsletter ? "Newsletter" : "Manual"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            {isEx ? (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: DANGER_BG,
                                  color: DANGER,
                                  border: `1px solid ${DANGER_BORDER}`,
                                }}
                              >
                                Excluded
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: SUCCESS_BG,
                                  color: SUCCESS_DARK,
                                  border: `1px solid ${SUCCESS_BORDER}`,
                                }}
                              >
                                Active
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              {/* Toggle Exclude / Restore */}
                              {isEx ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreEmail(rec.email)}
                                  title="Restore into audience"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    background: SUCCESS_BG,
                                    border: `1px solid ${SUCCESS_BORDER}`,
                                    color: SUCCESS_DARK,
                                    padding: "3px 7px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                  }}
                                >
                                  <RotateCcw size={11} /> Restore
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleExcludeEmail(rec.email)}
                                  title="Exclude from this campaign"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    background: SURFACE_ALT,
                                    border: `1px solid ${BORDER}`,
                                    color: TEXT_MUTED,
                                    padding: "3px 7px",
                                    borderRadius: "4px",
                                    fontSize: "10.5px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <UserX size={11} /> Exclude
                                </button>
                              )}

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleModalDeleteRecipient(rec)}
                                disabled={actionLoadingEmail === rec.email}
                                title={isNewsletter ? "Permanently delete subscriber from database" : "Remove from manual list"}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  background: DANGER_BG,
                                  border: `1px solid ${DANGER_BORDER}`,
                                  color: DANGER,
                                  padding: "3px 7px",
                                  borderRadius: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                }}
                              >
                                <Trash2 size={11} /> {isNewsletter ? "Delete DB" : "Remove"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ fontSize: "12px", color: TEXT_MUTED }}>
                Net Target Audience: <strong style={{ color: ACCENT }}>{displayRecipients.filter((r) => !r.is_excluded).length}</strong> recipients will receive this campaign.
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecipientModal(false);
                  setModalFeedback(null);
                }}
                style={{
                  background: ACCENT,
                  border: "none",
                  color: "#fff",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
