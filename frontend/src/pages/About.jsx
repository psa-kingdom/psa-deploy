import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import Reveal from "../components/Reveal";
import { FIRM, OFFICES, TEAM_PILLARS, MILESTONES, VALUES } from "../data/site";

export default function About() {
  return (
    <main className="bg-ivory">
      <section className="bg-ink text-ivory relative overflow-hidden pt-40 pb-24 md:pb-32">
        <div className="absolute inset-0 grain pointer-events-none opacity-40" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-6">About</p>
              <h1 className="font-display-bold text-5xl md:text-7xl lg:text-[88px] text-ivory tracking-[-0.02em] leading-[1.02]">
                Built on Integrity.<br /><span className="italic text-gold">Driven by Expertise.</span>
              </h1>
              <p className="font-body text-lg md:text-xl text-ivory/70 mt-10 max-w-3xl leading-relaxed">
                P Suman &amp; Associates is a technology-enabled Chartered Accountancy and advisory firm headquartered in Kolkata, with offices in Delhi, Siliguri, and Patna. Over 15+ years, PSA has built India&apos;s most rigorous inventory intelligence practice and a full-spectrum audit and advisory capability — serving 200+ clients across 12 sectors and 15+ states.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="py-24 md:py-32 bg-white border-y border-borderline">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-12 lg:col-span-4">
              <p className="eyebrow mb-6">Leadership</p>
              <h2 className="font-display-bold text-5xl md:text-6xl text-ink tracking-[-0.02em] leading-[1.02]">
                The founding partner.
              </h2>
            </div>
            <Reveal className="col-span-12 lg:col-span-8">
              <div className="grid grid-cols-12 gap-8 items-start">
                <div className="col-span-12 sm:col-span-4">
                  {/* Portrait */}
                  <div className="aspect-square w-full max-w-[260px] relative border border-gold/40 overflow-hidden">
                    <img
                      src="/founder.jpg"
                      alt="CA Prem Suman — Founder & Managing Partner"
                      data-testid="founder-portrait"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent p-4">
                      <div className="w-10 h-px bg-gold mb-2" />
                      <p className="font-body text-[10px] uppercase tracking-[0.3em] text-ivory">FCA · ICAI</p>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-8">
                  <p className="eyebrow text-[10px]">Founder &amp; Managing Partner</p>
                  <h3 className="font-display text-4xl md:text-5xl text-ink mt-3 tracking-tight leading-tight">
                    CA Prem Suman
                  </h3>
                  <p className="font-body text-sm text-ink/55 mt-2 uppercase tracking-[0.18em]">FCA (ICAI)</p>

                  <blockquote className="font-display italic text-2xl text-ink/85 mt-8 leading-snug border-l-2 border-gold pl-6">
                    &ldquo;20+ years leading audit, internal controls, inventory management, and assurance mandates across manufacturing, automobiles, real estate, financial services, and infrastructure.&rdquo;
                  </blockquote>

                  <ul className="mt-8 space-y-3 font-body text-base text-ink/75">
                    <li>· Co-opted Member, Corporate Laws &amp; Corporate Governance Committee (ICAI)</li>
                    <li>· Architect of the firm&apos;s structured audit methodology and technology roadmap</li>
                    <li>· Sector exposure: manufacturing, automotive, real estate, financial services, infrastructure</li>
                  </ul>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Delivery Organisation */}
      <section className="py-24 md:py-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow">The Delivery Organisation</p>
              <h2 className="font-display-bold text-5xl md:text-6xl text-ink tracking-[-0.02em] mt-5 leading-[1.02]">
                A multi-disciplinary team.
              </h2>
            </div>
            <div className="col-span-12 md:col-span-6 md:col-start-7 self-end">
              <p className="font-body text-base text-ink/65 leading-relaxed">
                CA Prem Suman is supported by a senior, multi-disciplinary delivery organisation — chartered accountants, cost accountants, technology specialists, and operational audit experts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-borderline border border-borderline">
            {TEAM_PILLARS.map((p, i) => (
              <div key={p.title} className="bg-ivory p-10 hover:bg-white transition-colors duration-500">
                <span className="font-display text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-heading text-xl text-ink mt-6 leading-snug">{p.title}</h3>
                <p className="font-body text-sm text-ink/60 mt-3 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="py-24 md:py-32 bg-white border-y border-borderline">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="flex items-center justify-between gap-8 mb-12">
            <p className="eyebrow">Offices</p>
            <div className="hairline-long flex-1" />
            <p className="font-body text-sm text-ink/55 uppercase tracking-[0.2em] whitespace-nowrap">Pan-India reach</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {OFFICES.map((o) => (
              <Reveal key={o.city}>
                <div className="border border-borderline bg-ivory p-8 h-full hover:border-gold hover:bg-white transition-all duration-500 group">
                  <MapPin className="w-5 h-5 text-gold" strokeWidth={1.5} />
                  <h3 className="font-heading text-3xl text-ink mt-6 group-hover:text-gold transition-colors duration-500" style={{ fontWeight: 600 }}>
                    {o.city}
                  </h3>
                  {o.role === "Headquarters" ? (
                    <p className="font-body text-[10px] uppercase tracking-[0.25em] text-gold mt-3">Headquarters</p>
                  ) : (
                    <p className="font-body text-[10px] uppercase tracking-[0.25em] text-ink/45 mt-3">Office</p>
                  )}
                  <div className="w-6 h-px bg-gold/40 mt-6 group-hover:w-16 transition-all duration-500" />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 md:py-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow">Our Values</p>
              <h2 className="font-display-bold text-5xl md:text-6xl text-ink tracking-[-0.02em] mt-5 leading-[1.02]">
                Four principles.<br />Non-negotiable.
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUES.map((v, i) => (
              <div key={v.title} className="border-t border-ink pt-8">
                <span className="font-display text-2xl text-gold">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-heading text-2xl text-ink mt-6">{v.title}</h3>
                <p className="font-body text-sm text-ink/65 mt-3 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-24 md:py-32 bg-ink text-ivory">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-10 mb-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow-light">Milestones</p>
              <h2 className="font-display-bold text-5xl md:text-6xl text-ivory tracking-[-0.02em] mt-5 leading-[1.02]">
                15+ years,<br /><span className="italic text-gold">documented.</span>
              </h2>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-0">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className={`col-span-12 md:col-span-6 lg:col-span-3 border-t border-ivory/15 pt-8 pb-12 pr-6 ${i % 4 !== 3 ? "lg:border-r lg:border-ivory/15" : ""}`}>
                <p className="font-display text-3xl text-gold">{m.year}</p>
                <p className="font-body text-sm text-ivory/75 mt-4 leading-relaxed">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 bg-white border-t border-borderline">
        <div className="container-px mx-auto max-w-[1440px] text-center">
          <h2 className="font-display-bold text-5xl md:text-7xl text-ink tracking-[-0.025em] leading-[1.02] max-w-4xl mx-auto">
            Work with a senior-led firm.
          </h2>
          <Link to="/contact" data-testid="about-cta" className="btn-primary mt-12 inline-flex">
            Talk to an Expert <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </main>
  );
}
