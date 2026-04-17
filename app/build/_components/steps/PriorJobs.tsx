"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

type Job = FormData["priorJobs"][number];

const emptyJob: Job = { company: "", title: "", start: "", current: false, description: "" };

export function PriorJobs() {
  const { formData, updateFormData } = useResume();
  const jobs = formData.priorJobs;

  const replace = (idx: number, patch: Partial<Job>) => {
    const next = jobs.map((j, i) => (i === idx ? { ...j, ...patch } : j));
    updateFormData({ priorJobs: next });
  };
  const add = () => updateFormData({ priorJobs: [...jobs, emptyJob] });
  const remove = (idx: number) =>
    updateFormData({ priorJobs: jobs.filter((_, i) => i !== idx) });

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No earlier jobs? You can skip this step.
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
            <Input label="Company" value={j.company} onChange={(v) => replace(idx, { company: v })} />
            <Input label="Title" value={j.title} onChange={(v) => replace(idx, { title: v })} />
            <Input label="Start" value={j.start} onChange={(v) => replace(idx, { start: v })} />
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
              onChange={(e) => replace(idx, { description: e.target.value })}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
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

export function validatePriorJobs(data: FormData): string[] {
  const errs: string[] = [];
  data.priorJobs.forEach((j, i) => {
    if (!j.company) errs.push(`priorJobs.${i}.company`);
    if (!j.title) errs.push(`priorJobs.${i}.title`);
    if (!j.start) errs.push(`priorJobs.${i}.start`);
    if (!j.description) errs.push(`priorJobs.${i}.description`);
  });
  return errs;
}

function Input(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
