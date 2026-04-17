import Link from "next/link";
import type { SVGProps } from "react";
import { parseJobContext } from "@/lib/jobContext";
import { generateMockJobs } from "@/lib/mockJobs";
import { steps } from "@/app/build/_components/steps";
import { ResumeReadyBanner } from "./_components/ResumeReadyBanner";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jc = parseJobContext(params);
  const jobs = generateMockJobs(jc.title, jc.keywords);

  const buildQs = new URLSearchParams();
  if (jc.title) buildQs.set("title", jc.title);
  if (jc.keywords.length > 0) buildQs.set("keywords", jc.keywords.join(","));
  if (jc.jobId) buildQs.set("jobId", jc.jobId);
  buildQs.set("step", steps[0].id);
  const buildHref = `/build?${buildQs.toString()}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="motion-fade-up mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" /> Back
        </Link>

        <ResumeReadyBanner jobId={jc.jobId} />

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {jc.title ? `${jc.title} jobs` : "Matching jobs"}
        </h1>
        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
          {jobs.length} positions found
          {jc.keywords.length > 0 ? (
            <>
              {" "}· filtered by{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {jc.keywords.join(", ")}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <ul className="space-y-3">
        {jobs.map((job, idx) => (
          <li
            key={job.id}
            className="motion-fade-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <article className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md sm:flex-row sm:items-center dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                    {job.title}
                  </h3>
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    {job.matchScore}% match
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    <BuildingIcon className="h-3.5 w-3.5" /> {job.company}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-3.5 w-3.5" /> {job.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" /> {job.posted}
                  </span>
                  <span className="inline-flex items-center gap-1 text-zinc-400">
                    {job.type}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center justify-center gap-1 self-start rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 sm:self-center dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Apply <ExternalLinkIcon className="h-3.5 w-3.5" />
              </button>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
        <p className="mb-3 text-zinc-600 dark:text-zinc-400">
          Want a tailored resume to boost your match scores?
        </p>
        <Link
          href={buildHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
        >
          Build your resume <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        Listings are illustrative samples and not real job postings.
      </p>
    </main>
  );
}

function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
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
      <line x1="9" y1="22" x2="9" y2="18" />
      <line x1="15" y1="22" x2="15" y2="18" />
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
