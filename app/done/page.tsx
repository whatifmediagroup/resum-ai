"use client";

import { KoalaMascot } from "@/app/_components/KoalaMascot";

export default function DonePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
      <KoalaMascot speech="You're officially koalified! 🎉" size={150} delay={0} />
      <div>
        <h1 className="text-2xl font-semibold">Resume ready ✓</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          You can close this tab and return to your job search.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Close tab
      </button>
    </main>
  );
}
