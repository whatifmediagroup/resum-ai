"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { KoalaMascot } from "@/app/_components/KoalaMascot";

export default function DonePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg flex-col items-center justify-center gap-8 px-4 py-12 text-center sm:px-6">
      <div className="motion-fade-up">
        <KoalaMascot
          speech="You're officially koalified!"
          size={160}
          delay={0}
        />
      </div>

      <div className="motion-fade-up motion-delay-150">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircleIcon className="h-4 w-4" />
          Resume ready
        </div>
        <h1 className="text-balance text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          You&apos;re all set
        </h1>
        <p className="mt-3 text-balance text-zinc-600 dark:text-zinc-400">
          Your tailored resume has been downloaded. Time to start applying —
          good luck out there.
        </p>
      </div>

      <div
        className="motion-fade-up flex w-full flex-col gap-2 sm:flex-row sm:justify-center"
        style={{ animationDelay: "250ms" }}
      >
        <Link
          href="/jobs"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
        >
          <BriefcaseIcon className="h-4 w-4" />
          Browse matching jobs
        </Link>
        <Link
          href="/preview"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
        >
          <EyeIcon className="h-4 w-4" />
          View resume again
        </Link>
      </div>
    </main>
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

function BriefcaseIcon(props: SVGProps<SVGSVGElement>) {
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
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
