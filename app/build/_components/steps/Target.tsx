"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Target() {
  const { formData, updateFormData, jobContext } = useResume();
  const t = formData.target;
  const set = (patch: Partial<FormData["target"]>) =>
    updateFormData({ target: { ...t, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Desired title</span>
        <input
          value={t.title || jobContext.title || ""}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={jobContext.title}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Short pitch</span>
        <textarea
          rows={4}
          value={t.pitch}
          onChange={(e) => set({ pitch: e.target.value })}
          placeholder="One or two sentences about what you want to do next."
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    </div>
  );
}

export function validateTarget(data: FormData): string[] {
  const errs: string[] = [];
  if (!data.target.title) errs.push("title");
  if (!data.target.pitch) errs.push("pitch");
  return errs;
}
