import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Linkedin, Link2, ArrowUpRight } from "lucide-react";
import NewsletterBlock from "../components/NewsletterBlock";
import { ARTICLES } from "../data/articles";

export default function InsightDetail() {
  const { slug } = useParams();
  const article = ARTICLES.find((a) => a.slug === slug);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const id = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(id);
    };
  }, [slug]);

  if (!article) {
    return (
      <main className="bg-ivory pt-40 pb-32 min-h-screen">
        <div className="container-px mx-auto max-w-[800px] text-center">
          <p className="eyebrow mb-4">404</p>
          <h1 className="font-display text-5xl text-ink">Article not found.</h1>
          <Link to="/insights" data-testid="article-back" className="btn-primary mt-10 inline-flex">
            Back to Insights
          </Link>
        </div>
      </main>
    );
  }

  const related = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard unavailable
    }
  };

  return (
    <main className="bg-ivory pt-24">
      {/* Reading Progress */}
      <div className="fixed top-20 left-0 right-0 h-[2px] bg-borderline z-40" data-testid="article-progress-track">
        <div
          data-testid="article-progress-fill"
          className="h-full bg-gold transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* HERO */}
      <section className="container-px mx-auto max-w-[1100px] pt-16 pb-12">
        <Link to="/insights" data-testid="article-back-link" className="inline-flex items-center gap-2 font-body text-sm text-ink/60 hover:text-gold transition-colors duration-300 mb-10">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> All Insights
        </Link>
        <p className="eyebrow mb-5">{article.category} · {article.readTime}</p>
        <h1 className="font-display-bold text-4xl md:text-6xl lg:text-7xl text-ink tracking-[-0.025em] leading-[1.02]">
          {article.title}
        </h1>
        <p className="font-body text-lg md:text-xl text-ink/65 mt-8 leading-relaxed max-w-3xl">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between mt-10 border-y border-borderline py-5">
          <div>
            <p className="font-body text-sm text-ink/80">{article.author}</p>
            <p className="font-body text-xs text-ink/50 uppercase tracking-[0.15em] mt-0.5">{article.date}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
              target="_blank"
              rel="noreferrer"
              data-testid="article-share-linkedin"
              className="w-9 h-9 inline-flex items-center justify-center border border-borderline hover:border-gold hover:text-gold transition-colors duration-300"
              aria-label="Share on LinkedIn"
            >
              <Linkedin className="w-4 h-4" strokeWidth={1.5} />
            </a>
            <button
              onClick={copyLink}
              data-testid="article-share-copy"
              className="w-9 h-9 inline-flex items-center justify-center border border-borderline hover:border-gold hover:text-gold transition-colors duration-300"
              aria-label="Copy link"
            >
              <Link2 className="w-4 h-4" strokeWidth={1.5} />
            </button>
            {copied && <span data-testid="article-copy-toast" className="font-body text-xs text-gold ml-2">Copied</span>}
          </div>
        </div>
      </section>

      {/* HERO IMAGE */}
      <section className="container-px mx-auto max-w-[1440px] mb-20">
        <img src={article.image} alt={article.title} className="w-full aspect-[21/9] object-cover" />
      </section>

      {/* BODY + TOC */}
      <section className="container-px mx-auto max-w-[1280px] pb-24">
        <div className="grid grid-cols-12 gap-10">
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-32">
              <p className="eyebrow mb-5">In this article</p>
              <ul className="space-y-3 border-l border-borderline pl-5">
                {article.toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      data-testid={`toc-${t.id}`}
                      className="font-body text-sm text-ink/65 hover:text-gold transition-colors duration-300 leading-snug block"
                    >
                      {t.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <article className="col-span-12 lg:col-span-8 lg:col-start-5">
            <div className="article-prose" dangerouslySetInnerHTML={{ __html: article.body }} />
          </article>
        </div>
      </section>

      {/* RELATED */}
      <section className="py-24 bg-white border-y border-borderline">
        <div className="container-px mx-auto max-w-[1440px]">
          <p className="eyebrow mb-10">Related Insights</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {related.map((a) => (
              <Link key={a.slug} to={`/insights/${a.slug}`} data-testid={`article-related-${a.slug}`} className="group block">
                <div className="overflow-hidden aspect-[16/10] mb-5">
                  <img src={a.image} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                </div>
                <p className="eyebrow text-[10px]">{a.category}</p>
                <h3 className="font-heading text-xl text-ink mt-2 leading-snug group-hover:text-gold transition-colors duration-500">{a.title}</h3>
                <span className="link-underline mt-4 inline-flex items-center gap-2 font-body text-sm text-ink group-hover:text-gold transition-colors duration-500">
                  Read <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="py-24 md:py-32">
        <div className="container-px mx-auto max-w-[1440px]">
          <NewsletterBlock variant="dark" testidPrefix="article-newsletter" />
        </div>
      </section>
    </main>
  );
}
