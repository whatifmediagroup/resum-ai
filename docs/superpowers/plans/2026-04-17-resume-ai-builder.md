# Resume AI Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 16 SPA that collects resume data via a data-driven multi-step form, calls Claude (sonnet-4-6) through a server route to produce a tailored `ResumeJson`, renders it as a PDF with `@react-pdf/renderer`, and lets the user download it.

**Architecture:** All UI is client. One server route (`app/api/generate`) proxies Claude so `ANTHROPIC_API_KEY` stays off the client. Form state lives in a React context backed by `localStorage` keyed by `jobId`. Structured AI output via a forced tool call whose `input_schema` is the Zod-derived `ResumeJson` schema — so Claude's output is typed on arrival and our PDF renderer is just a projection.

**Tech Stack:** Next.js 16.2.4 (App Router) · React 19.2.4 · Tailwind v4 · Zod · `@anthropic-ai/sdk` · `@react-pdf/renderer` · Vitest + `@testing-library/react` for tests.

**Design doc:** `docs/superpowers/specs/2026-04-17-resume-ai-builder-design.md`.

**CRITICAL — Next.js version:** This project uses Next.js **16.2.4**. The project's `AGENTS.md` warns this version has breaking changes vs. training data. **Before writing any route handler, page, or server component, read the relevant doc in `node_modules/next/dist/docs/` after running `npm install`.** Examples: route handlers (`route-handlers.md`), server components, `searchParams` shape, dynamic APIs.

---

## File Structure

```
app/
  layout.tsx                               (KEEP — existing scaffold)
  globals.css                              (KEEP)
  page.tsx                                 (REPLACE — landing)
  build/
    page.tsx                               (CREATE — step router)
    _components/
      FormShell.tsx                        (CREATE)
      steps/
        index.ts                           (CREATE — StepDef[] registry)
        Identity.tsx                       (CREATE)
        Target.tsx                         (CREATE)
        RecentJob.tsx                      (CREATE)
        PriorJobs.tsx                      (CREATE)
        Education.tsx                      (CREATE)
        Skills.tsx                         (CREATE)
  preview/
    page.tsx                               (CREATE)
    _components/
      ResumeDocument.tsx                   (CREATE — @react-pdf doc)
      ResumePreview.tsx                    (CREATE — <PDFViewer/>)
  done/
    page.tsx                               (CREATE)
  api/
    generate/
      route.ts                             (CREATE — POST handler)

lib/
  schema.ts                                (CREATE — Zod schemas)
  jobContext.ts                            (CREATE — URL → JobContext)
  storage.ts                               (CREATE — localStorage wrapper)
  claude.ts                                (CREATE — server-only Anthropic wrapper)
  resumeContext.tsx                        (CREATE — React context)

tests/
  schema.test.ts                           (CREATE)
  jobContext.test.ts                       (CREATE)
  storage.test.ts                          (CREATE)
  claude.test.ts                           (CREATE)
  api-generate.test.ts                     (CREATE)
  ResumeDocument.test.tsx                  (CREATE)

vitest.config.ts                           (CREATE)
vitest.setup.ts                            (CREATE)
.env.local.example                         (CREATE)
.env.local                                 (CREATE — gitignored, user fills)
```

**Commit cadence:** every task ends with a commit. No feature branches for this plan — the team will coordinate branches separately.

---

## Task 1: Install dependencies and set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.env.local.example`
- Create: `.env.local`
- Modify: `.gitignore` (verify `.env.local` ignored)

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install zod @anthropic-ai/sdk @react-pdf/renderer
```

Expected: packages added to `dependencies`.

- [ ] **Step 2: Install dev deps**

Run:
```bash
npm install -D vitest @vitejs/plugin-react @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: packages added to `devDependencies`.

- [ ] **Step 3: Check Next.js 16 docs**

Run:
```bash
ls node_modules/next/dist/docs/
```

Read at least: `app-router/route-handlers.md` (or the file containing route-handler guidance) and the page/searchParams doc. Note any breaking changes vs. training-data Next.js. Do NOT skip this.

- [ ] **Step 4: Add test scripts to package.json**

Edit `package.json` `scripts`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
```

- [ ] **Step 6: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 7: Create `.env.local.example`**

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

- [ ] **Step 8: Create `.env.local`**

Write the same contents as `.env.local.example`. The user will replace `sk-ant-...` with a real key before running `npm run dev`. DO NOT commit `.env.local` — verify it is in `.gitignore`.

- [ ] **Step 9: Verify `.gitignore` ignores `.env.local`**

The default Next.js `.gitignore` includes `.env*.local`. Read it to confirm. If missing, add `.env*.local` on its own line.

- [ ] **Step 10: Verify setup**

Run:
```bash
npm run test
```

Expected: "No test files found" — that's fine; setup works.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts .env.local.example .gitignore
git commit -m "chore: install deps and configure Vitest"
```

---

## Task 2: Zod schemas (`lib/schema.ts`)

