"use client";

import {
  useCallback,
  useState,
  type ChangeEvent,
  type SVGProps,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useResume } from "@/lib/resumeContext";
import { writeSession, readSession } from "@/lib/storage";
import { emptyFormData } from "@/lib/schema";
import { steps } from "@/app/build/_components/steps";

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  let full = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    full += pageText + "\n\n";
  }
  return full.trim();
}

function describeError(status: number): string {
  if (status === 400)
    return "We couldn't read that resume — try pasting the text directly.";
  if (status === 422)
    return "The AI couldn't extract a clean resume from that. Try editing the text and retrying.";
  if (status === 502) return "The AI is having a moment. Try again in a few seconds.";
  return "Something went wrong. Please try again.";
}

export function UploadView() {
  const router = useRouter();
  const { jobContext, setResumeJson, setSourceResumeText } = useResume();
  const [extractedText, setExtractedText] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setParsing(true);

    try {
      if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        setExtractedText(await file.text());
      } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await extractPdfText(file);
        setExtractedText(text);
      } else {
        setError("Unsupported file type. Please upload a PDF or TXT file.");
      }
    } catch (err) {
      console.error("Extraction failed:", err);
      setError("Could not parse that file. Try pasting the text below instead.");
    } finally {
      setParsing(false);
    }
  }, []);

  const handleProofread = async () => {
    const text = extractedText.trim();
    if (text.length < 20) {
      setError("Please add at least a couple of sentences from your resume.");
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const res = await fetch("/api/proofread", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ resumeText: text, jobContext }),
      });
      if (!res.ok) {
        let detail: string | undefined;
        try {
          const body = (await res.json()) as { message?: string };
          detail = body?.message;
        } catch {
          /* ignore */
        }
        const base = describeError(res.status);
        throw new Error(detail ? `${base} (${detail})` : base);
      }
      const json = await res.json();
      const existing = readSession(jobContext.jobId);
      writeSession(jobContext.jobId, {
        jobContext,
        formData: existing?.formData ?? emptyFormData,
        resumeJson: json,
        delivered: false,
        sourceResumeText: text,
      });
      setSourceResumeText(text);
      setResumeJson(json);
      router.push(`/preview${window.location.search}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const buildHref = (() => {
    const qs = new URLSearchParams();
    if (jobContext.title) qs.set("title", jobContext.title);
    if (jobContext.keywords.length > 0) qs.set("keywords", jobContext.keywords.join(","));
    if (jobContext.jobId) qs.set("jobId", jobContext.jobId);
    qs.set("step", steps[0].id);
    return `/build?${qs.toString()}`;
  })();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="motion-fade-up mb-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Upload your resume
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Drop in your existing resume and let AI tighten it up — tailored to{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {jobContext.title ? jobContext.title : "the role you want"}
          </span>
          .
        </p>
      </div>

      <div className="motion-fade-up motion-delay-150 space-y-6">
        <div
          className="motion-fade-up rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          style={{ animationDelay: "250ms" }}
        >
          <label className="flex cursor-pointer flex-col items-center gap-3 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <UploadIcon className="h-8 w-8" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {parsing ? "Reading file…" : fileName || "Click to upload your resume"}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                PDF or TXT files supported
              </p>
            </div>
            <input
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={handleFile}
              className="hidden"
              disabled={parsing || processing}
            />
          </label>
        </div>

        <div
          className="motion-fade-up text-center text-sm text-zinc-500 dark:text-zinc-500"
          style={{ animationDelay: "350ms" }}
        >
          or
        </div>

        <div
          className="motion-fade-up rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          style={{ animationDelay: "450ms" }}
        >
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            <FileTextIcon className="h-4 w-4 text-indigo-500" />
            {extractedText ? "Extracted content (editable)" : "Paste your resume text"}
          </div>
          <textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={12}
            placeholder="Paste your resume content here…"
            className="w-full resize-y rounded-xl border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {extractedText.trim().length} characters
          </p>
        </div>

        {error ? (
          <div
            className="motion-fade-up flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            style={{ animationDelay: "500ms" }}
          >
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div
          className="motion-fade-up flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "550ms" }}
        >
          <button
            type="button"
            onClick={handleProofread}
            disabled={processing || parsing || extractedText.trim().length < 20}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SparklesIcon className="h-4 w-4" />
            {processing ? "Improving…" : "AI proofread & improve"}
          </button>
          <Link
            href={buildHref}
            className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Build from scratch
          </Link>
        </div>

        <div
          className="motion-fade-up text-center text-sm"
          style={{ animationDelay: "650ms" }}
        >
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            ← Back
          </Link>
        </div>
      </div>
    </main>
  );
}

function UploadIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileTextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function SparklesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
    </svg>
  );
}
