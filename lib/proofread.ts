import Anthropic from "@anthropic-ai/sdk";
import {
  MAX_SKILLS,
  ResumeJsonSchema,
  type JobContext,
  type ResumeJson,
} from "./schema";
import {
  buildResumeTool,
  capSkills,
  ResumeGenerationError,
  type AnthropicLike,
} from "./claude";

export const PROOFREAD_SYSTEM_PROMPT = `You are a professional resume editor. The user will provide the raw text of their existing resume plus an optional target job context.

Your task is to clean up the resume and emit it through the emit_resume tool. Follow these rules strictly:

EDITING RULES
- Fix grammar, spelling, and punctuation while preserving the candidate's voice.
- Tighten phrasing, lead bullets with strong verbs, and prefer measurable outcomes.
- Reorder skills so the most relevant to the target job come first when a target is given.
- Keep every bullet to 24 words or fewer.
- Do not invent experience, employers, titles, dates, or credentials.

REQUIRED FIELD HANDLING — every required field MUST be populated with a non-empty string:
- header.fullName: extract the candidate's name; if truly absent, use "Unknown".
- header.contact.phone, header.contact.email, header.contact.location: if a value is not in the resume, use the literal string "n/a". Email must look like an email; if there is no real email use "unknown@example.com".
- experience: include at least one entry. Every entry needs company, title, dates, and at least one bullet. If something is missing, write "n/a". If the resume contains no work history at all, emit a single entry { company: "n/a", title: "n/a", dates: "n/a", bullets: ["No prior experience listed."] }.
- education: include at least one entry with institution and credential. Dates are OPTIONAL — include the dates field only when the resume text contains real dates for that entry; omit the dates key entirely when absent (never emit "n/a" or other placeholders for dates). Use "n/a" only for missing institution or credential. If no education is listed at all, emit [{ institution: "n/a", credential: "n/a" }].
- skills: include at least one skill string; if none are present, infer one or two from the experience text or use ["n/a"]. Return a MAXIMUM of 15 skills, ordered by relevance to the target job (most relevant first). If the resume lists more than 15, keep the 15 most relevant and drop the rest.

LINKS — header.links keys (linkedIn, portfolio, github) are OPTIONAL:
- Only include a link if it is a fully-qualified absolute URL starting with "https://" or "http://".
- If you only have a bare host like "linkedin.com/in/foo", prefix it with "https://".
- If a link is unparseable, OMIT that key entirely. Never emit empty strings or "n/a" for link values.

Call emit_resume with the structured fields. Do not return prose.`;

export type ProofreadInput = {
  resumeText: string;
  jobContext: JobContext;
  nudge?: string;
};

function defaultClient(): AnthropicLike {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const URL_RE = /^https?:\/\//i;
const BARE_DOMAIN_RE = /^[\w-]+(\.[\w-]+)+(\/.*)?$/;

function coerceUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (v.toLowerCase() === "n/a") return undefined;
  if (URL_RE.test(v)) return v;
  if (BARE_DOMAIN_RE.test(v)) return `https://${v}`;
  return undefined;
}

