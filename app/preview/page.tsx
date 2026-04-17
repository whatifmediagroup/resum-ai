"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { ResumeProviderShell } from "./_shell";
import { ResumePreview } from "./_components/ResumePreview";
import { steps } from "@/app/build/_components/steps";

function PreviewInner() {
  const router = useRouter();
  const { formData, jobContext, resumeJson, setResumeJson, setDelivered } = useResume();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState("");

  useEffect(() => {
    if (!resumeJson) router.replace(`/build?step=${steps[0].id}`);
  }, [resumeJson, router]);

  if (!resumeJson) return null;

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData, jobContext, nudge: nudge || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResumeJson(json);
      setNudge("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const markDelivered = () => {
    setDelivered(true);
    router.push("/done");
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preview</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/build?step=${steps[0].id}`)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Edit answers
          </button>
        </div>
      </div>
      <ResumePreview data={resumeJson} />
      <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="text-sm">
          <span className="block mb-1">Regenerate with a nudge (optional)</span>
          <input
            value={nudge}
            onChange={(e) => setNudge(e.target.value)}
            placeholder='e.g. "make it more technical" or "shorten each bullet"'
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={markDelivered}
            className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            I've downloaded it
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
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
