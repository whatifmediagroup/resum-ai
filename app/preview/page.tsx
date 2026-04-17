"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { ResumeProviderShell } from "./_shell";
import { ResumePreview } from "./_components/ResumePreview";
import { NudgeForm } from "./_components/NudgeForm";
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preview</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(editHref)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            {editLabel}
          </button>
        </div>
      </div>
      <ResumePreview data={resumeJson} />
      <NudgeForm
        onRegenerate={regenerate}
        onMarkDelivered={markDelivered}
        regenerating={regenerating}
        error={error}
      />
    </main>
  );
}

export default function PreviewPage() {
  return (
    <ResumeProviderShell>
      <PreviewInner />
    </ResumeProviderShell>
  );
}
