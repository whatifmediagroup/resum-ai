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
        identity: { fullName: "Ada", phone: "x", email: "a@b.co", location: "L" },
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
        identity: { fullName: "A", phone: "x", email: "a@b.co", location: "L" },
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
