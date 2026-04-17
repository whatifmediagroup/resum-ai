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
        <div className="flex h-[70vh] items-center justify-center rounded border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-500">Fitting your resume to one page…</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        Couldn&apos;t render preview: {state.message}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {!state.fits ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Your resume still spans more than one page after the smallest layout was tried. Consider trimming bullets or a nudge to shorten content.
        </div>
      ) : null}
      <iframe
        title="Resume preview"
        src={state.url}
        style={{ width: "100%", height: "70vh", border: 0 }}
      />
      <a
        href={state.url}
        download={fileName}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Download PDF
      </a>
    </div>
  );
}

export const ResumePreview = memo(ResumePreviewImpl);
