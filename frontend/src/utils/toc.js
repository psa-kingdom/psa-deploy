/**
 * TOC & Heading Detection Utility for PSA Insights CMS
 *
 * Provides:
 * - Robust parsing of <h2> and <h3> headings from HTML content.
 * - Deterministic, unique anchor ID generation with preservation of existing IDs.
 * - HTML entity decoding and tag stripping for clean editorial labels.
 * - Reconciling and synchronizing TOC entries while preserving manual label customizations.
 * - Injection of generated heading IDs into raw article HTML without modifying other markup.
 */

/**
 * Decode common HTML entities to plain text.
 */
export function decodeHtmlEntities(str) {
  if (!str) return "";
  const entities = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&ldquo;": "“",
    "&rdquo;": "”",
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash|hellip|lsquo|rsquo|ldquo|rdquo);/g, (match) => entities[match] || match);
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtmlTags(str) {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Clean a heading string to generate a clean, deterministic anchor slug.
 */
export function slugifyAnchor(text) {
  if (!text) return "heading";
  const clean = stripHtmlTags(decodeHtmlEntities(text));
  const slug = clean
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "heading";
}

/**
 * Parse <h2> and <h3> headings from article HTML.
 * Supports both DOMParser (in browser) and regex fallback (for SSR / node test runners).
 *
 * Returns: Array of { id: string, label: string, level: number, hasExistingId: boolean }
 */
export function parseHeadingsFromHtml(html) {
  if (!html || typeof html !== "string") return [];

  const headings = [];
  const usedIds = new Map(); // idBase -> count for deduplication

  // Helper to ensure unique ID
  const getUniqueId = (candidateId) => {
    const base = candidateId || "heading";
    const count = usedIds.get(base) || 0;
    usedIds.set(base, count + 1);
    if (count === 0) {
      return base;
    }
    return `${base}-${count + 1}`;
  };

  // Check if browser DOMParser is available
  if (typeof window !== "undefined" && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const nodes = doc.body.querySelectorAll("h2, h3");

      nodes.forEach((el) => {
        const level = el.tagName.toLowerCase() === "h2" ? 2 : 3;
        const rawText = el.textContent || "";
        const label = decodeHtmlEntities(rawText).trim();
        const existingId = el.getAttribute("id")?.trim() || "";

        let id;
        let hasExistingId = false;

        if (existingId) {
          id = existingId;
          hasExistingId = true;
          // Track existing ID so generated ones don't collide
          usedIds.set(existingId, (usedIds.get(existingId) || 0) + 1);
        } else {
          const generatedBase = slugifyAnchor(label);
          id = getUniqueId(generatedBase);
        }

        if (label) {
          headings.push({
            id,
            label,
            level,
            hasExistingId,
          });
        }
      });

      return headings;
    } catch (_) {
      // fallback to regex if DOMParser fails
    }
  }

  // Regex fallback for node environments / malformed fragments
  const headingRegex = /<(h[23])(?:\s+([^>]*))?>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const level = tag === "h2" ? 2 : 3;
    const attributes = match[2] || "";
    const innerContent = match[3] || "";

    // Extract ID attribute if present
    const idMatch = attributes.match(/\bid=(?:["']([^"']+)["']|([^>\s]+))/i);
    const existingId = (idMatch ? (idMatch[1] || idMatch[2]) : "").trim();

    const label = decodeHtmlEntities(stripHtmlTags(innerContent)).trim();

    let id;
    let hasExistingId = false;

    if (existingId) {
      id = existingId;
      hasExistingId = true;
      usedIds.set(existingId, (usedIds.get(existingId) || 0) + 1);
    } else {
      const generatedBase = slugifyAnchor(label);
      id = getUniqueId(generatedBase);
    }

    if (label) {
      headings.push({
        id,
        label,
        level,
        hasExistingId,
      });
    }
  }

  return headings;
}

/**
 * Injects missing `id="..."` attributes into <h2> and <h3> tags in the HTML string,
 * preserving existing IDs and all other HTML intact.
 */
export function injectMissingHeadingIds(html, headingsList = null) {
  if (!html || typeof html !== "string") return html;

  const headings = headingsList || parseHeadingsFromHtml(html);
  let headingIndex = 0;

  // Replace each h2/h3 tag, injecting id only if missing
  return html.replace(/<(h[23])(\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, (fullMatch, tag, attrs = "", content) => {
    if (headingIndex >= headings.length) return fullMatch;

    const currentHeading = headings[headingIndex++];
    const hasId = /\bid\s*=/i.test(attrs);

    if (hasId) {
      // Preserve existing tag exactly as is
      return fullMatch;
    }

    // Inject id
    const cleanAttrs = attrs ? ` ${attrs.trim()}` : "";
    return `<${tag} id="${currentHeading.id}"${cleanAttrs}>${content}</${tag}>`;
  });
}

/**
 * Synchronize / reconcile current TOC items with detected headings from body HTML.
 * Preserves custom TOC labels when the anchor ID matches.
 *
 * @param {Array} currentToc - Current [{ id, label, level }]
 * @param {Array} detectedHeadings - [{ id, label, level }]
 * @returns {Array} Reconciled TOC items
 */
export function reconcileToc(currentToc = [], detectedHeadings = []) {
  const existingLabelMap = new Map();
  (currentToc || []).forEach((item) => {
    if (item.id) {
      existingLabelMap.set(item.id, item.label);
    }
  });

  return detectedHeadings.map((heading) => ({
    id: heading.id,
    label: existingLabelMap.has(heading.id) ? existingLabelMap.get(heading.id) : heading.label,
    level: heading.level || 2,
  }));
}

/**
 * Identifies TOC items that do not match any heading in the detected headings list.
 *
 * @param {Array} currentToc
 * @param {Array} detectedHeadings
 * @returns {Set<string>} Set of orphaned IDs
 */
export function findOrphanedTocIds(currentToc = [], detectedHeadings = []) {
  const detectedIds = new Set((detectedHeadings || []).map((h) => h.id));
  const orphans = new Set();

  (currentToc || []).forEach((item) => {
    if (item.id && !detectedIds.has(item.id)) {
      orphans.add(item.id);
    }
  });

  return orphans;
}

/**
 * Format hierarchical numbering for TOC items (e.g. 01, 01.1, 01.2, 02).
 */
export function computeHierarchicalNumbers(tocItems = []) {
  let mainIndex = 0;
  let subIndex = 0;

  return (tocItems || []).map((item) => {
    if (item.level === 3) {
      subIndex += 1;
      const mainStr = String(Math.max(mainIndex, 1)).padStart(2, "0");
      return `${mainStr}.${subIndex}`;
    } else {
      mainIndex += 1;
      subIndex = 0;
      return String(mainIndex).padStart(2, "0");
    }
  });
}
