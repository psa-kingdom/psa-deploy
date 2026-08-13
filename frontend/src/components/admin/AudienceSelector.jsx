import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Mail, ListFilter, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AudienceSelector({ backendUrl, selectedSource, onChange, onEstimateLoaded }) {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sources = [
    {
      id: "newsletter_subscriptions",
      title: "Newsletter Subscribers",
      desc: "Users who subscribed to PSA Insights via website forms",
      icon: Mail,
      badge: "Recommended"
    },
    {
      id: "manual",
      title: "Manual Recipients",
      desc: "Admin-entered email addresses (entered in the composer above)",
      icon: Users,
      badge: null
    },
    {
      id: "combined",
      title: "Both Sources",
      desc: "Newsletter subscribers + manual list, deduplicated",
      icon: ListFilter,
      badge: null
    }
  ];

  useEffect(() => {
    fetchEstimate(selectedSource);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource]);

  const fetchEstimate = async (source) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${backendUrl}/api/admin/communication/campaigns/estimate?source=${source}`,
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
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-serif font-bold text-navy mb-1">1. Select Target Audience</h3>
        <p className="text-sm text-slate-500">
          Choose recipient source. All emails are automatically normalized, deduplicated, and checked against suppression lists.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((src) => {
          const Icon = src.icon;
          const isSelected = selectedSource === src.id;
          return (
            <div
              key={src.id}
              onClick={() => onChange(src.id)}
              className={`relative cursor-pointer rounded-lg p-5 border transition-all duration-200 ${
                isSelected
                  ? "bg-navy/5 border-navy shadow-sm ring-1 ring-navy"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              {src.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {src.badge}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-lg ${isSelected ? "bg-navy text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-navy">{src.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{src.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Audience Estimation Card */}
      <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ListFilter className="w-5 h-5 text-amber-600" />
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                Audience Calculation Summary
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold text-navy">
                  {loading ? "..." : (estimate ? estimate.net_target_count : 0)}
                </span>
                <span className="text-xs text-slate-500 font-medium">Verified Unique Recipients</span>
              </div>
            </div>
          </div>

          {estimate && (
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">
                <span className="text-slate-400 mr-1.5">Raw Records:</span>
                <span className="font-semibold text-slate-700">{estimate.raw_count}</span>
              </div>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">
                <span className="text-slate-400 mr-1.5">Suppressed / Opted Out:</span>
                <span className="font-semibold text-slate-700">{estimate.suppressed_count}</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Duplicates</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
