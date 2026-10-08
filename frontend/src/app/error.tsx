"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
        <Icon name="alert-circle" className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">Something went wrong</h2>
      <p className="mb-6 max-w-md text-muted">
        {error.message || "We couldn't complete your request due to an unexpected issue. Please try again."}
      </p>
      <div className="flex gap-4">
        <Button onClick={() => window.history.back()} variant="secondary">Go Back</Button>
        <Button onClick={() => reset()}>Try Again</Button>
      </div>
    </div>
  );
}
