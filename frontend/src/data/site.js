// Centralised site data for PSA — single source of truth.

export const FIRM = {
  name: "P Suman & Associates",
  short: "PSA",
  tagline: "Precision. Integrity. Enterprise-Grade Assurance.",
  subTagline: "Trusted by India's Leading Enterprises Across 15+ States",
  phones: ["+91 98315 46721", "033-4073 4189"],
  emails: ["info@psumanassociates.com", "psumanassociates@gmail.com"],
  website: "www.psumanassociates.com",
  linkedin: "https://www.linkedin.com/company/p-suman-associates/",
};

export const OFFICES = [
  { city: "Kolkata", role: "Headquarters" },
  { city: "Delhi", role: "Office" },
  { city: "Siliguri", role: "Office" },
  { city: "Patna", role: "Office" },
];

export const STATS = [
  { value: 200, suffix: "+", label: "Clients Served" },
  { value: 15, suffix: "+", label: "States Covered" },
  { value: 100, prefix: "₹", suffix: "Cr+", label: "Inventory Audited" },
  { value: 15, suffix: "+", label: "Years of Practice" },
];

export const STATS_EXTENDED = [
  { value: 200, suffix: "+", label: "Clients" },
  { value: 15, suffix: "+", label: "States" },
  { value: 75, suffix: "+", label: "Cities" },
  { value: 150, suffix: "+", label: "Dealerships Audited" },
  { value: 100, prefix: "₹", suffix: "Cr+", label: "Inventory Value Audited" },
  { value: 15, suffix: "+", label: "Years of Practice" },
  { value: 7, suffix: "+", label: "OEM Partnerships" },
];

export const SERVICES = [
  {
    slug: "internal-audit-assurance",
    no: "01",
    title: "Internal Audit & Assurance",
    short: "Risk-based internal audit, IFC, and SOX-aligned frameworks for India's enterprises.",
    description:
      "Rigorous, risk-based internal audit programmes that satisfy boards, audit committees, and statutory expectations. PSA's methodology is documented, technology-enabled, and tailored to each client's risk universe — from process audits and compliance reviews to IFC implementation and management audit.",
    capabilities: [
      "Process audits",
      "Compliance reviews",
      "IFC (Internal Financial Controls) implementation",
      "SOX-aligned frameworks",
      "Management audit",
      "Audit committee reporting",
    ],
    stat: { value: "200+", label: "Audit Engagements Completed" },
  },
  {
    slug: "inventory-intelligence",
    no: "02",
    title: "Inventory Intelligence",
    short: "India's most rigorous inventory audit practice — barcode-enabled, DMS-integrated, board-grade.",
    flagship: true,
    description:
      "The flagship of the firm. Physical stock verification, variance analysis, dead stock identification, dealership compliance audits, and inventory policy design — delivered through barcode systems and DMS integration. PSA has audited ₹100Cr+ of inventory across 150+ dealerships and 7+ OEM partners.",
    capabilities: [
      "Physical stock verification",
      "Variance analysis & reconciliation",
      "Dead stock identification",
      "Barcode-enabled verification",
      "DMS (Dealer Management System) integration",
      "Dealership compliance audits",
      "Inventory policy design",
    ],
    stat: { value: "₹100Cr+", label: "Inventory Audited · 150+ Dealerships · 7+ OEM Partners" },
  },
  {
    slug: "risk-advisory",
    no: "03",
    title: "Risk Advisory",
    short: "ERM, regulatory compliance, fraud risk, and business continuity frameworks for boards and CFOs.",
    description:
      "Enterprise risk frameworks designed for board-level confidence. PSA helps leadership teams identify, quantify, and govern strategic, operational, financial, regulatory, and reputational risks — and embed the controls and continuity plans that make those frameworks structurally sound.",
    capabilities: [
      "Enterprise Risk Management (ERM)",
      "Regulatory compliance advisory",
      "Fraud risk assessment",
      "Business continuity planning",
      "Internal control diagnostics",
    ],
    stat: { value: "50+", label: "Risk Frameworks Implemented" },
  },
  {
    slug: "process-performance-improvement",
    no: "04",
    title: "Process & Performance Improvement",
    short: "Process re-engineering, SOPs, KPI frameworks, and operational benchmarking — measurable outcomes only.",
    description:
      "Measurable outcomes, not slide decks. PSA maps the as-is, redesigns the to-be, and builds the SOPs, KPI frameworks, and benchmarks that make operating performance visible and improvable. Average measured efficiency uplift across engagements: 30%+.",
    capabilities: [
      "Process mapping (as-is / to-be)",
      "SOP development",
      "KPI framework design",
      "Operational benchmarking",
      "Process re-engineering",
    ],
    stat: { value: "30%+", label: "Average Efficiency Improvement" },
  },
];