**Files:**
- Create: `tests/schema.test.ts`
- Create: `lib/schema.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/schema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  JobContextSchema,
  FormDataSchema,
  ResumeJsonSchema,
  type ResumeJson,
  type FormData,
} from "@/lib/schema";

const validFormData: FormData = {
  identity: { fullName: "Ada Lovelace", phone: "555-0100", email: "ada@example.com", location: "London" },
  target: { title: "Software Engineer", pitch: "Build things that matter." },
  recentJob: {
    company: "Analytical Engines Ltd",
    title: "Engineer",
    start: "2024-01",
    current: true,
    description: "Wrote algorithms.",
  },
  priorJobs: [],
  education: [
    { institution: "University of London", credential: "BSc Math", start: "2018-09", end: "2022-06" },
  ],
  skills: ["Algorithms", "Notation"],
  links: { linkedIn: "https://linkedin.com/in/ada" },
};

const validResumeJson: ResumeJson = {
  header: {
    fullName: "Ada Lovelace",
    contact: { phone: "555-0100", email: "ada@example.com", location: "London" },
    links: { linkedIn: "https://linkedin.com/in/ada" },
  },
  summary: "Engineer who writes clear algorithms.",
  experience: [
    { company: "Analytical Engines Ltd", title: "Engineer", dates: "2024-01 – Present", bullets: ["Wrote algorithms."] },
  ],
  education: [{ institution: "University of London", credential: "BSc Math", dates: "2018-09 – 2022-06" }],
  skills: ["Algorithms", "Notation"],
};

describe("schemas", () => {
  it("JobContextSchema accepts title/keywords/jobId", () => {
    const parsed = JobContextSchema.parse({ title: "SWE", keywords: ["python"], jobId: "123" });
    expect(parsed.keywords).toEqual(["python"]);
  });

  it("JobContextSchema allows missing title and jobId", () => {
    expect(() => JobContextSchema.parse({ keywords: [] })).not.toThrow();
  });

  it("FormDataSchema parses a valid payload", () => {
    expect(() => FormDataSchema.parse(validFormData)).not.toThrow();
  });

  it("FormDataSchema rejects missing required identity fields", () => {
    const bad = { ...validFormData, identity: { fullName: "", phone: "", email: "", location: "" } };
    expect(() => FormDataSchema.parse(bad)).toThrow();
  });

  it("ResumeJsonSchema parses a valid AI output", () => {
    expect(() => ResumeJsonSchema.parse(validResumeJson)).not.toThrow();
  });

  it("ResumeJsonSchema requires at least one experience entry", () => {
    const bad = { ...validResumeJson, experience: [] };
    expect(() => ResumeJsonSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
npm run test -- schema
```

Expected: FAIL — module `@/lib/schema` not found.

- [ ] **Step 3: Implement `lib/schema.ts`**

```ts
import { z } from "zod";

export const JobContextSchema = z.object({
  title: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  jobId: z.string().optional(),
});
export type JobContext = z.infer<typeof JobContextSchema>;

const JobSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().optional(),
  current: z.boolean(),
  description: z.string(),
});

const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  credential: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const FormDataSchema = z.object({
  identity: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    location: z.string().min(1),
  }),
  target: z.object({
    title: z.string().min(1),
    pitch: z.string().min(1),
  }),
  recentJob: JobSchema,
  priorJobs: z.array(JobSchema),
  education: z.array(EducationEntrySchema).min(1),
  skills: z.array(z.string().min(1)).min(1),
  links: z.object({
    linkedIn: z.string().url().optional(),
    portfolio: z.string().url().optional(),
    github: z.string().url().optional(),
  }),
});
export type FormData = z.infer<typeof FormDataSchema>;

export const ResumeJsonSchema = z.object({
  header: z.object({
    fullName: z.string().min(1),
    contact: z.object({
      phone: z.string().min(1),
      email: z.string().email(),
      location: z.string().min(1),
    }),
    links: z.object({
      linkedIn: z.string().url().optional(),
      portfolio: z.string().url().optional(),
      github: z.string().url().optional(),
    }),
  }),
  summary: z.string().min(1),
  experience: z
    .array(
      z.object({
        company: z.string().min(1),
        title: z.string().min(1),
        dates: z.string().min(1),
        bullets: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  education: z
    .array(
      z.object({
        institution: z.string().min(1),
        credential: z.string().min(1),
        dates: z.string().min(1),
      })
    )
    .min(1),
  skills: z.array(z.string().min(1)).min(1),
});
export type ResumeJson = z.infer<typeof ResumeJsonSchema>;

/**
 * Empty FormData used to initialize the context. Keeps step components
 * from branching on undefined shapes.
 */
export const emptyFormData: FormData = {
  identity: { fullName: "", phone: "", email: "", location: "" },
  target: { title: "", pitch: "" },
  recentJob: { company: "", title: "", start: "", current: true, description: "" },
  priorJobs: [],
  education: [],
  skills: [],
  links: {},
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
npm run test -- schema
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/schema.ts tests/schema.test.ts
git commit -m "feat: add Zod schemas for FormData, ResumeJson, JobContext"
```

---

## Task 3: URL param parser (`lib/jobContext.ts`)

**Files:**
- Create: `tests/jobContext.test.ts`
- Create: `lib/jobContext.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/jobContext.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseJobContext } from "@/lib/jobContext";

describe("parseJobContext", () => {
  it("parses title, comma-separated keywords, and jobId", () => {
    const params = new URLSearchParams("title=Software+Engineer&keywords=python,react&jobId=123");
    expect(parseJobContext(params)).toEqual({
      title: "Software Engineer",
      keywords: ["python", "react"],
      jobId: "123",
    });
  });

  it("returns empty keywords when param missing", () => {
    const params = new URLSearchParams("title=PM");
    expect(parseJobContext(params)).toEqual({ title: "PM", keywords: [] });
  });

  it("trims whitespace and drops empty keyword entries", () => {
    const params = new URLSearchParams("keywords=a,, b ,c");
    expect(parseJobContext(params).keywords).toEqual(["a", "b", "c"]);
  });

  it("accepts a plain Record for Next.js searchParams prop", () => {
    expect(parseJobContext({ title: "SWE", keywords: "go,rust", jobId: "42" })).toEqual({
      title: "SWE",
      keywords: ["go", "rust"],
      jobId: "42",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- jobContext
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/jobContext.ts`**

```ts
import { JobContextSchema, type JobContext } from "./schema";

type ParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(input: ParamsInput, key: string): string | undefined {
  if (input instanceof URLSearchParams) {
    return input.get(key) ?? undefined;
  }
  const v = input[key];
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}

export function parseJobContext(input: ParamsInput): JobContext {
  const raw = readParam(input, "keywords") ?? "";
  const keywords = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return JobContextSchema.parse({
    title: readParam(input, "title") || undefined,
    keywords,
    jobId: readParam(input, "jobId") || undefined,
  });
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm run test -- jobContext
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/jobContext.ts tests/jobContext.test.ts
git commit -m "feat: parse job context from URL params"
```

---

## Task 4: localStorage wrapper (`lib/storage.ts`)

