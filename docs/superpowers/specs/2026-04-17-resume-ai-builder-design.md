# Resume AI Builder — Design

**Date:** 2026-04-17
**Stakeholder:** Tory Rumrill
**Context:** 4-hour hackathon, 9-person team
**Status:** Approved for implementation planning

## 1. Goal

Single-page app (Next.js 16) that takes a user with a job-context URL, collects resume data through a multi-step form, sends it to Claude for tailoring against the target job's keywords, renders a formatted resume as a downloadable PDF, and returns the user to a "done" state.

North Star: end-to-end working flow by Hour 3; polish in Hour 4.

## 2. Scope

### In scope (MVP)
- URL param ingestion: `?title=…&keywords=…&jobId=…`
- Multi-step form, data-driven from a step registry (count not hardcoded)
- Server route that calls Claude (`claude-sonnet-4-6`) and returns a tailored `ResumeJson`
- Client-side PDF rendering with `@react-pdf/renderer`
- Preview with Regenerate (AI re-run) and Edit (jump back to any step)
- Download PDF, then a Done screen
- `localStorage` persistence keyed by `jobId` for abandonment recovery

### Out of scope for MVP
- The landing "Do you have a resume?" gate and the Yes-Ready / Yes-Update paths. Everyone goes straight into the form. Yes-Update (upload + parse) is deferred as Hour 4+ stretch.
- Authentication, server-side persistence, database
- Streaming AI responses
- Mock SERP; return path is a simple Done screen with a "Close tab" button
- E2E automation, comprehensive unit tests

## 3. Architecture

**Stack:** Next.js 16 App Router (scaffolded) · React 19 · Tailwind v4 · `@react-pdf/renderer` · Anthropic SDK · Zod. Single Vercel deploy.

**Split:**
- UI: client components
- One server route (`app/api/generate/route.ts`) proxies Claude — keeps `ANTHROPIC_API_KEY` off the client
- PDF renders client-side
- Form state: React context + `localStorage`
- No database

**External boundaries:** browser → `/api/generate` → Anthropic API. `ANTHROPIC_API_KEY` lives in a Vercel env var; never shipped to the client.

## 4. File Structure

```
app/
  layout.tsx                     (existing)
  page.tsx                       # landing; reads URL params; CTA → /build
  build/
    page.tsx                     # step router — reads ?step=<id> and renders from registry
    _components/
      FormShell.tsx              # progress bar, back/next, frame; iterates steps[]
      steps/
        index.ts                 # steps: StepDef[]  ← single source of truth
        Identity.tsx             # name, phone, email, location
        Target.tsx               # desired title, pitch (prefilled from URL)
        RecentJob.tsx            # single most-recent job
        PriorJobs.tsx            # repeater
        Education.tsx            # repeater
        Skills.tsx               # skills + links
  preview/
    page.tsx                     # <ResumeDocument/>; Regenerate / Edit / Download
    _components/
      ResumeDocument.tsx         # @react-pdf/renderer Document + Page
      ResumePreview.tsx          # <PDFViewer/> wrapper
  done/page.tsx                  # "Resume ready" + Close Tab
  api/generate/route.ts          # POST: { formData, jobContext, nudge? }

lib/
  schema.ts                      # Zod: FormData, ResumeJson, JobContext
  storage.ts                     # localStorage read/write, keyed by jobId
  jobContext.ts                  # parse URL params → JobContext
  claude.ts                      # server-only Anthropic wrapper
  resumeContext.tsx              # React context for form data

docs/superpowers/specs/2026-04-17-resume-ai-builder-design.md
```

### Step registry contract

`app/build/_components/steps/index.ts` owns the list; no other file hardcodes the step count.

```ts
export type StepDef = {
  id: string;                                // stable slug used in ?step=
  label: string;                             // progress bar label
  Component: React.FC;                       // renders the step UI
  validate: (data: FormData) => string[];    // [] = pass
};

export const steps: StepDef[] = [
  Identity, Target, RecentJob, PriorJobs, Education, Skills,
];
```

`FormShell` derives progress, next/back, and submit-gate state from `steps.length` and `validate`. Adding, removing, or reordering a step is a one-line edit to the array. URLs use stable ids (`?step=identity`), not indices, so bookmarks survive reordering.

## 5. Data Flow

```
1. Landing (/)
   parseJobContext(searchParams) → JobContext
   writeStorage(jobId, { jobContext })
   CTA → /build?step=<first step id>

2. Each step
   Read FormData from context (seeded from localStorage)
   On Next: validate → merge partial into context → persist → navigate to next step id

3. Final step submit (→ /preview)
   POST /api/generate { formData, jobContext }
   Persist ResumeJson under resume-ai:<jobId> (or :default)
   Navigate to /preview

4. /api/generate (server)
   Validate body with Zod
   Build prompt (§6) — inject jobContext.keywords
   Call Claude with forced `emit_resume` tool use (input_schema = ResumeJson)
   Validate Claude output with Zod
     200 → JSON
     400 → invalid request body
     422 → Claude output failed schema (after one auto-retry)
     502 → upstream failure / timeout

5. /preview
   Read ResumeJson from context
   <PDFViewer><ResumeDocument data={resumeJson}/></PDFViewer>
   Buttons:
     Regenerate → re-POST with same formData + optional nudge string
     Edit answers → /build?step=<id> (context preserved)
     Download → <PDFDownloadLink>

6. /done
   Mark resume-ai:<jobId>.delivered = true
   "Close tab" button
```

