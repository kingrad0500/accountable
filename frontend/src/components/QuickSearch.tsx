import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Briefcase, Building, Search, User } from "lucide-react";
import { useContacts } from "../features/contacts/api";
import { useDeals } from "../features/deals/api";
import { useOrganizations } from "../features/organizations/api";
import { quickSearch, type SearchItem, type SearchKind } from "./searchMatches";

const ICONS = { deal: Briefcase, contact: User, organization: Building };
const PATHS: Record<SearchKind, string> = {
  deal: "/deals",
  contact: "/contacts",
  organization: "/organizations",
};

/** The top bar's search: finds deals, contacts and organizations by name; "/" focuses it (G10). */
export function QuickSearch() {
  // The lists load once the box is first used, so other pages don't pay for them.
  const [used, setUsed] = useState(false);
  const deals = useDeals(used);
  const contacts = useContacts(used);
  const organizations = useOrganizations(used);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const items = useMemo<SearchItem[]>(
    () => [
      ...(deals.data ?? []).map((d) => ({
        kind: "deal" as const,
        id: d.id,
        name: d.name,
        detail: d.organization_name,
      })),
      ...(contacts.data ?? []).map((c) => ({
        kind: "contact" as const,
        id: c.id,
        name: c.name,
        detail: c.organization_name,
      })),
      ...(organizations.data ?? []).map((o) => ({
        kind: "organization" as const,
        id: o.id,
        name: o.name,
        detail: o.industry,
      })),
    ],
    [deals.data, contacts.data, organizations.data],
  );
  const groups = useMemo(() => quickSearch(query, items), [query, items]);
  const flat = groups.flatMap((g) => g.items);

  // "/" focuses the box, unless you're typing somewhere else.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (item: SearchItem) => {
    navigate(`${PATHS[item.kind]}/${item.id}`);
    setQuery("");
    setOpen(false);
    input.current?.blur();
  };

  const showList = open && query.trim().length > 0;
  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <div className="relative">
      <label className="flex h-9 w-[300px] items-center gap-2 rounded-[10px] bg-page px-3 text-fg-muted focus-within:outline-2 focus-within:outline-cerulean">
        <Search size={16} aria-hidden />
        <input
          ref={input}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && flat.length ? optionId(active) : undefined}
          aria-label="Search deals, contacts and organizations"
          placeholder="Search deals, contacts, organizations"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => {
            setUsed(true);
            setOpen(true);
          }}
          // Options keep focus in the box on mousedown, so a blur means focus really left.
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (flat.length ? (a + 1) % flat.length : 0));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (flat.length ? (a - 1 + flat.length) % flat.length : 0));
            } else if (e.key === "Enter" && flat[active]) {
              e.preventDefault();
              go(flat[active]);
            } else if (e.key === "Escape") {
              setQuery("");
              setOpen(false);
            }
          }}
          className="w-full bg-transparent text-[13.5px] text-fg outline-none placeholder:text-fg-muted"
        />
        <kbd className="mono rounded-md bg-surface px-1.5 text-[11px] text-fg-muted" aria-hidden>
          /
        </kbd>
      </label>
      {showList && (
        <div className="panel absolute bg-raised top-11 right-0 z-30 w-[380px] p-1.5 shadow-lift">
          <ul id={listId} role="listbox" aria-label="Search results">
            {flat.length === 0 && (
              <li role="presentation" className="px-3 py-3 text-[13px] text-fg-muted">
                Nothing matches "{query.trim()}"
              </li>
            )}
            {groups.map((g) => (
              <li key={g.kind} role="presentation">
                <p
                  className="px-3 pt-2 pb-1 text-[11.5px] font-semibold tracking-wide text-fg-muted uppercase"
                  aria-hidden
                >
                  {g.label}
                </p>
                <ul role="group" aria-label={g.label}>
                  {g.items.map((item) => {
                    const i = flat.indexOf(item);
                    const Icon = ICONS[item.kind];
                    // The box keeps focus and handles the keys; options are only clicked,
                    // so they stay out of the tab order.
                    return (
                      <li key={`${item.kind}${item.id}`} role="presentation">
                        <button
                          type="button"
                          tabIndex={-1}
                          id={optionId(i)}
                          role="option"
                          aria-selected={i === active}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => go(item)}
                          onMouseEnter={() => setActive(i)}
                          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left ${i === active ? "bg-tint" : ""}`}
                        >
                          <Icon size={15} className="flex-none text-fg-muted" aria-hidden />
                          <span className="truncate font-medium">{item.name}</span>
                          {item.detail && (
                            <span className="ml-auto truncate text-[12px] text-fg-muted">
                              {item.detail}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
