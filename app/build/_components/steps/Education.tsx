"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

type Edu = FormData["education"][number];

const emptyEdu: Edu = { institution: "", credential: "", start: "", end: "" };

export function Education() {
  const { formData, updateFormData } = useResume();
  const edu = formData.education.length > 0 ? formData.education : [emptyEdu];

  const replace = (idx: number, patch: Partial<Edu>) => {
    const next = edu.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    updateFormData({ education: next });
  };
  const add = () => updateFormData({ education: [...edu, emptyEdu] });
  const remove = (idx: number) =>
    updateFormData({ education: edu.filter((_, i) => i !== idx) });

  return (
    <div className="flex flex-col gap-6">
      {edu.map((e, idx) => (
        <div key={idx} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Education {idx + 1}</h3>
            {edu.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institution"
              value={e.institution}
              onChange={(v) => replace(idx, { institution: v })}
            />
            <Input
              label="Credential"
              value={e.credential}
              onChange={(v) => replace(idx, { credential: v })}
            />
            <Input
              label="Start"
              value={e.start ?? ""}
              onChange={(v) => replace(idx, { start: v || undefined })}
            />
            <Input
              label="End"
              value={e.end ?? ""}
              onChange={(v) => replace(idx, { end: v || undefined })}
            />
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

export function validateEducation(data: FormData): string[] {
  const errs: string[] = [];
  if (data.education.length === 0) errs.push("education.count");
  data.education.forEach((e, i) => {
    if (!e.institution) errs.push(`education.${i}.institution`);
    if (!e.credential) errs.push(`education.${i}.credential`);
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
