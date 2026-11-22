import { useEffect, type ReactNode } from "react";
import { ChevronDown, ListFilter } from "lucide-react";

/** The page's heading, which also sets the browser tab's title. */
export function PageTitle({ title, hidden = false, children }: { title: string; hidden?: boolean; children?: ReactNode }) {
  useEffect(() => {
    document.title = `${title} · Accountable`;
  }, [title]);
  if (hidden) return <h1 className="sr-only">{title}</h1>;
  return (
    <div className="mx-1 mb-4 flex items-baseline justify-between gap-4">
      <h1 className="text-[26px] tracking-[-0.02em]">{title}</h1>
      {children}
    </div>
  );
}

/** A labelled select used as a table filter. */
export function FilterSelect<V extends string>({
  label,
  value,
  onChange,
  options,
  onPage = false,
}: {
  /** On the page background rather than inside a panel. */
  onPage?: boolean;
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; count?: number }[];
}) {
  return (
    <label className={`flex h-9 items-center gap-2 rounded-[10px] pr-1 pl-3 ${onPage ? "bg-panel shadow-soft" : "bg-bg"} text-[13px] font-medium text-ink-muted focus-within:outline-2 focus-within:outline-cerulean`}>
      {onPage && <ListFilter size={15} aria-hidden />}
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className="h-full cursor-pointer appearance-none bg-transparent pr-6 font-semibold text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count !== undefined ? ` (${o.count})` : ""}
          </option>
        ))}
      </select>
      <ChevronDown size={15} aria-hidden className="pointer-events-none -ml-6 mr-1.5 text-ink" />
    </label>
  );
}
