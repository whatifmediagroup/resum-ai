import Anthropic from "@anthropic-ai/sdk";
import {
  ResumeJsonSchema,
  type JobContext,
  type ResumeJson,
} from "./schema";
import {
  buildResumeTool,
  ResumeGenerationError,
  type AnthropicLike,
} from "./claude";

export const PROOFREAD_SYSTEM_PROMPT = `You are a professional resume editor. The user will provide the raw text of their existing resume plus an optional target job context. Your task is to:

- Fix grammar, spelling, and punctuation while preserving the candidate's voice.
- Tighten phrasing, lead bullets with strong verbs, and prefer measurable outcomes.
- Reorder skills so the most relevant to the target job come first when a target is given.
- Keep every bullet to 24 words or fewer.
- Do not invent experience, employers, titles, dates, or credentials. If a field is missing or unclear, omit it or use a clearly conservative placeholder ("n/a") only when the schema requires it.
- Return the cleaned resume by calling the emit_resume tool with the structured fields. Do not return prose.`;

export type ProofreadInput = {
  resumeText: string;
  jobContext: JobContext;
};

function defaultClient(): AnthropicLike {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function buildProofreadMessages(
  input: ProofreadInput
): Anthropic.MessageParam[] {
  const { resumeText, jobContext } = input;
  const ctx = {
    title: jobContext.title ?? null,
    keywords: jobContext.keywords ?? [],
    jobId: jobContext.jobId ?? null,
  };
  return [
    {
      role: "user",
      content: `Proofread and improve the following resume. Then call emit_resume with the structured result.

Job context:
${JSON.stringify(ctx, null, 2)}

Resume text:
"""
${resumeText.trim()}
"""`,
    },
  ];
}

export async function proofreadResume(
  input: ProofreadInput,
  client: AnthropicLike = defaultClient()
): Promise<ResumeJson> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const tool = buildResumeTool();

  const tryOnce = async (messages: Anthropic.MessageParam[]) =>
    client.messages.create({
      model,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: PROOFREAD_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages,
    });

  let response: Anthropic.Message;
  try {
    response = await tryOnce(buildProofreadMessages(input));
  } catch (err) {
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name
  );
  if (!toolBlock) {
    throw new ResumeGenerationError("schema", "Claude did not call emit_resume.");
  }

  const parsed = ResumeJsonSchema.safeParse(toolBlock.input);
  if (parsed.success) return parsed.data;

  const retryMessages: Anthropic.MessageParam[] = [
    ...buildProofreadMessages(input),
    {
      role: "user",
      content:
        "Your previous emit_resume arguments did not match the schema. Call emit_resume again and ensure every required field is present and non-empty.",
    },
  ];

  let retry: Anthropic.Message;
  try {
    retry = await tryOnce(retryMessages);
  } catch (err) {
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const retryBlock = retry.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name
  );
  if (!retryBlock) {
    throw new ResumeGenerationError("schema", "Claude did not call emit_resume on retry.");
  }

  const retryParsed = ResumeJsonSchema.safeParse(retryBlock.input);
  if (!retryParsed.success) {
    throw new ResumeGenerationError("schema", retryParsed.error.message);
  }
  return retryParsed.data;
}
