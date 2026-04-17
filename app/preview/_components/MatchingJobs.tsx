"use client";
import type { SVGProps } from "react";
import { useMemo } from "react";
import { useResume } from "@/lib/resumeContext";
import { generateMockJobs } from "@/lib/mockJobs";

export function MatchingJobs() {
  const { jobContext } = useResume();
  const jobs = useMemo(
    () => generateMockJobs(jobContext.title, jobContext.keywords),
    [jobContext.title, jobContext.keywords]
  );

  return (
    <section className="flex flex-col gap-3">
      <header>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          These {jobs.length} jobs match your resume!
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Illustrative samples based on your target
          {jobContext.title ? ` "${jobContext.title}"` : ""}.
        </p>
      </header>

      <ul className="space-y-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <article className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                    {job.title}
                  </h3>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <BuildingIcon className="h-3 w-3" /> {job.company}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="h-3 w-3" /> {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" /> Posted {job.posted}
                    </span>
                    <span>{job.type}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {job.matchScore}% match
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    ATS {job.atsScore}
                  </span>
                </div>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                {job.description}
              </p>

              <div>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  View job <ExternalLinkIcon className="h-3.5 w-3.5" />
                </a>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-zinc-400">
        Listings are illustrative samples and not real job postings.
      </p>
    </section>
  );
}

function BuildingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
    </svg>
  );
}

function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ExternalLinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
