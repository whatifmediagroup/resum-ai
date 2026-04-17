"use client";
import dynamic from "next/dynamic";
import type { ResumeJson } from "@/lib/schema";
import { ResumeDocument } from "./ResumeDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <div className="h-[70vh] animate-pulse bg-zinc-100 dark:bg-zinc-900" /> }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

export function ResumePreview({ data }: { data: ResumeJson }) {
  return (
    <div className="flex flex-col gap-4">
      <PDFViewer style={{ width: "100%", height: "70vh", border: 0 }}>
        <ResumeDocument data={data} />
      </PDFViewer>
      <PDFDownloadLink
        document={<ResumeDocument data={data} />}
        fileName={`${data.header.fullName.replace(/\s+/g, "_")}_resume.pdf`}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
      </PDFDownloadLink>
    </div>
  );
}
