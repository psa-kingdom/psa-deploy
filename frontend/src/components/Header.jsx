import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, Lock } from "lucide-react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { SERVICES, INDUSTRIES } from "../data/site";
import { ARTICLES } from "../data/articles";

const NAV = [
  { label: "Services", to: "/services", mega: "services" },
  { label: "Industries", to: "/industries", mega: "industries" },
  { label: "About", to: "/about" },
  { label: "Insights", to: "/insights", mega: "insights" },
  { label: "Contact", to: "/contact" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [openMega, setOpenMega] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMega(null);
  }, [location.pathname]);

  return (
    <header
      data-testid="site-header"
      onMouseLeave={() => setOpenMega(null)}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-white/95 dark:bg-[#06182C]/95 backdrop-blur-md border-b border-borderline dark:border-white/10 shadow-[0_1px_20px_-10px_rgba(10,37,64,0.15)] dark:shadow-[0_4px_25px_-5px_rgba(0,0,0,0.5)]"
          : "bg-white/90 dark:bg-[#06182C]/90 backdrop-blur-sm border-b border-borderline/60 dark:border-white/10"
      }`}
    >
      <div className="container-px mx-auto max-w-[1440px] flex items-center justify-between h-20">
        <Logo size="md" />

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {NAV.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.mega && setOpenMega(item.mega)}
            >
              <NavLink
                to={item.to}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `font-body text-[13px] uppercase tracking-[0.18em] py-2 inline-flex items-center gap-1.5 transition-colors duration-300 ${
                    isActive
                      ? "text-gold"
                      : "text-ink/80 dark:text-slate-300 hover:text-ink dark:hover:text-white"
                  }`
                }
              >
                {item.label}
                {item.mega && <ChevronDown className="w-3 h-3 opacity-50" strokeWidth={1.5} />}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* CTAs & Theme Toggle */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/admin/login"
            data-testid="nav-admin-portal"
            className="inline-flex items-center gap-1.5 font-body text-[11px] uppercase tracking-[0.12em] text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white border border-borderline dark:border-white/15 hover:border-ink/30 dark:hover:border-white/30 rounded px-3 py-1.5 transition-all duration-300"
          >
            <Lock className="w-3 h-3" strokeWidth={1.5} />
            Admin Portal
          </Link>
          <Link
            to="/contact"
            data-testid="nav-talk-to-expert"
            className="btn-primary"
          >
            Talk to an Expert →
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="lg:hidden flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            className="text-ink dark:text-white p-1.5"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="mobile-menu-toggle"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mega dropdowns */}
      {openMega && (
        <div className="hidden lg:block absolute left-0 right-0 top-full bg-white dark:bg-[#06182C] border-t border-borderline dark:border-white/10 shadow-[0_20px_40px_-20px_rgba(10,17,24,0.15)] dark:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)]">
          <div className="container-px mx-auto max-w-[1440px] py-12">
            {openMega === "services" && (
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-3">
                  <p className="eyebrow mb-4">Practice Areas</p>
                  <h3 className="font-heading text-2xl text-ink dark:text-white leading-tight">Comprehensive advisory, built for enterprise scale.</h3>
                </div>
                <div className="col-span-9 grid grid-cols-2 gap-x-10 gap-y-6">
                  {SERVICES.map((s) => (
                    <Link
                      key={s.slug}
                      to={`/services#${s.slug}`}
                      data-testid={`mega-service-${s.slug}`}
                      className="group border-l border-borderline dark:border-white/15 pl-5 hover:border-gold transition-colors duration-300"
                    >
                      <span className="font-display text-sm text-gold">{s.no}</span>
                      <h4 className="font-heading text-lg text-ink dark:text-white mt-1 group-hover:text-gold transition-colors duration-300">{s.title}</h4>
                      <p className="font-body text-sm text-ink/60 dark:text-slate-400 mt-1.5 leading-relaxed">{s.short}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {openMega === "industries" && (
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-3">
                  <p className="eyebrow mb-4">12 Sectors</p>
                  <h3 className="font-heading text-2xl text-ink dark:text-white leading-tight">Sector-deep intelligence, drawn from 15+ years of engagement.</h3>
                </div>
                <div className="col-span-9 grid grid-cols-3 gap-x-8 gap-y-3">
                  {INDUSTRIES.map((ind) => (
                    <Link
                      key={ind.slug}
                      to={`/industries#${ind.slug}`}
                      data-testid={`mega-industry-${ind.slug}`}
                      className="font-body text-sm text-ink/80 dark:text-slate-300 hover:text-gold transition-colors duration-300 py-1 border-b border-transparent hover:border-gold/40"
                    >
                      {ind.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {openMega === "insights" && (
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-3">
                  <p className="eyebrow mb-4">Insights</p>
                  <h3 className="font-heading text-2xl text-ink dark:text-white leading-tight">Perspectives for India&apos;s senior finance leaders.</h3>
                  <Link to="/insights" data-testid="mega-insights-all" className="link-underline mt-6 inline-block font-body text-sm text-ink dark:text-slate-200 hover:text-gold">
                    View all insights →
                  </Link>
                </div>
                <div className="col-span-9 grid grid-cols-3 gap-6">
                  {ARTICLES.slice(0, 3).map((a) => (
                    <Link
                      key={a.slug}
                      to={`/insights/${a.slug}`}
                      data-testid={`mega-article-${a.slug}`}
                      className="group"
                    >
                      <div className="overflow-hidden mb-3">
                        <img
                          src={a.image}
                          alt={a.title}
                          loading="lazy"
                          className="w-full h-40 object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </div>
                      <p className="eyebrow text-[10px] mb-1.5">{a.category}</p>
                      <h4 className="font-heading text-base text-ink dark:text-white leading-snug group-hover:text-gold transition-colors duration-300">
                        {a.title}
                      </h4>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-[#06182C] border-t border-borderline dark:border-white/10">
          <nav className="container-px mx-auto py-8 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `font-heading text-2xl py-3 border-b border-borderline dark:border-white/10 ${
                    isActive ? "text-gold" : "text-ink dark:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/contact" data-testid="mobile-nav-cta" className="btn-primary mt-6 w-full">
              Talk to an Expert →
            </Link>
            <Link
              to="/admin/login"
              data-testid="mobile-nav-admin-portal"
              className="inline-flex items-center justify-center gap-2 mt-3 w-full font-body text-[11px] uppercase tracking-[0.12em] text-ink/50 dark:text-slate-400 hover:text-ink dark:hover:text-white border border-borderline dark:border-white/15 rounded py-2.5 transition-all duration-300"
            >
              <Lock className="w-3 h-3" strokeWidth={1.5} />
              Admin Portal
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
