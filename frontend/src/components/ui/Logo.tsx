export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 40 40" className="h-8 w-8 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="9" fill="#2c3958" />
        <path d="M9 15h9M9 20h6M9 25h9" stroke="#f7941d" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M18 12l9 8-9 8" fill="none" stroke="#f7941d" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          <span style={{ color: "#2c3958" }}>Het</span>
          <span style={{ color: "#f7941d" }}>Ex</span>
        </span>
      )}
    </div>
  );
}
