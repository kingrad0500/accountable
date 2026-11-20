import { cloneElement, type ReactElement } from "react";

type Props = {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
};

/** A labelled form control with its error underneath (V5). */
export function Field({ id, label, error, className = "", children }: Props) {
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}
