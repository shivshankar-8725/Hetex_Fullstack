export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img 
        src="/logo.jpeg" 
        alt="HetEx Logo" 
        width={180} 
        height={50} 
        className="object-contain max-h-12 w-auto" 
      />
    </div>
  );
}
