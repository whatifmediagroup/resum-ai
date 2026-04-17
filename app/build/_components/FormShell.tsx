"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { steps, findStep } from "./steps";

type StepDirection = "forward" | "back" | "initial";

function animationClass(dir: StepDirection): string {
  if (dir === "forward") return "motion-slide-in-right";
  if (dir === "back") return "motion-slide-in-left";
  return "motion-fade-up";
}

function describeError(status: number): string {
  if (status === 400) return "Some answers need fixing — go back and check your entries.";
  if (status === 422)
    return "We couldn't build a clean resume from that. Try a different nudge or tweak your answers.";
  if (status === 502) return "The AI is having a moment. Try again in a few seconds.";
  return "Something went wrong. Please try again.";
}

export function FormShell({ currentId }: { currentId: string }) {
  const router = useRouter();
  const { formData, jobContext, resumeJson, setResumeJson, updateFormData } = useResume();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touchedByStep, setTouchedByStep] = useState<Record<string, Record<string, boolean>>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});

  const here = useMemo(() => findStep(currentId), [currentId]);
  useEffect(() => {
    if (!here) router.replace(`/build?step=${steps[0].id}`);
  }, [here, router]);

  const stepId = here?.step.id;
  useEffect(() => {
    if (stepId) setVisited((v) => (v[stepId] ? v : { ...v, [stepId]: true }));
  }, [stepId]);

  const prevIndexRef = useRef<number | null>(null);
  let direction: StepDirection = "initial";
  if (here) {
    const prev = prevIndexRef.current;
    if (prev !== null && here.index > prev) direction = "forward";
    else if (prev !== null && here.index < prev) direction = "back";
  }
  useEffect(() => {
    if (here) prevIndexRef.current = here.index;
  }, [here]);

  const currentTouched = stepId ? touchedByStep[stepId] ?? {} : {};
  const markTouched = (field: string) => {
    if (!stepId) return;
    setTouchedByStep((prev) => {
      const forStep = prev[stepId] ?? {};
      if (forStep[field]) return prev;
      return { ...prev, [stepId]: { ...forStep, [field]: true } };
    });
  };

  const markAllTouched = () => {
    if (!here) return;
    const errs = here.step.validate(formData);
    if (Object.keys(errs).length === 0) return;
    setTouchedByStep((prev) => {
      const forStep = { ...(prev[here.step.id] ?? {}) };
      for (const k of Object.keys(errs)) forStep[k] = true;
      return { ...prev, [here.step.id]: forStep };
    });
  };

  if (!here) return null;

  const { step, index } = here;
  const isLast = index === steps.length - 1;
  const errors = step.validate(formData);
  const canProceed = Object.keys(errors).length === 0;
  const skippable = step.isSkippable?.(formData) ?? false;

  const goTo = (i: number) => router.push(`/build?step=${steps[i].id}`);

  const goPrev = () => {
    if (index === 0) router.push("/");
    else goTo(index - 1);
  };

  const goNext = async () => {
    if (!canProceed) {
      markAllTouched();
      return;
    }
    if (!isLast) {
      goTo(index + 1);
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
      router.push(`/preview${window.location.search}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    if (!skippable) return;
    const patch = step.skip?.(formData);
    if (patch) updateFormData(patch);
    setTouchedByStep((prev) => ({ ...prev, [step.id]: {} }));
    if (!isLast) goTo(index + 1);
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <ProgressBar
        index={index}
        visited={visited}
        onJump={(i) => {
          if (i === index) return;
          if (i < index || visited[steps[i].id]) goTo(i);
        }}
      />
      <div key={step.id} className={`flex flex-col gap-6 ${animationClass(direction)}`}>
        <h2
          className="motion-fade-up text-xl font-semibold"
          style={{ animationDelay: "0ms" }}
        >
          {step.label}
        </h2>
        <div className="motion-fade-up" style={{ animationDelay: "100ms" }}>
          <step.Component errors={errors} touched={currentTouched} markTouched={markTouched} />
        </div>
      </div>
      <div key={`foot-${step.id}`} className="flex flex-col gap-3">
        {error ? (
          <p
            className="motion-fade-up text-sm text-red-600"
            style={{ animationDelay: "200ms" }}
          >
            {error}
          </p>
        ) : null}
        <div
          className="motion-fade-up flex items-center justify-between gap-3"
          style={{ animationDelay: "250ms" }}
        >
          <button
            type="button"
            onClick={goPrev}
            className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {skippable && !isLast ? (
              <button
                type="button"
                onClick={skip}
                className="rounded border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Skip
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isLast ? (submitting ? "Generating…" : "Generate resume") : "Next"}
            </button>
          </div>
        </div>
        {resumeJson ? (
          <p
            className="motion-fade-up text-xs text-zinc-500"
            style={{ animationDelay: "350ms" }}
          >
            A resume already exists for this session — clicking Generate will replace it.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProgressBar({
  index,
  visited,
  onJump,
}: {
  index: number;
  visited: Record<string, boolean>;
  onJump: (i: number) => void;
}) {
  return (
    <nav aria-label="Progress" className="flex flex-col gap-2">
      <div className="flex gap-1">
        {steps.map((s, i) => {
          const active = i === index;
          const reachable = i < index || visited[s.id];
          const filled = i <= index || visited[s.id];
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to step ${i + 1}: ${s.label}`}
              aria-current={active ? "step" : undefined}
              disabled={!reachable && !active}
              onClick={() => onJump(i)}
              className={`h-1.5 flex-1 rounded transition-colors ${
                filled ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
              } ${
                reachable && !active
                  ? "cursor-pointer hover:opacity-80"
                  : active
                  ? "ring-2 ring-black/30 dark:ring-white/30"
                  : "cursor-not-allowed"
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">
        Step {index + 1} of {steps.length} — {steps[index].label}
      </p>
    </nav>
  );
}
