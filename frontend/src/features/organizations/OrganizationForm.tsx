import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Organization } from "../../api/types";
import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { changedOnly, showServerErrors } from "../../lib/forms";
import { useSaveOrganization } from "./api";
import { organizationSchema, type OrganizationInput, type OrganizationValues } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
  onSaved?: (organization: Organization) => void;
};

export const INDUSTRIES = ["Software", "Healthcare", "Logistics", "Retail", "Finance", "Manufacturing", "Education", "Media"];

export function OrganizationFormDialog({ open, onOpenChange, organization, onSaved }: Props) {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={organization ? `Edit ${organization.name}` : "Add organization"}>
      {open && (
        <OrganizationForm
          organization={organization}
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

function OrganizationForm({
  organization,
  onCancel,
  onSaved,
}: {
  organization?: Organization | null;
  onCancel: () => void;
  onSaved: (o: Organization) => void;
}) {
  const save = useSaveOrganization();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<OrganizationInput, unknown, OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name ?? "",
      website: organization?.website ?? "",
      industry: organization?.industry ?? "",
      notes: organization?.notes ?? "",
    },
  });

  const onSubmit = async (values: OrganizationValues) => {
    const payload = organization ? changedOnly(values, dirtyFields) : values;
    try {
      const saved =
        organization && Object.keys(payload).length === 0
          ? organization
          : await save.mutateAsync({ id: organization?.id, values: payload });
      toast.success(organization ? "Organization saved" : "Organization added");
      onSaved(saved);
    } catch (error) {
      showServerErrors(error, setError, ["name", "website", "industry", "notes"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Field id="org-name" label="Name" error={errors.name?.message} className="col-span-2">
        <input className="input" autoComplete="off" autoFocus {...register("name")} />
      </Field>
      <Field id="org-website" label="Website" error={errors.website?.message}>
        <input className="input" autoComplete="off" placeholder="acme.com" {...register("website")} />
      </Field>
      <Field id="org-industry" label="Industry" error={errors.industry?.message}>
        <input className="input" autoComplete="off" list="industries" {...register("industry")} />
      </Field>
      <datalist id="industries">
        {INDUSTRIES.map((i) => (
          <option key={i} value={i} />
        ))}
      </datalist>
      <Field id="org-notes" label="Notes" error={errors.notes?.message} className="col-span-2">
        <textarea className="input" rows={3} {...register("notes")} />
      </Field>
      <div className="col-span-2 mt-3 flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {organization ? "Save organization" : "Add organization"}
        </button>
      </div>
    </form>
  );
}
