import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, X, Send, ShieldAlert } from "lucide-react";

export default function CampaignReviewModal({
  isOpen,
  onClose,
  campaign,
  frozenCount,
  onConfirm,
  confirming
}) {
  const [typedCount, setTypedCount] = useState("");
  const [confirmedCheck, setConfirmedCheck] = useState(false);

  if (!isOpen || !campaign) return null;

  const countMatches = parseInt(typedCount, 10) === frozenCount;
  const canDispatch = countMatches && confirmedCheck && !confirming;

  const handleConfirm = () => {
    if (!canDispatch) return;
    const idempotencyKey = `psa_camp_${campaign.campaign_id || Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    onConfirm(idempotencyKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-navy px-6 py-4 text-white flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif font-bold text-base tracking-wide">
              Two-Step Production Campaign Confirmation
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={confirming}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-slate-700 text-sm">
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r text-xs text-amber-900 leading-relaxed">
            <strong>Critical Safety Check:</strong> Once dispatched, outbox jobs will begin sending through the provider queue. Emails that have already reached inboxes cannot be recalled.
          </div>

          {/* Campaign Summary Table */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Campaign Title:</span>
              <span className="font-semibold text-navy">{campaign.title}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Sender:</span>
              <span className="font-semibold text-slate-800">{campaign.sender_email || "P Suman & Associates"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Subject Line:</span>
              <span className="font-semibold text-slate-800">{campaign.subject}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Frozen Target Audience:</span>
              <span className="font-bold text-sm text-navy bg-amber-100 px-2 py-0.5 rounded">
                {frozenCount} Verified Recipients
              </span>
            </div>
          </div>

          {/* Safety Barrier: Type Exact Count */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Type the exact recipient count (<span className="text-navy font-mono text-sm">{frozenCount}</span>) to unlock dispatch:
            </label>
            <input
              type="text"
              value={typedCount}
              onChange={(e) => setTypedCount(e.target.value.trim())}
              placeholder={`Enter ${frozenCount}`}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
            />
          </div>

          {/* Checkbox verification */}
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 select-none">
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-navy focus:ring-navy"
            />
            <span>
              I have sent a test email, verified all personalization tags, and authorize the automated delivery of this campaign.
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg shadow-sm"
          >
            Cancel & Return
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canDispatch}
            className={`px-5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all ${
              canDispatch
                ? "bg-navy hover:bg-navy/90 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {confirming ? "Authorizing & Dispatching..." : `Authorize & Dispatch (${frozenCount} Emails)`}
          </button>
        </div>
      </div>
    </div>
  );
}
