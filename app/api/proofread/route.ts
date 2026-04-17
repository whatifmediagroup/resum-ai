import { NextResponse } from "next/server";
import { z } from "zod";
import { JobContextSchema } from "@/lib/schema";
import { ResumeGenerationError } from "@/lib/claude";
import { proofreadResume } from "@/lib/proofread";

export const runtime = "nodejs";

const BodySchema = z.object({
  resumeText: z.string().min(20, "Need at least 20 characters of resume text."),
  jobContext: JobContextSchema,
  nudge: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid-body", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const resume = await proofreadResume(parsed.data);
    return NextResponse.json(resume, { status: 200 });
  } catch (err) {
    if (err instanceof ResumeGenerationError) {
      const status = err.code === "upstream" ? 502 : 422;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
