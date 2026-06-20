import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Reveal from "../components/Reveal";
import NewsletterBlock from "../components/NewsletterBlock";
import { ARTICLES } from "../data/articles";
import { CATEGORIES } from "../data/site";

export default function Insights() {
  const [active, setActive] = useState("All");
  const [visible, setVisible] = useState(9);

  const featured = ARTICLES[0];
  const rest = ARTICLES.slice(1);

  const filtered = useMemo(() => {
    if (active === "All") return rest;
    return rest.filter((a) => a.category === active);
  }, [active, rest]);

  return (
    <main className="bg-ivory">
      {/* HERO — dark anchor */}
      <section className="bg-ink text-ivory relative overflow-hidden pt-40 pb-24">
        <div className="absolute inset-0 grain pointer-events-none opacity-40" />
        <div className="relative container-px mx-auto max-w-[1440px]">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-10">
              <p className="eyebrow-light mb-6">Insights</p>
              <h1 className="font-display-bold text-5xl md:text-7xl lg:text-[88px] text-ivory tracking-[-0.02em] leading-[1.02]">
                PSA Insights.
              </h1>
              <p className="font-body text-lg md:text-xl text-ivory/70 mt-10 max-w-3xl leading-relaxed">
                Perspectives on audit, risk, and business performance — written for India&apos;s senior finance leaders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="pb-20">
        <div className="container-px mx-auto max-w-[1440px]">
          <Reveal>
            <Link to={`/insights/${featured.slug}`} data-testid={`insights-featured-${featured.slug}`} className="group grid grid-cols-12 gap-10 items-center border-t border-b border-borderline py-12">
              <div className="col-span-12 lg:col-span-7 overflow-hidden">
                <img src={featured.image} alt={featured.title} className="w-full aspect-[16/10] object-cover transition-transform duration-1000 group-hover:scale-105" />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <p className="eyebrow text-[10px]">{featured.category} · Featured · {featured.readTime}</p>
                <h2 className="font-display-bold text-4xl md:text-5xl text-ink mt-4 tracking-[-0.02em] leading-[1.02] group-hover:text-gold transition-colors duration-500">
                  {featured.title}
                </h2>
                <p className="font-body text-base text-ink/65 mt-6 leading-relaxed">{featured.excerpt}</p>
                <span className="link-underline mt-8 inline-flex items-center gap-2 font-body text-sm text-ink group-hover:text-gold transition-colors duration-500">
                  Read the article <ArrowUpRight className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CATEGORY FILTER */}
      <div className="sticky top-20 z-30 bg-ivory/95 backdrop-blur-md border-y border-borderline">
        <div className="container-px mx-auto max-w-[1440px] py-5 flex gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              data-testid={`category-filter-${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              onClick={() => { setActive(c); setVisible(9); }}
              className={`flex-shrink-0 font-body text-[12px] uppercase tracking-[0.18em] px-4 py-2 border transition-all duration-300 ${
                active === c
                  ? "bg-ink text-ivory border-ink"
                  : "border-borderline text-ink/65 hover:text-ink hover:border-ink/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      <section className="py-20 md:py-28">
        <div className="container-px mx-auto max-w-[1440px]">
          {filtered.length === 0 ? (
            <p className="font-body text-base text-ink/55 text-center py-20">No articles in this category yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {filtered.slice(0, visible).map((a, i) => (
                <Reveal key={a.slug} delay={(i % 3) * 80}>
                  <Link to={`/insights/${a.slug}`} data-testid={`insights-card-${a.slug}`} className="group block">
                    <div className="overflow-hidden aspect-[16/10] mb-6">
                      <img src={a.image} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                    </div>
                    <p className="eyebrow text-[10px]">{a.category} · {a.readTime}</p>
                    <h3 className="font-heading text-2xl text-ink mt-3 leading-snug group-hover:text-gold transition-colors duration-500">{a.title}</h3>
                    <p className="font-body text-sm text-ink/65 mt-3 leading-relaxed line-clamp-3">{a.excerpt}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}

          {filtered.length > visible && (
            <div className="text-center mt-20">
              <button
                data-testid="insights-load-more"
                onClick={() => setVisible((v) => v + 6)}
                className="btn-secondary"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="pb-24 md:pb-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <NewsletterBlock variant="dark" testidPrefix="insights-newsletter" />
        </div>
      </section>
    </main>
  );
}
