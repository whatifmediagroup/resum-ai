"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyFormData,
  type FormData,
  type JobContext,
  type ResumeJson,
} from "./schema";
import { readSession, writeSession, type Session } from "./storage";

type Ctx = {
  jobContext: JobContext;
  setJobContext: (jc: JobContext) => void;
  formData: FormData;
  updateFormData: (patch: Partial<FormData>) => void;
  resumeJson: ResumeJson | null;
  setResumeJson: (r: ResumeJson | null) => void;
  delivered: boolean;
  setDelivered: (d: boolean) => void;
};

const ResumeCtx = createContext<Ctx | null>(null);

export function ResumeProvider({
  initialJobContext,
  children,
}: {
  initialJobContext: JobContext;
  children: ReactNode;
}) {
  const jobId = initialJobContext.jobId;
  const [state, setState] = useState<Session>(() => ({
    jobContext: initialJobContext,
    formData: {
      ...emptyFormData,
      target: {
        ...emptyFormData.target,
        title: initialJobContext.title ?? "",
      },
    },
    resumeJson: null,
    delivered: false,
  }));

  useEffect(() => {
    const saved = readSession(jobId);
    if (saved) {
      setState((prev) => ({
        ...saved,
        jobContext: { ...saved.jobContext, ...initialJobContext },
        formData: { ...prev.formData, ...saved.formData },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    writeSession(jobId, state);
  }, [jobId, state]);

  const setJobContext = useCallback(
    (jc: JobContext) => setState((s) => ({ ...s, jobContext: jc })),
    []
  );
  const updateFormData = useCallback(
    (patch: Partial<FormData>) =>
      setState((s) => ({ ...s, formData: { ...s.formData, ...patch } })),
    []
  );
  const setResumeJson = useCallback(
    (r: ResumeJson | null) => setState((s) => ({ ...s, resumeJson: r })),
    []
  );
  const setDelivered = useCallback(
    (d: boolean) => setState((s) => ({ ...s, delivered: d })),
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      jobContext: state.jobContext,
      setJobContext,
      formData: state.formData,
      updateFormData,
      resumeJson: state.resumeJson,
      setResumeJson,
      delivered: state.delivered,
      setDelivered,
    }),
    [state, setJobContext, updateFormData, setResumeJson, setDelivered]
  );

  return <ResumeCtx.Provider value={value}>{children}</ResumeCtx.Provider>;
}

export function useResume(): Ctx {
  const v = useContext(ResumeCtx);
  if (!v) throw new Error("useResume must be used inside <ResumeProvider>");
  return v;
}
