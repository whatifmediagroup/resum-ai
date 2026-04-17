"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Skills() {
  const { formData, updateFormData } = useResume();
  const skillsStr = formData.skills.join(", ");
  const links = formData.links;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Skills (comma-separated)</span>
        <input
          value={skillsStr}
          onChange={(e) =>
            updateFormData({
              skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <LinkField
        label="LinkedIn URL"
        value={links.linkedIn ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, linkedIn: v || undefined } })}
      />
      <LinkField
        label="Portfolio URL"
        value={links.portfolio ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, portfolio: v || undefined } })}
      />
      <LinkField
        label="GitHub URL"
        value={links.github ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, github: v || undefined } })}
      />
    </div>
  );
}

export function validateSkills(data: FormData): string[] {
  const errs: string[] = [];
  if (data.skills.length === 0) errs.push("skills");
  return errs;
}

function LinkField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label} (optional)</span>
      <input
        type="url"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
