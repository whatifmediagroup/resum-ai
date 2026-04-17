import { NextResponse } from "next/server";
import { z } from "zod";
import { FormDataSchema, JobContextSchema } from "@/lib/schema";
import { generateResume, ResumeGenerationError } from "@/lib/claude";

export const runtime = "nodejs";

const BodySchema = z.object({
  formData: FormDataSchema,
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
    return NextResponse.json({ error: "invalid-body", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const resume = await generateResume(parsed.data);
    return NextResponse.json(resume, { status: 200 });
  } catch (err) {
    if (err instanceof ResumeGenerationError) {
      const status = err.code === "upstream" ? 502 : 422;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
