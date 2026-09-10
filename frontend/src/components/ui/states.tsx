import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-slate-200", className)} />
  );
}

export function LoadingLine({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </p>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ErrorState({
  title,
  detail,
  onRetry,
  retryLabel = "Try again",
}: {
  title: string;
  detail?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-rose-900">{title}</p>
          {detail ? (
            <p className="mt-1 text-sm text-rose-700">{detail}</p>
          ) : null}
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-rose-300 bg-white hover:bg-rose-100"
              onClick={onRetry}
            >
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
