import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen relative overflow-hidden bg-slate-50">
      {/* Unified Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-light/40 via-slate-50 to-brand-light/20"></div>
      <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand/5 blur-3xl mix-blend-multiply"></div>
      <div className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl mix-blend-multiply"></div>
      
      <div className="relative z-10 flex w-full max-w-7xl mx-auto">
        {/* Left side: Branding / Marketing (Hidden on small screens) */}
        <div className="hidden w-[55%] flex-col justify-center px-12 lg:flex">
          <div className="mb-10 scale-125 origin-left">
            <Logo />
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.15] tracking-tight text-foreground max-w-lg">
            Simplify your shipping. <br/> Amplify your growth.
          </h1>
          <p className="mt-6 text-lg text-muted font-medium leading-relaxed max-w-md">
            HetEx is your all-in-one logistics platform. Compare top couriers, book shipments instantly, automate live tracking, and manage NDRs — all from a single, powerful dashboard designed to make your delivery process effortless.
          </p>
        </div>

        {/* Right side: Auth Form */}
        <div className="flex w-full items-center justify-center lg:w-[45%] px-4 sm:px-12 py-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex justify-center">
              <Logo />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
