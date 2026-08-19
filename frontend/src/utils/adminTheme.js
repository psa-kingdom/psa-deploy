/**
 * adminTheme.js
 *
 * Shared design token constants for the PSA Admin Panel.
 * Used across all admin pages and components via inline style props.
 *
 * Design direction: light/hybrid enterprise SaaS.
 * - Light, neutral page surfaces with deliberate dark sidebar.
 * - Clear typographic hierarchy.
 * - PSA blue/cyan accent language preserved.
 * - Semantic colors (green/amber/red) preserved for safety indicators.
 *
 * DO NOT import this in public-facing pages or components.
 */

/** ─── Surfaces ─── */
export const PAGE_BG = "#F0F4F8";         // Cool light neutral — main content area
export const SURFACE = "#FFFFFF";          // Cards, panels, modals
export const SURFACE_ALT = "#F8FAFC";      // Nested sections, subtle wells, table header
export const SURFACE_HOVER = "#EFF6FF";    // Row hover — very light blue tint
export const SURFACE_SELECTED = "#E0F2FE"; // Selected row — slightly more pronounced

/** ─── Sidebar (intentionally dark for deliberate contrast) ─── */
export const SIDEBAR_BG = "#0F1C2E";
export const SIDEBAR_ACTIVE_BG = "#1A3350";
export const SIDEBAR_ACTIVE_BORDER = "#0EA5E9";
export const SIDEBAR_ACTIVE_TEXT = "#38BDF8";
export const SIDEBAR_INACTIVE_TEXT = "#8BA8C4";
export const SIDEBAR_INACTIVE_HOVER_TEXT = "#B8D0E8";
export const SIDEBAR_INACTIVE_HOVER_BG = "rgba(255,255,255,0.05)";
export const SIDEBAR_DIVIDER = "rgba(255,255,255,0.07)";

/** ─── Topbar ─── */
export const TOPBAR_BG = "#FFFFFF";
export const TOPBAR_BORDER = "#DDE3EC";

/** ─── Borders ─── */
export const BORDER = "#DDE3EC";          // Standard border
export const BORDER_STRONG = "#B8C4D0";   // Strong separation
export const BORDER_FOCUS = "#0EA5E9";    // Focus ring color

/** ─── Typography ─── */
export const TEXT_PRIMARY = "#0A2540";    // Page titles, headings, important numbers
export const TEXT_SECONDARY = "#3D5A78";  // Body text, labels, descriptions
export const TEXT_MUTED = "#6B8099";      // Metadata, timestamps, helper text
export const TEXT_DISABLED = "#A3B3C1";   // Intentionally muted — placeholder, disabled
export const TEXT_INVERSE = "#FFFFFF";    // Text on dark backgrounds

/** ─── PSA Accent (Sky Blue) ─── */
export const ACCENT = "#0EA5E9";
export const ACCENT_DARK = "#0284C7";
export const ACCENT_LIGHT = "#38BDF8";
export const ACCENT_BG = "rgba(14,165,233,0.08)";
export const ACCENT_BORDER = "rgba(14,165,233,0.2)";

/** ─── Semantic: Success / Green (also TEST MODE) ─── */
export const SUCCESS = "#16A34A";         // Green — success actions, TEST MODE
export const SUCCESS_DARK = "#15803D";    // Darker green — text on light tint bg
export const SUCCESS_BG = "rgba(22,163,74,0.08)";
export const SUCCESS_BORDER = "#BBF7D0";
export const SUCCESS_BORDER_STRONG = "#16A34A";

/** ─── Semantic: Warning / Amber (also PRODUCTION MODE) ─── */
export const WARNING = "#D97706";         // Amber — warnings, PRODUCTION MODE
export const WARNING_DARK = "#92400E";    // Dark amber — text on light tint bg
export const WARNING_BG = "rgba(217,119,6,0.08)";
export const WARNING_BORDER = "#FDE68A";
export const WARNING_BORDER_STRONG = "#D97706";

/** ─── Semantic: Danger / Red ─── */
export const DANGER = "#DC2626";
export const DANGER_DARK = "#991B1B";
export const DANGER_BG = "rgba(220,38,38,0.08)";
export const DANGER_BORDER = "#FECACA";
export const DANGER_BORDER_STRONG = "#DC2626";

/** ─── Shadows ─── */
export const SHADOW_SM = "0 1px 3px rgba(10,37,64,0.06), 0 1px 2px rgba(10,37,64,0.04)";
export const SHADOW_MD = "0 4px 12px rgba(10,37,64,0.08), 0 2px 4px rgba(10,37,64,0.04)";
export const SHADOW_PANEL = "-8px 0 32px rgba(10,37,64,0.12)";

/** ─── Radius ─── */
export const RADIUS_SM = "4px";
export const RADIUS_MD = "8px";
export const RADIUS_LG = "12px";

/** ─── Shared component styles (factory functions) ─── */

/** Standard form input */
export const INPUT_STYLE = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS_MD,
  color: TEXT_PRIMARY,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s, box-shadow 0.15s",
};

/** Standard form label */
export const LABEL_STYLE = {
  display: "block",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: TEXT_SECONDARY,
  marginBottom: "6px",
};

/** Primary action button */
export const BTN_PRIMARY_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: ACCENT,
  color: TEXT_INVERSE,
  border: "none",
  borderRadius: RADIUS_MD,
  padding: "9px 18px",
  fontSize: "12.5px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 0.15s",
};

/** Secondary action button */
export const BTN_SECONDARY_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS_MD,
  padding: "8px 14px",
  fontSize: "12px",
  color: TEXT_SECONDARY,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "border-color 0.15s, background 0.15s",
};

/** Destructive action button */
export const BTN_DANGER_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: DANGER_BG,
  border: `1px solid ${DANGER_BORDER_STRONG}`,
  borderRadius: RADIUS_MD,
  padding: "8px 14px",
  fontSize: "12px",
  color: DANGER,
  cursor: "pointer",
  fontFamily: "inherit",
};

/** Green / TEST MODE button */
export const BTN_SUCCESS_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  background: SUCCESS_BG,
  border: `1px solid ${SUCCESS_BORDER_STRONG}`,
  borderRadius: RADIUS_MD,
  padding: "8px 14px",
  fontSize: "12px",
  color: SUCCESS_DARK,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.15s",
};

/** Standard card */
export const CARD_STYLE = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: RADIUS_LG,
  boxShadow: SHADOW_SM,
};
