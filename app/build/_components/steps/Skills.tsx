"use client";
import { useRef, useState, type SVGProps } from "react";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";
import type { StepProps, StepErrors } from "./index";

type Row = { id: number; value: string };

function compactSkills(rows: Row[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const v = r.value.trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

function shallowEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function Skills({ errors, touched, markTouched }: StepProps) {
  const { formData, jobContext, updateFormData } = useResume();
  const links = formData.links;

  const skillsError = touched.skills ? errors.skills : undefined;
  const linkError = (name: string) => (touched[name] ? errors[name] : undefined);

  const idRef = useRef(0);
  const [rows, setRows] = useState<Row[]>(() => {
    const seed = formData.skills.length > 0 ? formData.skills : [""];
    return seed.map((value) => ({ id: idRef.current++, value }));
  });

  const [suggestionsById, setSuggestionsById] = useState<Record<number, string[]>>({});
  const [loadingById, setLoadingById] = useState<Record<number, boolean>>({});
  const [errorById, setErrorById] = useState<Record<number, string | null>>({});

  const sync = (next: Row[]) => {
    const cleaned = compactSkills(next);
    if (!shallowEqual(cleaned, formData.skills)) {
      updateFormData({ skills: cleaned });
    }
  };

  const updateRow = (id: number, value: string) => {
    const next = rows.map((r) => (r.id === id ? { ...r, value } : r));
    setRows(next);
    sync(next);
    markTouched("skills");
  };

  const removeRow = (id: number) => {
    const filtered = rows.filter((r) => r.id !== id);
    const next =
      filtered.length > 0 ? filtered : [{ id: idRef.current++, value: "" }];
    setRows(next);
    sync(next);
    setSuggestionsById((m) => {
      if (!(id in m)) return m;
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
    setErrorById((m) => {
      if (!(id in m)) return m;
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
    markTouched("skills");
  };

  const addRow = (value = "") => {
    const id = idRef.current++;
    const next = [...rows, { id, value }];
    setRows(next);
    sync(next);
    markTouched("skills");
    return id;
  };

  const fetchSuggestions = async (row: Row) => {
    const baseSkill = row.value.trim();
    if (!baseSkill) {
      setErrorById((m) => ({ ...m, [row.id]: "Type a skill first." }));
      return;
    }
    setLoadingById((m) => ({ ...m, [row.id]: true }));
    setErrorById((m) => ({ ...m, [row.id]: null }));
    try {
      const res = await fetch("/api/suggest-skills", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          baseSkill,
          targetTitle: formData.target.title || jobContext.title,
          targetPitch: formData.target.pitch,
          existingSkills: compactSkills(rows),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message || "Couldn't get suggestions.");
      }
      const data = (await res.json()) as { suggestions?: unknown };
      const list = Array.isArray(data?.suggestions)
        ? (data.suggestions as unknown[]).filter(
            (s): s is string => typeof s === "string"
          )
        : [];
      const taken = new Set(compactSkills(rows).map((s) => s.toLowerCase()));
      const filtered = list.filter((s) => !taken.has(s.trim().toLowerCase()));
      setSuggestionsById((m) => ({ ...m, [row.id]: filtered }));
      if (filtered.length === 0) {
        setErrorById((m) => ({ ...m, [row.id]: "No new ideas right now." }));
      }
    } catch (e) {
      setErrorById((m) => ({ ...m, [row.id]: (e as Error).message }));
    } finally {
      setLoadingById((m) => ({ ...m, [row.id]: false }));
    }
  };

  const acceptSuggestion = (row: Row, value: string) => {
    addRow(value);
    setSuggestionsById((m) => {
      const cur = m[row.id] ?? [];
      return {
        ...m,
        [row.id]: cur.filter((s) => s.toLowerCase() !== value.toLowerCase()),
      };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm">Skills</span>
        <p className="text-xs text-zinc-500">
          Add one skill per field. Tap <em>Suggest</em> for AI-generated related
          skills tailored to your target role.
        </p>
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const loading = loadingById[row.id] ?? false;
            const suggestions = suggestionsById[row.id] ?? [];
            const errMsg = errorById[row.id];
            return (
              <li key={row.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    value={row.value}
                    onChange={(e) => updateRow(row.id, e.target.value)}
                    onBlur={() => markTouched("skills")}
                    placeholder="e.g. TypeScript"
                    aria-label="Skill"
                    aria-invalid={Boolean(skillsError) || undefined}
                    className={`flex-1 rounded border px-3 py-2 text-sm dark:bg-zinc-900 ${
                      skillsError
                        ? "border-red-500 dark:border-red-500"
                        : "border-zinc-300 dark:border-zinc-700"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => fetchSuggestions(row)}
                    disabled={loading || !row.value.trim()}
                    className="inline-flex items-center gap-1 rounded border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    title="AI suggest related skills"
                  >
                    <SparklesIcon className="h-3.5 w-3.5" />
                    {loading ? "Thinking…" : "Suggest"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove skill"
                    className="rounded border border-transparent p-1.5 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {errMsg ? (
                  <span className="text-xs text-red-600">{errMsg}</span>
                ) : null}
                {suggestions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pl-0.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => acceptSuggestion(row, s)}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                      >
                        <PlusIcon className="h-3 w-3" />
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div>
          <button
            type="button"
            onClick={() => addRow()}
            className="inline-flex items-center gap-1 rounded border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            <PlusIcon className="h-3 w-3" />
            Add skill
          </button>
        </div>
        {skillsError ? (
          <span className="text-xs text-red-600">{skillsError}</span>
        ) : null}
      </div>

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

function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.8 2.4L22 17l-2.2.6L19 20l-.8-2.4L16 17l2.2-.6L19 14z" />
    </svg>
  );
}

function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