**Files:**
- Create: `tests/storage.test.ts`
- Create: `lib/storage.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { readSession, writeSession, keyFor, clearSession } from "@/lib/storage";
import { emptyFormData } from "@/lib/schema";

beforeEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  it("keyFor prefers jobId, falls back to default", () => {
    expect(keyFor("abc123")).toBe("resume-ai:abc123");
    expect(keyFor(undefined)).toBe("resume-ai:default");
  });

  it("returns null when nothing saved", () => {
    expect(readSession("job1")).toBeNull();
  });

  it("round-trips a session", () => {
    const session = {
      jobContext: { title: "SWE", keywords: ["go"], jobId: "job1" },
      formData: emptyFormData,
      resumeJson: null,
      delivered: false,
    };
    writeSession("job1", session);
    expect(readSession("job1")).toEqual(session);
  });

  it("clearSession removes the entry", () => {
    writeSession("job1", {
      jobContext: { keywords: [] },
      formData: emptyFormData,
      resumeJson: null,
      delivered: false,
    });
    clearSession("job1");
    expect(readSession("job1")).toBeNull();
  });

  it("readSession returns null when stored JSON is corrupt", () => {
    localStorage.setItem("resume-ai:job1", "{not-json");
    expect(readSession("job1")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- storage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/storage.ts`**

```ts
import type { FormData, JobContext, ResumeJson } from "./schema";

export type Session = {
  jobContext: JobContext;
  formData: FormData;
  resumeJson: ResumeJson | null;
  delivered: boolean;
};

export function keyFor(jobId: string | undefined): string {
  return `resume-ai:${jobId && jobId.length > 0 ? jobId : "default"}`;
}

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const test = "__resume_ai_probe__";
    window.localStorage.setItem(test, "1");
    window.localStorage.removeItem(test);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSession(jobId: string | undefined): Session | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  const raw = ls.getItem(keyFor(jobId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function writeSession(jobId: string | undefined, session: Session): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.setItem(keyFor(jobId), JSON.stringify(session));
}

export function clearSession(jobId: string | undefined): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.removeItem(keyFor(jobId));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm run test -- storage
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/storage.ts tests/storage.test.ts
git commit -m "feat: add localStorage session wrapper keyed by jobId"
```

---

## Task 5: Claude wrapper (`lib/claude.ts`)

**Files:**
- Create: `tests/claude.test.ts`
- Create: `lib/claude.ts`

This task tests the **prompt builder** and **tool-schema builder** in isolation. The actual Anthropic call is wrapped behind a factory so the API-route test in Task 6 can inject a fake.

- [ ] **Step 1: Write the failing test**

Create `tests/claude.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildMessages,
  buildResumeTool,
  SYSTEM_PROMPT,
} from "@/lib/claude";

describe("claude helpers", () => {
  it("SYSTEM_PROMPT mentions 'do not invent'", () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain("do not invent");
  });

  it("buildResumeTool produces a tool with name emit_resume and an object schema", () => {
    const tool = buildResumeTool();
    expect(tool.name).toBe("emit_resume");
    expect(tool.input_schema.type).toBe("object");
    expect(tool.input_schema.properties).toHaveProperty("header");
    expect(tool.input_schema.properties).toHaveProperty("experience");
  });

  it("buildMessages embeds jobContext and formData as JSON", () => {
    const msgs = buildMessages({
      jobContext: { title: "SWE", keywords: ["go"], jobId: "1" },
      formData: {
        identity: { fullName: "Ada", phone: "x", email: "a@b.c", location: "L" },
        target: { title: "SWE", pitch: "p" },
        recentJob: { company: "C", title: "T", start: "2024", current: true, description: "d" },
        priorJobs: [],
        education: [{ institution: "I", credential: "C" }],
        skills: ["s"],
        links: {},
      },
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("jobContext");
    expect(text).toContain("Ada");
  });

  it("buildMessages appends the nudge when provided", () => {
    const msgs = buildMessages({
      jobContext: { keywords: [] },
      formData: {
        identity: { fullName: "A", phone: "x", email: "a@b.c", location: "L" },
        target: { title: "t", pitch: "p" },
        recentJob: { company: "C", title: "T", start: "2024", current: true, description: "d" },
        priorJobs: [],
        education: [{ institution: "I", credential: "C" }],
        skills: ["s"],
        links: {},
      },
      nudge: "make it shorter",
    });
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("make it shorter");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- claude
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/claude.ts`**

```ts
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
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

/**
 * Zod-to-JSON-Schema conversion. We emit only the subset Anthropic
 * needs; keep it in lockstep with ResumeJsonSchema.
 */
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

/**
 * Factory so tests can inject a fake Anthropic client. In production,
 * call generateResume() which lazy-creates a real one.
 */
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
      ] as unknown as string, // Anthropic SDK types accept block form at runtime.
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

  // Single retry with a reinforcement message appended.
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
```

**Note about the `system` line:** If the Anthropic SDK version installed rejects the block-form system array at compile time, simplify to a plain string:

```ts
system: SYSTEM_PROMPT,
```

Prompt caching on the system block is a nice-to-have; correctness is the priority. Remove the `cache_control` line if the SDK types complain.

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm run test -- claude
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/claude.ts tests/claude.test.ts
git commit -m "feat: add Claude prompt builder and tool-schema for emit_resume"
```

---

## Task 6: API route `/api/generate`

**Files:**
- Create: `tests/api-generate.test.ts`
- Create: `app/api/generate/route.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/api-generate.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateMock = vi.fn();
vi.mock("@/lib/claude", async (orig) => {
  const real = await orig<typeof import("@/lib/claude")>();
  return { ...real, generateResume: generateMock };
});

import { POST } from "@/app/api/generate/route";
import type { ResumeJson, FormData } from "@/lib/schema";

const validFormData: FormData = {
  identity: { fullName: "Ada", phone: "555", email: "a@b.c", location: "L" },
  target: { title: "SWE", pitch: "p" },
  recentJob: { company: "C", title: "T", start: "2024", current: true, description: "d" },
  priorJobs: [],
  education: [{ institution: "I", credential: "BSc" }],
  skills: ["s"],
  links: {},
};

