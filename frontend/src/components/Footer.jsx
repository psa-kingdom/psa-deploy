import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Linkedin, ArrowUpRight } from "lucide-react";
import Logo from "./Logo";
import { FIRM, OFFICES } from "../data/site";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    try {
      await axios.post(`${API}/newsletter`, { email, source: "footer" });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="bg-ink text-ivory">
      {/* Newsletter strip */}
      <div className="border-b border-ivory/10">
        <div className="container-px mx-auto max-w-[1440px] py-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5">
            <p className="eyebrow-light mb-2">The PSA Monthly Briefing</p>
            <p className="font-heading text-xl md:text-2xl text-ivory leading-snug">
              Audit intelligence, distilled.
            </p>
          </div>
          <div className="md:col-span-7">
            <form onSubmit={submit} data-testid="footer-newsletter-form" className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@firm.com"
                required
                data-testid="footer-newsletter-email"
                className="flex-1 bg-transparent border border-white/25 px-5 py-3.5 text-white placeholder:text-white/45 focus:outline-none focus:border-sky transition-colors duration-300 font-body text-sm"
              />
              <button
                type="submit"
                disabled={status === "submitting"}
                data-testid="footer-newsletter-submit"
                className="bg-sky text-white px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] hover:bg-sky-dark transition-colors duration-500 disabled:opacity-60"
              >
                {status === "submitting" ? "Subscribing…" : status === "success" ? "Subscribed ✓" : "Subscribe"}
              </button>
            </form>
            {status === "success" && (
              <p data-testid="footer-newsletter-success" className="font-body text-xs text-sky-light mt-3">Thank you — you&apos;ll receive our next briefing.</p>
            )}
            {status === "error" && (
              <p className="font-body text-xs text-red-400 mt-3">Something went wrong. Please try again.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container-px mx-auto max-w-[1440px] py-20 grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <Logo variant="dark" size="lg" />
          <p className="font-body text-sm text-ivory/60 mt-8 leading-relaxed max-w-sm">
            India&apos;s technology-enabled audit and advisory firm. Big-4 quality, built for the mid-market and enterprise.
          </p>
          <a
            href={FIRM.linkedin}
            target="_blank"
            rel="noreferrer"
            data-testid="footer-linkedin"
            className="mt-8 inline-flex items-center gap-2 text-ivory/70 hover:text-gold transition-colors duration-300 text-sm"
          >
            <Linkedin className="w-4 h-4" strokeWidth={1.5} /> LinkedIn
          </a>
        </div>

        <div className="md:col-span-2">
          <p className="eyebrow-light mb-5">Services</p>
          <ul className="space-y-3">
            <li><Link to="/services#internal-audit-assurance" data-testid="footer-link-internal-audit" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Internal Audit</Link></li>
            <li><Link to="/services#inventory-intelligence" data-testid="footer-link-inventory" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Inventory Intelligence</Link></li>
            <li><Link to="/services#risk-advisory" data-testid="footer-link-risk" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Risk Advisory</Link></li>
            <li><Link to="/services#process-performance-improvement" data-testid="footer-link-process" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Process Improvement</Link></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <p className="eyebrow-light mb-5">Firm</p>
          <ul className="space-y-3">
            <li><Link to="/about" data-testid="footer-link-about" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">About</Link></li>
            <li><Link to="/industries" data-testid="footer-link-industries" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Industries</Link></li>
            <li><Link to="/insights" data-testid="footer-link-insights" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Insights</Link></li>
            <li><Link to="/contact" data-testid="footer-link-contact" className="font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">Contact</Link></li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <p className="eyebrow-light mb-5">Offices</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {OFFICES.map((o) => (
              <div key={o.city}>
                <p className="font-heading text-base text-ivory">{o.city}{o.role === "Headquarters" && <span className="text-gold text-[10px] ml-2 align-middle uppercase tracking-[0.2em]">HQ</span>}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-2">
            {FIRM.phones.map((p) => (
              <a key={p} href={`tel:${p.replace(/\s|-/g, "")}`} className="block font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300">{p}</a>
            ))}
            <a href={`mailto:${FIRM.emails[0]}`} data-testid="footer-email" className="inline-flex items-center gap-1.5 font-body text-sm text-ivory/80 hover:text-gold transition-colors duration-300 mt-2">
              {FIRM.emails[0]} <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-ivory/10">
        <div className="container-px mx-auto max-w-[1440px] py-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="font-body text-xs text-ivory/40 tracking-[0.1em]">
            © {new Date().getFullYear()} P Suman &amp; Associates. All rights reserved.
          </p>
          <p className="font-body text-xs text-ivory/40 tracking-[0.1em]">
            Chartered Accountants · ICAI Firm
          </p>
        </div>
      </div>
    </footer>
  );
}
