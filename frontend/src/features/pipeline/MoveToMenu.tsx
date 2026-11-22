import { DropdownMenu } from "radix-ui";
import { ArrowRightLeft } from "lucide-react";
import type { Deal } from "../../api/types";
import { STAGES } from "../../lib/stages";

/** The simpler keyboard path for a move: pick the new stage from a menu (P6). */
export function MoveToMenu({ deal, onMove }: { deal: Deal; onMove: (deal: Deal, stage: Deal["stage"]) => void }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        // Shown on hover and keyboard focus, as in the design; always in the Tab order.
        className="icon-btn !size-6 opacity-0 transition-opacity group-focus-within/card:opacity-100 group-hover/card:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
        aria-label={`Move ${deal.name} to`}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ArrowRightLeft size={13} aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="panel z-50 min-w-[170px] p-1.5 shadow-lift"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenu.Label className="px-2 py-1 text-[12px] font-semibold text-ink-muted">Move to</DropdownMenu.Label>
          {STAGES.filter((s) => s.key !== deal.stage).map((s) => (
            <DropdownMenu.Item
              key={s.key}
              onSelect={() => onMove(deal, s.key)}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] font-medium outline-none data-[highlighted]:bg-tint"
            >
              <span className="size-2.5 rounded-full" style={{ background: s.dot }} aria-hidden />
              {s.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
