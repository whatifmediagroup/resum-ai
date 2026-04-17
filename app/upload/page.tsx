import { Suspense } from "react";
import { ResumeProvider } from "@/lib/resumeContext";
import { parseJobContext } from "@/lib/jobContext";
import { UploadView } from "./_components/UploadView";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jobContext = parseJobContext(params);

  return (
    <Suspense>
      <ResumeProvider initialJobContext={jobContext}>
        <UploadView />
      </ResumeProvider>
    </Suspense>
  );
}
