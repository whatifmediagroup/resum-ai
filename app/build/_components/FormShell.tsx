"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { steps, findStep } from "./steps";

function describeError(status: number): string {
  if (status === 400) return "Some answers need fixing — go back and check your entries.";
  if (status === 422) return "We couldn't build a clean resume from that. Try a different nudge or tweak your answers.";
  if (status === 502) return "The AI is having a moment. Try again in a few seconds.";
  return "Something went wrong. Please try again.";
}

export function FormShell({ currentId }: { currentId: string }) {
  const router = useRouter();
  const { formData, jobContext, resumeJson, setResumeJson } = useResume();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const here = useMemo(() => findStep(currentId), [currentId]);
  useEffect(() => {
    if (!here) router.replace(`/build?step=${steps[0].id}`);
  }, [here, router]);
  if (!here) return null;

  const { step, index } = here;
  const isLast = index === steps.length - 1;
  const errors = step.validate(formData);
  const canProceed = errors.length === 0;

  const goPrev = () => {
    if (index === 0) router.push("/");
    else router.push(`/build?step=${steps[index - 1].id}`);
  };

  const goNext = async () => {
    if (!canProceed) return;
    if (!isLast) {
      router.push(`/build?step=${steps[index + 1].id}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData, jobContext }),
      });
      if (!res.ok) throw new Error(describeError(res.status));
      const json = await res.json();
      setResumeJson(json);
      router.push("/preview");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <ProgressBar index={index} total={steps.length} />
      <h2 className="text-xl font-semibold">{step.label}</h2>
      <step.Component />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!canProceed ? (
        <p className="text-xs text-amber-600">Fill the required fields to continue.</p>
      ) : null}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canProceed || submitting}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isLast ? (submitting ? "Generating…" : "Generate resume") : "Next"}
        </button>
      </div>
      {resumeJson ? (
        <p className="text-xs text-zinc-500">
          A resume already exists for this session — clicking Generate will replace it.
        </p>
      ) : null}
    </div>
  );
}

function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded ${
            i <= index ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}
