"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

type Job = FormData["priorJobs"][number];

const emptyJob: Job = { company: "", title: "", start: "", current: false, description: "" };

export function PriorJobs({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const jobs = formData.priorJobs;

  const replace = (idx: number, patch: Partial<Job>) => {
    const next = jobs.map((j, i) => (i === idx ? { ...j, ...patch } : j));
    updateFormData({ priorJobs: next });
  };
  const add = () => updateFormData({ priorJobs: [...jobs, emptyJob] });
  const remove = (idx: number) =>
    updateFormData({ priorJobs: jobs.filter((_, i) => i !== idx) });

  const fieldKey = (idx: number, name: string) => `priorJobs.${idx}.${name}`;
  const fieldError = (idx: number, name: string) =>
    touched[fieldKey(idx, name)] ? errors[fieldKey(idx, name)] : undefined;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No earlier jobs? Click Skip below, or add one here.
        </p>
        <button
          type="button"
          onClick={add}
          className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Add earlier job
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {jobs.map((j, idx) => (
        <div key={idx} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Job {idx + 1}</h3>
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
              label="Company"
              value={j.company}
              error={fieldError(idx, "company")}
              onChange={(v) => {
                replace(idx, { company: v });
                markTouched(fieldKey(idx, "company"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "company"))}
            />
            <Input
              label="Title"
              value={j.title}
              error={fieldError(idx, "title")}
              onChange={(v) => {
                replace(idx, { title: v });
                markTouched(fieldKey(idx, "title"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "title"))}
            />
            <Input
              label="Start"
              value={j.start}
              error={fieldError(idx, "start")}
              onChange={(v) => {
                replace(idx, { start: v });
                markTouched(fieldKey(idx, "start"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "start"))}
            />
            <Input
              label="End"
              value={j.end ?? ""}
              onChange={(v) => replace(idx, { end: v || undefined })}
            />
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span>Description</span>
            <textarea
              rows={3}
              value={j.description}
              onChange={(e) => {
                replace(idx, { description: e.target.value });
                markTouched(fieldKey(idx, "description"));
              }}
              onBlur={() => markTouched(fieldKey(idx, "description"))}
              aria-invalid={Boolean(fieldError(idx, "description")) || undefined}
              className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
                fieldError(idx, "description")
                  ? "border-red-500 dark:border-red-500"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            />
            {fieldError(idx, "description") ? (
              <span className="text-xs text-red-600">{fieldError(idx, "description")}</span>
            ) : null}
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
      >
        Add another job
      </button>
    </div>
  );
}

export function validatePriorJobs(data: FormData): StepErrors {
  const errs: StepErrors = {};
  data.priorJobs.forEach((j, i) => {
    if (!j.company) errs[`priorJobs.${i}.company`] = "Company is required.";
    if (!j.title) errs[`priorJobs.${i}.title`] = "Title is required.";
    if (!j.start) errs[`priorJobs.${i}.start`] = "Start is required.";
    if (!j.description) errs[`priorJobs.${i}.description`] = "Description is required.";
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
