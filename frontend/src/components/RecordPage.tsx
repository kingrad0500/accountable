import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

type Fact = { label: string; value: ReactNode };

/** The header panel on a record page: name, key fields, Edit and Delete. */
export function RecordHeader({
  kind,
  back,
  title,
  badges,
  facts,
  onEdit,
  onDelete,
  children,
}: {
  kind: string;
  back: { to: string; label: string };
  title: string;
  badges?: ReactNode;
  facts: Fact[];
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} · Accountable`;
  }, [title]);
  return (
    <header className="panel mb-[18px] px-6 py-5">
      <Link to={back.to} className="inline-flex items-center gap-1.5 rounded text-[13px] font-medium text-ink-muted hover:text-ink">
        <ArrowLeft size={14} aria-hidden /> {back.label}
      </Link>
      <div className="mt-2 flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold tracking-wide text-ink-muted uppercase">{kind}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[26px] tracking-[-0.02em]">{title}</h1>
            {badges}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-quiet" onClick={onEdit}>
            <Pencil size={15} aria-hidden /> Edit
          </button>
          <button type="button" className="btn btn-quiet hover:!text-raspberry-ink" onClick={onDelete}>
            <Trash2 size={15} aria-hidden /> Delete
          </button>
        </div>
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        {facts.map((f) => (
          <div key={f.label}>
            <dt className="text-[12px] font-medium text-ink-muted">{f.label}</dt>
            <dd className="mt-0.5 font-medium">{f.value ?? <span className="muted font-normal">None</span>}</dd>
          </div>
        ))}
      </dl>
      {children}
    </header>
  );
}

/** A side panel listing linked records. */
export function LinkedPanel({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel p-5" aria-label={title}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[15px]">
          {title}
          {count !== undefined && <span className="mono ml-2 text-[12px] text-ink-muted">{count}</span>}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkedRow({ to, title, sub, right }: { to: string; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5 shadow-[0_-1px_0_var(--tint)] first:shadow-none">
      <div className="min-w-0 flex-1">
        <Link to={to} className="block truncate font-semibold hover:underline">
          {title}
        </Link>
        {sub && <p className="truncate text-[12.5px] text-ink-muted">{sub}</p>}
      </div>
      {right}
    </li>
  );
}

export function RecordMissing({ what, back }: { what: string; back: { to: string; label: string } }) {
  return (
    <div className="panel p-10 text-center">
      <h1 className="text-xl">This {what} doesn't exist</h1>
      <p className="muted mt-2">It may have been deleted.</p>
      <Link to={back.to} className="btn btn-quiet mt-5">
        <ArrowLeft size={15} aria-hidden /> {back.label}
      </Link>
    </div>
  );
}

export function Loading() {
  return <p className="muted p-6">Loading…</p>;
}
