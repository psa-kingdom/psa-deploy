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
  RotateCcw
} from "lucide-react";
import {
  SURFACE, SURFACE_ALT, BORDER,
  TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, TEXT_DISABLED,
  ACCENT, ACCENT_BG, ACCENT_BORDER,
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

  const handleAddSingleEmail = (e) => {
    if (e) e.preventDefault();
    const trimmed = newEmailInput.trim().toLowerCase();
    if (!trimmed) return;

    // Split if user pasted comma/spaces into single input
    const parts = trimmed
      .split(/[,;\s]+/)
      .map((p) => p.replace(/^["'<>\[\]\(\);,.]+|["'<>\[\]\(\);,.]+$/g, "").trim().toLowerCase())
      .filter(Boolean);

    const updated = [...manualEmails, ...parts];
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

  const isManualActive = selectedSource === "manual" || selectedSource === "combined";

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
            style={{ display: "flex", gap: "8px", marginBottom: "12px" }}
          >
            <input
              type="text"
              placeholder="Add recipient email (e.g. client@company.com) & press Enter"
              value={newEmailInput}
              onChange={(e) => setNewEmailInput(e.target.value)}
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

          {/* Chips container with individual [x] removal controls */}
          {manualEmails.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                maxHeight: "150px",
                overflowY: "auto",
                padding: "8px",
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
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    color: TEXT_PRIMARY,
                    fontSize: "11px",
                    fontFamily: "monospace",
                    padding: "3px 8px",
                    borderRadius: "4px",
                  }}
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveEmail(idx)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: TEXT_MUTED,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remove recipient"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "14px",
                background: SURFACE,
                borderRadius: "6px",
                border: `1px dashed ${BORDER}`,
                textAlign: "center",
                fontSize: "11.5px",
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
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "2px" }}>
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
    </div>
  );
}
