import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  "layout-dashboard": "M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 7h7v9h-7v-9zM4 14h7v6H4v-6z",
  "plus-circle": "M12 8v8m-4-4h8M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  package: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  "alert-triangle": "M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  wallet: "M3 7a2 2 0 012-2h12a2 2 0 012 2v1H3V7zm0 3h18v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7zm13 3.5a1 1 0 100 2 1 1 0 000-2z",
  "map-pin": "M12 21s7-6.5 7-11.5A7 7 0 105 9.5C5 14.5 12 21 12 21zm0-9a2.5 2.5 0 110-5 2.5 2.5 0 010 5z",
  "credit-card": "M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm0 4h20M6 15h4",
  "bar-chart": "M4 20V10m6 10V4m6 16v-8m6 8V8",
  plug: "M9 2v6m6-6v6M6 8h12l-1 6a5 5 0 01-10 0L6 8zM12 18v4",
  truck: "M3 7h11v9H3V7zm11 3h4l3 3v3h-7v-6zM6.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm12 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0",
  users: "M9 12a4 4 0 100-8 4 4 0 000 8zm7-1a3 3 0 100-6 3 3 0 000 6zM2 21a7 7 0 0114 0m2-4a5 5 0 014.9 4",
  percent: "M19 5L5 19M7 7a2 2 0 100-4 2 2 0 000 4zm10 14a2 2 0 100-4 2 2 0 000 4z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35",
  bell: "M6 8a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zm4.5 10a1.5 1.5 0 003 0",
  "log-out": "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m6 4l4 4-4 4m4-4H9",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  "chevron-right": "M9 18l6-6-6-6",
  copy: "M9 9h10v10H9zM5 15V5h10",
  scale: "M12 3v18M5 7l-3 7a3.5 3.5 0 007 0l-3-7zm14 0l-3 7a3.5 3.5 0 007 0l-3-7zM5 7h14M9 21h6",
  "search-check": "M11 19a8 8 0 100-16 8 8 0 000 16zm10 2l-4.35-4.35M8.5 11l1.8 1.8L14.5 9",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z",
  "message-circle": "M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z",
};

export function Icon({ name, className, ...props }: { name: keyof typeof PATHS | string } & SVGProps<SVGSVGElement>) {
  const d = PATHS[name] ?? PATHS["package"];
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-4 w-4"}
      {...props}
    >
      <path d={d} />
    </svg>
  );
}
