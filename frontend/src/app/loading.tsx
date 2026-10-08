import { Logo } from "@/components/ui/Logo";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <div className="animate-pulse scale-150">
          <Logo />
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-full animate-[progress_1.5s_ease-in-out_infinite] rounded-full bg-brand origin-left" />
        </div>
      </div>
    </div>
  );
}
