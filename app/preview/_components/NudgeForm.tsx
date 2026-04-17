"use client";
import { useState, type SVGProps } from "react";

type Props = {
  onRegenerate: (nudge: string | undefined) => Promise<void>;
  onMarkDelivered: () => void;
  regenerating: boolean;
  error?: string | null;
};

const SUGGESTIONS: { label: string; nudge: string }[] = [
  { label: "Make it more technical", nudge: "make it more technical" },
  { label: "Shorten each bullet", nudge: "shorten each bullet" },
  { label: "More action verbs", nudge: "use stronger action verbs" },
  { label: "Quantify impact", nudge: "quantify impact with numbers where possible" },
];

export function NudgeForm({
  onRegenerate,
  onMarkDelivered,
  regenerating,
  error,
}: Props) {
  const [nudge, setNudge] = useState("");

  const submit = async () => {
    await onRegenerate(nudge.trim() || undefined);
    setNudge("");
  };

  const applySuggestion = async (value: string) => {
    setNudge(value);
    await onRegenerate(value);
    setNudge("");
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
          <SparklesIcon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Refine with AI
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Add a short nudge or pick a suggestion to regenerate.
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.nudge}
            type="button"
            onClick={() => applySuggestion(s.nudge)}
            disabled={regenerating}
            className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="block text-sm">
        <span className="sr-only">Regenerate with a nudge</span>
        <input
          value={nudge}
          onChange={(e) => setNudge(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !regenerating) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder='e.g. "emphasize leadership" or "focus on Python projects"'
          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
          disabled={regenerating}
        />
      </label>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={submit}
          disabled={regenerating}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {regenerating ? (
            <>
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
              Regenerating…
            </>
          ) : (
            <>
              <RefreshIcon className="h-3.5 w-3.5" />
              Regenerate
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onMarkDelivered}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <CheckIcon className="h-3.5 w-3.5" />
          I&apos;ve downloaded it
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="motion-fade-up mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}
    </div>
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
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
    </svg>
  );
}

function RefreshIcon(props: SVGProps<SVGSVGElement>) {
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
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
      <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
    </svg>
  );
}

function SpinnerIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M21 12a9 9 0 1 1-6.22-8.56" />
    </svg>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
