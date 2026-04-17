import {
  generateObject,
  NoObjectGeneratedError,
  type LanguageModel,
  type ModelMessage,
  type SystemModelMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  MAX_SKILLS,
  ResumeJsonSchema,
  type JobContext,
  type ResumeJson,
} from "./schema";
import { capSkills, ResumeGenerationError } from "./claude";

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

function defaultModel(): LanguageModel {
  return anthropic(process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6");
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
): ModelMessage[] {
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
  model: LanguageModel = defaultModel()
): Promise<ResumeJson> {
  const system: SystemModelMessage = {
    role: "system",
    content: PROOFREAD_SYSTEM_PROMPT,
    providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
  };
  const baseMessages = buildProofreadMessages(input);

  const callOnce = (extra: ModelMessage[] = []) =>
    generateObject({
      model,
      schema: ResumeJsonSchema,
      schemaName: "emit_resume",
      schemaDescription: "Emit the tailored resume as structured data.",
      system: [system],
      messages: [...baseMessages, ...extra],
      maxOutputTokens: 4096,
      providerOptions: {
        anthropic: { structuredOutputMode: "jsonTool" },
      },
      experimental_repairText: async ({ text }) => {
        try {
          const obj = JSON.parse(text);
          return JSON.stringify(sanitizeProofreadOutput(obj));
        } catch {
          return null;
        }
      },
    });

  try {
    const { object } = await callOnce();
    return capSkills(object);
  } catch (err) {
    if (!NoObjectGeneratedError.isInstance(err)) {
      throw new ResumeGenerationError("upstream", (err as Error).message);
    }
    console.warn("[proofread] first pass schema validation failed:", err.message);
    const correction = `Your previous emit_resume arguments did not match the schema. Issues:
${err.message}

Call emit_resume again. Every required string MUST be non-empty — use "n/a" for missing fields. Every link in header.links MUST be a fully-qualified https:// URL or be omitted entirely.`;

    try {
      const { object } = await callOnce([
        { role: "user", content: correction },
      ]);
      return capSkills(object);
    } catch (retryErr) {
      if (NoObjectGeneratedError.isInstance(retryErr)) {
        console.warn("[proofread] retry schema validation failed:", retryErr.message);
        throw new ResumeGenerationError("schema", retryErr.message);
      }
      throw new ResumeGenerationError("upstream", (retryErr as Error).message);
    }
  }
}
