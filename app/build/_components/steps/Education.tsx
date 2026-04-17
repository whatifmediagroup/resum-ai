"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";
import { MonthPicker } from "../MonthPicker";

type Edu = FormData["education"][number];

const emptyEdu: Edu = { institution: "", credential: "", start: "", end: "" };

export function Education({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const edu = formData.education;

  const replace = (idx: number, patch: Partial<Edu>) => {
    const next = edu.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    updateFormData({ education: next });
  };
  const add = () => updateFormData({ education: [...edu, emptyEdu] });
  const remove = (idx: number) =>
    updateFormData({ education: edu.filter((_, i) => i !== idx) });

  const fieldKey = (idx: number, name: string) => `education.${idx}.${name}`;
  const fieldError = (idx: number, name: string) =>
    touched[fieldKey(idx, name)] ? errors[fieldKey(idx, name)] : undefined;

  if (edu.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No formal education to list? Click Skip below, or add an entry here.
        </p>
        <button
          type="button"
          onClick={add}
          className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Add education
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {edu.map((e, idx) => (
        <div key={idx} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Education {idx + 1}</h3>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institution"
              value={e.institution}
              error={fieldError(idx, "institution")}
              onChange={(v) => {
                replace(idx, { institution: v });
                markTouched(fieldKey(idx, "institution"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "institution"))}
            />
            <Input
              label="Credential"
              value={e.credential}
              error={fieldError(idx, "credential")}
              onChange={(v) => {
                replace(idx, { credential: v });
                markTouched(fieldKey(idx, "credential"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "credential"))}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span>Start</span>
              <MonthPicker value={e.start ?? ""} onChange={(v) => replace(idx, { start: v || undefined })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>End</span>
              <MonthPicker value={e.end ?? ""} onChange={(v) => replace(idx, { end: v || undefined })} />
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
      >
        Add another
      </button>
    </div>
  );
}

export function validateEducation(data: FormData): StepErrors {
  const errs: StepErrors = {};
  data.education.forEach((e, i) => {
    if (!e.institution) errs[`education.${i}.institution`] = "Institution is required.";
    if (!e.credential) errs[`education.${i}.credential`] = "Credential is required.";
  });
  return errs;
}

function Input(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
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
