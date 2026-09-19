import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Mail,
  Send,
  Layers,
  FileText
} from "lucide-react";

export default function DeliveryLogsTable({ backendUrl, campaigns = [], onRefreshCampaigns }) {
  const [activeSubTab, setActiveSubTab] = useState("campaigns"); // "campaigns" | "attempts"
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [expandedCampaignId, setExpandedCampaignId] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    if (onRefreshCampaigns) onRefreshCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `${backendUrl}/api/admin/communication/logs?limit=50`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&job_type=${typeFilter}`;
      if (recipientSearch) url += `&recipient=${encodeURIComponent(recipientSearch)}`;

      const res = await axios.get(url, { withCredentials: true });
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${backendUrl}/api/admin/communication/logs/stats`, {
        withCredentials: true
      });
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const toggleExpand = (campaignId) => {
    setExpandedCampaignId(expandedCampaignId === campaignId ? null : campaignId);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("campaigns")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "campaigns"
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Historical Campaigns ({campaigns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("attempts")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "attempts"
                ? "bg-sky-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Individual Dispatch Records
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            fetchLogs();
            fetchStats();
            if (onRefreshCampaigns) onRefreshCampaigns();
          }}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-300 bg-white dark:bg-[#0A2540] border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          title="Refresh audit data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats Header Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-[#0A2540] p-3.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Attempts</span>
            <span className="text-xl font-bold text-slate-800 dark:text-white block mt-1">{stats.total_attempts}</span>
          </div>
          <div className="bg-white dark:bg-[#0A2540] p-3.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sent to Provider</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1">{stats.sent_count}</span>
          </div>
          <div className="bg-white dark:bg-[#0A2540] p-3.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Blocked (Test Mode)</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400 block mt-1">{stats.skipped_count}</span>
          </div>
          <div className="bg-white dark:bg-[#0A2540] p-3.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Failed</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 block mt-1">{stats.failed_count}</span>
          </div>
          <div className="bg-white dark:bg-[#0A2540] p-3.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Campaigns</span>
            <span className="text-xl font-bold text-sky-600 dark:text-sky-400 block mt-1">{campaigns.length || stats.total_campaigns}</span>
          </div>
        </div>
      )}

      {/* SUBTAB 1: CAMPAIGN HISTORY GROUPED VIEW */}
      {activeSubTab === "campaigns" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Historical record of created and dispatched campaigns</span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Note: Application dispatch status is recorded. Webhook delivery confirmation is tracked when received.
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-8 border border-slate-200 dark:border-white/10 text-center text-slate-400 dark:text-slate-500 text-xs">
              No historical campaigns recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => {
                const isExpanded = expandedCampaignId === c.campaign_id;
                const isCompleted = c.status === "completed";
                const isSending = c.status === "sending";
                const isCancelled = c.status === "cancelled";

                let statusBadge = "bg-slate-800 text-slate-300 border-slate-700";
                if (isCompleted) statusBadge = "bg-emerald-950/60 text-emerald-300 border-emerald-800";
                else if (isSending) statusBadge = "bg-indigo-950/60 text-indigo-300 border-indigo-800";
                else if (isCancelled) statusBadge = "bg-rose-950/60 text-rose-300 border-rose-800";
                else if (c.status === "reviewing") statusBadge = "bg-amber-950/60 text-amber-300 border-amber-800";

                return (
                  <div
                    key={c.campaign_id}
                    className="bg-white dark:bg-[#0A2540] rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm"
                  >
                    <div
                      onClick={() => toggleExpand(c.campaign_id)}
                      className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-sm text-slate-800 dark:text-white">{c.title}</span>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${statusBadge}`}>
                            {c.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4">
                          <span>Subject: <strong className="text-slate-700 dark:text-slate-200 font-normal">{c.subject}</strong></span>
                          <span>•</span>
                          <span>Recipients: <strong className="text-slate-700 dark:text-slate-200">{c.frozen_recipient_count || 0}</strong></span>
                          <span>•</span>
                          <span>Created: {new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Dispatched</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                            {c.dispatched_count || 0} / {c.frozen_recipient_count || 0}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Details Panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-[#06182C]/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Sender Address</span>
                          <span className="text-slate-700 dark:text-slate-200 font-mono mt-0.5 block">{c.sender_email || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Reply-To</span>
                          <span className="text-slate-700 dark:text-slate-200 font-mono mt-0.5 block">{c.reply_to || "—"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Target Audience Source</span>
                          <span className="text-slate-700 dark:text-slate-200 mt-0.5 block">{c.target_filter?.source || "manual"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Completed Timestamp</span>
                          <span className="text-slate-700 dark:text-slate-200 mt-0.5 block">
                            {c.completed_at ? new Date(c.completed_at).toLocaleString() : "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: INDIVIDUAL DISPATCH ATTEMPTS */}
      {activeSubTab === "attempts" && (
        <div className="space-y-4">
          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-[#0A2540] p-4 rounded-lg border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  placeholder="Search recipient email..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-white dark:bg-[#06182C] border border-slate-200 dark:border-white/15 text-slate-700 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-sky-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-white/10 rounded-md hover:bg-slate-200 dark:hover:bg-white/20"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs bg-white dark:bg-[#06182C] border border-slate-200 dark:border-white/15 rounded-md px-3 py-1.5 text-slate-600 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="campaign">Campaigns</option>
                <option value="transactional">Transactional</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white dark:bg-[#06182C] border border-slate-200 dark:border-white/15 rounded-md px-3 py-1.5 text-slate-600 dark:text-slate-200 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="blocked_test_mode">Blocked (Test Mode)</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#0A2540] rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Message ID</th>
                  <th className="py-3 px-4">Latency</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono text-slate-600 dark:text-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 dark:text-slate-500 font-sans">
                      {loading ? "Loading audit logs..." : "No email dispatch records found."}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    let badgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                    let Icon = AlertTriangle;
                    if (log.status === "sent") {
                      badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                      Icon = CheckCircle2;
                    } else if (log.status === "blocked_test_mode" || log.status === "skipped_allowlist") {
                      badgeClass = "bg-amber-50 text-amber-700 border border-amber-200";
                      Icon = ShieldCheck;
                    } else if (log.status === "failed") {
                      badgeClass = "bg-rose-50 text-rose-700 border border-rose-200";
                      Icon = XCircle;
                    }

                    let typeLabel = "Campaign";
                    let typeBadgeClass = "bg-sky-50 text-sky-700 border-sky-200";
                    if (log.transactional_type === "contact_acknowledgement") {
                      typeLabel = "Contact Ack";
                      typeBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (log.transactional_type === "newsletter_welcome") {
                      typeLabel = "Newsletter";
                      typeBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
                    } else if (log.job_type === "transactional") {
                      typeLabel = "Transactional";
                      typeBadgeClass = "bg-purple-50 text-purple-700 border-purple-200";
                    }

                    return (
                      <tr key={log.attempt_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-semibold border ${badgeClass}`}>
                            <Icon className="w-3 h-3" />
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadgeClass}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-medium text-slate-700 dark:text-slate-200">{log.recipient_email}</td>
                        <td className="py-3 px-4 uppercase text-[10px] text-slate-500 dark:text-slate-400">{log.provider}</td>
                        <td className="py-3 px-4 text-slate-400 dark:text-slate-500 truncate max-w-[140px]" title={log.resend_id}>
                          {log.resend_id || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{log.response_time_ms}ms</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