function asNonEmptyString(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return v.length > 0 ? v : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

type AnyRecord = Record<string, unknown>;

/**
 * Best-effort cleanup of Claude's emit_resume payload before strict zod validation.
 * Coerces bare-domain links to absolute URLs, drops unparseable links, and fills
 * empty required strings with "n/a" so a sparse resume can still produce a valid
 * ResumeJson the rest of the app understands.
 */
export function sanitizeProofreadOutput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const out = { ...(raw as AnyRecord) };

  const headerIn = (out.header as AnyRecord) ?? {};
  const contactIn = (headerIn.contact as AnyRecord) ?? {};
  const linksIn = (headerIn.links as AnyRecord) ?? {};

  const links: AnyRecord = {};
  const linkedIn = coerceUrl(linksIn.linkedIn);
  const portfolio = coerceUrl(linksIn.portfolio);
  const github = coerceUrl(linksIn.github);
  if (linkedIn) links.linkedIn = linkedIn;
  if (portfolio) links.portfolio = portfolio;
  if (github) links.github = github;

  out.header = {
    fullName: asNonEmptyString(headerIn.fullName, "Unknown"),
    contact: {
      phone: asNonEmptyString(contactIn.phone, "n/a"),
      email: asNonEmptyString(contactIn.email, "unknown@example.com"),
      location: asNonEmptyString(contactIn.location, "n/a"),
    },
    links,
  };

  out.summary = asNonEmptyString(out.summary, "n/a");

  const experience = Array.isArray(out.experience) ? out.experience : [];
  const cleanedExperience = experience.map((e) => {
    const item = (e as AnyRecord) ?? {};
    const bullets = asStringArray(item.bullets);
    return {
      company: asNonEmptyString(item.company, "n/a"),
      title: asNonEmptyString(item.title, "n/a"),
      dates: asNonEmptyString(item.dates, "n/a"),
      bullets: bullets.length > 0 ? bullets : ["n/a"],
    };
  });
  out.experience =
    cleanedExperience.length > 0
      ? cleanedExperience
      : [{ company: "n/a", title: "n/a", dates: "n/a", bullets: ["No prior experience listed."] }];

  const education = Array.isArray(out.education) ? out.education : [];
  const cleanedEducation = education.map((e) => {
    const item = (e as AnyRecord) ?? {};
    const dates =
      typeof item.dates === "string" ? item.dates.trim() : "";
    const entry: AnyRecord = {
      institution: asNonEmptyString(item.institution, "n/a"),
      credential: asNonEmptyString(item.credential, "n/a"),
    };
    if (dates && dates.toLowerCase() !== "n/a") entry.dates = dates;
    return entry;
  });
  out.education =
    cleanedEducation.length > 0
      ? cleanedEducation
      : [{ institution: "n/a", credential: "n/a" }];

  const skills = asStringArray(out.skills);
  const nonEmpty = skills.length > 0 ? skills : ["n/a"];
  out.skills = nonEmpty.slice(0, MAX_SKILLS);

  return out;
}

export function buildProofreadMessages(
  input: ProofreadInput
): Anthropic.MessageParam[] {
  const { resumeText, jobContext, nudge } = input;
  const ctx = {
    title: jobContext.title ?? null,
    keywords: jobContext.keywords ?? [],
    jobId: jobContext.jobId ?? null,
  };
  const nudgeBlock = nudge?.trim()
    ? `\n\nUser nudge for this revision: ${nudge.trim()}`
    : "";
  return [
    {
      role: "user",
      content: `Proofread and improve the following resume. Then call emit_resume with the structured result.${nudgeBlock}

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

  const firstParsed = ResumeJsonSchema.safeParse(
    sanitizeProofreadOutput(toolBlock.input)
  );
  if (firstParsed.success) return capSkills(firstParsed.data);

  console.warn(
    "[proofread] first pass schema validation failed:",
    JSON.stringify(firstParsed.error.issues, null, 2)
  );

  const retryMessages: Anthropic.MessageParam[] = [
    ...buildProofreadMessages(input),
    {
      role: "user",
      content: `Your previous emit_resume arguments did not match the schema. Issues:
${JSON.stringify(firstParsed.error.issues, null, 2)}

Call emit_resume again. Every required string MUST be non-empty — use "n/a" for missing fields. Every link in header.links MUST be a fully-qualified https:// URL or be omitted entirely.`,
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

  const retryParsed = ResumeJsonSchema.safeParse(
    sanitizeProofreadOutput(retryBlock.input)
  );
  if (!retryParsed.success) {
    console.warn(
      "[proofread] retry schema validation failed:",
      JSON.stringify(retryParsed.error.issues, null, 2)
    );
    throw new ResumeGenerationError("schema", retryParsed.error.message);
  }
  return capSkills(retryParsed.data);
}
