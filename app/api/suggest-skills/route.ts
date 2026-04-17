import { NextResponse } from "next/server";
import { z } from "zod";
import { ResumeGenerationError } from "@/lib/claude";
import { suggestSkills } from "@/lib/skillSuggest";

export const runtime = "nodejs";

const BodySchema = z.object({
  baseSkill: z.string().trim().min(1, "baseSkill is required."),
  targetTitle: z.string().trim().optional(),
  targetPitch: z.string().trim().optional(),
  existingSkills: z.array(z.string()).default([]),
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
    const suggestions = await suggestSkills(parsed.data);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (err) {
    if (err instanceof ResumeGenerationError) {
      const status = err.code === "upstream" ? 502 : 422;
      return NextResponse.json({ error: err.code, message: err.message }, { status });
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
