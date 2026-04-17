import type { FormData, JobContext, ResumeJson } from "./schema";

export type Session = {
  jobContext: JobContext;
  formData: FormData;
  resumeJson: ResumeJson | null;
  delivered: boolean;
  sourceResumeText?: string | null;
};

export function keyFor(jobId: string | undefined): string {
  return `resume-ai:${jobId && jobId.length > 0 ? jobId : "default"}`;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const test = "__resume_ai_probe__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSession(jobId: string | undefined): Session | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  const raw = ls.getItem(keyFor(jobId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(jobId: string | undefined, session: Session): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(keyFor(jobId), JSON.stringify(session));
  } catch {
    // Silent fail: quota exceeded, disabled storage, etc.
  }
}

export function clearSession(jobId: string | undefined): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.removeItem(keyFor(jobId));
}
