import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import Reveal from "../components/Reveal";
import { SERVICES } from "../data/site";

export default function Services() {
  return (
    <main className="bg-ivory">
      {/* HERO — dark anchor */}
      <section className="bg-ink text-ivory relative overflow-hidden pt-40 pb-24 md:pb-32">
        <div className="absolute inset-0 grain pointer-events-none opacity-40" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-6">Services</p>
              <h1 className="font-display-bold text-5xl md:text-7xl lg:text-[88px] text-ivory tracking-[-0.02em] leading-[1.02]">
                Comprehensive advisory,<br />built for <span className="italic text-gold">enterprise scale.</span>
              </h1>
              <p className="font-body text-lg md:text-xl text-ivory/70 mt-10 max-w-3xl leading-relaxed">
                Four practices, one standard. PSA&apos;s services are designed for boards and audit committees that demand rigour, independence, and measurable outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Service deep-dives */}
      {SERVICES.map((s, idx) => (
        <section
          key={s.slug}
          id={s.slug}
          className={`py-24 md:py-32 scroll-mt-24 ${idx % 2 === 0 ? "bg-white border-y border-borderline" : "bg-ivory"}`}
        >
          <div className="container-px mx-auto max-w-[1440px]">
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-12 lg:col-span-5">
                <div className="sticky top-32">
                  <div className="flex items-baseline gap-6">
                    <span className="font-display text-3xl text-gold">{s.no}</span>
                    {s.flagship && <span className="font-body text-[10px] uppercase tracking-[0.25em] text-gold border border-gold/40 px-2.5 py-1">Flagship Practice</span>}
                  </div>
                  <h2 className="font-display-bold text-5xl md:text-6xl text-ink tracking-[-0.02em] mt-6 leading-[1.02]">
                    {s.title}
                  </h2>
                  <p className="font-body text-base text-ink/65 mt-6 leading-relaxed">{s.short}</p>
                </div>
              </div>

              <Reveal className="col-span-12 lg:col-span-7 lg:col-start-7">
                <p className="font-body text-lg text-ink/80 leading-[1.85]">{s.description}</p>

                <div className="mt-10">
                  <p className="eyebrow mb-5">Capabilities</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {s.capabilities.map((c) => (
                      <li key={c} className="flex items-start gap-3 font-body text-base text-ink/80">
                        <Check className="w-4 h-4 text-gold mt-1.5 flex-shrink-0" strokeWidth={2} />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-12 border-t border-borderline pt-10">
                  <p className="eyebrow mb-3">Track Record</p>
                  <p className="font-display text-5xl md:text-6xl text-ink tracking-tight">{s.stat.value}</p>
                  <p className="font-body text-sm text-ink/60 mt-2">{s.stat.label}</p>
                </div>

                <Link to="/contact" data-testid={`service-cta-${s.slug}`} className="btn-primary mt-12 inline-flex">
                  Discuss this practice <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </Link>
              </Reveal>
            </div>
          </div>
        </section>
      ))}

      {/* Bottom CTA */}
      <section className="py-24 md:py-32 bg-white border-t border-borderline">
        <div className="container-px mx-auto max-w-[1440px] text-center">
          <p className="eyebrow">Engagement</p>
          <h2 className="font-display-bold text-5xl md:text-7xl text-ink tracking-[-0.025em] mt-6 leading-[1.02] max-w-4xl mx-auto">
            Senior-led from the<br /><span className="italic text-sky">first conversation.</span>
          </h2>
          <p className="font-body text-lg text-ink/75 mt-8 max-w-2xl mx-auto leading-relaxed">
            Every mandate is personally overseen by the founding partner.
          </p>
          <Link to="/contact" data-testid="services-bottom-cta" className="btn-primary mt-12 inline-flex">
            Talk to an Expert <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </main>
  );
}
