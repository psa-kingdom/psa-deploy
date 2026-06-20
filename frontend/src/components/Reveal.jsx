import React from "react";
import { useInView } from "../hooks/useInView";

/**
 * Reveal — wraps content with a fade-up reveal when scrolled into view.
 */
export default function Reveal({ children, delay = 0, as: Tag = "div", className = "" }) {
  const [ref, inView] = useInView();
  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "in-view" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