**Storage keys:** `resume-ai:<jobId>` when `jobId` is present; otherwise `resume-ai:default` (single slot).

## 6. AI Prompt

`lib/claude.ts` (server-only):

```
System: "You are a resume writer. Given the applicant's raw data and the target
job context, produce a tailored resume as JSON matching the provided schema.
Rewrite bullets to emphasize keywords where truthful; do not invent experience.
Keep each bullet ≤ 24 words. Produce a 2-3 sentence summary."

User: {
  jobContext: { title, keywords },
  formData:   { identity, target, recentJob, priorJobs, education, skills, links },
  nudge?: string                             // from Regenerate
}

Model:   claude-sonnet-4-6 (default)
Structured output: a single tool `emit_resume` whose `input_schema` is generated from `ResumeJson` (Zod → JSON Schema). Force tool use via `tool_choice: { type: "tool", name: "emit_resume" }`. Claude's `tool_use.input` becomes our typed `ResumeJson`.
```

**Prompt caching:** cache the system prompt + schema block (stable). Per-request user content is uncached. Material win across regenerations and the team's iterations during the hackathon.

**Regenerate variant:** same prompt + optional `nudge` appended to the user message ("make it more technical", "shorten").

## 7. Schemas (Zod, single source of truth)

Defined once in `lib/schema.ts`; imported by both the API route (validates Claude output) and `ResumeDocument` (types props). Changing the schema surfaces every call site via TypeScript.

```ts
JobContext = { title?: string; keywords: string[]; jobId?: string }

FormData = {
  identity:   { fullName; phone; email; location };
  target:     { title; pitch };
  recentJob:  Job;
  priorJobs:  Job[];
  education:  EducationEntry[];
  skills:     string[];
  links:      { linkedIn?; portfolio?; github? };
}

Job = { company; title; start; end?; current: boolean; description };
EducationEntry = { institution; credential; start?; end? };

ResumeJson = {
  header:     { fullName; contact; links };
  summary:    string;
  experience: { company; title; dates; bullets: string[] }[];
  education:  { institution; credential; dates }[];
  skills:     string[];
}
```

## 8. Error Handling

| Failure                            | Where              | Response                                 | UI                                              |
|------------------------------------|--------------------|------------------------------------------|-------------------------------------------------|
| Zod fails on request body          | API route          | 400                                      | "Something's off with your answers" + Edit     |
| Anthropic 5xx / timeout            | API route          | 502                                      | "AI is having a moment" + Retry                 |
| Claude output fails Zod            | API route          | 422 (after one auto-retry)               | Same retry UI                                   |
| Network error                      | preview/page.tsx   | —                                        | Same retry UI                                   |
| PDF render throws                  | preview            | —                                        | Fall back to HTML preview + "Download unavailable, copy text" |
| localStorage unavailable           | storage.ts         | —                                        | In-memory only; warn once at landing            |

**Not handled (intentionally):** auth, rate limiting, server-side persistence, streaming.

## 9. Testing

4-hour budget — tight, surgical:

1. Manual happy-path walkthrough: landing → form (all steps) → preview → download.
2. Zod round-trip: hand-crafted `ResumeJson` fixture renders in `ResumeDocument` without throwing.
3. API route smoke test with a mocked Anthropic client returning fixture JSON.

No per-field unit tests. No E2E automation. Team-wide manual QA before demo.

## 10. Decisions Log (why these paths)

| Decision                          | Chosen                                | Why                                                                 |
|-----------------------------------|---------------------------------------|---------------------------------------------------------------------|
| Three-path gate                   | Dropped for MVP                       | Yes-Update needs PDF/DOCX parsing; too risky in 4 hours.            |
| API key handling                  | Next.js server route proxy            | Single Vercel deploy, key stays on the server.                      |
| PDF generation                    | `@react-pdf/renderer`                 | User preference; deterministic output; one render path.             |
| AI output shape                   | Structured JSON matching a schema     | Deterministic rendering, AI does the writing, no layout drift.      |
| Post-download return path         | Done screen + "Close tab"             | No mock SERP to maintain; demo-able as-is.                          |
| Edit behavior on preview          | Regenerate + jump back to any step    | Real value without building contenteditable for @react-pdf.         |
| Step count                        | Data-driven registry                  | Likely to change; hardcoding creates a refactor hazard.             |
| Default model                     | `claude-sonnet-4-6`                   | Team preference.                                                    |

## 11. Open Questions

None blocking. Resolve during implementation if they surface:
- Resume visual template — one clean default for MVP; selectable templates are Hour 4+ stretch.
- Streaming preview — defer; single JSON response is simpler and adequate.
