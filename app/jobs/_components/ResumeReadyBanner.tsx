"use client";

import { useEffect, useState, type SVGProps } from "react";
import Link from "next/link";
import { readSession } from "@/lib/storage";

export function ResumeReadyBanner({ jobId }: { jobId?: string }) {
  const [hasResume, setHasResume] = useState(false);

  useEffect(() => {
    const session = readSession(jobId);
    setHasResume(!!session?.resumeJson);
  }, [jobId]);

  if (!hasResume) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          Resume ready!
        </p>
        <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90">
          Your AI-tailored resume is ready. Apply to the jobs below with confidence.
        </p>
      </div>
      <Link
        href="/preview"
        className="hidden shrink-0 self-center rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 sm:inline-flex dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
      >
        View resume
      </Link>
    </div>
  );
}

function CheckCircleIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
