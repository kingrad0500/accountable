import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { Contact } from "../../api/types";
import { Field } from "../../components/Field";
import { FormDialog } from "../../components/FormDialog";
import { changedOnly, showServerErrors } from "../../lib/forms";
import { STATUSES } from "../../lib/stages";
import { useOrganizations } from "../organizations/api";
import { useSaveContact } from "./api";
import { contactSchema, type ContactInput, type ContactValues } from "./schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  /** Starting values for a new contact, such as its organization. */
  initial?: Partial<ContactInput>;
  onSaved?: (contact: Contact) => void;
};

const FIELDS = ["name", "email", "phone", "job_title", "organization_id", "status"];

export function ContactFormDialog({ open, onOpenChange, contact, initial, onSaved }: Props) {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={contact ? `Edit ${contact.name}` : "Add contact"}>
      {open && (
        <ContactForm
          contact={contact}
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

function ContactForm(props: {
  contact?: Contact | null;
  initial?: Partial<ContactInput>;
  onCancel: () => void;
  onSaved: (c: Contact) => void;
}) {
  const organizations = useOrganizations();
  if (!organizations.data) return <p className="muted py-6">Loading…</p>;
  return <ContactFields {...props} />;
}

function ContactFields({
  contact,
  initial,
  onCancel,
  onSaved,
}: {
  contact?: Contact | null;
  initial?: Partial<ContactInput>;
  onCancel: () => void;
  onSaved: (c: Contact) => void;
}) {
  const organizations = useOrganizations();
  const save = useSaveContact();
  const defaults: ContactInput = contact
    ? {
        name: contact.name,
        email: contact.email ?? "",
        phone: contact.phone ?? "",
        job_title: contact.job_title ?? "",
        organization_id: contact.organization_id ? String(contact.organization_id) : "",
        status: contact.status,
      }
    : { name: "", email: "", phone: "", job_title: "", organization_id: "", status: "lead", ...initial };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<ContactInput, unknown, ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: defaults });

  const onSubmit = async (values: ContactValues) => {
    const payload = contact ? changedOnly(values, dirtyFields) : values;
    try {
      const saved =
        contact && Object.keys(payload).length === 0 ? contact : await save.mutateAsync({ id: contact?.id, values: payload });
      toast.success(contact ? "Contact saved" : "Contact added");
      onSaved(saved);
    } catch (error) {
      showServerErrors(error, setError, FIELDS);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-2 gap-x-4 gap-y-3">
      <Field id="contact-name" label="Name" error={errors.name?.message} className="col-span-2">
        <input className="input" autoComplete="off" autoFocus {...register("name")} />
      </Field>
      <Field id="contact-email" label="Email" error={errors.email?.message}>
        <input type="email" className="input" autoComplete="off" {...register("email")} />
      </Field>
      <Field id="contact-phone" label="Phone" error={errors.phone?.message}>
        <input type="tel" className="input" autoComplete="off" {...register("phone")} />
      </Field>
      <Field id="contact-title" label="Job title" error={errors.job_title?.message}>
        <input className="input" autoComplete="off" {...register("job_title")} />
      </Field>
      <Field id="contact-organization" label="Organization" error={errors.organization_id?.message}>
        <select className="input" {...register("organization_id")}>
          <option value="">No organization</option>
          {(organizations.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="contact-status" label="Status" error={errors.status?.message}>
        <select className="input" {...register("status")}>
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="col-span-2 mt-3 flex justify-end gap-2">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {contact ? "Save contact" : "Add contact"}
        </button>
      </div>
    </form>
  );
}
