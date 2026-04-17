import { Suspense } from "react";
import { FormShell } from "./_components/FormShell";
import { ResumeProvider } from "@/lib/resumeContext";
import { parseJobContext } from "@/lib/jobContext";
import { steps } from "./_components/steps";

export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jobContext = parseJobContext(params);
  const stepParam = typeof params.step === "string" ? params.step : steps[0].id;

  return (
    <Suspense>
      <ResumeProvider initialJobContext={jobContext}>
        <main className="min-h-screen bg-zinc-50 dark:bg-black">
          <FormShell currentId={stepParam} />
        </main>
      </ResumeProvider>
    </Suspense>
  );
}