const validResume: ResumeJson = {
  header: {
    fullName: "Ada",
    contact: { phone: "555", email: "a@b.c", location: "L" },
    links: {},
  },
  summary: "s",
  experience: [{ company: "C", title: "T", dates: "2024", bullets: ["b"] }],
  education: [{ institution: "I", credential: "BSc", dates: "n/a" }],
  skills: ["s"],
};

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  generateMock.mockReset();
});

describe("POST /api/generate", () => {
  it("returns 200 + ResumeJson on success", async () => {
    generateMock.mockResolvedValueOnce(validResume);
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(validResume);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq({ formData: { bogus: true }, jobContext: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 502 on upstream failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    generateMock.mockRejectedValueOnce(new ResumeGenerationError("upstream", "boom"));
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(502);
  });

  it("returns 422 on schema failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    generateMock.mockRejectedValueOnce(new ResumeGenerationError("schema", "bad"));
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(422);
  });

  it("passes nudge through to generateResume", async () => {
    generateMock.mockResolvedValueOnce(validResume);
    await POST(
      makeReq({ formData: validFormData, jobContext: { keywords: [] }, nudge: "shorter" })
    );
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({ nudge: "shorter" }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- api-generate
```

Expected: FAIL — module `@/app/api/generate/route` not found.

- [ ] **Step 3: Implement `app/api/generate/route.ts`**

```ts
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
```

**Version sanity check:** open `node_modules/next/dist/docs/app-router/route-handlers.md` (or the closest matching doc) and verify that:
(a) `export async function POST(req: Request)` with a `Response` return is still the correct signature, and
(b) `export const runtime = "nodejs"` is still the way to pin the runtime.
If Next.js 16 has changed either, update this file to match — the test pins the behavior, not the signature.

- [ ] **Step 4: Run tests to verify pass**

Run:
```bash
npm run test -- api-generate
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/generate/route.ts tests/api-generate.test.ts
git commit -m "feat: add /api/generate route with Zod validation and typed errors"
```

---

## Task 7: React context (`lib/resumeContext.tsx`)

**Files:**
- Create: `lib/resumeContext.tsx`

No unit test here — context behavior is exercised by form components in subsequent tasks. Keep it thin.

- [ ] **Step 1: Create `lib/resumeContext.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  emptyFormData,
  type FormData,
  type JobContext,
  type ResumeJson,
} from "./schema";
import { readSession, writeSession, type Session } from "./storage";

type Ctx = {
  jobContext: JobContext;
  setJobContext: (jc: JobContext) => void;
  formData: FormData;
  updateFormData: (patch: Partial<FormData>) => void;
  resumeJson: ResumeJson | null;
  setResumeJson: (r: ResumeJson | null) => void;
  delivered: boolean;
  setDelivered: (d: boolean) => void;
};

const ResumeCtx = createContext<Ctx | null>(null);

export function ResumeProvider({
  initialJobContext,
  children,
}: {
  initialJobContext: JobContext;
  children: ReactNode;
}) {
  const jobId = initialJobContext.jobId;
  const [state, setState] = useState<Session>(() => ({
    jobContext: initialJobContext,
    formData: emptyFormData,
    resumeJson: null,
    delivered: false,
  }));

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    const saved = readSession(jobId);
    if (saved) {
      setState((prev) => ({
        ...saved,
        jobContext: { ...saved.jobContext, ...initialJobContext },
        formData: { ...prev.formData, ...saved.formData },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist on every change.
  useEffect(() => {
    writeSession(jobId, state);
  }, [jobId, state]);

  const setJobContext = useCallback(
    (jc: JobContext) => setState((s) => ({ ...s, jobContext: jc })),
    []
  );
  const updateFormData = useCallback(
    (patch: Partial<FormData>) =>
      setState((s) => ({ ...s, formData: { ...s.formData, ...patch } })),
    []
  );
  const setResumeJson = useCallback(
    (r: ResumeJson | null) => setState((s) => ({ ...s, resumeJson: r })),
    []
  );
  const setDelivered = useCallback(
    (d: boolean) => setState((s) => ({ ...s, delivered: d })),
    []
  );

  const value = useMemo<Ctx>(
    () => ({
      jobContext: state.jobContext,
      setJobContext,
      formData: state.formData,
      updateFormData,
      resumeJson: state.resumeJson,
      setResumeJson,
      delivered: state.delivered,
      setDelivered,
    }),
    [state, setJobContext, updateFormData, setResumeJson, setDelivered]
  );

  return <ResumeCtx.Provider value={value}>{children}</ResumeCtx.Provider>;
}

export function useResume(): Ctx {
  const v = useContext(ResumeCtx);
  if (!v) throw new Error("useResume must be used inside <ResumeProvider>");
  return v;
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors in `lib/resumeContext.tsx`. Fix any issues before committing.

- [ ] **Step 3: Commit**

```bash
git add lib/resumeContext.tsx
git commit -m "feat: add ResumeProvider React context with localStorage hydration"
```

---

## Task 8: Step registry and step components

This task creates six step components plus the registry. Each step is a thin client component that reads `formData` from context and calls `updateFormData` on change. The registry is the only list of steps; `FormShell` and the router page read from it.

**Files:**
- Create: `app/build/_components/steps/index.ts`
- Create: `app/build/_components/steps/Identity.tsx`
- Create: `app/build/_components/steps/Target.tsx`
- Create: `app/build/_components/steps/RecentJob.tsx`
- Create: `app/build/_components/steps/PriorJobs.tsx`
- Create: `app/build/_components/steps/Education.tsx`
- Create: `app/build/_components/steps/Skills.tsx`

- [ ] **Step 1: Create `steps/Identity.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Identity() {
  const { formData, updateFormData } = useResume();
  const id = formData.identity;
  const set = (patch: Partial<FormData["identity"]>) =>
    updateFormData({ identity: { ...id, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Full name" value={id.fullName} onChange={(v) => set({ fullName: v })} />
      <Field label="Phone" value={id.phone} onChange={(v) => set({ phone: v })} />
      <Field label="Email" type="email" value={id.email} onChange={(v) => set({ email: v })} />
      <Field label="Location" value={id.location} onChange={(v) => set({ location: v })} />
    </div>
  );
}

export function validateIdentity(data: FormData): string[] {
  const errs: string[] = [];
  if (!data.identity.fullName) errs.push("fullName");
  if (!data.identity.phone) errs.push("phone");
  if (!/.+@.+\..+/.test(data.identity.email)) errs.push("email");
  if (!data.identity.location) errs.push("location");
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-300">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
```

- [ ] **Step 2: Create `steps/Target.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Target() {
  const { formData, updateFormData, jobContext } = useResume();
  const t = formData.target;
  const set = (patch: Partial<FormData["target"]>) =>
    updateFormData({ target: { ...t, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Desired title</span>
        <input
          value={t.title || jobContext.title || ""}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={jobContext.title}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Short pitch</span>
        <textarea
          rows={4}
          value={t.pitch}
          onChange={(e) => set({ pitch: e.target.value })}
          placeholder="One or two sentences about what you want to do next."
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    </div>
  );
}

export function validateTarget(data: FormData): string[] {
  const errs: string[] = [];
  if (!data.target.title) errs.push("title");
  if (!data.target.pitch) errs.push("pitch");
  return errs;
}
```

- [ ] **Step 3: Create `steps/RecentJob.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function RecentJob() {
  const { formData, updateFormData } = useResume();
  const j = formData.recentJob;
  const set = (patch: Partial<FormData["recentJob"]>) =>
    updateFormData({ recentJob: { ...j, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Company" value={j.company} onChange={(v) => set({ company: v })} />
      <Field label="Title" value={j.title} onChange={(v) => set({ title: v })} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start (YYYY-MM)" value={j.start} onChange={(v) => set({ start: v })} />
        <Field
          label="End (YYYY-MM)"
          value={j.end ?? ""}
          onChange={(v) => set({ end: v || undefined })}
          disabled={j.current}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={j.current}
          onChange={(e) => set({ current: e.target.checked, end: e.target.checked ? undefined : j.end })}
        />
        Currently work here
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Description / bullets (one per line)</span>
        <textarea
          rows={5}
          value={j.description}
          onChange={(e) => set({ description: e.target.value })}
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
    </div>
  );
}

export function validateRecentJob(data: FormData): string[] {
  const errs: string[] = [];
  const j = data.recentJob;
  if (!j.company) errs.push("company");
  if (!j.title) errs.push("title");
  if (!j.start) errs.push("start");
  if (!j.description) errs.push("description");
  if (!j.current && !j.end) errs.push("end");
  return errs;
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        className="rounded border border-zinc-300 px-3 py-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
```

- [ ] **Step 4: Create `steps/PriorJobs.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

type Job = FormData["priorJobs"][number];

const emptyJob: Job = { company: "", title: "", start: "", current: false, description: "" };

export function PriorJobs() {
  const { formData, updateFormData } = useResume();
  const jobs = formData.priorJobs;

  const replace = (idx: number, patch: Partial<Job>) => {
    const next = jobs.map((j, i) => (i === idx ? { ...j, ...patch } : j));
    updateFormData({ priorJobs: next });
  };
  const add = () => updateFormData({ priorJobs: [...jobs, emptyJob] });
  const remove = (idx: number) =>
    updateFormData({ priorJobs: jobs.filter((_, i) => i !== idx) });

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No earlier jobs? You can skip this step.
        </p>
        <button
          type="button"
          onClick={add}
          className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          Add earlier job
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {jobs.map((j, idx) => (
        <div key={idx} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Job {idx + 1}</h3>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Company" value={j.company} onChange={(v) => replace(idx, { company: v })} />
            <Input label="Title" value={j.title} onChange={(v) => replace(idx, { title: v })} />
            <Input label="Start" value={j.start} onChange={(v) => replace(idx, { start: v })} />
            <Input
              label="End"
              value={j.end ?? ""}
              onChange={(v) => replace(idx, { end: v || undefined })}
            />
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span>Description</span>
            <textarea
              rows={3}
              value={j.description}
              onChange={(e) => replace(idx, { description: e.target.value })}
              className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
      >
        Add another job
      </button>
    </div>
  );
}

export function validatePriorJobs(data: FormData): string[] {
  const errs: string[] = [];
  data.priorJobs.forEach((j, i) => {
    if (!j.company) errs.push(`priorJobs.${i}.company`);
    if (!j.title) errs.push(`priorJobs.${i}.title`);
    if (!j.start) errs.push(`priorJobs.${i}.start`);
    if (!j.description) errs.push(`priorJobs.${i}.description`);
  });
  return errs;
}

function Input(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
```

- [ ] **Step 5: Create `steps/Education.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

type Edu = FormData["education"][number];

const emptyEdu: Edu = { institution: "", credential: "", start: "", end: "" };

export function Education() {
  const { formData, updateFormData } = useResume();
  const edu = formData.education.length > 0 ? formData.education : [emptyEdu];

  const replace = (idx: number, patch: Partial<Edu>) => {
    const next = edu.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    updateFormData({ education: next });
  };
  const add = () => updateFormData({ education: [...edu, emptyEdu] });
  const remove = (idx: number) =>
    updateFormData({ education: edu.filter((_, i) => i !== idx) });

  return (
    <div className="flex flex-col gap-6">
      {edu.map((e, idx) => (
        <div key={idx} className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">Education {idx + 1}</h3>
            {edu.length > 1 ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Institution"
              value={e.institution}
              onChange={(v) => replace(idx, { institution: v })}
            />
            <Input
              label="Credential"
              value={e.credential}
              onChange={(v) => replace(idx, { credential: v })}
            />
            <Input
              label="Start"
              value={e.start ?? ""}
              onChange={(v) => replace(idx, { start: v || undefined })}
            />
            <Input
              label="End"
              value={e.end ?? ""}
              onChange={(v) => replace(idx, { end: v || undefined })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
      >
        Add another
      </button>
    </div>
  );
}

export function validateEducation(data: FormData): string[] {
  const errs: string[] = [];
  if (data.education.length === 0) errs.push("education.count");
  data.education.forEach((e, i) => {
    if (!e.institution) errs.push(`education.${i}.institution`);
    if (!e.credential) errs.push(`education.${i}.credential`);
  });
  return errs;
}

function Input(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label}</span>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
```

- [ ] **Step 6: Create `steps/Skills.tsx`**

```tsx
"use client";
import { useResume } from "@/lib/resumeContext";
import type { FormData } from "@/lib/schema";

export function Skills() {
  const { formData, updateFormData } = useResume();
  const skillsStr = formData.skills.join(", ");
  const links = formData.links;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span>Skills (comma-separated)</span>
        <input
          value={skillsStr}
          onChange={(e) =>
            updateFormData({
              skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <LinkField
        label="LinkedIn URL"
        value={links.linkedIn ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, linkedIn: v || undefined } })}
      />
      <LinkField
        label="Portfolio URL"
        value={links.portfolio ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, portfolio: v || undefined } })}
      />
      <LinkField
        label="GitHub URL"
        value={links.github ?? ""}
        onChange={(v) => updateFormData({ links: { ...links, github: v || undefined } })}
      />
    </div>
  );
}

export function validateSkills(data: FormData): string[] {
  const errs: string[] = [];
  if (data.skills.length === 0) errs.push("skills");
  return errs;
}

function LinkField(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{props.label} (optional)</span>
      <input
        type="url"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}
```

- [ ] **Step 7: Create `steps/index.ts` (the registry)**

```ts
import type { FC } from "react";
import type { FormData } from "@/lib/schema";
import { Identity, validateIdentity } from "./Identity";
import { Target, validateTarget } from "./Target";
import { RecentJob, validateRecentJob } from "./RecentJob";
import { PriorJobs, validatePriorJobs } from "./PriorJobs";
import { Education, validateEducation } from "./Education";
import { Skills, validateSkills } from "./Skills";

export type StepDef = {
  id: string;
  label: string;
  Component: FC;
  validate: (data: FormData) => string[];
};

export const steps: StepDef[] = [
  { id: "identity", label: "About you", Component: Identity, validate: validateIdentity },
  { id: "target", label: "Target role", Component: Target, validate: validateTarget },
  { id: "recent-job", label: "Current role", Component: RecentJob, validate: validateRecentJob },
  { id: "prior-jobs", label: "Earlier jobs", Component: PriorJobs, validate: validatePriorJobs },
  { id: "education", label: "Education", Component: Education, validate: validateEducation },
  { id: "skills", label: "Skills & links", Component: Skills, validate: validateSkills },
];

export function findStep(id: string): { step: StepDef; index: number } | null {
  const index = steps.findIndex((s) => s.id === id);
  if (index === -1) return null;
  return { step: steps[index], index };
}
```

- [ ] **Step 8: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add app/build/_components/steps
git commit -m "feat: add six resume steps and data-driven step registry"
```

---

## Task 9: FormShell

**Files:**
- Create: `app/build/_components/FormShell.tsx`

- [ ] **Step 1: Create `FormShell.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { steps, findStep } from "./steps";

export function FormShell({ currentId }: { currentId: string }) {
  const router = useRouter();
  const { formData, jobContext, resumeJson, setResumeJson } = useResume();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const here = useMemo(() => findStep(currentId), [currentId]);
  if (!here) {
    if (typeof window !== "undefined") router.replace(`/build?step=${steps[0].id}`);
    return null;
  }

  const { step, index } = here;
  const isLast = index === steps.length - 1;
  const errors = step.validate(formData);
  const canProceed = errors.length === 0;

  const goPrev = () => {
    if (index === 0) router.push("/");
    else router.push(`/build?step=${steps[index - 1].id}`);
  };

  const goNext = async () => {
    if (!canProceed) return;
    if (!isLast) {
      router.push(`/build?step=${steps[index + 1].id}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData, jobContext }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResumeJson(json);
      router.push("/preview");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <ProgressBar index={index} total={steps.length} />
      <h2 className="text-xl font-semibold">{step.label}</h2>
      <step.Component />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!canProceed ? (
        <p className="text-xs text-amber-600">Fill the required fields to continue.</p>
      ) : null}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          className="rounded border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!canProceed || submitting}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {isLast ? (submitting ? "Generating…" : "Generate resume") : "Next"}
        </button>
      </div>
      {resumeJson ? (
        <p className="text-xs text-zinc-500">
          A resume already exists for this session — clicking Generate will replace it.
        </p>
      ) : null}
    </div>
  );
}

function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded ${
            i <= index ? "bg-black dark:bg-white" : "bg-zinc-200 dark:bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/build/_components/FormShell.tsx
git commit -m "feat: add FormShell that drives steps from the registry"
```

---

## Task 10: Build page router

**Files:**
- Create: `app/build/page.tsx`

- [ ] **Step 1: Create `app/build/page.tsx`**

```tsx
import { Suspense } from "react";
import { FormShell } from "./_components/FormShell";
import { ResumeProvider } from "@/lib/resumeContext";
import { parseJobContext } from "@/lib/jobContext";
import { steps } from "./_components/steps";

// Next.js 16 note: confirm the searchParams prop shape in
// node_modules/next/dist/docs/ before modifying. If Next.js 16 has
// moved to a Promise-based searchParams, await it here.
export default async function BuildPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jobContext = parseJobContext(params);
  const stepParam = typeof params.step === "string" ? params.step : steps[0].id;

  return (
    <Suspense>
      <ResumeProvider initialJobContext={jobContext}>
        <main className="min-h-screen bg-zinc-50 dark:bg-black">
          <FormShell currentId={stepParam} />
        </main>
      </ResumeProvider>
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify searchParams shape in Next.js 16 docs**

Open `node_modules/next/dist/docs/` and search for "searchParams". Next.js 15 moved to Promise-based searchParams; confirm 16 still uses the same. If not, adjust the prop type.

- [ ] **Step 3: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/build/page.tsx
git commit -m "feat: add /build step router page"
```

---

## Task 11: ResumeDocument (PDF renderer)

**Files:**
- Create: `tests/ResumeDocument.test.tsx`
- Create: `app/preview/_components/ResumeDocument.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/ResumeDocument.test.tsx`. Test that `<ResumeDocument/>` can be instantiated with a valid fixture without throwing. We don't render the binary PDF; we just assert the React element tree is constructable.

```tsx
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { ResumeDocument } from "@/app/preview/_components/ResumeDocument";
import type { ResumeJson } from "@/lib/schema";

const fixture: ResumeJson = {
  header: {
    fullName: "Ada Lovelace",
    contact: { phone: "555-0100", email: "ada@example.com", location: "London" },
    links: { linkedIn: "https://linkedin.com/in/ada" },
  },
  summary: "Engineer who writes clear algorithms.",
  experience: [
    { company: "AE Ltd", title: "Engineer", dates: "2024 – Present", bullets: ["Designed the Analytical Engine."] },
  ],
  education: [{ institution: "U. London", credential: "BSc Math", dates: "2018–2022" }],
  skills: ["Algorithms", "Notation"],
};

describe("ResumeDocument", () => {
  it("constructs a React element tree for a valid fixture", () => {
    const el = createElement(ResumeDocument, { data: fixture });
    expect(el).toBeTruthy();
    expect(el.type).toBe(ResumeDocument);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm run test -- ResumeDocument
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ResumeDocument.tsx`**

```tsx
"use client";
import { Document, Page, Text, View, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResumeJson } from "@/lib/schema";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  name: { fontSize: 20, fontWeight: 700 },
  contact: { marginTop: 2, color: "#555", fontSize: 9 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottom: "1 solid #000",
    paddingBottom: 2,
    marginBottom: 6,
  },
  jobHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  jobTitle: { fontWeight: 700 },
  dates: { color: "#555" },
  bullet: { marginLeft: 10, marginTop: 2 },
  linkRow: { color: "#0645AD", fontSize: 9, marginTop: 2 },
});

export function ResumeDocument({ data }: { data: ResumeJson }) {
  const contactLine = [data.header.contact.phone, data.header.contact.email, data.header.contact.location]
    .filter(Boolean)
    .join("  •  ");

  const links = data.header.links;
  const linkEntries = [
    links.linkedIn && { label: "LinkedIn", href: links.linkedIn },
    links.portfolio && { label: "Portfolio", href: links.portfolio },
    links.github && { label: "GitHub", href: links.github },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{data.header.fullName}</Text>
        <Text style={styles.contact}>{contactLine}</Text>
        {linkEntries.length > 0 ? (
          <View style={styles.linkRow}>
            {linkEntries.map((l, i) => (
              <Link key={i} src={l.href}>
                {l.label}
                {i < linkEntries.length - 1 ? "  •  " : ""}
              </Link>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text>{data.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {data.experience.map((job, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>
                  {job.title} — {job.company}
                </Text>
                <Text style={styles.dates}>{job.dates}</Text>
              </View>
              {job.bullets.map((b, bi) => (
                <Text key={bi} style={styles.bullet}>
                  • {b}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {data.education.map((e, i) => (
            <View key={i} style={styles.jobHeader}>
              <Text style={styles.jobTitle}>
                {e.credential} — {e.institution}
              </Text>
              <Text style={styles.dates}>{e.dates}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text>{data.skills.join("  •  ")}</Text>
        </View>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Run test to verify pass**

Run:
```bash
npm run test -- ResumeDocument
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add app/preview/_components/ResumeDocument.tsx tests/ResumeDocument.test.tsx
git commit -m "feat: add @react-pdf ResumeDocument renderer"
```

---

## Task 12: ResumePreview + preview page

**Files:**
- Create: `app/preview/_components/ResumePreview.tsx`
- Create: `app/preview/page.tsx`

`@react-pdf/renderer` components (`PDFViewer`, `PDFDownloadLink`) touch browser-only APIs and should be dynamically imported with `{ ssr: false }`.

- [ ] **Step 1: Create `ResumePreview.tsx`**

```tsx
"use client";
import dynamic from "next/dynamic";
import type { ResumeJson } from "@/lib/schema";
import { ResumeDocument } from "./ResumeDocument";

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFViewer),
  { ssr: false, loading: () => <div className="h-[70vh] animate-pulse bg-zinc-100 dark:bg-zinc-900" /> }
);

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

export function ResumePreview({ data }: { data: ResumeJson }) {
  return (
    <div className="flex flex-col gap-4">
      <PDFViewer style={{ width: "100%", height: "70vh", border: 0 }}>
        <ResumeDocument data={data} />
      </PDFViewer>
      <PDFDownloadLink
        document={<ResumeDocument data={data} />}
        fileName={`${data.header.fullName.replace(/\s+/g, "_")}_resume.pdf`}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        {({ loading }) => (loading ? "Preparing…" : "Download PDF")}
      </PDFDownloadLink>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/preview/page.tsx`**

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useResume } from "@/lib/resumeContext";
import { ResumeProviderShell } from "./_shell";
import { ResumePreview } from "./_components/ResumePreview";
import { steps } from "@/app/build/_components/steps";

function PreviewInner() {
  const router = useRouter();
  const { formData, jobContext, resumeJson, setResumeJson, setDelivered } = useResume();
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState("");

  useEffect(() => {
    if (!resumeJson) router.replace(`/build?step=${steps[0].id}`);
  }, [resumeJson, router]);

  if (!resumeJson) return null;

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ formData, jobContext, nudge: nudge || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResumeJson(json);
      setNudge("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const markDelivered = () => {
    setDelivered(true);
    router.push("/done");
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Preview</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push(`/build?step=${steps[0].id}`)}
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
          >
            Edit answers
          </button>
        </div>
      </div>
      <ResumePreview data={resumeJson} />
      <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4 dark:border-zinc-800">
        <label className="text-sm">
          <span className="block mb-1">Regenerate with a nudge (optional)</span>
          <input
            value={nudge}
            onChange={(e) => setNudge(e.target.value)}
            placeholder='e.g. "make it more technical" or "shorten each bullet"'
            className="w-full rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="rounded border border-zinc-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700"
          >
            {regenerating ? "Regenerating…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={markDelivered}
            className="rounded bg-black px-3 py-2 text-sm text-white dark:bg-white dark:text-black"
          >
            I've downloaded it
          </button>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </main>
  );
}

export default function PreviewPage() {
  return (
    <ResumeProviderShell>
      <PreviewInner />
    </ResumeProviderShell>
  );
}
```

- [ ] **Step 3: Create `app/preview/_shell.tsx`**

The preview page is client-only and doesn't have access to `searchParams` the same way. We need a client-side provider that pulls the saved session from localStorage (since the user may land on `/preview` only after submitting the form).

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ResumeProvider } from "@/lib/resumeContext";
import { parseJobContext } from "@/lib/jobContext";
import type { JobContext } from "@/lib/schema";

export function ResumeProviderShell({ children }: { children: ReactNode }) {
  const [jc, setJc] = useState<JobContext | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setJc(parseJobContext(params));
  }, []);

  if (!jc) return null;
  return <ResumeProvider initialJobContext={jc}>{children}</ResumeProvider>;
}
```

- [ ] **Step 4: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/preview
git commit -m "feat: add /preview page with PDFViewer, regenerate, and download"
```

---

## Task 13: Landing page and Done page

**Files:**
- Modify: `app/page.tsx` (replace scaffold)
- Create: `app/done/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

Full rewrite — overwrite the existing scaffold:

```tsx
import Link from "next/link";
import { parseJobContext } from "@/lib/jobContext";
import { steps } from "@/app/build/_components/steps";

export default async function Landing({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const jc = parseJobContext(params);
  const firstStep = steps[0].id;
  const qs = new URLSearchParams();
  if (jc.title) qs.set("title", jc.title);
  if (jc.keywords.length > 0) qs.set("keywords", jc.keywords.join(","));
  if (jc.jobId) qs.set("jobId", jc.jobId);
  qs.set("step", firstStep);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 p-8 text-center">
      <h1 className="text-3xl font-semibold">Build a tailored resume in minutes</h1>
      {jc.title ? (
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          For <span className="font-medium">{jc.title}</span>
          {jc.keywords.length > 0 ? (
            <>
              {" "}· matching{" "}
              <span className="font-medium">{jc.keywords.join(", ")}</span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">
          Answer a few quick questions and we'll generate a polished PDF for you.
        </p>
      )}
      <Link
        href={`/build?${qs.toString()}`}
        className="rounded bg-black px-5 py-3 text-sm text-white dark:bg-white dark:text-black"
      >
        Get started
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Create `app/done/page.tsx`**

```tsx
"use client";
export default function DonePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Resume ready ✓</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        You can close this tab and return to your job search.
      </p>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black"
      >
        Close tab
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/done/page.tsx
git commit -m "feat: add landing and done pages"
```

---

## Task 14: TypeScript path alias

**Files:**
- Modify: `tsconfig.json`

The plan uses `@/…` imports (`@/lib/schema`, etc.). Confirm the alias is configured.

- [ ] **Step 1: Inspect `tsconfig.json`**

Read it. If `compilerOptions.paths` already maps `"@/*"` to `["./*"]`, skip to Step 3.

- [ ] **Step 2: Add the path alias**

Set `compilerOptions.paths`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  }
}
```

Merge carefully — don't clobber other fields.

- [ ] **Step 3: Typecheck**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors. Run `npm run test` to confirm Vitest still resolves — the `vitest.config.ts` alias in Task 1 matches.

- [ ] **Step 4: Commit (if anything changed)**

```bash
git add tsconfig.json
git commit -m "chore: configure @/* path alias"
```

If no change, skip the commit.

---

## Task 15: End-to-end smoke verification

No code in this task — this is the go/no-go gate before declaring MVP done. The user runs this manually.

- [ ] **Step 1: Set the API key**

Edit `.env.local` and fill in a real `ANTHROPIC_API_KEY`.

- [ ] **Step 2: Start the dev server**

Run:
```bash
npm run dev
```

- [ ] **Step 3: Walk the happy path**

Visit: `http://localhost:3000/?title=Software+Engineer&keywords=python,react&jobId=demo-1`

Verify:
- Landing shows "For Software Engineer · matching python, react".
- "Get started" goes to `/build?title=…&keywords=…&jobId=demo-1&step=identity`.
- Fill each step with realistic data. "Next" is disabled until the current step validates.
- On the final step, "Generate resume" shows "Generating…", then the page navigates to `/preview`.
- `/preview` shows a rendered PDF with your name and bullets that reflect the keywords.
- Click "Regenerate" with a nudge like "make it more technical" → new PDF appears.
- Click "Download PDF" → file downloads.
- Click "I've downloaded it" → `/done` appears.

- [ ] **Step 4: Walk the persistence path**

Refresh the browser mid-form. Expected: answers you already typed are still there (hydrated from localStorage).

- [ ] **Step 5: Walk the error paths**

- Unset `ANTHROPIC_API_KEY` in `.env.local`, restart dev. Generate should show an error message. Re-set the key.
- In Chrome DevTools > Application, clear Local Storage and refresh `/preview` directly. Expected: redirect to `/build?step=identity`.

- [ ] **Step 6: Run the full test suite**

Run:
```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 7: Build production bundle**

Run:
```bash
npm run build
```

Expected: build succeeds with no type errors.

- [ ] **Step 8: Commit whatever you fixed along the way**

If the walkthrough surfaced bugs, fix each one in its own commit tied back to the task that introduced it. Re-run Steps 3-7 until clean.

---

## Notes on scope

- **No Yes-Ready / Yes-Update gate.** Everyone goes through the form. Adding the upload path is a separate plan.
- **Mock SERP deferred.** The Done page is terminal.
- **No streaming.** Single JSON response. Regenerate is a full re-run.
- **No rate limiting / auth.** Hackathon demo only; do not deploy beyond the team's demo without adding both.
- **Prompt caching** is set up on the system block in Task 5. If the SDK types reject the block form, fall back to plain string — keep the correctness win, drop the cache win. Don't block on it.
- **PDF render error boundary deferred.** Spec §8 lists a "PDF render throws → HTML fallback" path. For MVP we rely on `@react-pdf/renderer`'s own resilience; an `ErrorBoundary` around `<ResumePreview/>` is a good Hour 4 add if time permits.
