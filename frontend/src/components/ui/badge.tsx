import * as React from "react";

import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: "bg-slate-100 text-slate-700 ring-slate-200",
  contacted: "bg-blue-50 text-blue-700 ring-blue-200",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  proposal: "bg-amber-50 text-amber-800 ring-amber-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset",
        STATUS_STYLES[status] ?? STATUS_STYLES.new,
        className,
      )}
    >
      {status}
    </span>
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ring-slate-200 bg-slate-50 text-slate-600",
        className,
      )}
      {...props}
    />
  );
}
