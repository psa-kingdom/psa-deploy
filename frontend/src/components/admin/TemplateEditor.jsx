import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, Code, Smartphone, Monitor, Sparkles } from "lucide-react";

export default function TemplateEditor({
  backendUrl,
  templates = [],
  selectedTemplateId,
  onTemplateSelect,
  subject,
  onSubjectChange,
  bodyHtml,
  onBodyHtmlChange,
}) {
  const [viewMode, setViewMode] = useState("preview"); // "editor" | "preview" | "split"
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "mobile"
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchLivePreview(subject, bodyHtml);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, bodyHtml]);

  const fetchLivePreview = async (subj, html) => {
    if (!html) {
      setPreviewHtml("");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await axios.post(
        `${backendUrl}/api/admin/communication/templates/preview`,
        {
          subject: subj || "Subject Preview",
          body_html: html,
          recipient_name: "CA Rajesh Sharma",
          recipient_company: "Bharat Financial Corp",
          recipient_email: "rajesh@example.com"
        },
        {
          withCredentials: true
        }
      );
      setPreviewHtml(res.data.html);
    } catch (err) {
      console.error("Preview render failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const insertVariable = (varName) => {
    const tag = `{{${varName}}}`;
    onBodyHtmlChange(bodyHtml + tag);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-serif font-bold text-navy mb-1">2. Compose Email Content</h3>
          <p className="text-sm text-slate-500">
            Select a template or write custom HTML. What you see is exactly what will be sent.
          </p>
        </div>

        {/* Template Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Template:</label>
          <select
            value={selectedTemplateId || ""}
            onChange={(e) => onTemplateSelect(e.target.value)}
            className="text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-navy"
          >
            <option value="">-- Custom Template --</option>
            {templates.map((t) => (
              <option key={t.template_id} value={t.template_id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Subject Line Input */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
          Email Subject Line
        </label>
        <div className="relative">
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. Important Regulatory & Tax Advisory Update"
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
          />
        </div>
      </div>

      {/* Personalization Tag Inserter */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Insert Placeholder:
        </span>
        {["name", "company", "email", "unsubscribe_url"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => insertVariable(v)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-2 py-1 rounded transition-colors text-[11px]"
          >
            &#123;&#123;{v}&#125;&#125;
          </button>
        ))}
      </div>

      {/* Main Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-slate-400" /> HTML Content Body
            </span>
            <span className="text-[11px] text-slate-400">
              {applyWrapper !== false ? "Corporate wrapper applied around body" : "Exact authored HTML sent as-is"}
            </span>
          </div>
          <textarea
            rows={18}
            value={bodyHtml}
            onChange={(e) => onBodyHtmlChange(e.target.value)}
            placeholder="<h2>Enter HTML message content here...</h2>"
            className="w-full font-mono text-xs p-4 bg-slate-900 text-slate-100 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed"
          />
        </div>

        {/* Live Preview Column */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" /> Real-time Email Preview
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded border border-slate-200">
              <button
                type="button"
                onClick={() => setPreviewDevice("desktop")}
                className={`p-1 rounded text-xs flex items-center gap-1 ${previewDevice === "desktop" ? "bg-white text-navy font-semibold shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice("mobile")}
                className={`p-1 rounded text-xs flex items-center gap-1 ${previewDevice === "mobile" ? "bg-white text-navy font-semibold shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          <div
            className={`border border-slate-200 rounded-lg bg-slate-100 overflow-hidden flex justify-center p-3 h-[410px] ${
              previewDevice === "mobile" ? "max-w-[380px] mx-auto" : "w-full"
            }`}
          >
            {previewLoading ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Rendering preview...
              </div>
            ) : previewHtml ? (
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-full bg-white rounded shadow-sm border-0"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                Enter HTML body content to see preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
