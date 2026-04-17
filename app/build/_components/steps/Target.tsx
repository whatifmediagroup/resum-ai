"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

export function Target({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData, jobContext } = useResume();
  const t = formData.target;
  const set = (patch: Partial<FormData["target"]>) =>
    updateFormData({ target: { ...t, ...patch } });

  const titleError = touched.title ? errors.title : undefined;
  const pitchError = touched.pitch ? errors.pitch : undefined;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Desired title</span>
        <input
          value={t.title}
          onChange={(e) => {
            set({ title: e.target.value });
            markTouched("title");
          }}
          onBlur={() => markTouched("title")}
          placeholder={jobContext.title}
          aria-invalid={Boolean(titleError) || undefined}
          className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
            titleError
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {titleError ? <span className="text-xs text-red-600">{titleError}</span> : null}
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Short pitch</span>
        <textarea
          rows={4}
          value={t.pitch}
          onChange={(e) => {
            set({ pitch: e.target.value });
            markTouched("pitch");
          }}
          onBlur={() => markTouched("pitch")}
          placeholder="One or two sentences about what you want to do next."
          aria-invalid={Boolean(pitchError) || undefined}
          className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
            pitchError
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {pitchError ? <span className="text-xs text-red-600">{pitchError}</span> : null}
      </label>
    </div>
  );
}

export function validateTarget(data: FormData): StepErrors {
  const errs: StepErrors = {};
  if (!data.target.title) errs.title = "Target title is required.";
  if (!data.target.pitch) errs.pitch = "Add a short pitch so we can tailor the summary.";
  return errs;
}
