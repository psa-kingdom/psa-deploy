import {
  parseHeadingsFromHtml,
  slugifyAnchor,
  decodeHtmlEntities,
  stripHtmlTags,
  injectMissingHeadingIds,
  reconcileToc,
  findOrphanedTocIds,
  computeHierarchicalNumbers,
} from "./toc";

describe("TOC & Heading Detection Utility", () => {
  test("decodes HTML entities and strips HTML markup correctly", () => {
    expect(decodeHtmlEntities("Audit &amp; Assurance")).toBe("Audit & Assurance");
    expect(decodeHtmlEntities("Risk &lt; 2026 &gt; &quot;Report&quot;")).toBe('Risk < 2026 > "Report"');
    expect(stripHtmlTags("<h2><strong>Bold</strong> & <em>Italic</em></h2>")).toBe("Bold & Italic");
  });

  test("generates clean deterministic slug anchors", () => {
    expect(slugifyAnchor("The Expansion Paradox")).toBe("the-expansion-paradox");
    expect(slugifyAnchor("Dealer-Level Governance: 2026 & Beyond!")).toBe("dealer-level-governance-2026-beyond");
    expect(slugifyAnchor("")).toBe("heading");
  });

  test("parses h2 and h3 headings, preserving existing IDs", () => {
    const html = `
      <h2 id="context">The Expansion Paradox</h2>
      <p>Some paragraph text...</p>
      <h3>Dealer-Level Governance</h3>
      <h2 id="risk">Where Controls Break First</h2>
      <h3>Dealer-Level Governance</h3>
    `;

    const headings = parseHeadingsFromHtml(html);

    expect(headings).toHaveLength(4);
    expect(headings[0]).toEqual({
      id: "context",
      label: "The Expansion Paradox",
      level: 2,
      hasExistingId: true,
    });
    expect(headings[1]).toEqual({
      id: "dealer-level-governance",
      label: "Dealer-Level Governance",
      level: 3,
      hasExistingId: false,
    });
    expect(headings[2]).toEqual({
      id: "risk",
      label: "Where Controls Break First",
      level: 2,
      hasExistingId: true,
    });
    // Duplicate heading without ID gets unique suffix
    expect(headings[3]).toEqual({
      id: "dealer-level-governance-2",
      label: "Dealer-Level Governance",
      level: 3,
      hasExistingId: false,
    });
  });

  test("handles entities and nested markup inside headings", () => {
    const html = `<h2>Audit &amp; Governance: <em>A 2026 Perspective</em></h2>`;
    const headings = parseHeadingsFromHtml(html);

    expect(headings).toHaveLength(1);
    expect(headings[0].label).toBe("Audit & Governance: A 2026 Perspective");
    expect(headings[0].id).toBe("audit-governance-a-2026-perspective");
    expect(headings[0].level).toBe(2);
  });

  test("injectMissingHeadingIds injects IDs without modifying other HTML or existing IDs", () => {
    const html = `<h2 id="already-set">Header 1</h2><p>text</p><h3>New Subheading</h3>`;
    const result = injectMissingHeadingIds(html);

    expect(result).toContain('<h2 id="already-set">Header 1</h2>');
    expect(result).toContain('<h3 id="new-subheading">New Subheading</h3>');
  });

  test("reconcileToc preserves customized TOC labels", () => {
    const currentToc = [
      { id: "context", label: "Customized Label for Expansion", level: 2 },
    ];
    const detected = [
      { id: "context", label: "The Expansion Paradox", level: 2 },
      { id: "new-section", label: "New Section", level: 2 },
    ];

    const reconciled = reconcileToc(currentToc, detected);
    expect(reconciled).toEqual([
      { id: "context", label: "Customized Label for Expansion", level: 2 },
      { id: "new-section", label: "New Section", level: 2 },
    ]);
  });

  test("findOrphanedTocIds detects deleted heading IDs", () => {
    const currentToc = [
      { id: "context", label: "Context" },
      { id: "old-deleted-heading", label: "Deleted Section" },
    ];
    const detected = [
      { id: "context", label: "Context" },
    ];

    const orphans = findOrphanedTocIds(currentToc, detected);
    expect(orphans.has("old-deleted-heading")).toBe(true);
    expect(orphans.has("context")).toBe(false);
  });

  test("computeHierarchicalNumbers formats 01, 01.1, 02 correctly", () => {
    const toc = [
      { id: "h1", level: 2 },
      { id: "h2", level: 3 },
      { id: "h3", level: 3 },
      { id: "h4", level: 2 },
      { id: "h5", level: 3 },
    ];

    const numbers = computeHierarchicalNumbers(toc);
    expect(numbers).toEqual(["01", "01.1", "01.2", "02", "02.1"]);
  });
});
