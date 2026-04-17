"use client";
import { useState } from "react";

type Props = {
  onRegenerate: (nudge: string | undefined) => Promise<void>;
  onMarkDelivered: () => void;
  regenerating: boolean;
  error?: string | null;
};

export function NudgeForm({ onRegenerate, onMarkDelivered, regenerating, error }: Props) {
  const [nudge, setNudge] = useState("");

  const submit = async () => {
    await onRegenerate(nudge.trim() || undefined);
    setNudge("");
  };

  return (
    <div className="motion-fade-up flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
      <label
        className="motion-fade-up text-sm"
        style={{ animationDelay: "100ms" }}
      >
        <span className="mb-1 block">Regenerate with a nudge (optional)</span>
        <input
          value={nudge}
          onChange={(e) => setNudge(e.target.value)}
          placeholder='e.g. "make it more technical" or "shorten each bullet"'
          className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          disabled={regenerating}
        />
      </label>
      <div
        className="motion-fade-up flex items-center gap-2"
        style={{ animationDelay: "200ms" }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={regenerating}
          className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
        <button
          type="button"
          onClick={onMarkDelivered}
          className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
        >
          I've downloaded it
        </button>
      </div>
      {error ? (
        <p
          className="motion-fade-up text-xs text-red-600"
          style={{ animationDelay: "300ms" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
