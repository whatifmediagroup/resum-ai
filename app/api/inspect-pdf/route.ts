import { NextResponse } from "next/server";
import { detectOverlap, type PdfItem } from "@/lib/fitResume";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 });
  }

  let bytes: Uint8Array;
  try {
    const buf = await req.arrayBuffer();
    if (buf.byteLength === 0) {
      return NextResponse.json({ error: "empty-body" }, { status: 400 });
    }
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "file-too-large" }, { status: 413 });
    }
    bytes = new Uint8Array(buf);
  } catch {
    return NextResponse.json({ error: "invalid-body" }, { status: 400 });
  }

  try {
    const { extractTextItems } = await import("unpdf");
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
        return NextResponse.json({ pageCount: totalPages, overlap: true });
      }
    }
    return NextResponse.json({ pageCount: totalPages, overlap: false });
  } catch (err) {
    console.error("PDF inspection failed:", err);
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "inspect-failed", message }, { status: 422 });
  }
}
