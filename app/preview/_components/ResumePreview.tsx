"use client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ResumeJson } from "@/lib/schema";
import { fitResume } from "@/lib/fitResume";

type FitState =
  | { status: "fitting" }
  | { status: "ready"; url: string; fits: boolean; attempts: number }
  | { status: "error"; message: string };

function ResumePreviewImpl({ data }: { data: ResumeJson }) {
  const [state, setState] = useState<FitState>({ status: "fitting" });
  const [prevData, setPrevData] = useState(data);
  if (prevData !== data) {
    setPrevData(data);
    setState({ status: "fitting" });
  }
  const fileName = useMemo(
    () => `${data.header.fullName.replace(/\s+/g, "_") || "resume"}_resume.pdf`,
    [data.header.fullName]
  );
  const currentUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fitResume(data)
      .then((result) => {
        if (cancelled) return;
        const url = URL.createObjectURL(result.blob);
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = url;
        setState({ status: "ready", url, fits: result.fits, attempts: result.attempts });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("fitResume failed:", err);
        setState({ status: "error", message: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  if (state.status === "fitting") {
    return (
      <div className="flex flex-col gap-4">
        <div className="relative flex h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="absolute inset-x-0 top-0 h-1 overflow-hidden">
            <div className="h-full w-1/3 animate-[shimmer_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          </div>
          <div className="flex flex-col items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-6 w-6 animate-spin text-indigo-500"
            >
              <path d="M21 12a9 9 0 1 1-6.22-8.56" />
            </svg>
            Fitting your resume to one page…
          </div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        Couldn&apos;t render preview: {state.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!state.fits ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>
            Your resume still spans more than one page. Trim bullets or try a
            nudge like “shorten each bullet.”
          </span>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <iframe
          title="Resume preview"
          src={state.url}
          style={{ width: "100%", height: "70vh", border: 0 }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={state.url}
          download={fileName}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </a>
        {state.fits ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Fits on one page
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const ResumePreview = memo(ResumePreviewImpl);
