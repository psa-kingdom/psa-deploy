import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Cpu, BarChart3, Network, Database } from "lucide-react";
import StatCounter from "../components/StatCounter";
import Marquee from "../components/Marquee";
import Reveal from "../components/Reveal";
import NewsletterBlock from "../components/NewsletterBlock";
import { FIRM, STATS, SERVICES, CLIENTS, SECTOR_TICKER, DIFFERENTIATORS, INDUSTRIES } from "../data/site";
import { ARTICLES } from "../data/articles";

export default function Home() {
  const featuredIndustries = INDUSTRIES.filter((i) => ["automobile", "fmcg", "hospitality"].includes(i.slug));
  const featured = ARTICLES[0];
  const others = ARTICLES.slice(1, 4);

  return (
    <main className="bg-ivory">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col bg-ink text-ivory overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1443527394413-4b820fd08dde?crop=entropy&cs=srgb&fm=jpg&w=1920&q=85"
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/75 to-ink" />
        </div>
        <div className="relative flex-1 container-px mx-auto max-w-[1440px] pt-40 pb-16 grid grid-cols-12 gap-8 items-end">
          <div className="col-span-12 lg:col-span-9">
            <p className="eyebrow-light mb-8" data-testid="hero-eyebrow">P Suman &amp; Associates · Chartered Accountants</p>
            <h1 className="font-display-bold text-[44px] sm:text-6xl lg:text-[96px] leading-[0.95] tracking-[-0.025em] text-ivory">
              Precision.<br />
              Integrity.<br />
              <span className="text-gold">Enterprise-Grade Assurance.</span>
            </h1>
            <p className="font-body text-base md:text-lg text-ivory/70 mt-10 max-w-2xl leading-relaxed">
              India&apos;s technology-enabled audit and advisory firm — trusted by leading enterprises across 15+ states.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/contact" data-testid="hero-cta-primary" className="bg-sky text-white px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] hover:bg-sky-dark transition-colors duration-500 inline-flex items-center gap-2 border border-sky hover:border-sky-dark">
                Talk to an Expert <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
              <Link to="/services" data-testid="hero-cta-secondary" className="btn-ghost-dark">
                Our Practice Areas
              </Link>
            </div>
          </div>
        </div>

        {/* Stat counters band */}
        <div className="relative border-t border-ivory/15">
          <div className="container-px mx-auto max-w-[1440px] grid grid-cols-2 md:grid-cols-4">
            {STATS.map((s, i) => (
              <div key={i} className={`py-8 md:py-10 ${i < 3 ? "md:border-r border-ivory/15" : ""} ${i === 1 || i === 3 ? "border-l md:border-l-0" : ""} ${i < 2 ? "border-b md:border-b-0 border-ivory/15" : ""}`}>
                <div className="font-display text-5xl md:text-6xl text-gold tracking-tight">
                  <StatCounter
                    value={s.value}
                    prefix={s.prefix || ""}
                    suffix={s.suffix || ""}
                    testid={`hero-stat-${i}`}
                  />
                </div>
                <p className="font-body text-[11px] uppercase tracking-[0.22em] text-ivory/60 mt-3">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sector ticker */}
        <div className="relative border-t border-ivory/15 py-5">
          <Marquee items={SECTOR_TICKER} variant="dark" speed="slow" />
        </div>
      </section>

      {/* PRACTICE AREAS */}
      <section className="py-24 md:py-32 bg-white relative">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow">Practice Areas</p>
              <h2 className="font-display-bold text-5xl md:text-7xl text-ink tracking-[-0.02em] mt-5 leading-[1.02]">
                Four practices.<br />
                <span className="italic text-sky">One standard.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 self-end">
              <p className="font-body text-lg text-ink/75 leading-relaxed">
                Rigorous, sector-deep, and technology-enabled. PSA delivers audit and advisory at the standard that India&apos;s most demanding boards expect.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-borderline border border-borderline">
            {SERVICES.map((s) => (
              <Reveal key={s.slug}>
                <Link
                  to={`/services#${s.slug}`}
                  data-testid={`home-service-${s.slug}`}
                  className="group block bg-white p-10 md:p-14 hover:bg-offwhite transition-colors duration-500 h-full relative"
                >
                  <div className="flex items-baseline justify-between mb-12">
                    <span className="font-display-bold text-3xl text-sky">{s.no}</span>
                    {s.flagship && <span className="font-body text-[10px] uppercase tracking-[0.25em] text-sky border border-sky/40 px-2.5 py-1 font-semibold">Flagship</span>}
                  </div>
                  <h3 className="font-heading text-3xl md:text-4xl text-ink tracking-tight leading-tight group-hover:text-sky transition-colors duration-500" style={{ fontWeight: 700 }}>
                    {s.title}
                  </h3>
                  <p className="font-body text-base text-ink/75 mt-5 leading-relaxed max-w-md">{s.short}</p>
                  <div className="mt-10 inline-flex items-center gap-2 font-body text-[12px] uppercase tracking-[0.22em] text-sky font-semibold group-hover:text-ink transition-colors duration-500">
                    Explore practice <ArrowUpRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={1.5} />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <section className="py-16 bg-white border-y border-borderline">
        <div className="container-px mx-auto max-w-[1440px] mb-8">
          <p className="eyebrow text-center">Trusted by India&apos;s Leading Enterprises</p>
        </div>
        <Marquee items={CLIENTS} variant="light" />
      </section>

      {/* TECHNOLOGY & AI POSITIONING */}
      <section className="py-24 md:py-32 bg-ink text-ivory relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <img
            src="https://images.unsplash.com/photo-1644088379091-d574269d422f?crop=entropy&cs=srgb&fm=jpg&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/40" />
        </div>
        <div className="relative container-px mx-auto max-w-[1440px] grid grid-cols-12 gap-10 items-center">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow-light">AI & Technology-Enabled Delivery</p>
            <h2 className="font-display-bold text-5xl md:text-7xl text-ivory tracking-[-0.02em] mt-6 leading-[1.02]">
              Audit Intelligence,<br />
              <span className="italic text-gold">Powered by Technology.</span>
            </h2>
            <p className="font-body text-lg text-ivory/70 mt-8 leading-relaxed max-w-2xl">
              PSA deploys real-time analytics, barcode-enabled stock verification, DMS integration, and data-driven audit frameworks — bringing the precision of technology to every engagement. The result: faster cycles, deeper coverage, and assurance backed by data, not sampling.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
            {[
              { Icon: BarChart3, t: "Real-Time Analytics", d: "Live audit dashboards across multi-state networks." },
              { Icon: Database, t: "DMS Integration", d: "Direct data extraction from dealership systems." },
              { Icon: Network, t: "Barcode Verification", d: "Sub-1% variance in inventory counts." },
              { Icon: Cpu, t: "Audit Automation", d: "Exception-based monitoring at scale." },
            ].map(({ Icon, t, d }, i) => (
              <div key={i} className="border border-ivory/15 p-6 hover:border-gold transition-colors duration-500">
                <Icon className="w-6 h-6 text-gold" strokeWidth={1.5} />
                <h4 className="font-heading text-lg text-ivory mt-5">{t}</h4>
                <p className="font-body text-xs text-ivory/60 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRY DEPTH */}
      <section className="py-24 md:py-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow">Industry Depth</p>
              <h2 className="font-display text-5xl md:text-6xl text-ink tracking-tight mt-5 leading-[1.05]">
                Sector-deep,<br />board-grade.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 self-end">
              <Link to="/industries" data-testid="home-industries-link" className="link-underline font-body text-sm text-ink hover:text-gold inline-flex items-center gap-2">
                All 12 sectors <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredIndustries.map((ind) => (
              <Reveal key={ind.slug}>
                <Link to={`/industries#${ind.slug}`} data-testid={`home-industry-${ind.slug}`} className="group block">
                  <div className="overflow-hidden mb-6 aspect-[4/5]">
                    <img src={ind.img} alt={ind.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  </div>
                  <p className="eyebrow text-[10px]">Sector</p>
                  <h3 className="font-heading text-2xl text-ink mt-2 group-hover:text-gold transition-colors duration-500">{ind.name}</h3>
                  <p className="font-body text-sm text-ink/60 mt-3 leading-relaxed">{ind.blurb}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY PSA */}
      <section className="py-24 md:py-32 bg-navy text-white relative">
        <div className="absolute inset-0 grain pointer-events-none opacity-30" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8 mb-16 items-end">
            <div className="col-span-12 md:col-span-7">
              <p className="eyebrow-light">Why PSA</p>
              <h2 className="font-display-bold text-5xl md:text-7xl text-white tracking-[-0.02em] mt-5 leading-[1.02]">
                Six reasons<br /><span className="italic text-sky-light">leadership chooses us.</span>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-5">
              <p className="font-body text-base md:text-lg text-white/80 leading-relaxed font-medium">
                Built for boards, audit committees, and senior finance leaders that demand independence, technology, and measurable outcomes.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {DIFFERENTIATORS.map((d) => (
              <div key={d.no} className="bg-navy p-10 md:p-12 hover:bg-navy-mid transition-colors duration-500 group">
                <span className="font-display-bold text-3xl text-sky-light">{d.no}</span>
                <h3 className="font-heading text-2xl text-white mt-6 leading-snug" style={{ fontWeight: 700 }}>{d.title}</h3>
                <p className="font-body text-sm text-white/75 mt-4 leading-relaxed">{d.body}</p>
                <div className="w-8 h-px bg-sky mt-8 group-hover:w-20 transition-all duration-500" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED INSIGHTS */}
      <section className="py-24 md:py-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8 mb-16 items-end">
            <div className="col-span-12 md:col-span-7">
              <p className="eyebrow">Featured Insights</p>
              <h2 className="font-display-bold text-5xl md:text-6xl text-ink tracking-[-0.02em] mt-5 leading-[1.02]">
                Perspectives from the practice.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-5 md:text-right">
              <Link to="/insights" data-testid="home-insights-all" className="link-underline font-body text-sm text-ink hover:text-gold inline-flex items-center gap-2">
                All Insights <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            <Reveal className="col-span-12 lg:col-span-7">
              <Link to={`/insights/${featured.slug}`} data-testid={`home-article-${featured.slug}`} className="group block">
                <div className="overflow-hidden mb-8 aspect-[16/10]">
                  <img src={featured.image} alt={featured.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                </div>
                <p className="eyebrow text-[10px]">{featured.category} · {featured.readTime}</p>
                <h3 className="font-heading text-3xl md:text-4xl text-ink mt-3 leading-tight group-hover:text-gold transition-colors duration-500">{featured.title}</h3>
                <p className="font-body text-base text-ink/65 mt-4 leading-relaxed max-w-xl">{featured.excerpt}</p>
              </Link>
            </Reveal>
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
              {others.map((a) => (
                <Reveal key={a.slug}>
                  <Link to={`/insights/${a.slug}`} data-testid={`home-article-${a.slug}`} className="group block border-b border-borderline pb-8 last:border-b-0">
                    <p className="eyebrow text-[10px]">{a.category}</p>
                    <h4 className="font-heading text-xl text-ink mt-2 leading-snug group-hover:text-gold transition-colors duration-500">{a.title}</h4>
                    <p className="font-body text-sm text-ink/60 mt-2 leading-relaxed line-clamp-2">{a.excerpt}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="pb-24 md:pb-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <NewsletterBlock variant="dark" testidPrefix="home-newsletter" />
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 md:py-32 bg-white border-t border-borderline">
        <div className="container-px mx-auto max-w-[1440px] text-center">
          <p className="eyebrow">Ready to Begin</p>
          <h2 className="font-display-bold text-5xl md:text-7xl text-ink tracking-[-0.025em] mt-6 leading-[1.02] max-w-4xl mx-auto">
            Ready to elevate your<br /><span className="italic text-gold">assurance standards?</span>
          </h2>
          <p className="font-body text-lg text-ink/65 mt-8 max-w-2xl mx-auto leading-relaxed">
            A 30-minute conversation with our partner team. No obligation. Independent perspective on your audit, risk, and process priorities.
          </p>
          <Link to="/contact" data-testid="home-final-cta" className="btn-primary mt-12 inline-flex">
            Request a Consultation <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </main>
  );
}
