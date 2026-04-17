import Link from "next/link";
import { parseJobContext } from "@/lib/jobContext";
import { steps } from "@/app/build/_components/steps";

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jc = parseJobContext(params);
  const firstStep = steps[0].id;
  const qs = new URLSearchParams();
  if (jc.title) qs.set("title", jc.title);
  if (jc.keywords.length > 0) qs.set("keywords", jc.keywords.join(","));
  if (jc.jobId) qs.set("jobId", jc.jobId);
  qs.set("step", firstStep);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-3xl font-semibold">Build a tailored resume in minutes</h1>
      {jc.title ? (
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          For <span className="font-medium">{jc.title}</span>
          {jc.keywords.length > 0 ? (
            <>
              {" "}· matching{" "}
              <span className="font-medium">{jc.keywords.join(", ")}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">
          Answer a few quick questions and we'll generate a polished PDF for you.
        </p>
      )}
      <Link
        href={`/build?${qs.toString()}`}
        className="rounded bg-black px-5 py-3 text-sm text-white dark:bg-white dark:text-black"
      >
        Get started
      </Link>
    </main>
  );
}
