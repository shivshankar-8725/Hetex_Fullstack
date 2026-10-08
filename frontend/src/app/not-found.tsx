import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name="file-question" className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">Record Not Found</h2>
      <p className="mb-6 max-w-md text-muted">
        The order or resource you are looking for does not exist or you don't have permission to view it.
      </p>
      <Link href="/dashboard">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
}
