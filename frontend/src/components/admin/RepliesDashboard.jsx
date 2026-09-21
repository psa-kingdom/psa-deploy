import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  MessageSquare,
  Mail,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Inbox,
  ArrowUpRight,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  Info,
  Eye,
  ExternalLink,
} from "lucide-react";
import {
  SURFACE,
  SURFACE_ALT,
  SURFACE_HOVER,
  BORDER,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  TEXT_MUTED,
  ACCENT,
  ACCENT_BG,
  ACCENT_BORDER,
  CARD_STYLE,
  RADIUS_MD,
  RADIUS_LG,
  SHADOW_SM,
  BTN_PRIMARY_STYLE,
  BTN_SECONDARY_STYLE,
} from "../../utils/adminTheme";

export default function RepliesDashboard({ backendUrl, campaigns = [] }) {
  const [stats, setStats] = useState({
    total_replies: 0,
    unique_subjects_count: 0,
    by_subject: [],
    recent_replies: [],
  });
  const [repliesList, setRepliesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // View Full Message Modal State
  const [activeViewingReply, setActiveViewingReply] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  // New Reply Form State
  const [formData, setFormData] = useState({
    sender_email: "",
    sender_name: "",
    recipient_email: "updates@updates.psumanassociates.com",
    subject: "",
    snippet: "",
    campaign_id: "",
  });

  const showToast = (msg, type = "success") => {
    setToastMsg({ msg, type });
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleOpenReplyContent = async (reply) => {
    setActiveViewingReply(reply);
    setLoadingContent(true);
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/replies/${reply.reply_id}/content`,
        { withCredentials: true }
      );
      if (res.data) {
        setActiveViewingReply(res.data);
      }
    } catch (err) {
      console.warn("Could not load on-demand content:", err);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleSyncFromResend = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/replies/sync`,
        {},
        { withCredentials: true }
      );
      const data = res.data;
      if (data.synced_count > 0) {
        showToast(`Synced ${data.synced_count} new reply from Resend!`, "success");
      } else {
        showToast(
          data.message || "Resend Receiving mailbox checked: no new inbound messages found.",
          "info"
        );
      }
      await refreshAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to sync from Resend.";
      showToast(msg, "error");
    } finally {
      setSyncing(false);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/replies/stats`,
        { withCredentials: true }
      );
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load replies stats:", err);
    }
  }, [backendUrl]);

  const fetchReplies = useCallback(async () => {
    try {
      const params = {};
      if (selectedSubjectFilter) params.subject = selectedSubjectFilter;
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/replies`,
        {
          params,
          withCredentials: true,
        }
      );
      if (res.data?.replies) {
        setRepliesList(res.data.replies);
      }
    } catch (err) {
      console.error("Failed to load replies list:", err);
    }
  }, [backendUrl, selectedSubjectFilter]);

  const refreshAll = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchReplies()]);
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchReplies()]).finally(() =>
      setLoading(false)
    );
  }, [fetchStats, fetchReplies]);

  const handleSimulateReply = async (e) => {
    e.preventDefault();
    if (!formData.sender_email || !formData.subject) {
      showToast("Please provide sender email and subject.", "error");
      return;
    }

    setSimulating(true);
    try {
      await axios.post(
        `${backendUrl}/api/admin/communication/replies`,
        formData,
        { withCredentials: true }
      );
      showToast("Test reply successfully recorded!", "success");
      setShowSimulateModal(false);
      setFormData({
        sender_email: "",
        sender_name: "",
        recipient_email: "contact@psumanassociates.com",
        subject: "",
        snippet: "",
        campaign_id: "",
      });
      await refreshAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to record test reply.";
      showToast(msg, "error");
    } finally {
      setSimulating(false);
    }
  };

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm("Delete this reply record?")) return;
    try {
      await axios.delete(
        `${backendUrl}/api/admin/communication/replies/${replyId}`,
        { withCredentials: true }
      );
      showToast("Reply deleted", "success");
      setRepliesList((prev) => prev.filter((r) => r.reply_id !== replyId));
      fetchStats();
    } catch (err) {
      showToast("Could not delete reply", "error");
    }
  };

  const filteredSubjects = stats.by_subject.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.clean_subject.toLowerCase().includes(q) ||
      s.sample_raw_subject.toLowerCase().includes(q) ||
      (s.campaign_title && s.campaign_title.toLowerCase().includes(q))
    );
  });

  const topSubject = stats.by_subject[0] || null;
  const latestReply = stats.recent_replies[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "12px 18px",
            borderRadius: RADIUS_MD,
            background:
              toastMsg.type === "error"
                ? "#DC2626"
                : toastMsg.type === "info"
                ? "#2563EB"
                : "#16A34A",
            color: "#FFFFFF",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          {toastMsg.type === "error" ? (
            <AlertCircle size={16} />
          ) : toastMsg.type === "info" ? (
            <Info size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{toastMsg.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          ...CARD_STYLE,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          padding: "20px 24px",
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "6px",
                background: ACCENT_BG,
                color: ACCENT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={16} />
            </div>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                color: TEXT_PRIMARY,
                margin: 0,
              }}
            >
              Email Replies &amp; Inbound Traffic
            </h2>
          </div>
          <p
            style={{
              fontSize: "13px",
              color: TEXT_MUTED,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Track incoming responses to your email campaigns, grouped by subject line and sender.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <button
            type="button"
            onClick={handleSyncFromResend}
            disabled={syncing || refreshing}
            style={{
              ...BTN_SECONDARY_STYLE,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              cursor: syncing || refreshing ? "not-allowed" : "pointer",
              background: SURFACE_HOVER,
            }}
            title="Fetch inbound messages directly from Resend Receiving API"
          >
            <CloudDownload
              size={14}
              className={syncing ? "animate-pulse" : ""}
            />
            {syncing ? "Syncing..." : "Sync from Resend"}
          </button>
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            style={{
              ...BTN_SECONDARY_STYLE,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
            title="Refresh statistics"
          >
            <RefreshCw
              size={13}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            style={{
              ...BTN_PRIMARY_STYLE,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Record Test Reply
          </button>
        </div>
      </div>

      {/* Inbound Routing & Setup Info Banner */}
      <div
        style={{
          ...CARD_STYLE,
          padding: "16px 20px",
          background: "rgba(59, 130, 246, 0.04)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Info size={16} color="#2563EB" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: TEXT_PRIMARY }}>
              Inbound Receiving Pipeline
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "12px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#16A34A",
                fontWeight: "700",
              }}
            >
              Domain Verified: updates.psumanassociates.com
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowConfigGuide((prev) => !prev)}
            style={{
              background: "none",
              border: "none",
              color: ACCENT,
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: 0,
            }}
          >
            {showConfigGuide ? "Hide Routing Details" : "View Routing Details & Tips"}
            {showConfigGuide ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {showConfigGuide && (
          <div
            style={{
              marginTop: "8px",
              paddingTop: "12px",
              borderTop: `1px dashed ${BORDER}`,
              fontSize: "12px",
              lineHeight: 1.6,
              color: TEXT_SECONDARY,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            <div>
              <strong style={{ color: TEXT_PRIMARY, display: "block", marginBottom: "4px" }}>
                1. How Replies Reach Resend:
              </strong>
              Emails must be received at an address on your verified domain (
              <code style={{ background: SURFACE_ALT, padding: "2px 5px", borderRadius: "4px" }}>
                updates@updates.psumanassociates.com
              </code>
              ) which has MX records pointing to Resend's inbound servers.
            </div>
            <div>
              <strong style={{ color: TEXT_PRIMARY, display: "block", marginBottom: "4px" }}>
                2. Sync vs Live Webhook:
              </strong>
              Click <strong>"Sync from Resend"</strong> anytime to pull inbound messages directly from
              the Resend API. In production, webhooks push updates immediately.
            </div>
            <div>
              <strong style={{ color: TEXT_PRIMARY, display: "block", marginBottom: "4px" }}>
                3. Manual Testing:
              </strong>
              You can instantly simulate or record any reply (e.g. from Gmail) using the{" "}
              <strong>"Record Test Reply"</strong> button above to verify campaign attribution and
              analytics.
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {/* Total Replies */}
        <div style={{ ...CARD_STYLE, padding: "20px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: TEXT_MUTED,
              display: "block",
              marginBottom: "8px",
            }}
          >
            Total Replies Received
          </span>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: ACCENT,
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            {stats.total_replies}
          </div>
          <span style={{ fontSize: "12px", color: TEXT_MUTED }}>
            From verified inbound webhooks &amp; channels
          </span>
        </div>

        {/* Unique Subjects */}
        <div style={{ ...CARD_STYLE, padding: "20px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: TEXT_MUTED,
              display: "block",
              marginBottom: "8px",
            }}
          >
            Active Mail Subjects
          </span>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: TEXT_PRIMARY,
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            {stats.unique_subjects_count}
          </div>
          <span style={{ fontSize: "12px", color: TEXT_MUTED }}>
            Distinct campaigns or threads replied to
          </span>
        </div>

        {/* Top Performing Subject */}
        <div style={{ ...CARD_STYLE, padding: "20px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: TEXT_MUTED,
              display: "block",
              marginBottom: "8px",
            }}
          >
            Top Subject By Volume
          </span>
          <div
            style={{
              fontSize: "15px",
              fontWeight: "700",
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "6px",
            }}
            title={topSubject ? topSubject.clean_subject : "No replies yet"}
          >
            {topSubject ? topSubject.clean_subject : "None"}
          </div>
          <span style={{ fontSize: "12px", color: TEXT_MUTED }}>
            {topSubject
              ? `${topSubject.reply_count} replies (${topSubject.unique_senders_count} senders)`
              : "No replies recorded yet"}
          </span>
        </div>

        {/* Latest Reply */}
        <div style={{ ...CARD_STYLE, padding: "20px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: TEXT_MUTED,
              display: "block",
              marginBottom: "8px",
            }}
          >
            Latest Response
          </span>
          <div
            style={{
              fontSize: "13px",
              fontWeight: "700",
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              marginBottom: "6px",
            }}
            title={latestReply ? latestReply.sender_email : ""}
          >
            {latestReply ? latestReply.sender_email : "No replies"}
          </div>
          <span style={{ fontSize: "11px", color: TEXT_MUTED }}>
            {latestReply
              ? new Date(latestReply.received_at).toLocaleString()
              : "Awaiting incoming traffic"}
          </span>
        </div>
      </div>

      {/* Main Grid: Subjects Breakdown & Detailed List */}
      <div style={{ ...CARD_STYLE, padding: "24px" }}>
        {/* Table Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: TEXT_PRIMARY,
                margin: 0,
              }}
            >
              Replies by Email Subject Line
            </h3>
            <span style={{ fontSize: "12px", color: TEXT_MUTED }}>
              Grouped and ranked by volume of inbound responses
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {selectedSubjectFilter && (
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter(null)}
                style={{
                  ...BTN_SECONDARY_STYLE,
                  fontSize: "11px",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  cursor: "pointer",
                }}
              >
                Clear Filter: "{selectedSubjectFilter.slice(0, 20)}..."
                <X size={12} />
              </button>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: SURFACE_ALT,
                border: `1px solid ${BORDER}`,
                borderRadius: RADIUS_MD,
                padding: "6px 12px",
              }}
            >
              <Search size={14} style={{ color: TEXT_MUTED }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject lines..."
                style={{
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: "12px",
                  color: TEXT_PRIMARY,
                  width: "180px",
                }}
              />
              {searchQuery && (
                <X
                  size={13}
                  style={{ color: TEXT_MUTED, cursor: "pointer" }}
                  onClick={() => setSearchQuery("")}
                />
              )}
            </div>
          </div>
        </div>

        {/* Subjects Table */}
        {filteredSubjects.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: SURFACE_ALT,
              borderRadius: RADIUS_MD,
              border: `1px dashed ${BORDER}`,
            }}
          >
            <Inbox
              size={36}
              style={{ color: TEXT_MUTED, margin: "0 auto 12px", opacity: 0.6 }}
            />
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: TEXT_PRIMARY,
                marginBottom: "4px",
              }}
            >
              No email replies found
            </div>
            <p
              style={{
                fontSize: "12px",
                color: TEXT_MUTED,
                maxWidth: "420px",
                margin: "0 auto 16px",
                lineHeight: 1.5,
              }}
            >
              When clients or recipients reply to your campaigns (or via Resend's inbound webhook), their responses will automatically group here by subject line.
            </p>
            <button
              type="button"
              onClick={() => setShowSimulateModal(true)}
              style={{
                ...BTN_PRIMARY_STYLE,
                fontSize: "12px",
                padding: "8px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
              Simulate First Reply
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1.5px solid ${BORDER}`,
                    textAlign: "left",
                    color: TEXT_MUTED,
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 14px" }}>Mail Subject</th>
                  <th style={{ padding: "12px 14px" }}>Replies</th>
                  <th style={{ padding: "12px 14px" }}>Unique Senders</th>
                  <th style={{ padding: "12px 14px" }}>Latest Reply</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>
                    Filter
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((s, idx) => {
                  const isSelected = selectedSubjectFilter === s.clean_subject;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        background: isSelected ? ACCENT_BG : "transparent",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Subject Name & Campaign association */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div style={{ fontWeight: "700", color: TEXT_PRIMARY }}>
                          {s.clean_subject}
                        </div>
                        {s.campaign_title && (
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: "10px",
                              fontWeight: "600",
                              background: "rgba(14, 165, 233, 0.1)",
                              color: ACCENT,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              marginTop: "4px",
                            }}
                          >
                            Campaign: {s.campaign_title}
                          </span>
                        )}
                        {s.sample_raw_subject !== s.clean_subject && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: TEXT_MUTED,
                              marginTop: "2px",
                            }}
                          >
                            Sample header: {s.sample_raw_subject}
                          </div>
                        )}
                      </td>

                      {/* Reply Count Badge */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "rgba(22, 163, 74, 0.1)",
                            color: "#15803D",
                          }}
                        >
                          <MessageSquare size={12} />
                          {s.reply_count}{" "}
                          {s.reply_count === 1 ? "reply" : "replies"}
                        </span>
                      </td>

                      {/* Unique Senders */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            fontWeight: "600",
                            color: TEXT_SECONDARY,
                            fontSize: "12px",
                          }}
                        >
                          {s.unique_senders_count}{" "}
                          {s.unique_senders_count === 1
                            ? "contact"
                            : "contacts"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: TEXT_MUTED,
                            marginTop: "2px",
                            maxWidth: "260px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={s.senders.join(", ")}
                        >
                          {s.senders.join(", ")}
                        </div>
                      </td>

                      {/* Latest Timestamp */}
                      <td style={{ padding: "14px", verticalAlign: "middle" }}>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: TEXT_SECONDARY,
                          }}
                        >
                          {s.latest_reply_at
                            ? new Date(s.latest_reply_at).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: TEXT_MUTED,
                            marginTop: "2px",
                          }}
                        >
                          {s.latest_reply_at
                            ? new Date(s.latest_reply_at).toLocaleTimeString(
                                [],
                                { hour: "2-digit", minute: "2-digit" }
                              )
                            : ""}
                        </div>
                      </td>

                      {/* Filter Button */}
                      <td
                        style={{
                          padding: "14px",
                          verticalAlign: "middle",
                          textAlign: "right",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedSubjectFilter(
                              isSelected ? null : s.clean_subject
                            )
                          }
                          style={{
                            ...BTN_SECONDARY_STYLE,
                            padding: "4px 10px",
                            fontSize: "11px",
                            cursor: "pointer",
                            background: isSelected ? ACCENT : undefined,
                            color: isSelected ? "#FFFFFF" : undefined,
                            borderColor: isSelected ? ACCENT : undefined,
                          }}
                        >
                          {isSelected ? "Filtered" : "View Messages"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Messages Feed */}
      <div style={{ ...CARD_STYLE, padding: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: TEXT_PRIMARY,
                margin: 0,
              }}
            >
              {selectedSubjectFilter
                ? `Messages for "${selectedSubjectFilter}"`
                : "All Received Messages Feed"}
            </h3>
            <span style={{ fontSize: "12px", color: TEXT_MUTED }}>
              Detailed inbound messages, sender details, and timestamps
            </span>
          </div>
          <span
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: TEXT_MUTED,
            }}
          >
            Showing {repliesList.length}{" "}
            {repliesList.length === 1 ? "message" : "messages"}
          </span>
        </div>

        {repliesList.length === 0 ? (
          <div
            style={{
              padding: "32px",
              textAlign: "center",
              color: TEXT_MUTED,
              fontSize: "13px",
            }}
          >
            No individual messages to display for this selection.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {repliesList.map((r) => (
              <div
                key={r.reply_id}
                style={{
                  padding: "16px",
                  background: SURFACE_ALT,
                  border: `1px solid ${BORDER}`,
                  borderRadius: RADIUS_MD,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "rgba(14, 165, 233, 0.12)",
                        color: ACCENT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "13px",
                      }}
                    >
                      {r.sender_name
                        ? r.sender_name[0].toUpperCase()
                        : r.sender_email[0].toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "700",
                          color: TEXT_PRIMARY,
                        }}
                      >
                        {r.sender_name ? `${r.sender_name} ` : ""}
                        <span
                          style={{
                            fontWeight: "500",
                            color: TEXT_MUTED,
                            fontSize: "12px",
                          }}
                        >
                          &lt;{r.sender_email}&gt;
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: TEXT_MUTED }}>
                        Delivered to: {r.recipient_email}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: TEXT_MUTED,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Clock size={12} />
                      {new Date(r.received_at).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenReplyContent(r)}
                      style={{
                        ...BTN_SECONDARY_STYLE,
                        padding: "3px 8px",
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                      title="View full email body"
                    >
                      <Eye size={12} /> View Email
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(r.reply_id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#DC2626",
                        cursor: "pointer",
                        padding: "4px",
                        display: "flex",
                        alignItems: "center",
                        opacity: 0.7,
                      }}
                      title="Delete this message record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Subject & Snippet */}
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: TEXT_SECONDARY,
                  }}
                >
                  {r.subject}
                </div>
                {r.snippet && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: TEXT_SECONDARY,
                      margin: 0,
                      background: SURFACE,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: `1px solid ${BORDER}`,
                      lineHeight: 1.5,
                    }}
                  >
                    {r.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Test Reply Modal */}
      {showSimulateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 28, 46, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              ...CARD_STYLE,
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              borderRadius: RADIUS_LG,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
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
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: TEXT_PRIMARY,
                  margin: 0,
                }}
              >
                Record / Simulate Inbound Reply
              </h3>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
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

            <form
              onSubmit={handleSimulateReply}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Campaign Quick Select (optional) */}
              {campaigns.length > 0 && (
                <div>
                  <label
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: TEXT_SECONDARY,
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Attach to Existing Campaign (Optional)
                  </label>
                  <select
                    value={formData.campaign_id}
                    onChange={(e) => {
                      const cId = e.target.value;
                      const selected = campaigns.find(
                        (c) => c.campaign_id === cId
                      );
                      setFormData((prev) => ({
                        ...prev,
                        campaign_id: cId,
                        subject: selected
                          ? `Re: ${selected.subject}`
                          : prev.subject,
                      }));
                    }}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: RADIUS_MD,
                      border: `1px solid ${BORDER}`,
                      fontSize: "13px",
                      color: TEXT_PRIMARY,
                      background: SURFACE,
                    }}
                  >
                    <option value="">-- Choose a campaign --</option>
                    {campaigns.map((c) => (
                      <option key={c.campaign_id} value={c.campaign_id}>
                        {c.title} — "{c.subject}"
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sender Email */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: TEXT_SECONDARY,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Sender Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.sender_email}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_email: e.target.value })
                  }
                  placeholder="e.g. client@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: RADIUS_MD,
                    border: `1px solid ${BORDER}`,
                    fontSize: "13px",
                    color: TEXT_PRIMARY,
                    background: SURFACE,
                  }}
                />
              </div>

              {/* Sender Name */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: TEXT_SECONDARY,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Sender Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) =>
                    setFormData({ ...formData, sender_name: e.target.value })
                  }
                  placeholder="e.g. John Doe"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: RADIUS_MD,
                    border: `1px solid ${BORDER}`,
                    fontSize: "13px",
                    color: TEXT_PRIMARY,
                    background: SURFACE,
                  }}
                />
              </div>

              {/* Subject */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: TEXT_SECONDARY,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Email Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  placeholder="e.g. Re: Year-End Tax Advisory 2026"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: RADIUS_MD,
                    border: `1px solid ${BORDER}`,
                    fontSize: "13px",
                    color: TEXT_PRIMARY,
                    background: SURFACE,
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: TEXT_MUTED,
                    marginTop: "4px",
                    display: "block",
                  }}
                >
                  "Re:" and "Fwd:" prefixes are automatically grouped to identify the parent email subject.
                </span>
              </div>

              {/* Message Snippet */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: TEXT_SECONDARY,
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Reply Message Snippet
                </label>
                <textarea
                  rows={3}
                  value={formData.snippet}
                  onChange={(e) =>
                    setFormData({ ...formData, snippet: e.target.value })
                  }
                  placeholder="e.g. Thank you for the update! We would like to schedule a consultation regarding the new GST rate revisions."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: RADIUS_MD,
                    border: `1px solid ${BORDER}`,
                    fontSize: "13px",
                    color: TEXT_PRIMARY,
                    background: SURFACE,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  style={{ ...BTN_SECONDARY_STYLE, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulating}
                  style={{
                    ...BTN_PRIMARY_STYLE,
                    cursor: simulating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={13} />
                  {simulating ? "Recording..." : "Record Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Email Content Modal */}
      {activeViewingReply && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 28, 46, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 9999,
          }}
          onClick={() => setActiveViewingReply(null)}
        >
          <div
            style={{
              ...CARD_STYLE,
              width: "100%",
              maxWidth: "680px",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              borderRadius: RADIUS_LG,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: SURFACE_ALT,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "rgba(14, 165, 233, 0.12)",
                    color: ACCENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "14px",
                  }}
                >
                  {activeViewingReply.sender_name
                    ? activeViewingReply.sender_name[0].toUpperCase()
                    : activeViewingReply.sender_email[0].toUpperCase()}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "15px",
                      fontWeight: "700",
                      color: TEXT_PRIMARY,
                      margin: 0,
                    }}
                  >
                    {activeViewingReply.subject || "No Subject"}
                  </h3>
                  <div style={{ fontSize: "12px", color: TEXT_MUTED }}>
                    From:{" "}
                    <strong style={{ color: TEXT_PRIMARY }}>
                      {activeViewingReply.sender_name
                        ? `${activeViewingReply.sender_name} <${activeViewingReply.sender_email}>`
                        : activeViewingReply.sender_email}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <a
                  href={`mailto:${activeViewingReply.sender_email}?subject=Re: ${encodeURIComponent(
                    activeViewingReply.subject || ""
                  )}`}
                  style={{
                    ...BTN_SECONDARY_STYLE,
                    fontSize: "11.5px",
                    padding: "6px 10px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  title="Open in your default mail client"
                >
                  <ExternalLink size={12} /> Reply
                </a>
                <button
                  type="button"
                  onClick={() => setActiveViewingReply(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: TEXT_MUTED,
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Metadata Bar */}
            <div
              style={{
                padding: "10px 20px",
                background: SURFACE,
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "11.5px",
                color: TEXT_MUTED,
              }}
            >
              <div>
                <strong>Delivered to:</strong> {activeViewingReply.recipient_email}
              </div>
              <div>
                <strong>Received:</strong>{" "}
                {new Date(activeViewingReply.received_at).toLocaleString("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </div>
              {activeViewingReply.campaign_title && (
                <div>
                  <strong>Campaign:</strong> {activeViewingReply.campaign_title}
                </div>
              )}
            </div>

            {/* Email Message Content Body */}
            <div
              style={{
                padding: "20px",
                overflowY: "auto",
                flex: 1,
                fontSize: "13px",
                lineHeight: 1.6,
                color: TEXT_PRIMARY,
                background: "#ffffff",
              }}
            >
              {loadingContent ? (
                <div style={{ textAlign: "center", padding: "40px", color: TEXT_MUTED }}>
                  <RefreshCw
                    size={20}
                    style={{ animation: "spin 1s linear infinite", marginBottom: "8px" }}
                  />
                  <div>Loading email content from server...</div>
                </div>
              ) : activeViewingReply.body_html ? (
                <div
                  dangerouslySetInnerHTML={{ __html: activeViewingReply.body_html }}
                  style={{ wordBreak: "break-word" }}
                />
              ) : activeViewingReply.body_text ? (
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    margin: 0,
                    color: TEXT_PRIMARY,
                  }}
                >
                  {activeViewingReply.body_text}
                </pre>
              ) : activeViewingReply.snippet ? (
                <div
                  style={{
                    padding: "12px 16px",
                    background: SURFACE_ALT,
                    border: `1px solid ${BORDER}`,
                    borderRadius: RADIUS_MD,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {activeViewingReply.snippet}
                </div>
              ) : (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    color: TEXT_MUTED,
                    fontStyle: "italic",
                  }}
                >
                  No body text recorded for this email message.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: `1px solid ${BORDER}`,
                background: SURFACE_ALT,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveViewingReply(null)}
                style={{ ...BTN_SECONDARY_STYLE, cursor: "pointer", fontSize: "12px", padding: "6px 14px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
