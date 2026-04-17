import Anthropic from "@anthropic-ai/sdk";
import {
  ResumeJsonSchema,
  type FormData,
  type JobContext,
  type ResumeJson,
} from "./schema";

export const SYSTEM_PROMPT = `You are a professional resume writer. Given the applicant's raw data and the target job context, produce a tailored resume as structured output matching the provided tool schema.

Rules:
- Rewrite bullets to emphasize the job keywords where truthful.
- Do not invent experience, companies, titles, or dates.
- Keep each bullet to 24 words or fewer and start with a strong verb.
- Summary is 2-3 sentences, written in the first person without "I".
- Reorder and prioritize skills so the most relevant to the target job come first.`;

type MinimalInputSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

function resumeJsonSchemaAsJsonSchema(): MinimalInputSchema {
  return {
    type: "object",
    properties: {
      header: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          contact: {
            type: "object",
            properties: {
              phone: { type: "string" },
              email: { type: "string" },
              location: { type: "string" },
            },
            required: ["phone", "email", "location"],
          },
          links: {
            type: "object",
            properties: {
              linkedIn: { type: "string" },
              portfolio: { type: "string" },
              github: { type: "string" },
            },
          },
        },
        required: ["fullName", "contact", "links"],
      },
      summary: { type: "string" },
      experience: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            title: { type: "string" },
            dates: { type: "string" },
            bullets: { type: "array", items: { type: "string" }, minItems: 1 },
          },
          required: ["company", "title", "dates", "bullets"],
        },
        minItems: 1,
      },
      education: {
        type: "array",
        items: {
          type: "object",
          properties: {
            institution: { type: "string" },
            credential: { type: "string" },
            dates: { type: "string" },
          },
          required: ["institution", "credential", "dates"],
        },
        minItems: 1,
      },
      skills: { type: "array", items: { type: "string" }, minItems: 1 },
    },
    required: ["header", "summary", "experience", "education", "skills"],
  };
}

export function buildResumeTool() {
  return {
    name: "emit_resume" as const,
    description: "Emit the tailored resume as structured data.",
    input_schema: resumeJsonSchemaAsJsonSchema(),
  };
}

export type GenerateInput = {
  jobContext: JobContext;
  formData: FormData;
  nudge?: string;
};

export function buildMessages(input: GenerateInput): Anthropic.MessageParam[] {
  const body = {
    jobContext: input.jobContext,
    formData: input.formData,
  };
  const nudgeLine = input.nudge ? `\n\nUser nudge: ${input.nudge}` : "";
  return [
    {
      role: "user",
      content: `Produce a tailored resume from the following data.${nudgeLine}\n\n${JSON.stringify(body, null, 2)}`,
    },
  ];
}

export type AnthropicLike = {
  messages: {
    create(args: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
};

function defaultClient(): AnthropicLike {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export class ResumeGenerationError extends Error {
  constructor(public readonly code: "upstream" | "schema", message: string) {
    super(message);
  }
}

export async function generateResume(
  input: GenerateInput,
  client: AnthropicLike = defaultClient()
): Promise<ResumeJson> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
  const tool = buildResumeTool();

  const tryOnce = async (messages: Anthropic.MessageParam[]) =>
    client.messages.create({
      model,
      max_tokens: 4096,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages,
    });

  let response: Anthropic.Message;
  try {
    response = await tryOnce(buildMessages(input));
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
    ...buildMessages(input),
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
