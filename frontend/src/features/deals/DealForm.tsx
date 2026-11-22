import { useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Contact, Deal, Organization } from "../../api/types";
import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { changedOnly, showServerErrors } from "../../lib/forms";
import { STAGES, defaultProbability, type StageKey } from "../../lib/stages";
import { useContacts } from "../contacts/api";
import { useOrganizations } from "../organizations/api";
import { useSaveDeal } from "./api";
import { dealSchema, type DealInput, type DealValues } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The deal to edit; leave out to add one. */
  deal?: Deal | null;
  /** Starting values for a new deal, such as from the pipeline's in-column form. */
  initial?: Partial<DealInput>;
  onSaved?: (deal: Deal) => void;
};

export function DealFormDialog({ open, onOpenChange, deal, initial, onSaved }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={deal ? `Edit ${deal.name}` : "Add deal"}
    >
      {open && (
        <DealForm
          deal={deal}
          initial={initial}
          onCancel={() => onOpenChange(false)}
          onSaved={(saved) => {
            onOpenChange(false);
            onSaved?.(saved);
          }}
        />
      )}
    </FormDialog>
  );
}

const FIELDS = [
  "name",
  "organization_id",
  "main_contact_id",
  "stage",
  "value",
  "probability",
  "close_date",
];

function fromDeal(deal: Deal): DealInput {
  return {
    name: deal.name,
    organization_id: deal.organization_id ? String(deal.organization_id) : "",
    main_contact_id: deal.main_contact_id ? String(deal.main_contact_id) : "",
    stage: deal.stage,
    value: String(deal.value),
    probability: String(deal.probability),
    close_date: deal.close_date ?? "",
  };
}

type FormProps = {
  deal?: Deal | null;
  initial?: Partial<DealInput>;
  onCancel: () => void;
  onSaved: (deal: Deal) => void;
};

function DealForm(props: FormProps) {
  // Selects need their options before they can show the deal's values.
  const organizations = useOrganizations();
  const contacts = useContacts();
  if (!organizations.data || !contacts.data) return <p className="muted py-6">Loading…</p>;
  return <DealFields {...props} organizations={organizations.data} contacts={contacts.data} />;
}

function DealFields({
  deal,
  initial,
  onCancel,
  onSaved,
  organizations,
  contacts,
}: FormProps & { organizations: Organization[]; contacts: Contact[] }) {
  const save = useSaveDeal();
  const probabilityTyped = useRef(false);

  const defaults: DealInput = deal
    ? fromDeal(deal)
    : {
        name: "",
        organization_id: "",
        main_contact_id: "",
        stage: "new",
        value: "",
        close_date: "",
        ...initial,
        probability: String(defaultProbability((initial?.stage ?? "new") as StageKey)),
      };

  const {
    register,
    handleSubmit,
    setValue,
    control,
    setError,
    setFocus,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<DealInput, unknown, DealValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: defaults,
  });
  // The dialog opens with the name field focused.
  useEffect(() => setFocus("name"), [setFocus]);

  const [orgId, contactId] = useWatch({ control, name: ["organization_id", "main_contact_id"] });
  // The main contact list shows contacts at the chosen organization (DL7).
  const contactOptions = useMemo(
    () =>
      contacts.filter(
        (c) => (orgId && String(c.organization_id) === orgId) || String(c.id) === contactId,
      ),
    [contacts, orgId, contactId],
  );

  const stage = register("stage");
  const probability = register("probability");
  // A new stage brings its usual probability, unless the user typed one (DL5, DL6).
  const onStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    stage.onChange(e);
    if (!probabilityTyped.current) {
      setValue("probability", String(defaultProbability(e.target.value as StageKey)), {
        shouldDirty: true,
      });
    }
  };

  const onSubmit = async (values: DealValues) => {
    const payload = deal ? changedOnly(values, dirtyFields) : values;
    try {
      const saved =
        deal && Object.keys(payload).length === 0
          ? deal
          : await save.mutateAsync({ id: deal?.id, values: payload });
      toast.success(deal ? "Deal saved" : "Deal added");
      onSaved(saved);
    } catch (error) {
      showServerErrors(error, setError, FIELDS);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Field id="deal-name" label="Deal name" error={errors.name?.message} className="col-span-2">
        <input className="input" autoComplete="off" {...register("name")} />
      </Field>
      <Field id="deal-organization" label="Organization" error={errors.organization_id?.message}>
        <select
          className="input"
          {...register("organization_id", {
            onChange: (e) => {
              const still = contacts.some(
                (c) => String(c.id) === contactId && String(c.organization_id) === e.target.value,
              );
              if (!still) setValue("main_contact_id", "", { shouldDirty: true });
            },
          })}
        >
          <option value="">Choose an organization</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="deal-contact"
        label="Main contact (optional)"
        error={errors.main_contact_id?.message}
      >
        <select className="input" {...register("main_contact_id")} disabled={!orgId && !contactId}>
          <option value="">{orgId ? "No main contact" : "Choose an organization first"}</option>
          {contactOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="deal-stage" label="Stage" error={errors.stage?.message}>
        <select className="input" {...stage} onChange={onStageChange}>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="deal-value" label="Value (USD)" error={errors.value?.message}>
        <input
          className="input mono"
          inputMode="numeric"
          autoComplete="off"
          placeholder="25000"
          {...register("value")}
        />
      </Field>
      <Field
        id="deal-probability"
        label="Probability of close (%)"
        error={errors.probability?.message}
      >
        <input
          className="input mono"
          inputMode="numeric"
          autoComplete="off"
          {...probability}
          onChange={(e) => {
            probabilityTyped.current = true;
            return probability.onChange(e);
          }}
        />
      </Field>
      <Field id="deal-close" label="Close date" error={errors.close_date?.message}>
        <input type="date" className="input mono" {...register("close_date")} />
      </Field>
      <div className="col-span-2 mt-3 flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {deal ? "Save deal" : "Add deal"}
        </button>
      </div>
    </form>
  );
}
