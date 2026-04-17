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
  const smallestFont = FONT_SIZES[FONT_SIZES.length - 1];
  for (let n = maxJobs; n >= 1; n--) {
    for (const fontSize of FONT_SIZES) {
      out.push({ fontSize, experienceCount: n, bulletTrimFromLast: 0 });
    }
    const oldestKeptBullets = data.experience[n - 1]?.bullets.length ?? 0;
    for (let trim = 1; trim < oldestKeptBullets; trim++) {
      out.push({ fontSize: smallestFont, experienceCount: n, bulletTrimFromLast: trim });
    }
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
      const yTolerance = Math.min(Math.min(a.height, b.height) * 0.5, 3) || 3;
      if (Math.abs(a.y - b.y) > yTolerance) continue;
      const xOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      if (xOverlap > minOverlapPt) return true;
    }
  }
  return false;
}

async function inspectPdf(blob: Blob): Promise<{ pageCount: number; overlap: boolean }> {
  const { extractTextItems } = await import("unpdf");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { totalPages, items: pages } = await extractTextItems(bytes);
  for (const pageItems of pages) {
    const items: PdfItem[] = pageItems.map((it) => ({
      x: it.x,
      y: it.y,
      width: it.width,
      height: it.height,
      str: it.str,
    }));
    if (detectOverlap(items)) {
      return { pageCount: totalPages, overlap: true };
    }
  }
  return { pageCount: totalPages, overlap: false };
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
