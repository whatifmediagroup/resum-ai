import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicLike } from "./claude";
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
): Anthropic.MessageParam[] {
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

function defaultClient(): AnthropicLike {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
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
  client: AnthropicLike = defaultClient()
): Promise<string[]> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const tool = buildSuggestSkillsTool();

  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model,
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: SKILL_SUGGEST_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: buildSuggestSkillsMessages(input),
    });
  } catch (err) {
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock =>
      b.type === "tool_use" && b.name === tool.name
  );
  if (!block) {
    throw new ResumeGenerationError("schema", "Claude did not call suggest_skills.");
  }

  const raw = block.input as { suggestions?: unknown };
  const arr = Array.isArray(raw?.suggestions) ? (raw.suggestions as unknown[]) : [];
  const cleaned = dedupeAgainst(
    arr.filter((s): s is string => typeof s === "string"),
    input.existingSkills
  );

  if (cleaned.length === 0) {
    throw new ResumeGenerationError("schema", "No usable suggestions returned.");
  }
  return cleaned;
}

export const __test__ = { dedupeAgainst };
