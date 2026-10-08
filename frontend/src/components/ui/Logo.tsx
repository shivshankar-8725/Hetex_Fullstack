import Image from "next/image";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <Image 
        src="/logo.jpeg" 
        alt="HetEx Logo" 
        width={180} 
        height={50} 
        className="object-contain"
        priority
      />
    </div>
  );
}
