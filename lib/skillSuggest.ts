import { generateObject, NoObjectGeneratedError, type LanguageModel, type ModelMessage, type SystemModelMessage } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { ResumeGenerationError } from "./claude";

export const SKILL_SUGGEST_SYSTEM_PROMPT = `You suggest 3-5 short, professionally-relevant resume skills (1-3 words each) that complement the candidate's existing skill list, prioritizing relevance to their target role.

Rules:
- Use canonical capitalization (e.g. "PostgreSQL", "Kubernetes", "TypeScript", "REST APIs").
- Suggestions must be DISTINCT from the candidate's existing skills (case-insensitive).
- Suggestions must be tightly related to the "base skill" the candidate just typed and to the target role/pitch when provided.
- Prefer concrete tools, frameworks, libraries, languages, and well-known concepts over vague phrases like "problem solving".
- Always call the suggest_skills tool. Never return prose.`;

export type SkillSuggestInput = {
  baseSkill: string;
  targetTitle?: string;
  targetPitch?: string;
  existingSkills: string[];
};

const SuggestSkillsSchema = z.object({
  suggestions: z.array(z.string()).min(1).max(5),
});

type MinimalInputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export function buildSuggestSkillsTool() {
  const schema: MinimalInputSchema = {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: 5,
      },
    },
    required: ["suggestions"],
  };
  return {
    name: "suggest_skills" as const,
    description: "Emit related professional skills relevant to the target role.",
    input_schema: schema,
  };
}

export function buildSuggestSkillsMessages(
  input: SkillSuggestInput
): ModelMessage[] {
  const body = {
    baseSkill: input.baseSkill,
    targetTitle: input.targetTitle ?? null,
    targetPitch: input.targetPitch ?? null,
    existingSkills: input.existingSkills,
  };
  return [
    {
      role: "user",
      content: `Suggest 3-5 related skills the candidate might add. Call suggest_skills with the result.

Context:
${JSON.stringify(body, null, 2)}`,
    },
  ];
}

function defaultModel(): LanguageModel {
  return anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6");
}

function dedupeAgainst(suggestions: string[], existing: string[]): string[] {
  const taken = new Set(existing.map((s) => s.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of suggestions) {
    const v = typeof raw === "string" ? raw.trim() : "";
    if (!v) continue;
    const k = v.toLowerCase();
    if (taken.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= 5) break;
  }
  return out;
}

export async function suggestSkills(
  input: SkillSuggestInput,
  model: LanguageModel = defaultModel()
): Promise<string[]> {
  const system: SystemModelMessage = {
    role: "system",
    content: SKILL_SUGGEST_SYSTEM_PROMPT,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
  };

  let object: z.infer<typeof SuggestSkillsSchema>;
  try {
    const result = await generateObject({
      model,
      schema: SuggestSkillsSchema,
      schemaName: "suggest_skills",
      schemaDescription: "Emit related professional skills relevant to the target role.",
      system: [system],
      messages: buildSuggestSkillsMessages(input),
      maxOutputTokens: 512,
      providerOptions: {
        anthropic: { structuredOutputMode: "jsonTool" },
      },
    });
    object = result.object;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      throw new ResumeGenerationError("schema", err.message);
    }
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const cleaned = dedupeAgainst(object.suggestions, input.existingSkills);
  if (cleaned.length === 0) {
    throw new ResumeGenerationError("schema", "No usable suggestions returned.");
  }
  return cleaned;
}

export const __test__ = { dedupeAgainst };
