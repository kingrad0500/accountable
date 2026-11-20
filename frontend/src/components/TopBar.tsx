import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import { Building2, Columns3, Handshake, LayoutGrid, Plus, Users } from "lucide-react";
import { ContactFormDialog } from "../features/contacts/ContactForm";
import { DealFormDialog } from "../features/deals/DealForm";
import { QuickSearch } from "./QuickSearch";
import { OrganizationFormDialog } from "../features/organizations/OrganizationForm";

const TABS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/deals", label: "Deals", icon: Handshake },
  { to: "/contacts", label: "Contacts", icon: Users },
  { to: "/organizations", label: "Organizations", icon: Building2 },
];

type Action = "deal" | "contact" | "organization";

function actionFor(path: string): Action {
  if (path.startsWith("/contacts")) return "contact";
  if (path.startsWith("/organizations")) return "organization";
  return "deal";
}

const ACTION_LABELS: Record<Action, string> = { deal: "Add deal", contact: "Add contact", organization: "Add organization" };

/** The floating top bar: wordmark, tabs, quick search and the page's main action. */
export function TopBar() {
  const location = useLocation();
  const action = actionFor(location.pathname);
  const [open, setOpen] = useState<Action | null>(null);

  return (
    <header className="panel mb-5 flex items-center gap-6 py-2.5 pr-3 pl-4">
      <NavLink to="/" className="flex items-center gap-2.5 rounded-lg text-[17px] font-bold tracking-[-0.01em]">
        <span
          aria-hidden
          className="grid size-[30px] place-items-center rounded-[9px] bg-ink font-serif text-[21px] font-normal text-sea-green"
        >
          A
        </span>
        Accountable
      </NavLink>
      <nav aria-label="Main" className="flex gap-0.5 rounded-xl bg-bg p-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-[34px] items-center gap-2 rounded-[9px] px-3.5 font-medium transition-colors ${
                isActive ? "bg-panel font-semibold text-ink shadow-soft" : "text-ink-muted hover:text-ink"
              }`
            }
          >
            <Icon size={16} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <QuickSearch />
        <button type="button" className="btn btn-primary" onClick={() => setOpen(action)}>
          <Plus size={16} strokeWidth={2.5} aria-hidden />
          {ACTION_LABELS[action]}
        </button>
      </div>
      <DealFormDialog open={open === "deal"} onOpenChange={(o) => setOpen(o ? "deal" : null)} />
      <ContactFormDialog open={open === "contact"} onOpenChange={(o) => setOpen(o ? "contact" : null)} />
      <OrganizationFormDialog open={open === "organization"} onOpenChange={(o) => setOpen(o ? "organization" : null)} />
    </header>
  );
}
