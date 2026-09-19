import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({
  className = "",
  size = "md",
  showLabel = false,
}) {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-10 h-10",
  };

  const iconSizes = {
    sm: 15,
    md: 17,
    lg: 19,
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      data-testid="theme-toggle-btn"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center rounded border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky ${
        isDark
          ? "bg-[#0E2D55]/60 border-white/20 text-amber-300 hover:text-amber-200 hover:bg-[#0E2D55] hover:border-amber-300/40 shadow-[0_0_12px_-3px_rgba(251,191,36,0.25)]"
          : "bg-slate-100/80 border-borderline text-ink/75 hover:text-ink hover:bg-slate-200/80 hover:border-ink/30 shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
      } ${sizeClasses[size] || sizeClasses.md} ${className}`}
    >
      <span className="sr-only">
        {isDark ? "Switch to light mode" : "Switch to dark mode"}
      </span>

      <span
        className={`transform transition-transform duration-500 ease-spring ${
          isDark ? "rotate-0 scale-100" : "-rotate-90 scale-0 absolute"
        }`}
      >
        <Sun size={iconSizes[size] || 17} strokeWidth={1.75} className="animate-pulse-slow" />
      </span>

      <span
        className={`transform transition-transform duration-500 ease-spring ${
          isDark ? "rotate-90 scale-0 absolute" : "rotate-0 scale-100"
        }`}
      >
        <Moon size={iconSizes[size] || 17} strokeWidth={1.75} />
      </span>

      {showLabel && (
        <span className="ml-2 font-body text-xs tracking-wider uppercase">
          {isDark ? "Light" : "Dark"}
        </span>
      )}
    </button>
  );
}
