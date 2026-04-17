"use client";
import dynamic from "next/dynamic";
import { memo, useMemo } from "react";
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

function ResumePreviewImpl({ data }: { data: ResumeJson }) {
  const document = useMemo(() => <ResumeDocument data={data} />, [data]);
  const fileName = useMemo(
    () => `${data.header.fullName.replace(/\s+/g, "_")}_resume.pdf`,
    [data.header.fullName]
  );

  return (
    <div className="flex flex-col gap-4">
      <PDFViewer style={{ width: "100%", height: "70vh", border: 0 }}>
        {document}
      </PDFViewer>
      <PDFDownloadLink
        document={document}
        fileName={fileName}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
      </PDFDownloadLink>
    </div>
  );
}

export const ResumePreview = memo(ResumePreviewImpl);
