"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type SVGProps } from "react";
import { useResume } from "@/lib/resumeContext";
import { ResumeProviderShell } from "./_shell";
import { ResumePreview } from "./_components/ResumePreview";
import { NudgeForm } from "./_components/NudgeForm";
import { MatchingJobs } from "./_components/MatchingJobs";
import { steps } from "@/app/build/_components/steps";

function describeError(status: number): string {
  if (status === 400) return "Some answers need fixing — go back and check your entries.";
  if (status === 422) return "We couldn't build a clean resume from that. Try a different nudge or tweak your answers.";
  if (status === 502) return "The AI is having a moment. Try again in a few seconds.";
  return "Something went wrong. Please try again.";
}

function PreviewInner() {
  const router = useRouter();
  const {
    formData,
    jobContext,
    resumeJson,
    setResumeJson,
    setDelivered,
    sourceResumeText,
  } = useResume();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resumeJson) router.replace(`/build?step=${steps[0].id}`);
  }, [resumeJson, router]);

  const regenerate = useCallback(
    async (nudge: string | undefined) => {
      setRegenerating(true);
      setError(null);
      try {
        const fromUpload = !!sourceResumeText;
        const formIsEmpty =
          !formData.identity.fullName.trim() ||
          !formData.identity.email.trim() ||
          formData.education.length === 0 ||
          formData.skills.length === 0;

        if (!fromUpload && formIsEmpty) {
          throw new Error(
            "We don't have your build answers anymore. Use Edit answers to fill them in, or Re-upload your existing resume."
          );
        }

        const endpoint = fromUpload ? "/api/proofread" : "/api/generate";
        const body = fromUpload
          ? { resumeText: sourceResumeText, jobContext, nudge }
          : { formData, jobContext, nudge };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let detail: string | undefined;
          try {
            const b = (await res.json()) as { message?: string };
            detail = b?.message;
          } catch {
            /* ignore */
          }
          const base = describeError(res.status);
          throw new Error(detail ? `${base} (${detail})` : base);
        }
        const json = await res.json();
        setResumeJson(json);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setRegenerating(false);
      }
    },
    [formData, jobContext, setResumeJson, sourceResumeText]
  );

  const markDelivered = useCallback(() => {
    setDelivered(true);
    router.push("/done");
  }, [router, setDelivered]);

  if (!resumeJson) return null;

  const fromUpload = !!sourceResumeText;
  const editLabel = fromUpload ? "Re-upload" : "Edit answers";
  const editHref = (() => {
    const qs = new URLSearchParams();
    if (jobContext.title) qs.set("title", jobContext.title);
    if (jobContext.keywords.length > 0) qs.set("keywords", jobContext.keywords.join(","));
    if (jobContext.jobId) qs.set("jobId", jobContext.jobId);
    if (!fromUpload) qs.set("step", steps[0].id);
    const tail = qs.toString();
    const base = fromUpload ? "/upload" : "/build";
    return tail ? `${base}?${tail}` : base;
  })();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="motion-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Preview
          </p>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Your tailored resume
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Review, nudge the AI, or download — then you&apos;re ready to apply.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(editHref)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          {editLabel}
        </button>
      </div>
      <div className="motion-fade-up" style={{ animationDelay: "80ms" }}>
        <ResumePreview data={resumeJson} />
      </div>
      <div className="motion-fade-up" style={{ animationDelay: "150ms" }}>
        <NudgeForm
          onRegenerate={regenerate}
          onMarkDelivered={markDelivered}
          regenerating={regenerating}
          error={error}
        />
      </div>
      <div className="motion-fade-up" style={{ animationDelay: "220ms" }}>
        <MatchingJobs />
      </div>
    </main>
  );
}

function PencilIcon(props: SVGProps<SVGSVGElement>) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

export default function PreviewPage() {
  return (
    <ResumeProviderShell>
      <PreviewInner />
    </ResumeProviderShell>
  );
}
