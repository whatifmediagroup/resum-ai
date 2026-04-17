import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { parseJobContext } from "@/lib/jobContext";
import { steps } from "@/app/build/_components/steps";
import { KoalaMascot } from "@/app/_components/KoalaMascot";

type GatePath = "update" | "build";

type PathOption = {
  id: GatePath;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  desc: string;
  iconClass: string;
  iconBgClass: string;
  route: "/upload" | "/build";
};

const paths: PathOption[] = [
  {
    id: "update",
    Icon: FilePenIcon,
    title: "Yes — but it needs work",
    desc: "Upload your resume and let AI suggest improvements.",
    iconClass: "text-amber-600 dark:text-amber-400",
    iconBgClass: "bg-amber-50 dark:bg-amber-950/40",
    route: "/upload",
  },
  {
    id: "build",
    Icon: FilePlusIcon,
    title: "No — I need one",
    desc: "No problem! We'll build one together in minutes.",
    iconClass: "text-indigo-600 dark:text-indigo-400",
    iconBgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    route: "/build",
  },
];

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jc = parseJobContext(params);
  const firstStep = steps[0].id;

  const baseQs = new URLSearchParams();
  if (jc.title) baseQs.set("title", jc.title);
  if (jc.keywords.length > 0) baseQs.set("keywords", jc.keywords.join(","));
  if (jc.jobId) baseQs.set("jobId", jc.jobId);

  function hrefFor(route: "/upload" | "/build"): string {
    const qs = new URLSearchParams(baseQs);
    if (route === "/build") qs.set("step", firstStep);
    const tail = qs.toString();
    return tail ? `${route}?${tail}` : route;
  }

  const buildHref = hrefFor("/build");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="motion-fade-up mb-10 text-center">
        <div className="mb-6 flex justify-center">
          <KoalaMascot
            speech="Let's get you koalified!"
            size={140}
            delay={0}
          />
        </div>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <SparklesIcon className="h-4 w-4" />
          AI-Powered Resume Builder
        </div>
        <h1 className="text-balance text-3xl font-bold text-zinc-900 sm:text-4xl dark:text-zinc-50">
          {jc.title ? (
            <>
              Land your next{" "}
              <span className="text-indigo-600 dark:text-indigo-400">{jc.title}</span> role
            </>
          ) : (
            <>
              Build a resume that{" "}
              <span className="text-indigo-600 dark:text-indigo-400">gets interviews</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-lg text-zinc-600 dark:text-zinc-400">
          Our AI tailors your resume to match the job you want. No templates, no guessing —
          just a polished, professional resume in minutes.
        </p>
        {jc.keywords.length > 0 ? (
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-500">
            Matching{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {jc.keywords.join(", ")}
            </span>
          </p>
        ) : null}
      </div>

      <div className="motion-fade-up motion-delay-150">
        <h2 className="mb-6 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Do you have a resume?
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {paths.map(({ id, Icon, title, desc, iconClass, iconBgClass, route }, idx) => (
            <div
              key={id}
              className="motion-fade-up h-full"
              style={{ animationDelay: `${250 + idx * 100}ms` }}
            >
              <Link href={hrefFor(route)} className="block h-full">
                <div className="group relative flex h-full flex-col items-center rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass} ${iconClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                  </h3>
                  <p className="flex-1 text-sm text-zinc-600 dark:text-zinc-400">{desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-indigo-400">
                    Get started <ArrowRightIcon className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-zinc-500 dark:text-zinc-500">
          Already know what you want?{" "}
          <Link
            href={buildHref}
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Start building →
          </Link>
        </p>
      </div>
    </main>
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
      <path d="M5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6L5 14z" />
    </svg>
  );
}

function FilePenIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h6" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M18.5 13.5a2.121 2.121 0 1 1 3 3L14 24l-4 1 1-4 7.5-7.5z" />
    </svg>
  );
}

function FilePlusIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
