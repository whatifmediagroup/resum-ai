"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

export function isRecentJobEmpty(j: FormData["recentJob"]): boolean {
  return !j.company && !j.title && !j.start && !j.description && !j.end;
}

export function RecentJob({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const j = formData.recentJob;
  const set = (patch: Partial<FormData["recentJob"]>) =>
    updateFormData({ recentJob: { ...j, ...patch } });

  const fieldError = (name: string) => (touched[name] ? errors[name] : undefined);
  const mark = (name: string) => markTouched(name);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No relevant current role? Click Skip below to continue.
      </p>
      <Field
        label="Company"
        value={j.company}
        error={fieldError("company")}
        onChange={(v) => {
          set({ company: v });
          mark("company");
        }}
        onBlur={() => mark("company")}
      />
      <Field
        label="Title"
        value={j.title}
        error={fieldError("title")}
        onChange={(v) => {
          set({ title: v });
          mark("title");
        }}
        onBlur={() => mark("title")}
      />
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Start (YYYY-MM)"
          value={j.start}
          error={fieldError("start")}
          onChange={(v) => {
            set({ start: v });
            mark("start");
          }}
          onBlur={() => mark("start")}
        />
        <Field
          label="End (YYYY-MM)"
          value={j.end ?? ""}
          error={fieldError("end")}
          onChange={(v) => {
            set({ end: v || undefined });
            mark("end");
          }}
          onBlur={() => mark("end")}
          disabled={j.current}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={j.current}
          onChange={(e) =>
            set({ current: e.target.checked, end: e.target.checked ? undefined : j.end })
          }
        />
        Currently work here
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Description / bullets (one per line)</span>
        <textarea
          rows={5}
          value={j.description}
          onChange={(e) => {
            set({ description: e.target.value });
            mark("description");
          }}
          onBlur={() => mark("description")}
          aria-invalid={Boolean(fieldError("description")) || undefined}
          className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
            fieldError("description")
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {fieldError("description") ? (
          <span className="text-xs text-red-600">{fieldError("description")}</span>
        ) : null}
      </label>
    </div>
  );
}

export function validateRecentJob(data: FormData): StepErrors {
  const errs: StepErrors = {};
  const j = data.recentJob;
  if (isRecentJobEmpty(j)) return errs;
  if (!j.company) errs.company = "Company is required.";
  if (!j.title) errs.title = "Title is required.";
  if (!j.start) errs.start = "Start date is required.";
  if (!j.description) errs.description = "Add a description or bullets.";
  if (!j.current && !j.end) errs.end = "End date is required (or mark as current).";
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
}) {
  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        disabled={props.disabled}
        aria-invalid={hasError || undefined}
        className={`rounded border px-3 py-2 disabled:opacity-50 dark:bg-zinc-900 ${
          hasError
            ? "border-red-500 dark:border-red-500"
            : "border-zinc-300 dark:border-zinc-700"
        }`}
      />
      {hasError ? <span className="text-xs text-red-600">{props.error}</span> : null}
    </label>
  );
}
