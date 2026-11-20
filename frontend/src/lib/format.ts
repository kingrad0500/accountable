// Money and date formatting. Money always shows its currency (USD).

const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "$12,500" */
export function usd(value: number): string {
  return usdFormat.format(Math.round(value));
}

/** "$59k", "$1.2M", "$2.17M", "$800" */
export function usdShort(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 999_500) return `${sign}$${trim((abs / 1_000_000).toFixed(2))}M`;
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function trim(n: string): string {
  return n.replace(/\.?0+$/, "");
}

/** Parse "2026-11-18" as a local date (no time-zone shift). */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "18 Nov 2026" */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? (value.length === 10 ? parseDate(value) : new Date(value)) : value;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "12 Nov" this year, "12 Feb 2027" otherwise. */
export function formatDateShort(value: string, now: Date = new Date()): string {
  const d = value.length === 10 ? parseDate(value) : new Date(value);
  return d.getFullYear() === now.getFullYear() ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : formatDate(d);
}

/** "Wednesday, 18 November 2026" */
export function formatLongDate(d: Date): string {
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${LONG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "18 Nov 2026, 14:30" in local time. */
export function formatDateTime(value: string): string {
  const d = new Date(value);
  return `${formatDate(d)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "Just now", "5 minutes ago", "2 hours ago", "Yesterday", "3 days ago", then "12 Nov". */
export function relativeTime(value: string, now: Date = new Date()): string {
  const d = new Date(value);
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDateShort(value, now);
}

/** "67%" */
export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function monthLabel(month: string): string {
  return MONTHS[Number(month.slice(5, 7)) - 1];
}

export function initials(name: string | null | undefined): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