export const INDUSTRIES = [
  { slug: "automobile", name: "Automobile", img: "https://images.unsplash.com/photo-1647427060118-4911c9821b82?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "150+ dealerships audited across 7+ OEMs — Tata Motors, Hyundai, Kia, Mahindra, Honda, Yamaha, KTM, Bajaj.", credentials: "Tata Motors · Hyundai · Kia · Mahindra · Honda · Yamaha · KTM · Bajaj" },
  { slug: "fmcg", name: "FMCG", img: "https://images.unsplash.com/photo-1601600576337-c1d8a0d1373c?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Margin leakage diagnostics, distributor audits, and stock-point controls for fast-moving brands.", credentials: "Prabhuji Food Products and other national FMCG mandates" },
  { slug: "hospitality", name: "Hospitality", img: "https://images.unsplash.com/photo-1692153142524-60285a93c249?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Multi-outlet inventory controls, F&B cost audits, and operational benchmarking.", credentials: "Barbeque Nation · Vedic Resorts" },
  { slug: "retail", name: "Retail Sector", img: "https://images.unsplash.com/photo-1511317559916-56d5ddb62563?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Store-level control diagnostics, shrinkage analytics, and multi-state governance frameworks.", credentials: "Bata and pan-India retail networks" },
  { slug: "banking-finance", name: "Banking & Finance", img: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Regulatory compliance reviews, credit process audits, and risk-based assurance for financial services.", credentials: "NBFCs · Cooperative banks · Lending platforms" },
  { slug: "manufacturing", name: "Manufacturing", img: "https://images.unsplash.com/photo-1717386255773-1e3037c81788?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Plant-level cost controls, inventory variance analytics, and operational benchmarking.", credentials: "Multi-plant Indian manufacturers" },
  { slug: "real-estate", name: "Real Estate", img: "https://images.unsplash.com/photo-1565363887715-8884629e09ee?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Project cost audits, RERA-aligned controls, and developer assurance mandates.", credentials: "Residential & commercial developers across East and North India" },
  { slug: "healthcare-pharma", name: "Healthcare & Pharmaceuticals", img: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Regulated inventory controls, GMP-adjacent process audits, and hospital revenue assurance.", credentials: "Hospitals · Pharma distributors" },
  { slug: "textile", name: "Textile", img: "https://images.unsplash.com/photo-1675176785803-bffbbb0cd2f4?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Mill-floor inventory rigour, costing audits, and variance frameworks for textile manufacturers.", credentials: "Textile manufacturers and traders" },
  { slug: "agriculture", name: "Agriculture", img: "https://images.unsplash.com/photo-1632723893457-47e3abc47526?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Agri-processor stock audits, subsidy-aligned controls, and warehousing assurance.", credentials: "Agri-processors and warehousing networks" },
  { slug: "education", name: "Education", img: "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Institutional financial controls, fee-cycle audits, and governance reviews for education groups.", credentials: "Universities · K-12 chains" },
  { slug: "steel-metals", name: "Steel & Metals", img: "https://images.unsplash.com/photo-1720036236727-009f5b6f5a20?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80", blurb: "Heavy-inventory physical verification, scrap yield audits, and cost variance analytics.", credentials: "Steel manufacturers and metal traders" },
];

export const CLIENTS = [
  "Tata Motors", "Hyundai", "Kia", "Mahindra", "Honda", "Yamaha", "KTM", "Bajaj",
  "Barbeque Nation", "Prabhuji Food Products", "Vedic Resorts", "Bata",
];

export const SECTOR_TICKER = [
  "AUTOMOBILE", "FMCG", "HOSPITALITY", "RETAIL", "BANKING", "MANUFACTURING",
  "REAL ESTATE", "HEALTHCARE", "TEXTILE", "AGRICULTURE", "EDUCATION", "STEEL",
];

export const DIFFERENTIATORS = [
  { no: "01", title: "Big-4 Quality · Mid-Market Access", body: "The rigour of global firms, delivered to mid-market and enterprise clients without the layered overheads." },
  { no: "02", title: "AI & Technology-Enabled Delivery", body: "Barcode systems, DMS integration, real-time analytics dashboards, and data-driven audit methodologies embedded into every engagement." },
  { no: "03", title: "Pan-India Presence", body: "15+ states · 75+ cities · 4 offices — Kolkata, Delhi, Siliguri, Patna." },
  { no: "04", title: "Sector-Specific Intelligence", body: "12 industries served, with deepest exposure in automotive, FMCG, hospitality, manufacturing, and retail." },
  { no: "05", title: "₹100Cr+ Inventory Audited", body: "India's most rigorous inventory audit practice — 150+ dealerships, 7+ OEM partnerships." },
  { no: "06", title: "Long-Term Partnerships", body: "7+ year average client relationship — built on independence, integrity, and senior-led delivery." },
];

export const TEAM_PILLARS = [
  { title: "Chartered Accountants", body: "Audit oversight, control assessment, financial analysis. Qualified members of ICAI, sector-led teams." },
  { title: "Cost Accountants", body: "Operational cost controls and management accounting — variance, costing, and margin diagnostics." },
  { title: "Technology Specialists", body: "Barcode systems, DMS integration, analytics dashboards, and audit-automation delivery." },
  { title: "Operational Audit Experts", body: "Field execution, physical verification, warehouse expertise — pan-India deployment capability." },
];

export const MILESTONES = [
  { year: "2010", label: "Vision takes shape — foundations laid for an independent audit and advisory practice" },
  { year: "2012", label: "P Suman & Associates founded in Kolkata" },
  { year: "2014", label: "First 50 enterprise clients onboarded" },
  { year: "2016", label: "Entry into automotive sector — first dealership network mandate" },
  { year: "2018", label: "Technology systems deployment — barcode & DMS integration" },
  { year: "2020", label: "100+ dealerships audit milestone" },
  { year: "2022", label: "15-state pan-India presence established" },
  { year: "2024", label: "200+ clients · ₹100Cr+ inventory audited milestone" },
];

export const VALUES = [
  { title: "Integrity", body: "Independent judgement, free of conflicts." },
  { title: "Independence", body: "Senior-led, conflict-free assurance." },
  { title: "Excellence", body: "Documented methodology. Measurable outcomes." },
  { title: "Partnership", body: "Long-horizon client relationships." },
];

export const CATEGORIES = [
  "All", "Audit & Assurance", "Risk Advisory", "Inventory", "Process Improvement", "Regulatory", "FMCG", "Automotive",
];
