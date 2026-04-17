"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ResumeProvider } from "@/lib/resumeContext";
import { parseJobContext } from "@/lib/jobContext";
import type { JobContext } from "@/lib/schema";

export function ResumeProviderShell({ children }: { children: ReactNode }) {
  const [jc, setJc] = useState<JobContext | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setJc(parseJobContext(params));
  }, []);

  if (!jc) return null;
  return <ResumeProvider initialJobContext={jc}>{children}</ResumeProvider>;
}
