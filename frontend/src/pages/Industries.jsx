import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "../components/Reveal";
import { INDUSTRIES } from "../data/site";

export default function Industries() {
  return (
    <main className="bg-ivory">
      <section className="bg-ink text-ivory relative overflow-hidden pt-40 pb-24 md:pb-32">
        <div className="absolute inset-0 grain pointer-events-none opacity-40" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-6">Industries</p>
              <h1 className="font-display-bold text-5xl md:text-7xl lg:text-[88px] text-ivory tracking-[-0.02em] leading-[1.02]">
                Twelve sectors.<br /><span className="italic text-gold">Decades of exposure.</span>
              </h1>
              <p className="font-body text-lg md:text-xl text-ivory/70 mt-10 max-w-3xl leading-relaxed">
                PSA&apos;s sector intelligence is built from 15+ years of fieldwork — across India&apos;s most operationally complex industries.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
            {INDUSTRIES.map((ind, i) => (
              <Reveal key={ind.slug} delay={(i % 3) * 80}>
                <article id={ind.slug} className="group scroll-mt-32">
                  <div className="overflow-hidden aspect-[4/5] mb-6">
                    <img src={ind.img} alt={ind.name} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-sm text-gold">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-heading text-2xl text-ink leading-snug">{ind.name}</h3>
                  </div>
                  <p className="font-body text-sm text-ink/65 mt-3 leading-relaxed">{ind.blurb}</p>
                  <p className="font-body text-xs uppercase tracking-[0.18em] text-ink/45 mt-4">{ind.credentials}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-white border-t border-borderline">
        <div className="container-px mx-auto max-w-[1440px] grid grid-cols-12 gap-8 items-center">
          <div className="col-span-12 md:col-span-7">
            <p className="eyebrow">Sector-Deep Engagement</p>
            <h2 className="font-display-bold text-4xl md:text-5xl text-ink tracking-[-0.02em] mt-5 leading-[1.02]">
              Looking for sector-specific assurance? Our partners will brief you.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 md:text-right">
            <Link to="/contact" data-testid="industries-cta" className="btn-primary inline-flex">
              Request a Briefing <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
