import type { ResumeJson } from "@/lib/schema";
import { FONT_SIZES, type ResumeRenderConfig } from "@/app/preview/_components/ResumeDocument";

export type FitResult = {
  blob: Blob;
  config: ResumeRenderConfig;
  fits: boolean;
  attempts: number;
};

type Candidate = {
  fontSize: number;
  experienceCount: number;
  bulletTrimFromLast: number;
};

export function generateCandidates(data: ResumeJson): Candidate[] {
  const out: Candidate[] = [];
  const maxJobs = Math.max(1, data.experience.length);
  for (const fontSize of FONT_SIZES) {
    for (let n = maxJobs; n >= 1; n--) {
      out.push({ fontSize, experienceCount: n, bulletTrimFromLast: 0 });
    }
  }
  const smallestJobBullets = data.experience[0]?.bullets.length ?? 0;
  for (let trim = 1; trim < smallestJobBullets; trim++) {
    out.push({
      fontSize: FONT_SIZES[FONT_SIZES.length - 1],
      experienceCount: 1,
      bulletTrimFromLast: trim,
    });
  }
  return out;
}

export function applyCandidate(data: ResumeJson, c: Candidate): ResumeRenderConfig {
  const experience = data.experience.slice(0, c.experienceCount).map((job, idx, arr) => {
    const isOldest = idx === arr.length - 1;
    if (!isOldest || c.bulletTrimFromLast <= 0) return job;
    const keep = Math.max(1, job.bullets.length - c.bulletTrimFromLast);
    return { ...job, bullets: job.bullets.slice(0, keep) };
  });
  return { fontSize: c.fontSize, experience };
}

type PdfItem = { x: number; y: number; width: number; height: number; str: string };

export function detectOverlap(items: PdfItem[], minOverlapPt = 2): boolean {
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (!a.str.trim()) continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (!b.str.trim()) continue;
      const yTolerance = Math.min(a.height, b.height) * 0.7 || 6;
      if (Math.abs(a.y - b.y) > yTolerance) continue;
      const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      if (xOverlap > minOverlapPt) return true;
    }
  }
  return false;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }
  return pdfjs;
}

async function inspectPdf(blob: Blob): Promise<{ pageCount: number; overlap: boolean }> {
  const pdfjs = await loadPdfjs();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    const pageCount = pdf.numPages;
    let overlap = false;
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items: PdfItem[] = content.items
        .map((raw) => {
          const it = raw as { transform?: number[]; width?: number; height?: number; str?: string };
          if (!it.transform || typeof it.str !== "string") return null;
          return {
            x: it.transform[4],
            y: it.transform[5],
            width: it.width ?? 0,
            height: it.height ?? 0,
            str: it.str,
          };
        })
        .filter((v): v is PdfItem => v !== null);
      if (detectOverlap(items)) {
        overlap = true;
        break;
      }
    }
    return { pageCount, overlap };
  } finally {
    await pdf.cleanup();
    await pdf.destroy();
  }
}

type Renderer = (data: ResumeJson, config: ResumeRenderConfig) => Promise<Blob>;

const defaultRenderer: Renderer = async (data, config) => {
  const [{ pdf }, { ResumeDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/app/preview/_components/ResumeDocument"),
  ]);
  return pdf(<ResumeDocument data={data} config={config} />).toBlob();
};

export async function fitResume(
  data: ResumeJson,
  options: { renderer?: Renderer; inspector?: typeof inspectPdf } = {}
): Promise<FitResult> {
  const renderer = options.renderer ?? defaultRenderer;
  const inspector = options.inspector ?? inspectPdf;
  const candidates = generateCandidates(data);

  let lastBlob: Blob | null = null;
  let lastConfig: ResumeRenderConfig | null = null;
  let attempts = 0;

  for (const candidate of candidates) {
    attempts++;
    const config = applyCandidate(data, candidate);
    const blob = await renderer(data, config);
    lastBlob = blob;
    lastConfig = config;
    const { pageCount, overlap } = await inspector(blob);
    if (!overlap && pageCount === 1) {
      return { blob, config, fits: true, attempts };
    }
  }

  return {
    blob: lastBlob!,
    config: lastConfig!,
    fits: false,
    attempts,
  };
}
