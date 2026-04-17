"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

export function Skills({ errors, touched, markTouched }: StepProps) {
  const { formData, updateFormData } = useResume();
  const skillsStr = formData.skills.join(", ");
  const links = formData.links;

  const skillsError = touched.skills ? errors.skills : undefined;
  const linkError = (name: string) => (touched[name] ? errors[name] : undefined);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Skills (comma-separated)</span>
        <input
          value={skillsStr}
          onChange={(e) => {
            updateFormData({
              skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            });
            markTouched("skills");
          }}
          onBlur={() => markTouched("skills")}
          aria-invalid={Boolean(skillsError) || undefined}
          className={`rounded border px-3 py-2 dark:bg-zinc-900 ${
            skillsError
              ? "border-red-500 dark:border-red-500"
              : "border-zinc-300 dark:border-zinc-700"
          }`}
        />
        {skillsError ? <span className="text-xs text-red-600">{skillsError}</span> : null}
      </label>
      <LinkField
        label="LinkedIn URL"
        value={links.linkedIn ?? ""}
        error={linkError("linkedIn")}
        onChange={(v) => {
          updateFormData({ links: { ...links, linkedIn: v || undefined } });
          markTouched("linkedIn");
        }}
        onBlur={() => markTouched("linkedIn")}
      />
      <LinkField
        label="Portfolio URL"
        value={links.portfolio ?? ""}
        error={linkError("portfolio")}
        onChange={(v) => {
          updateFormData({ links: { ...links, portfolio: v || undefined } });
          markTouched("portfolio");
        }}
        onBlur={() => markTouched("portfolio")}
      />
      <LinkField
        label="GitHub URL"
        value={links.github ?? ""}
        error={linkError("github")}
        onChange={(v) => {
          updateFormData({ links: { ...links, github: v || undefined } });
          markTouched("github");
        }}
        onBlur={() => markTouched("github")}
      />
    </div>
  );
}

function isValidUrl(v: string): boolean {
  try {
    new URL(v);
    return true;
  } catch {
    return false;
  }
}

export function validateSkills(data: FormData): StepErrors {
  const errs: StepErrors = {};
  if (data.skills.length === 0) errs.skills = "Add at least one skill.";
  for (const key of ["linkedIn", "portfolio", "github"] as const) {
    const v = data.links[key];
    if (v && !isValidUrl(v)) errs[key] = "Enter a valid URL (include https://).";
  }
  return errs;
}

function LinkField(props: {
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
}) {
  const hasError = Boolean(props.error);
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label} (optional)</span>
      <input
        type="url"
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
