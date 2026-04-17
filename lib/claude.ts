import Anthropic from "@anthropic-ai/sdk";
import {
  MAX_SKILLS,
  ResumeJsonSchema,
  type FormData,
  type JobContext,
  type ResumeJson,
} from "./schema";

export const SYSTEM_PROMPT = `# Resume Generation System Prompt

You are a professional resume writer specializing in tailoring resumes to specific job opportunities. Your task is to generate a polished, ATS-friendly resume that strategically highlights the candidate's experience and skills in alignment with the target job(s).

## Input Format
You will receive a JSON payload containing:
1. **formData** (structured candidate data):
   - identity: fullName, phone, email, location
   - target: title, pitch
   - recentJob: company, title, start, end, current, description (may be empty if candidate skipped)
   - priorJobs: array of earlier roles with same shape as recentJob (may be empty)
   - education: array of { institution, credential, start, end } (may be empty)
   - skills: array of strings
   - links: { linkedIn, portfolio, github } (all optional)
2. **jobContext**: title, keywords[], jobId — the target role the resume is being tailored for.
3. Optional user **nudge** guiding the revision.

## Output
Emit the resume by calling the \`emit_resume\` tool. The tool schema is the source of truth for output shape. Populate every required field.

## Content Strategy
- **Keyword alignment:** Extract keywords from jobContext.title + jobContext.keywords and weave them naturally into the summary and experience bullets. Prioritize exact title matches, required technical skills, industry terminology, and metrics/outcomes.
- **Summary:** 2–3 sentences positioning the candidate for the target role. Active voice, no "I". Include 2–3 top keywords. Use the candidate's target.pitch as the seed.
- **Experience bullets:**
  - Start with strong action verbs (Led, Designed, Developed, Optimized, Increased, etc.).
  - Follow with result or impact (metrics, percentage improvements, scope) when present.
  - Keep each bullet to 24 words or fewer; concise beats detailed.
  - Reorder bullets by relevance to the target job (most relevant first).
  - Amplify the candidate's own descriptions; never fabricate experience, employers, titles, or dates.
  - Use past tense for all bullets; recentJob with current=true may use present tense.
- **Education:** include institution + credential + dates. Omit GPA. Order most-recent first.
- **Skills:** prioritize skills that appear in the job description. Return a MAXIMUM of 15 skills, ordered by relevance (most relevant first). Drop low-signal skills rather than truncating arbitrarily.

## Page Length & Prioritization
- Target one page (standard 8.5"×11", 1" margins, 10–11pt).
- Include the recent role first, then priorJobs most-relevant/recent first.
- If space is tight: condense or omit the oldest priorJobs entirely rather than trimming bullets on recent, relevant ones.
- Trim skills to the most relevant 10–12 if the resume overflows; never exceed 15.

## Tone & Voice
- Professional, achievement-focused, confident but not boastful.
- ATS-friendly: plain text, no special characters, tables, or graphics.
- Avoid generic phrases ("hard worker", "team player").

## Edge Cases
- **Missing contact fields:** omit from header; never fabricate.
- **Sparse job description:** infer reasonable accomplishments from the title + industry; do not invent specifics.
- **Empty recentJob (skipped):** use priorJobs only. If priorJobs is also empty, output at least one experience entry derived from target.pitch framed as objective/summary-style, clearly not invented history.
- **Empty education array:** pass an empty array — do not fabricate institutions or credentials.
- **No skills provided:** infer 5–8 key skills from the work experience that align with the target job.

## Consistency
- Consistent date formatting (e.g., "Jan 2020 – Present" or "2021 – 2024").
- Consistent tense across bullets within a role.
- Do not include empty strings; if a field is unknown, omit it where the tool schema permits.
- Output keyword-rich text that still reads naturally — no keyword stuffing.`;

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
      },
      skills: {
        type: "array",
        items: { type: "string" },
        minItems: 1,
        maxItems: MAX_SKILLS,
      },
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

export function capSkills(resume: ResumeJson): ResumeJson {
  if (resume.skills.length <= MAX_SKILLS) return resume;
  return { ...resume, skills: resume.skills.slice(0, MAX_SKILLS) };
}

function stripEmptyOptionalUrls(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const obj = input as Record<string, unknown>;
  const header = obj.header as Record<string, unknown> | undefined;
  if (header && typeof header === "object") {
    const links = header.links as Record<string, unknown> | undefined;
    if (links && typeof links === "object") {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(links)) {
        if (typeof v === "string" && v.trim().length > 0) cleaned[k] = v.trim();
      }
      header.links = cleaned;
    }
  }
  return obj;
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
    console.error("[generateResume] upstream error:", err);
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const toolBlock = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name
  );
  if (!toolBlock) {
    console.error("[generateResume] no tool_use block. stop_reason:", response.stop_reason, "content:", JSON.stringify(response.content));
    throw new ResumeGenerationError("schema", "Claude did not call emit_resume.");
  }

  const firstInput = stripEmptyOptionalUrls(toolBlock.input);
  const parsed = ResumeJsonSchema.safeParse(firstInput);
  if (parsed.success) return capSkills(parsed.data);
  console.error("[generateResume] first attempt schema fail:", JSON.stringify(parsed.error.issues), "input:", JSON.stringify(toolBlock.input));

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
    console.error("[generateResume] retry upstream error:", err);
    throw new ResumeGenerationError("upstream", (err as Error).message);
  }

  const retryBlock = retry.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name
  );
  if (!retryBlock) {
    console.error("[generateResume] retry had no tool_use block. stop_reason:", retry.stop_reason, "content:", JSON.stringify(retry.content));
    throw new ResumeGenerationError("schema", "Claude did not call emit_resume on retry.");
  }

  const retryInput = stripEmptyOptionalUrls(retryBlock.input);
  const retryParsed = ResumeJsonSchema.safeParse(retryInput);
  if (!retryParsed.success) {
    console.error("[generateResume] retry schema fail:", JSON.stringify(retryParsed.error.issues), "input:", JSON.stringify(retryBlock.input));
    throw new ResumeGenerationError("schema", retryParsed.error.message);
  }
  return capSkills(retryParsed.data);
}
