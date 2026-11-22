import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Field } from "../../components/Field";
import { showServerErrors } from "../../lib/forms";
import { defaultProbability, stageLabel, type StageKey } from "../../lib/stages";
import { useSaveDeal } from "../deals/api";
import { DealFormDialog } from "../deals/DealForm";
import { dealSchema, type DealInput } from "../deals/schema";
import { useOrganizations } from "../organizations/api";

const quickSchema = dealSchema.pick({
  name: true,
  organization_id: true,
  value: true,
  close_date: true,
});
type QuickInput = Pick<DealInput, "name" | "organization_id" | "value" | "close_date">;
type QuickValues = {
  name: string;
  organization_id: number;
  value: number;
  close_date: string | null;
};

/** "Add deal" inside a column: a short form, with "More details" for the full one (P4). */
export function AddDealInColumn({ stage }: { stage: StageKey }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Partial<DealInput> | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const label = stageLabel(stage);

  // Closing the quick form puts focus back on the button, once the button is back on screen.
  const focusButton = useRef(false);
  const close = () => {
    focusButton.current = true;
    setOpen(false);
  };
  useEffect(() => {
    if (open || !focusButton.current) return;
    focusButton.current = false;
    button.current?.focus();
  }, [open]);

  return (
    <>
      {open ? (
        <QuickForm
          stage={stage}
          onCancel={close}
          onDone={close}
          onMoreDetails={(values) => {
            setOpen(false);
            setDetails({ ...values, stage });
          }}
        />
      ) : (
        <button
          ref={button}
          type="button"
          className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-2 text-[13px] font-medium text-ink-muted hover:bg-panel hover:text-ink"
          aria-label={`Add deal to ${label}`}
          onClick={() => setOpen(true)}
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden /> Add deal
        </button>
      )}
      <DealFormDialog
        open={details !== null}
        // It's opened from "More details", never by the dialog itself, so a change means it closed.
        onOpenChange={() => {
          setDetails(null);
          requestAnimationFrame(() => button.current?.focus());
        }}
        initial={details ?? undefined}
      />
    </>
  );
}

function QuickForm({
  stage,
  onCancel,
  onDone,
  onMoreDetails,
}: {
  stage: StageKey;
  onCancel: () => void;
  onDone: () => void;
  onMoreDetails: (values: QuickInput) => void;
}) {
  const organizations = useOrganizations();
  const save = useSaveDeal();
  const label = stageLabel(stage);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<QuickInput, unknown, QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: { name: "", organization_id: "", value: "", close_date: "" },
  });
  useEffect(() => setFocus("name"), [setFocus]);

  const onSubmit = async (values: QuickValues) => {
    try {
      await save.mutateAsync({
        values: { ...values, stage, probability: defaultProbability(stage), main_contact_id: null },
      });
      toast.success(`Deal added to ${label}`);
      onDone();
    } catch (error) {
      showServerErrors(error, setError, ["name", "organization_id", "value", "close_date"]);
    }
  };

  const id = (f: string) => `quick-${stage}-${f}`;
  return (
    // Escape from any field cancels; the wrapper only catches the key as it bubbles up.
    <div role="presentation" onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <form
        role="group"
        aria-label={`New deal in ${label}`}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-2 rounded-xl bg-panel p-3 shadow-lift [&_.field>label]:text-[11.5px] [&_.input]:h-8 [&_.input]:px-2.5 [&_.input]:text-[13px]"
      >
        <Field id={id("name")} label="Deal name" error={errors.name?.message}>
          <input className="input" autoComplete="off" {...register("name")} />
        </Field>
        <Field id={id("org")} label="Organization" error={errors.organization_id?.message}>
          <select className="input" {...register("organization_id")}>
            <option value="">Choose</option>
            {(organizations.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field id={id("value")} label="Value (USD)" error={errors.value?.message}>
            <input
              className="input mono"
              inputMode="numeric"
              autoComplete="off"
              {...register("value")}
            />
          </Field>
          <Field id={id("close")} label="Close date" error={errors.close_date?.message}>
            <input
              type="date"
              className="input mono !px-1.5 !text-[12px]"
              {...register("close_date")}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            className="mr-auto text-[12px] font-semibold text-cerulean-ink hover:underline"
            onClick={() => onMoreDetails(getValues())}
          >
            More details
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
            Add to {label}
          </button>
        </div>
      </form>
    </div>
  );
}
