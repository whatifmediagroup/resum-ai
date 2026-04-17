"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

export function Identity({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const id = formData.identity;
  const set = (patch: Partial<FormData["identity"]>) =>
    updateFormData({ identity: { ...id, ...patch } });

  const fieldError = (name: string) => (touched[name] ? errors[name] : undefined);

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Full name"
        value={id.fullName}
        error={fieldError("fullName")}
        onChange={(v) => {
          set({ fullName: v });
          markTouched("fullName");
        }}
        onBlur={() => markTouched("fullName")}
      />
      <Field
        label="Phone"
        value={id.phone}
        error={fieldError("phone")}
        onChange={(v) => {
          set({ phone: v });
          markTouched("phone");
        }}
        onBlur={() => markTouched("phone")}
      />
      <Field
        label="Email"
        type="email"
        value={id.email}
        error={fieldError("email")}
        onChange={(v) => {
          set({ email: v });
          markTouched("email");
        }}
        onBlur={() => markTouched("email")}
      />
      <Field
        label="Location"
        value={id.location}
        error={fieldError("location")}
        onChange={(v) => {
          set({ location: v });
          markTouched("location");
        }}
        onBlur={() => markTouched("location")}
      />
    </div>
  );
}

export function validateIdentity(data: FormData): StepErrors {
  const errs: StepErrors = {};
  if (!data.identity.fullName) errs.fullName = "Full name is required.";
  if (!data.identity.phone) errs.phone = "Phone is required.";
  if (!data.identity.email) errs.email = "Email is required.";
  else if (!/.+@.+\..+/.test(data.identity.email)) errs.email = "Enter a valid email address.";
  if (!data.identity.location) errs.location = "Location is required.";
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
}) {
  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        aria-invalid={hasError || undefined}
        className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
          hasError
            ? "border-red-500 dark:border-red-500"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      />
      {hasError ? <span className="text-xs text-red-600">{props.error}</span> : null}
    </label>
  );
}
