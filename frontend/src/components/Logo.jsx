import React from "react";
import { Link } from "react-router-dom";

/**
 * PSA Logo — pure typographic wordmark.
 * Variant: light (dark text on ivory) | dark (ivory text on dark)
 */
export default function Logo({ variant = "light", size = "md", className = "" }) {
  const isDark = variant === "dark";
  const text = isDark ? "text-ivory" : "text-ink";
  const sub = isDark ? "text-ivory/60" : "text-ink/55";
  const rule = "bg-gold";

  const sizes = {
    sm: { mono: "text-2xl", sub: "text-[8px]", ruleW: "w-5" },
    md: { mono: "text-[28px] leading-none", sub: "text-[9px]", ruleW: "w-6" },
    lg: { mono: "text-5xl leading-none", sub: "text-[11px]", ruleW: "w-8" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <Link to="/" data-testid="logo-home-link" className={`inline-flex items-center group ${className}`}>
      <div className="flex flex-col">
        <span className={`font-display font-bold tracking-[-0.02em] ${s.mono} ${text} transition-colors duration-500 group-hover:text-gold`}>
          PSA
        </span>
        <div className="flex items-center gap-2 mt-1">
          <span className={`block h-px ${s.ruleW} ${rule}`} />
          <span className={`font-body font-medium uppercase ${s.sub} tracking-[0.25em] ${sub}`}>
            P Suman &amp; Associates
          </span>
        </div>
      </div>
    </Link>
  );
}
