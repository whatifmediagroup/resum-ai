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
