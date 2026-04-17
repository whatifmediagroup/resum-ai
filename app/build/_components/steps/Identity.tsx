"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Identity() {
  const { formData, updateFormData } = useResume();
  const id = formData.identity;
  const set = (patch: Partial<FormData["identity"]>) =>
    updateFormData({ identity: { ...id, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Full name" value={id.fullName} onChange={(v) => set({ fullName: v })} />
      <Field label="Phone" value={id.phone} onChange={(v) => set({ phone: v })} />
      <Field label="Email" type="email" value={id.email} onChange={(v) => set({ email: v })} />
      <Field label="Location" value={id.location} onChange={(v) => set({ location: v })} />
    </div>
  );
}

export function validateIdentity(data: FormData): string[] {
  const errs: string[] = [];
  if (!data.identity.fullName) errs.push("fullName");
  if (!data.identity.phone) errs.push("phone");
  if (!/.+@.+\..+/.test(data.identity.email)) errs.push("email");
  if (!data.identity.location) errs.push("location");
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
