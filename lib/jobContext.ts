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
