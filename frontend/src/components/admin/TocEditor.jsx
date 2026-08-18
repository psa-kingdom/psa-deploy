import React, { useState, useMemo } from "react";
import {
  List,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Link as LinkIcon,
  CheckCircle2,
  Layers,
  X,
  Hash,
} from "lucide-react";
import {
  parseHeadingsFromHtml,
  injectMissingHeadingIds,
  reconcileToc,
  findOrphanedTocIds,
  computeHierarchicalNumbers,
  slugifyAnchor,
} from "../../utils/toc";

export default function TocEditor({ toc = [], onChange, body = "", onUpdateBody }) {
  const [syncNotice, setSyncNotice] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customId, setCustomId] = useState("");
  const [customLevel, setCustomLevel] = useState(2);

  // Parse detected headings from the raw body HTML
  const detectedHeadings = useMemo(() => {
    return parseHeadingsFromHtml(body);
  }, [body]);

  // Identify any orphaned TOC items whose anchor ID is missing in the body
  const orphanedIds = useMemo(() => {
    return findOrphanedTocIds(toc, detectedHeadings);
  }, [toc, detectedHeadings]);

  // Compute hierarchical numbers (01, 01.1, 02)
  const numbers = useMemo(() => {
    return computeHierarchicalNumbers(toc);
  }, [toc]);

  // Detect which headings are present in the body but not yet added to the TOC
  const unlinkedHeadings = useMemo(() => {
    const currentIds = new Set((toc || []).map((t) => t.id));
    return detectedHeadings.filter((h) => !currentIds.has(h.id));
  }, [detectedHeadings, toc]);

  // Handle Synchronize from Headings
  const handleSync = () => {
    const rawHeadings = parseHeadingsFromHtml(body);
    if (rawHeadings.length === 0) {
      setSyncNotice("No <h2> or <h3> headings detected in article body.");
      setTimeout(() => setSyncNotice(""), 3500);
      return;
    }

    // If some headings lacked IDs in raw HTML, inject them so anchors match
    if (onUpdateBody) {
      const updatedBody = injectMissingHeadingIds(body, rawHeadings);
      if (updatedBody !== body) {
        onUpdateBody(updatedBody);
      }
    }

    const reconciled = reconcileToc(toc, rawHeadings);
    onChange(reconciled);

    const preservedCount = (toc || []).filter((t) =>
      rawHeadings.some((h) => h.id === t.id && t.label !== h.label)
    ).length;

    setSyncNotice(
      `Synced ${reconciled.length} heading${reconciled.length === 1 ? "" : "s"} from body${
        preservedCount > 0 ? ` (preserved ${preservedCount} custom label${preservedCount === 1 ? "" : "s"})` : ""
      }.`
    );
    setTimeout(() => setSyncNotice(""), 4000);
  };

  // Reorder item up
  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newToc = [...toc];
    const temp = newToc[index - 1];
    newToc[index - 1] = newToc[index];
    newToc[index] = temp;
    onChange(newToc);
  };

  // Reorder item down
  const handleMoveDown = (index) => {
    if (index === toc.length - 1) return;
    const newToc = [...toc];
    const temp = newToc[index + 1];
    newToc[index + 1] = newToc[index];
    newToc[index] = temp;
    onChange(newToc);
  };

  // Remove item
  const handleRemove = (index) => {
    const newToc = toc.filter((_, i) => i !== index);
    onChange(newToc);
  };

  // Edit item label
  const handleLabelChange = (index, newLabel) => {
    const newToc = [...toc];
    newToc[index] = { ...newToc[index], label: newLabel };
    onChange(newToc);
  };

  // Toggle level (h2 <-> h3)
  const handleToggleLevel = (index) => {
    const newToc = [...toc];
    const currentLevel = newToc[index].level || 2;
    newToc[index] = { ...newToc[index], level: currentLevel === 2 ? 3 : 2 };
    onChange(newToc);
  };

  // Quick-add detected heading
  const handleQuickAdd = (heading) => {
    const newToc = [
      ...toc,
      {
        id: heading.id,
        label: heading.label,
        level: heading.level || 2,
      },
    ];
    onChange(newToc);
  };

  // Add custom TOC item
  const handleAddCustomSubmit = (e) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    const finalId = (customId.trim() ? slugifyAnchor(customId) : slugifyAnchor(customLabel)) || "section";
    const newItem = {
      id: finalId,
      label: customLabel.trim(),
      level: Number(customLevel) || 2,
    };

    onChange([...toc, newItem]);
    setCustomLabel("");
    setCustomId("");
    setCustomLevel(2);
    setShowAddCustom(false);
  };

  // Clear all TOC items
  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all items from the Table of Contents?")) {
      onChange([]);
    }
  };

  return (
    <div
      style={{
        background: "#040b14",
        border: "1px solid rgba(14,165,233,0.15)",
        borderRadius: "8px",
        padding: "16px",
        marginTop: "16px",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "14px",
          borderBottom: "1px solid rgba(14,165,233,0.08)",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "5px",
              background: "rgba(14,165,233,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <List size={13} style={{ color: "#0ea5e9" }} />
          </div>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#e2e8f0",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Table of Contents
            </span>
            <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "8px" }}>
              ({toc.length} item{toc.length === 1 ? "" : "s"})
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleSync}
            title="Inspect article HTML body and sync TOC items with existing custom labels preserved"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 9px",
              borderRadius: "5px",
              border: "1px solid rgba(14,165,233,0.25)",
              background: "rgba(14,165,233,0.08)",
              color: "#38bdf8",
              fontSize: "11px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={11} /> Sync from Headings
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustom(!showAddCustom)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 9px",
              borderRadius: "5px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: showAddCustom ? "rgba(255,255,255,0.08)" : "transparent",
              color: "#94a3b8",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <Plus size={11} /> Add Item
          </button>

          {toc.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              title="Remove all items from TOC"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "5px",
                border: "1px solid rgba(239,68,68,0.2)",
                background: "transparent",
                color: "#f87171",
                fontSize: "10.5px",
                cursor: "pointer",
              }}
            >
              <Trash2 size={10} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Sync Flash Notice */}
      {syncNotice && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            padding: "8px 12px",
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.25)",
            borderRadius: "6px",
            color: "#4ade80",
            fontSize: "11.5px",
            marginBottom: "12px",
          }}
        >
          <CheckCircle2 size={13} />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Add Custom Form */}
      {showAddCustom && (
        <form
          onSubmit={handleAddCustomSubmit}
          style={{
            background: "#081324",
            border: "1px solid rgba(14,165,233,0.2)",
            borderRadius: "6px",
            padding: "12px",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "#38bdf8" }}>Add Table of Contents Item</span>
            <button
              type="button"
              onClick={() => setShowAddCustom(false)}
              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0 }}
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px auto", gap: "8px", alignItems: "center" }}>
            <input
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Display Label (e.g. Risk Breakpoints)"
              style={{
                background: "rgba(14,165,233,0.04)",
                border: "1px solid rgba(14,165,233,0.15)",
                borderRadius: "5px",
                padding: "6px 10px",
                fontSize: "12px",
                color: "#e2e8f0",
                outline: "none",
              }}
            />

            <input
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="Anchor ID (e.g. risk-breakpoints)"
              style={{
                background: "rgba(14,165,233,0.04)",
                border: "1px solid rgba(14,165,233,0.15)",
                borderRadius: "5px",
                padding: "6px 10px",
                fontSize: "12px",
                color: "#94a3b8",
                fontFamily: "monospace",
                outline: "none",
              }}
            />

            <select
              value={customLevel}
              onChange={(e) => setCustomLevel(Number(e.target.value))}
              style={{
                background: "#060f1c",
                border: "1px solid rgba(14,165,233,0.15)",
                borderRadius: "5px",
                padding: "6px 8px",
                fontSize: "11px",
                color: "#cbd5e1",
                outline: "none",
              }}
            >
              <option value={2}>H2 (Level 2)</option>
              <option value={3}>H3 (Level 3)</option>
            </select>

            <button
              type="submit"
              style={{
                padding: "6px 12px",
                borderRadius: "5px",
                border: "none",
                background: "#0ea5e9",
                color: "#fff",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Add Item
            </button>
          </div>
        </form>
      )}

      {/* ── TOC Items List ── */}
      {toc.length === 0 ? (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            border: "1px dashed rgba(14,165,233,0.15)",
            borderRadius: "6px",
            background: "rgba(14,165,233,0.02)",
          }}
        >
          <Layers size={22} style={{ color: "#334155", margin: "0 auto 8px" }} />
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            No Table of Contents items configured.
          </p>
          <p style={{ fontSize: "11px", color: "#475569", marginTop: "4px", marginBottom: "12px" }}>
            Click &ldquo;Sync from Headings&rdquo; to automatically detect and populate headings from your article content.
          </p>
          <button
            type="button"
            onClick={handleSync}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid rgba(14,165,233,0.3)",
              background: "rgba(14,165,233,0.1)",
              color: "#38bdf8",
              fontSize: "11.5px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={12} /> Sync from Headings
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {toc.map((item, idx) => {
            const isOrphaned = orphanedIds.has(item.id);
            const isLevel3 = item.level === 3;
            const numberLabel = numbers[idx] || String(idx + 1).padStart(2, "0");

            return (
              <div
                key={item.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 12px",
                  marginLeft: isLevel3 ? "24px" : "0px",
                  background: isOrphaned ? "rgba(245,158,11,0.06)" : "#071324",
                  border: `1px solid ${isOrphaned ? "rgba(245,158,11,0.3)" : "rgba(14,165,233,0.1)"}`,
                  borderRadius: "6px",
                  transition: "background 0.12s, border-color 0.12s",
                }}
              >
                {/* Hierarchical Number badge */}
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: isLevel3 ? "#64748b" : "#38bdf8",
                    minWidth: "28px",
                  }}
                >
                  {numberLabel}
                </span>

                {/* Level toggle badge (H2 / H3) */}
                <button
                  type="button"
                  onClick={() => handleToggleLevel(idx)}
                  title={`Level ${item.level || 2} heading. Click to toggle between H2 & H3`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: `1px solid ${isLevel3 ? "rgba(100,116,139,0.3)" : "rgba(14,165,233,0.3)"}`,
                    background: isLevel3 ? "rgba(100,116,139,0.12)" : "rgba(14,165,233,0.12)",
                    color: isLevel3 ? "#94a3b8" : "#38bdf8",
                    fontSize: "9.5px",
                    fontWeight: "700",
                    cursor: "pointer",
                    textTransform: "uppercase",
                  }}
                >
                  {isLevel3 ? "H3" : "H2"}
                </button>

                {/* Editable Label input */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    value={item.label}
                    onChange={(e) => handleLabelChange(idx, e.target.value)}
                    placeholder="TOC Display Label..."
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px dashed rgba(14,165,233,0.2)",
                      padding: "2px 4px",
                      fontSize: "12.5px",
                      fontWeight: isLevel3 ? "400" : "500",
                      color: "#e2e8f0",
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Anchor ID Badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: "#64748b",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    whiteSpace: "nowrap",
                  }}
                  title={`Anchor ID: #${item.id}`}
                >
                  <Hash size={10} style={{ color: "#475569" }} />
                  <span>{item.id}</span>
                </div>

                {/* Orphaned Warning */}
                {isOrphaned && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      color: "#fbbf24",
                      background: "rgba(245,158,11,0.12)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                    }}
                    title="This anchor ID was not found in the article body HTML."
                  >
                    <AlertTriangle size={10} /> Anchor missing
                  </span>
                )}

                {/* Reorder Up */}
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  title="Move up"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "3px",
                    color: idx === 0 ? "#1e293b" : "#64748b",
                    cursor: idx === 0 ? "default" : "pointer",
                  }}
                >
                  <ArrowUp size={12} />
                </button>

                {/* Reorder Down */}
                <button
                  type="button"
                  disabled={idx === toc.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  title="Move down"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "3px",
                    color: idx === toc.length - 1 ? "#1e293b" : "#64748b",
                    cursor: idx === toc.length - 1 ? "default" : "pointer",
                  }}
                >
                  <ArrowDown size={12} />
                </button>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  title="Remove from TOC"
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "3px",
                    color: "#f87171",
                    cursor: "pointer",
                    opacity: 0.7,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Unlinked Headings Helper (Quick Add) ── */}
      {unlinkedHeadings.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            padding: "8px 10px",
            background: "rgba(14,165,233,0.03)",
            border: "1px solid rgba(14,165,233,0.08)",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontSize: "10.5px", color: "#64748b", marginBottom: "6px", fontWeight: "600" }}>
            Detected in article body (not in TOC):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {unlinkedHeadings.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleQuickAdd(h)}
                title={`Click to add "${h.label}" to Table of Contents`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  border: "1px solid rgba(14,165,233,0.15)",
                  background: "rgba(14,165,233,0.06)",
                  color: "#38bdf8",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                <Plus size={10} />
                <span>{h.label}</span>
                <span style={{ fontSize: "9.5px", color: "#64748b" }}>({h.level === 3 ? "H3" : "H2"})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
