import React from "react";
import { CheckCircle2, AlertOctagon, RefreshCw, Send, XCircle } from "lucide-react";

export default function CampaignProgress({ campaign, onCancel, cancelling }) {
  if (!campaign) return null;

  const total = campaign.frozen_recipient_count || 1;
  const dispatched = campaign.dispatched_count || 0;
  const percentage = Math.min(100, Math.round((dispatched / total) * 100));

  const isCompleted = campaign.status === "completed";
  const isCancelled = campaign.status === "cancelled";
  const isSending = campaign.status === "sending";

  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-navy">{campaign.title}</h3>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isCompleted
                  ? "bg-emerald-100 text-emerald-800"
                  : isCancelled
                  ? "bg-rose-100 text-rose-800"
                  : "bg-amber-100 text-amber-800 animate-pulse"
              }`}
            >
              {campaign.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Subject: <span className="text-slate-700 font-medium">{campaign.subject}</span>
          </p>
        </div>

        {isSending && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="px-3.5 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            {cancelling ? "Stopping..." : "Stop Remaining Outbox"}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-600">
          <span>Dispatch Progress: {percentage}%</span>
          <span>
            {dispatched} of {total} Dispatched
          </span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 ${
              isCompleted
                ? "bg-emerald-500"
                : isCancelled
                ? "bg-rose-500"
                : "bg-navy"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Target</span>
          <span className="text-xl font-bold text-navy mt-0.5 block">{total}</span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Dispatched</span>
          <span className="text-xl font-bold text-slate-800 mt-0.5 block">{dispatched}</span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Delivered (Webhooks)</span>
          <span className="text-xl font-bold text-emerald-600 mt-0.5 block">{campaign.delivered_count || 0}</span>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Bounced / Failed</span>
          <span className="text-xl font-bold text-rose-600 mt-0.5 block">
            {(campaign.bounced_count || 0) + (campaign.failed_count || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
