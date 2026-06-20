import React, { useEffect, useRef, useState } from "react";

/**
 * Animated counter — counts up to `value` when scrolled into view.
 * Optional prefix/suffix. Supports both ints and decimals.
 */
export default function StatCounter({ value, prefix = "", suffix = "", duration = 1800, className = "", testid }) {
  const [display, setDisplay] = useState(0);
  const elRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !startedRef.current) {
        startedRef.current = true;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplay(Math.round(value * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value, duration]);

  return (
    <span ref={elRef} data-testid={testid} className={className}>
      {prefix}{display.toLocaleString("en-IN")}{suffix}
    </span>
  );
}
