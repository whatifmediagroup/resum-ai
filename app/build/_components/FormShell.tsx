"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { steps, findStep } from "./steps";
import { KoalaMascot } from "@/app/_components/KoalaMascot";

const STEP_SPEECH: Record<string, string> = {
  identity: "Nice to meet ya! Let's get the basics down.",
  target: "What role are you koalified for?",
  "recent-job": "Tell me about your current gig.",
  "prior-jobs": "Any earlier jobs worth bragging about?",
  education: "Where'd you earn your koalifications?",
  skills: "Time to show off — what are your superpowers?",
};

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <ProgressBar
        index={index}
        visited={visited}
        onJump={(i) => {
          if (i === index) return;
          if (i < index || visited[steps[i].id]) goTo(i);
        }}
      />
      <div className="flex justify-start">
        <KoalaMascot
          variant="helper"
          size={60}
          speech={STEP_SPEECH[step.id]}
        />
      </div>
      <div
        key={step.id}
        className={`flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 ${animationClass(direction)}`}
      >
        <h2
          className="motion-fade-up text-xl font-semibold text-zinc-900 dark:text-zinc-100"
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
          <div
            role="alert"
            className="motion-fade-up flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            style={{ animationDelay: "200ms" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        ) : null}
        <div
          className="motion-fade-up flex items-center justify-between gap-3"
          style={{ animationDelay: "250ms" }}
        >
          <button
            type="button"
            onClick={goPrev}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {skippable && !isLast ? (
              <button
                type="button"
                onClick={skip}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-950"
              >
                Skip
              </button>
            ) : null}
            <button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-zinc-950"
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
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                filled
                  ? "bg-indigo-600 dark:bg-indigo-500"
                  : "bg-zinc-200 dark:bg-zinc-800"
              } ${
                reachable && !active
                  ? "cursor-pointer hover:opacity-80"
                  : active
                  ? "ring-2 ring-indigo-400/40 dark:ring-indigo-500/40"
                  : "cursor-not-allowed"
              }`}
            />
          );
        })}
      </div>
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span className="text-indigo-600 dark:text-indigo-400">
          Step {index + 1}
        </span>{" "}
        of {steps.length} · {steps[index].label}
      </p>
    </nav>
  );
}
