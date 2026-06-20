import React, { useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * NewsletterBlock — used inside pages (homepage + article bottoms).
 * Variant: light | dark
 */
export default function NewsletterBlock({ variant = "light", testidPrefix = "newsletter" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setStatus("submitting");
    try {
      await axios.post(`${API}/newsletter`, { email, source: testidPrefix });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  const isDark = variant === "dark";

  return (
    <div className={`${isDark ? "bg-ink text-ivory" : "bg-ivory text-ink border border-borderline"} p-10 md:p-16`}>
      <div className="grid md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-6">
          <p className={`eyebrow${isDark ? "-light" : ""} mb-4`}>The PSA Monthly Briefing</p>
          <h3 className={`font-display text-4xl md:text-5xl ${isDark ? "text-ivory" : "text-ink"} tracking-tight leading-[1.05]`}>
            Audit intelligence, regulatory updates, and risk frameworks — distilled for senior finance leaders.
          </h3>
        </div>
        <div className="md:col-span-6">
          <form onSubmit={submit} data-testid={`${testidPrefix}-form`} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@firm.com"
              required
              data-testid={`${testidPrefix}-email`}
              className={`flex-1 bg-transparent border px-5 py-4 focus:outline-none transition-colors duration-300 font-body text-sm ${
                isDark
                  ? "border-ivory/20 text-ivory placeholder:text-ivory/40 focus:border-gold"
                  : "border-ink/20 text-ink placeholder:text-ink/40 focus:border-gold"
              }`}
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              data-testid={`${testidPrefix}-submit`}
              className={`px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] transition-colors duration-500 disabled:opacity-60 ${
                isDark ? "bg-sky text-white hover:bg-sky-dark" : "bg-sky text-white hover:bg-sky-dark"
              }`}
            >
              {status === "submitting" ? "Subscribing…" : status === "success" ? "Subscribed ✓" : "Subscribe"}
            </button>
          </form>
          <p className={`font-body text-xs ${isDark ? "text-ivory/50" : "text-ink/50"} mt-4`}>
            Read by 2,000+ senior finance professionals across India.
          </p>
          {status === "success" && (
            <p data-testid={`${testidPrefix}-success`} className="font-body text-sm text-gold mt-4">
              Thank you — you&apos;ll receive our next briefing.
            </p>
          )}
          {status === "error" && (
            <p className="font-body text-sm text-red-400 mt-4">Something went wrong. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
}
