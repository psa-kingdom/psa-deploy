// 9 full editorial articles — McKinsey/HBR tone.

const IMG = [
  "https://images.unsplash.com/photo-1762427354051-a9bdb181ae3b?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1523875194681-bedd468c58bf?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1616432043562-3671ea2e5242?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1627309366653-2dedc084cdf1?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1775163024488-e88e4a71179f?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1553413077-190dd305871c?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1642522029686-5485ea7e6042?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1713461983836-de0a45009424?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
  "https://images.unsplash.com/photo-1639772823849-6efbd173043c?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
];

export const ARTICLES = [
  {
    slug: "internal-controls-automotive-expansion",
    title: "Internal Controls in the Age of Rapid Automotive Expansion",
    category: "Audit & Assurance",
    excerpt: "As Indian OEMs accelerate dealer network expansion, the control environment at the dealership level is the single most under-managed risk facing automotive boards.",
    image: IMG[0],
    date: "March 2026",
    readTime: "9 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "context", label: "The Expansion Paradox" },
      { id: "risk", label: "Where Controls Break First" },
      { id: "playbook", label: "A Five-Part Control Playbook" },
      { id: "data", label: "Data, Not Audits, Catches Drift" },
      { id: "closing", label: "What Boards Should Demand" },
    ],
    body: `
<h2 id="context">The Expansion Paradox</h2>
<p>Over the past five years, Indian automotive OEMs have added dealerships at a rate that few control environments were designed to absorb. The category leaders we work with have, on average, doubled their dealer footprint — and in several cases tripled it in tier-2 and tier-3 markets. Growth of this magnitude is rightly celebrated commercially. Operationally, it is creating the largest control vacuum the sector has seen in a decade.</p>
<p>The paradox is straightforward: every new dealership is a self-contained operating company with its own inventory, cash, credit, and compliance footprint, but the headquarters control framework rarely expands at the same pace. The result is a tail of outlets that look identical on the org chart and behave very differently on the ground.</p>
<blockquote>In the dealerships we have audited over the last five years, more than 70% of material control weaknesses were located in the bottom quintile of outlets by revenue — and were invisible to the OEM until they were quantified.</blockquote>

<h2 id="risk">Where Controls Break First</h2>
<p>From 150+ dealership audits across 7+ OEMs, four control breakpoints recur with predictable regularity. They tend to appear in this order:</p>
<ul>
<li><strong>Inventory variance.</strong> Physical stock diverges from DMS records — first by units, then by value. Variance grows fastest in service-load and spare-parts inventories, where unit counts are high and per-piece values are low.</li>
<li><strong>Cash and collection drift.</strong> Receipts are not banked daily. Settlement against customer accounts lags. Floor-plan funded units are sold without lien release.</li>
<li><strong>Manpower control collapse.</strong> Segregation-of-duties matrices that work at headquarters dissolve at the outlet, where one person often books, bills, and banks.</li>
<li><strong>Compliance drift.</strong> RTO documentation, GST returns, and OEM-mandated certifications fall out of sync — usually first at the documentation layer, then at the substantive layer.</li>
</ul>

<h2 id="playbook">A Five-Part Control Playbook</h2>
<p>The remediation framework we deploy in these environments is deliberately structural. It rests on five components, each of which is owned by a defined function at the OEM and replicated identically across every outlet:</p>
<ul>
<li><strong>A standardised dealership control framework.</strong> One document, one matrix, one set of mandatory controls — applied at every outlet regardless of revenue band.</li>
<li><strong>Independent physical verification on a rolling cycle.</strong> Every outlet, every quarter, with barcode-enabled stock counts and reconciliation against the DMS.</li>
<li><strong>Exception-based monitoring.</strong> Not month-end MIS, but daily exception reports from the DMS, routed to a single accountable role.</li>
<li><strong>A dealer compliance scorecard.</strong> Quantified, comparable, and tied to commercial review cycles.</li>
<li><strong>A documented escalation protocol.</strong> When a threshold breaks, the path to remediation is pre-defined — including replacement decisions.</li>
</ul>

<h2 id="data">Data, Not Audits, Catches Drift</h2>
<p>Audits are necessary. They are not, by themselves, sufficient. In a network of 200+ outlets, a once-a-year touchpoint produces information that is already stale by the time it reaches the audit committee. The decisive shift we have made with several OEMs is to push the control conversation upstream, into the daily data flowing out of the DMS — variance reports, ageing buckets, lien-release logs, employee-keystroke logs at the billing terminal.</p>
<p>Once that data is harvested cleanly, the audit becomes a confirmation exercise, not a discovery exercise. Boards see drift in weeks, not in quarters.</p>

<h2 id="closing">What Boards Should Demand</h2>
<p>For an OEM board sitting on a rapidly expanding dealer network, the three questions that should be on the agenda for every governance review are these:</p>
<ul>
<li>Do we have a single, documented dealership control framework that has been applied at every outlet in the last twelve months?</li>
<li>Are we monitoring outlet-level exceptions daily, or are we waiting for the quarterly MIS pack?</li>
<li>Do we have an independent line of assurance — outside the regional sales hierarchy — telling the board where the controls are working and where they are not?</li>
</ul>
<p>If the answer to any of those is "not yet," the expansion is outrunning the controls. That is a board-level risk, and it deserves a board-level remedy.</p>
`,
  },
  {
    slug: "inventory-intelligence-dealership-audits",
    title: "Inventory Intelligence: Lessons from 150+ Dealership Audits",
    category: "Inventory",
    excerpt: "Five recurring patterns from a decade of inventory audits across India's largest automotive dealer networks — and what they reveal about how value leaks.",
    image: IMG[1],
    date: "February 2026",
    readTime: "11 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Why Inventory Is the Truest Audit" },
      { id: "patterns", label: "Five Patterns That Repeat" },
      { id: "tech", label: "Where Barcode and DMS Pay Back" },
      { id: "framework", label: "An Inventory Intelligence Framework" },
      { id: "close", label: "From Counting to Knowing" },
    ],
    body: `
<h2 id="intro">Why Inventory Is the Truest Audit</h2>
<p>Of every control surface an auditor encounters, inventory is the most honest. Cash can be smoothed, receivables can be reclassified, accruals can be timed — inventory is a physical object that either exists in the warehouse or does not. It is the audit area where assurance is most direct, and also the area where the most operational truth surfaces.</p>
<p>Across 150+ dealership audits, ₹100Cr+ of inventory verified, and 7+ OEM partnerships, we have come to treat inventory as a diagnostic instrument as much as an audit obligation. What the inventory says about the dealership is almost always more revealing than what the financial statements say.</p>

<h2 id="patterns">Five Patterns That Repeat</h2>
<ul>
<li><strong>Dead stock concentration in the long tail.</strong> Across networks, 60-70% of slow-moving units sit in the bottom decile of dealerships. The OEM rarely sees this because consolidated reports mask outlet-level concentration.</li>
<li><strong>Variance growth between physical counts.</strong> Where physical verification is annual, variance accelerates in Q3 and Q4 — a behavioural pattern tied to incentive cycles, not random error.</li>
<li><strong>Spare-parts shrinkage outpacing vehicle shrinkage.</strong> By a wide margin. The combination of high unit count and low per-piece value creates a control blind spot.</li>
<li><strong>Floor-plan exposure at unlien'd units.</strong> A small but recurring proportion of sold vehicles remain financed on the floor plan because the lien-release workflow has broken at the outlet.</li>
<li><strong>Inventory policy drift.</strong> The written stocking norm and the actual stocking behaviour diverge — sometimes deliberately, sometimes through accumulated workaround.</li>
</ul>

<h2 id="tech">Where Barcode and DMS Pay Back</h2>
<p>The economics of barcode-enabled stock verification are clearest where unit counts are highest — spare parts, accessories, and service consumables. Manual counts in these categories produce error rates of 4-8%; barcode-enabled counts compress that to well under 1%. More importantly, they make the count repeatable, auditable, and integrable with the DMS — which is where the variance becomes actionable.</p>
<blockquote>An inventory count without DMS reconciliation produces a number. An inventory count with DMS reconciliation produces a decision.</blockquote>
<p>The compounding payoff is that, over two to three audit cycles, the dealership's own controls tighten as the team internalises the visibility. The auditor becomes a feedback loop, not a policing function.</p>

<h2 id="framework">An Inventory Intelligence Framework</h2>
<p>The framework we deploy rests on four pillars, sequenced deliberately:</p>
<ul>
<li><strong>Policy clarity.</strong> A written stocking, ageing, and write-down norm — outlet-specific where the commercial footprint warrants it.</li>
<li><strong>Physical rigour.</strong> Barcode-enabled, independently supervised, on a documented rolling cycle.</li>
<li><strong>System reconciliation.</strong> Direct integration with the DMS — variance flags pushed upstream, not pulled downstream.</li>
<li><strong>Governance loop.</strong> A monthly scorecard reviewed at the OEM regional level and consolidated quarterly for the board.</li>
</ul>

<h2 id="close">From Counting to Knowing</h2>
<p>The shift we are pushing every client toward is the shift from <em>counting</em> inventory — a once-a-year exercise — to <em>knowing</em> inventory: a continuous, system-mediated, board-visible view of where stock sits, what it is worth, and what it is doing. That is what inventory intelligence is, and it is the discipline that increasingly separates the well-governed dealer networks from the rest.</p>
`,
  },
  {
    slug: "new-risk-landscape-indian-fmcg",
    title: "The New Risk Landscape for Indian FMCG Companies",
    category: "Risk Advisory",
    excerpt: "Distribution depth, working-capital intensity, and regulatory acceleration are reshaping the FMCG risk profile in ways that ERM frameworks designed five years ago cannot capture.",
    image: IMG[2],
    date: "February 2026",
    readTime: "10 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Why the Old Risk Map Is Wrong" },
      { id: "shifts", label: "Five Structural Shifts" },
      { id: "frameworks", label: "What an Updated ERM Looks Like" },
      { id: "close", label: "A CFO Agenda" },
    ],
    body: `
<h2 id="intro">Why the Old Risk Map Is Wrong</h2>
<p>The ERM frameworks most Indian FMCG companies are operating today were drafted in a different commercial era. They were built around a stable distributor pyramid, predictable working-capital cycles, and a regulatory environment that moved at a manageable cadence. None of those assumptions still hold.</p>
<p>The category leaders we advise are not facing more risk. They are facing structurally different risk — and their frameworks need to be rebuilt accordingly.</p>

<h2 id="shifts">Five Structural Shifts</h2>
<ul>
<li><strong>Distribution complexity.</strong> The traditional GT-only model has fragmented into GT, MT, e-commerce, quick-commerce, and direct-to-consumer channels — each with a different control surface.</li>
<li><strong>Working-capital intensity.</strong> Distributor credit terms have stretched, returns and damage allowances have grown, and trade-promotion accruals are absorbing more capital than they did a decade ago.</li>
<li><strong>Regulatory acceleration.</strong> GST, FSSAI, BIS, EPR, and labelling regimes have all moved faster than internal compliance functions are typically resourced for.</li>
<li><strong>Margin leakage at the distributor edge.</strong> A meaningful share of headline gross margin is dissipating in unmonitored damage, returns, and scheme-claim disputes.</li>
<li><strong>Fraud sophistication.</strong> Scheme manipulation, ghost outlets, and false claim cycles have become more organised — and harder to catch with manual sample audits.</li>
</ul>

<h2 id="frameworks">What an Updated ERM Looks Like</h2>
<p>The ERM frameworks we are now building for FMCG clients share four common features:</p>
<ul>
<li>Channel-segmented risk universes — GT, MT, e-com, quick-commerce, D2C — each mapped separately.</li>
<li>Continuous, data-driven distributor surveillance — claim-cycle analytics, return-rate variance, and scheme-uptake outliers reviewed monthly.</li>
<li>An integrated compliance calendar covering GST, FSSAI, BIS, EPR, and state-level obligations.</li>
<li>An explicit fraud-risk register, refreshed quarterly, with named owners.</li>
</ul>
<blockquote>An ERM framework that has not been re-baselined in the last 24 months should be treated as out of date by default.</blockquote>

<h2 id="close">A CFO Agenda</h2>
<p>For an FMCG CFO, the practical agenda is concentrated. Re-baseline the risk universe. Move from sample-based distributor audits to continuous surveillance. Build a unified regulatory calendar. And, critically, treat the framework as a living instrument — not a year-end artefact.</p>
`,
  },
  {
    slug: "process-audits-before-digital-transformation",
    title: "Why Process Audits Should Precede Digital Transformation",
    category: "Process Improvement",
    excerpt: "Digitising a broken process automates the breakage. A diagnostic process audit is the highest-return investment most leadership teams skip.",
    image: IMG[3],
    date: "January 2026",
    readTime: "8 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "The Automation Trap" },
      { id: "audit", label: "What a Process Audit Reveals" },
      { id: "sequencing", label: "The Right Sequence" },
      { id: "close", label: "Closing Note" },
    ],
    body: `
<h2 id="intro">The Automation Trap</h2>
<p>The most expensive mistake we see in mid-market and enterprise digital programmes is the same one, repeated across sectors: an organisation digitises its existing process before diagnosing it. The system is built on top of inefficiencies, redundancies, and informal workarounds that the legacy team has been silently absorbing for years.</p>
<p>The result is a digital platform that is faster, more visible, and equally broken — only now the breakage is structural, encoded into the workflow, and considerably more expensive to fix.</p>

<h2 id="audit">What a Process Audit Reveals</h2>
<p>A well-scoped process audit in this context is a diagnostic. It maps the as-is at the level of actual behaviour, not policy aspiration. It identifies handoffs that lose information, controls that have lapsed, and decisions that have migrated from one role to another without governance.</p>
<blockquote>In every digital transformation we have shadow-audited, the cost of fixing the process before automating was a fraction of the cost of un-automating later.</blockquote>

<h2 id="sequencing">The Right Sequence</h2>
<ul>
<li><strong>Diagnose.</strong> Map the as-is process at the level of behaviour and document divergence from policy.</li>
<li><strong>Redesign.</strong> Draft the to-be process. Document SOPs. Build the KPI framework.</li>
<li><strong>Then digitise.</strong> Configure the platform against the redesigned process, not the legacy one.</li>
<li><strong>Monitor.</strong> Operate the KPI framework as the primary control surface.</li>
</ul>

<h2 id="close">Closing Note</h2>
<p>Digital programmes succeed when they are built on process clarity. The process audit is not a delay to the transformation; it is the foundation that makes the transformation durable.</p>
`,
  },
  {
    slug: "governance-multi-state-retail",
    title: "Building a Governance Framework for Multi-State Retail Operations",
    category: "Regulatory",
    excerpt: "Multi-state retail growth multiplies regulatory and operational exposure faster than headquarters governance typically scales. A practical playbook.",
    image: IMG[4],
    date: "January 2026",
    readTime: "9 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Why Geography Is a Governance Variable" },
      { id: "pillars", label: "Four Governance Pillars" },
      { id: "close", label: "Operating Discipline" },
    ],
    body: `
<h2 id="intro">Why Geography Is a Governance Variable</h2>
<p>Retail in India is a federation of regulatory environments, not a single one. Labour law, shops-and-establishments registration, state-level GST nuances, signage regulations, and municipal compliance differ materially across states. A retailer operating in 15 states is, in effect, operating in 15 control universes.</p>
<p>The governance frameworks that worked when the footprint was concentrated in two or three states rarely scale linearly. They need to be re-architected.</p>

<h2 id="pillars">Four Governance Pillars</h2>
<ul>
<li><strong>A central regulatory register.</strong> One source of truth for every state-level obligation, with named owners and renewal dates.</li>
<li><strong>Standardised store-level controls.</strong> Identical control behaviour at every store, regardless of state.</li>
<li><strong>Independent multi-state assurance.</strong> Rotating physical reviews across the network on a documented cycle.</li>
<li><strong>Board-grade reporting.</strong> A consolidated compliance dashboard reviewed quarterly.</li>
</ul>

<h2 id="close">Operating Discipline</h2>
<p>Governance frameworks fail not because they are badly designed but because they are inconsistently operated. The discipline that separates the well-governed retailer from the rest is operational repetition, not framework sophistication.</p>
`,
  },
  {
    slug: "ifc-implementation-board-risk",
    title: "How IFC Implementation Reduces Board-Level Risk",
    category: "Audit & Assurance",
    excerpt: "Internal Financial Controls, properly implemented, are the single most powerful instrument an Indian board has to govern financial reporting risk.",
    image: IMG[5],
    date: "December 2025",
    readTime: "10 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Beyond Compliance" },
      { id: "anatomy", label: "Anatomy of a Working IFC Framework" },
      { id: "missteps", label: "Common Missteps" },
      { id: "close", label: "What Boards Should Ask" },
    ],
    body: `
<h2 id="intro">Beyond Compliance</h2>
<p>Most boards treat Internal Financial Controls as a statutory obligation. The companies that get the most out of IFC treat it as a governance instrument. Properly implemented, the IFC framework is the most direct line of sight a board has into the integrity of financial reporting.</p>

<h2 id="anatomy">Anatomy of a Working IFC Framework</h2>
<ul>
<li>A risk-and-control matrix that maps every financial-statement line item to the controls protecting it.</li>
<li>A clear distinction between entity-level controls and process-level controls.</li>
<li>An annual testing cycle, performed independently, with documented evidence.</li>
<li>A remediation discipline that closes weaknesses on a timeline.</li>
<li>A board-level reporting cadence that is honest about residual risk.</li>
</ul>
<blockquote>The IFC framework that nobody fails is the IFC framework that nobody believes. Boards should be cautious of a perfectly green dashboard.</blockquote>

<h2 id="missteps">Common Missteps</h2>
<p>The two recurring missteps are scope inflation — testing too many controls, none of them deeply — and scope evasion — testing only the controls that are known to work. The right IFC framework concentrates testing on the controls that most directly protect financial statement assertions, and it tests them rigorously.</p>

<h2 id="close">What Boards Should Ask</h2>
<p>Three questions. Are we testing the right controls? Are we testing them honestly? Are we remediating what fails on a documented timeline? If the answer to any of those is unclear, the IFC framework is doing less than it should.</p>
`,
  },
  {
    slug: "dealership-fraud-patterns",
    title: "Dealership Fraud Patterns: What 5 Years of Audits Revealed",
    category: "Automotive",
    excerpt: "Patterns recur. From floor-plan manipulation to spare-parts diversion, five years of forensic-grade audits reveal a recognisable taxonomy of dealership fraud.",
    image: IMG[6],
    date: "December 2025",
    readTime: "12 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Fraud Is Patterned, Not Random" },
      { id: "taxonomy", label: "A Working Taxonomy" },
      { id: "detection", label: "What Catches It" },
      { id: "close", label: "A Note on Tone" },
    ],
    body: `
<h2 id="intro">Fraud Is Patterned, Not Random</h2>
<p>A useful starting point for any anti-fraud programme in the dealership context is to abandon the assumption that fraud is unpredictable. Across the audits we have performed over the last five years, the same handful of fraud patterns recur — across regions, OEMs, and outlet types.</p>

<h2 id="taxonomy">A Working Taxonomy</h2>
<ul>
<li><strong>Floor-plan manipulation.</strong> Vehicles sold without lien release; or units cycled on the floor plan to extract financing benefit.</li>
<li><strong>Spare-parts diversion.</strong> High-velocity, low-per-piece-value parts diverted through service-counter workflows.</li>
<li><strong>Service revenue suppression.</strong> Cash-paying customers serviced without billing through the DMS.</li>
<li><strong>Demonstration vehicle misuse.</strong> Test-drive units cycled into informal rental or extended personal use.</li>
<li><strong>Insurance and warranty claim manipulation.</strong> Claim cycles padded through informal arrangements with surveyors or service partners.</li>
</ul>

<h2 id="detection">What Catches It</h2>
<p>None of these patterns is invisible. Each one leaves a trail in the DMS, the floor-plan ledger, or the inventory variance report — provided someone is looking. The decisive shift is from periodic, sample-based audits to continuous, exception-based monitoring. Daily exception reports out of the DMS, reviewed by a named role with no commercial conflict, will catch most of these patterns within weeks.</p>
<blockquote>Fraud is not a control failure. Fraud is the absence of independent attention.</blockquote>

<h2 id="close">A Note on Tone</h2>
<p>The objective of an anti-fraud framework is not to criminalise the dealer network. The vast majority of outlets we audit are honest, well-run, and commercially aligned with the OEM. The framework exists to protect the network, not to threaten it — and to surface the small minority of cases where independent attention is required.</p>
`,
  },
  {
    slug: "fmcg-margin-leakage",
    title: "FMCG Margin Leakage: Root Causes and Remediation Frameworks",
    category: "FMCG",
    excerpt: "Most FMCG businesses lose 100-300 basis points of gross margin between the price list and the realised invoice. Where it goes, and how to get it back.",
    image: IMG[7],
    date: "November 2025",
    readTime: "9 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "The Margin Gap Is Real" },
      { id: "sources", label: "Where the Leakage Hides" },
      { id: "framework", label: "A Remediation Framework" },
      { id: "close", label: "The Recovered Margin Compounds" },
    ],
    body: `
<h2 id="intro">The Margin Gap Is Real</h2>
<p>The gap between list-price gross margin and realised gross margin is, in our experience, one of the most under-investigated value-creation opportunities in mid-market FMCG. Across the audits we have performed, the gap runs from 100 to 300 basis points — sometimes more — and a meaningful share of that is recoverable.</p>

<h2 id="sources">Where the Leakage Hides</h2>
<ul>
<li>Scheme over-payment beyond approved thresholds.</li>
<li>Damage and return allowances absorbed without root-cause analysis.</li>
<li>Trade-promotion claim cycles paid against incomplete documentation.</li>
<li>Off-invoice discounting that has migrated from temporary to permanent.</li>
<li>Pricing exceptions that have outlived their commercial justification.</li>
</ul>

<h2 id="framework">A Remediation Framework</h2>
<p>The remediation framework is structural, not anecdotal. It requires a quantified margin-leakage map, by channel and by SKU; an independent claim-cycle audit; a documented exception-pricing register; and a monthly governance forum that owns the recovery plan.</p>
<blockquote>Margin recovery is almost never a single decision. It is the operating discipline of refusing leakage every month.</blockquote>

<h2 id="close">The Recovered Margin Compounds</h2>
<p>A 150-basis-point margin recovery on a ₹500Cr revenue base is ₹7.5Cr — every year, compounding. For most mid-market FMCG companies, that recovery is larger than any single growth initiative on the table.</p>
`,
  },
  {
    slug: "cfo-checklist-annual-internal-audit-planning",
    title: "The CFO's Checklist for Annual Internal Audit Planning",
    category: "Audit & Assurance",
    excerpt: "A practical, board-ready checklist for CFOs and Audit Committee Chairs entering the annual internal audit planning cycle.",
    image: IMG[8],
    date: "November 2025",
    readTime: "8 min read",
    author: "CA Prem Suman",
    toc: [
      { id: "intro", label: "Audit Planning Is Strategy" },
      { id: "checklist", label: "The Checklist" },
      { id: "close", label: "A Closing Discipline" },
    ],
    body: `
<h2 id="intro">Audit Planning Is Strategy</h2>
<p>The annual internal audit plan is, in effect, a statement of the organisation's risk priorities for the year. Done well, it is a strategic document. Done poorly, it is a calendar of past audits repeated.</p>

<h2 id="checklist">The Checklist</h2>
<ul>
<li>Has the risk universe been re-baselined in the last 12 months?</li>
<li>Are the highest-rated risks visibly reflected in the audit plan?</li>
<li>Is the plan resource-realistic — or aspirational?</li>
<li>Is there a clear distinction between assurance audits, advisory audits, and ad-hoc work?</li>
<li>Is the audit committee charter clear on its role in approving and reviewing the plan?</li>
<li>Are there explicit triggers for in-year plan revision?</li>
<li>Is the plan defensible to a regulator, not just to the board?</li>
</ul>
<blockquote>An audit plan that survives the year unchanged is a plan that has stopped listening to the business.</blockquote>

<h2 id="close">A Closing Discipline</h2>
<p>The best CFOs we work with treat the audit plan as a living document. They review it quarterly, revise it when the risk environment shifts, and demand that the audit function defend its choices in plain language. That is the discipline that turns internal audit from an obligation into an asset.</p>
`,
  },
];

export const featuredArticle = ARTICLES[0];
export const otherArticles = ARTICLES.slice(1);
