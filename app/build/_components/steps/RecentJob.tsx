"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function RecentJob() {
  const { formData, updateFormData } = useResume();
  const j = formData.recentJob;
  const set = (patch: Partial<FormData["recentJob"]>) =>
    updateFormData({ recentJob: { ...j, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Company" value={j.company} onChange={(v) => set({ company: v })} />
      <Field label="Title" value={j.title} onChange={(v) => set({ title: v })} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start (YYYY-MM)" value={j.start} onChange={(v) => set({ start: v })} />
        <Field
          label="End (YYYY-MM)"
          value={j.end ?? ""}
          onChange={(v) => set({ end: v || undefined })}
          disabled={j.current}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={j.current}
          onChange={(e) => set({ current: e.target.checked, end: e.target.checked ? undefined : j.end })}
        />
        Currently work here
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Description / bullets (one per line)</span>
        <textarea
          rows={5}
          value={j.description}
          onChange={(e) => set({ description: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    </div>
  );
}

export function validateRecentJob(data: FormData): string[] {
  const errs: string[] = [];
  const j = data.recentJob;
  if (!j.company) errs.push("company");
  if (!j.title) errs.push("title");
  if (!j.start) errs.push("start");
  if (!j.description) errs.push("description");
  if (!j.current && !j.end) errs.push("end");
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
