import { cn } from "builder-kit/ui";

/**
 * Inline icon set. All icons are decorative; the surrounding control supplies
 * the accessible name (A11Y-03).
 */
const PATHS = {
  spark: "M10 2l1.6 4.4L16 8l-4.4 1.6L10 14l-1.6-4.4L4 8l4.4-1.6L10 2z",
  search: "M9 4a5 5 0 1 0 0 10A5 5 0 0 0 9 4zM13 13l4 4",
  command: "M7 3a2 2 0 1 0 0 4h2V5a2 2 0 0 0-2-2zM13 3a2 2 0 1 1 0 4h-2V5a2 2 0 0 1 2-2zM7 17a2 2 0 1 1 0-4h2v2a2 2 0 0 1-2 2zM13 17a2 2 0 1 0 0-4h-2v2a2 2 0 0 0 2 2zM9 7h2v6H9z",
  sun: "M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4",
  moon: "M15.5 12.5A6 6 0 0 1 7.5 4.5a6.5 6.5 0 1 0 8 8z",
  plus: "M10 4v12M4 10h12",
  play: "M7 4l9 6-9 6V4z",
  check: "M4 10l4 4 8-8",
  clock: "M10 5v5l3 2M10 3a7 7 0 1 0 0 14A7 7 0 0 0 10 3z",
  alert: "M10 3l8 14H2L10 3zM10 8v4M10 14.5v.01",
  arrow: "M4 10h11M11 6l4 4-4 4",
  comment: "M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  layout: "M3 4h14v12H3zM3 8h14M8 8v8",
  layers: "M10 3l7 4-7 4-7-4 7-4zM3 11l7 4 7-4M3 15l7 4 7-4",
  settings: "M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4",
  terminal: "M3 4h14v12H3zM6 8l3 2-3 2M11 12h3",
  filter: "M3 5h14l-5.5 6v5l-3 1v-6L3 5z",
  x: "M5 5l10 10M15 5L5 15",
  copy: "M7 7h9v9H7zM4 4h9v3M4 4v9h3",
  external: "M11 3h6v6M17 3l-8 8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5",
  dots: "M6 10h.01M10 10h.01M14 10h.01",
  chevron: "M7 8l3 3 3-3",
  git: "M6 3v10a3 3 0 0 0 3 3h5M6 7l4-4M6 7L2 3",
  star: "M10 2l2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6L5.1 17l.9-5.5-4-3.9L7.6 7 10 2z",
  bolt: "M11 2L4 11h5l-1 7 7-9h-5l1-7z",
  refresh: "M16 10a6 6 0 1 1-2-4.5M16 3v4h-4",
};

export function Icon({ name, size = 16, className }) {
  const path = PATHS[name] ?? PATHS.dots;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn("icon-inline shrink-0", className)}
    >
      <path d={path} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
