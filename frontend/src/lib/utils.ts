import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_FALLBACK = "USD";

export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined,
) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || CURRENCY_FALLBACK,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Dates from the API are plain YYYY-MM-DD; parse as local to avoid TZ drift. */
function parseDateOnly(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** "Tomorrow", "Sep 15", "3 days overdue" — the phrasing a rep scans for. */
export function formatDueDate(value: string | null | undefined) {
  if (!value) return "No due date";

  const due = parseDateOnly(value);
  const days = Math.round(
    (due.getTime() - startOfToday().getTime()) / 86_400_000,
  );

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days <= 6) {
    return due.toLocaleDateString("en-US", { weekday: "long" });
  }
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isOverdue(value: string | null | undefined) {
  if (!value) return false;
  return parseDateOnly(value).getTime() < startOfToday().getTime();
}

export function formatTimestamp(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatFullTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
