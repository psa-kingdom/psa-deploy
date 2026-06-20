import React from "react";

/**
 * Marquee — CSS-driven infinite horizontal scroll for client logos / sector tickers.
 */
export default function Marquee({ items, speed = "normal", variant = "light", separator = "·" }) {
  const speedClass = speed === "slow" ? "animate-marquee-slow" : "animate-marquee";
  const colorClass = variant === "dark" ? "text-ivory/50" : "text-ink/40";
  const all = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden no-scrollbar w-full">
      <div className={`marquee-track ${speedClass}`}>
        {all.map((item, i) => (
          <div key={i} className="flex items-center gap-16 flex-shrink-0">
            <span className={`font-heading text-xl md:text-2xl ${colorClass} whitespace-nowrap tracking-tight`}>
              {item}
            </span>
            <span className={`text-gold/60 text-lg`}>{separator}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
