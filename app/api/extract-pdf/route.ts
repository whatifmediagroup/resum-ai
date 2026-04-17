import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request): Promise<Response> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid-form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty-file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file-too-large" }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  try {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(data, { mergePages: true });
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "no-text", message: "This PDF appears to be scanned or image-only." }, { status: 422 });
    }
    return NextResponse.json({ text: trimmed }, { status: 200 });
  } catch (err) {
    console.error("PDF extraction failed:", err);
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "parse-failed", message }, { status: 422 });
  }
}
