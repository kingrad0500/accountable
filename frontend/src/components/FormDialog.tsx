import type { ReactNode } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useReturnFocus } from "./useReturnFocus";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: number;
};

/** A dialog that holds a form. Focus returns to whatever opened it. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 560,
}: Props) {
  const returnFocus = useReturnFocus(open);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(7_59_76/0.35)]" />
        <Dialog.Content
          className="panel fixed top-[8vh] left-1/2 z-50 max-h-[84vh] -translate-x-1/2 overflow-y-auto p-6 shadow-lift"
          style={{ width }}
          onCloseAutoFocus={returnFocus}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="muted mt-1 text-[13px]">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close className="icon-btn" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
