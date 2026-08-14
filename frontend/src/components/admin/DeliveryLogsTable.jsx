import React, { useState, useEffect } from "react";
import axios from "axios";
import { Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";

export default function DeliveryLogsTable({ backendUrl }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");

  useEffect(() => {
    fetchLogs();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `${backendUrl}/api/admin/communication/logs?limit=50`;
      if (statusFilter) url += `&status=${statusFilter}`;
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

  return (
    <div className="space-y-6">
      {/* Stats Header Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Attempts</span>
            <span className="text-xl font-bold text-navy block mt-1">{stats.total_attempts}</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sent to Provider</span>
            <span className="text-xl font-bold text-emerald-600 block mt-1">{stats.sent_count}</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Blocked by Allowlist</span>
            <span className="text-xl font-bold text-amber-600 block mt-1">{stats.skipped_count}</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Failed</span>
            <span className="text-xl font-bold text-rose-600 block mt-1">{stats.failed_count}</span>
          </div>
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suppressed / Opted Out</span>
            <span className="text-xl font-bold text-slate-700 block mt-1">{stats.suppressed_count}</span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search recipient email..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded-md hover:bg-navy/90"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="blocked_test_mode">Blocked (Test Mode)</option>
            <option value="failed">Failed</option>
          </select>

          <button
            type="button"
            onClick={() => { fetchLogs(); fetchStats(); }}
            className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-navy" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Provider</th>
              <th className="py-3 px-4">Message ID</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">Timestamp (UTC)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 font-sans">
                  {loading ? "Loading audit logs..." : "No email dispatch records found."}
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                let badgeClass = "bg-slate-100 text-slate-700";
                let Icon = AlertTriangle;
                if (log.status === "sent") {
                  badgeClass = "bg-emerald-100 text-emerald-800";
                  Icon = CheckCircle2;
                } else if (log.status === "blocked_test_mode" || log.status === "skipped_allowlist") {
                  // skipped_allowlist kept for backward-compatible display of old DB records
                  badgeClass = "bg-amber-100 text-amber-800";
                  Icon = ShieldCheck;
                } else if (log.status === "failed") {
                  badgeClass = "bg-rose-100 text-rose-800";
                  Icon = XCircle;
                }

                return (
                  <tr key={log.attempt_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${badgeClass}`}>
                        <Icon className="w-3 h-3" />
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900">{log.recipient_email}</td>
                    <td className="py-3 px-4 uppercase text-[10px] text-slate-500">{log.provider}</td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-[140px]" title={log.resend_id}>
                      {log.resend_id || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{log.response_time_ms}ms</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
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
  );
}
