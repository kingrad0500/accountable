import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ActivityEntry, ActivityType } from "../../api/types";
import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { changedOnly, showServerErrors } from "../../lib/forms";
import { useSaveActivity } from "./api";
import { activitySchema, toLocalInput, type ActivityInput, type ActivityValues } from "./schema";
import { TypeIcon } from "./TypeIcon";

const TYPES: { key: ActivityType; label: string }[] = [
  { key: "note", label: "Note" },
  { key: "call", label: "Call" },
  { key: "email", label: "Email" },
];

const FIELDS = ["type", "description", "occurred_at", "follow_up_date"];

type Props = {
  /** Where a new activity goes: a contact or a deal (V4). */
  parent?: { contact_id: number } | { deal_id: number };
  /** The activity to edit. */
  activity?: ActivityEntry;
  idPrefix: string;
  onDone?: () => void;
  onCancel?: () => void;
};

/** Log or edit an activity: type (Note by default), description, when, optional follow-up (A1). */
export function ActivityForm({ parent, activity, idPrefix, onDone, onCancel }: Props) {
  const save = useSaveActivity();
  const defaults: ActivityInput = activity
    ? {
        type: activity.type,
        description: activity.description,
        occurred_at: toLocalInput(new Date(activity.occurred_at)),
        follow_up_date: activity.follow_up_date ?? "",
      }
    : { type: "note", description: "", occurred_at: toLocalInput(new Date()), follow_up_date: "" };

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<ActivityInput, unknown, ActivityValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: defaults,
  });
  const type = useWatch({ control, name: "type" });

  const onSubmit = async (values: ActivityValues) => {
    const payload = activity ? changedOnly(values, dirtyFields) : values;
    try {
      if (!activity || Object.keys(payload).length)
        await save.mutateAsync({ id: activity?.id, values: payload, parent });
      toast.success(activity ? "Activity saved" : "Activity logged");
      if (!activity)
        reset({
          type: "note",
          description: "",
          occurred_at: toLocalInput(new Date()),
          follow_up_date: "",
        });
      onDone?.();
    } catch (error) {
      showServerErrors(error, setError, FIELDS);
    }
  };

  const id = (f: string) => `${idPrefix}-${f}`;
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
      <fieldset className="flex gap-1.5">
        <legend className="sr-only">Type</legend>
        {TYPES.map((t) => (
          <label
            key={t.key}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cerulean ${
              type === t.key ? "bg-ink text-white" : "bg-bg text-ink-muted hover:text-ink"
            }`}
          >
            <input type="radio" value={t.key} className="sr-only" {...register("type")} />
            <TypeIcon type={t.key} size={13} bare />
            {t.label}
          </label>
        ))}
      </fieldset>
      <Field id={id("description")} label="What happened" error={errors.description?.message}>
        <textarea
          className="input"
          rows={2}
          placeholder="Called about the renewal…"
          {...register("description")}
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Field id={id("when")} label="When" error={errors.occurred_at?.message}>
          <input
            type="datetime-local"
            className="input mono w-[210px]"
            {...register("occurred_at")}
          />
        </Field>
        <Field
          id={id("follow-up")}
          label="Follow-up date (optional)"
          error={errors.follow_up_date?.message}
        >
          <input type="date" className="input mono w-[170px]" {...register("follow_up_date")} />
        </Field>
        <div className="ml-auto flex gap-2">
          {onCancel && (
            <button type="button" className="btn btn-quiet" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {activity ? "Save activity" : "Log activity"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ActivityFormDialog({
  activity,
  onClose,
}: {
  activity: ActivityEntry | null;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open={!!activity}
      onOpenChange={(o) => !o && onClose()}
      title="Edit activity"
      width={600}
    >
      {activity && (
        <ActivityForm
          activity={activity}
          idPrefix="edit-activity"
          onDone={onClose}
          onCancel={onClose}
        />
      )}
    </FormDialog>
  );
}
