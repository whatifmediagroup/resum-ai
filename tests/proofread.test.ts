import { describe, it, expect } from "vitest";
import {
  PROOFREAD_SYSTEM_PROMPT,
  buildProofreadMessages,
} from "@/lib/proofread";

describe("proofread helpers", () => {
  it("PROOFREAD_SYSTEM_PROMPT mentions 'do not invent'", () => {
    expect(PROOFREAD_SYSTEM_PROMPT.toLowerCase()).toContain("do not invent");
  });

  it("buildProofreadMessages embeds the resume text and job context", () => {
    const msgs = buildProofreadMessages({
      resumeText: "Ada Lovelace — Software Engineer at Analytical Engine.",
      jobContext: { title: "Senior SWE", keywords: ["go", "rust"], jobId: "42" },
    });
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("user");
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("Ada Lovelace");
    expect(text).toContain("Senior SWE");
    expect(text).toContain("rust");
    expect(text).toContain("emit_resume");
  });

  it("buildProofreadMessages handles missing job context gracefully", () => {
    const msgs = buildProofreadMessages({
      resumeText: "Some resume body.",
      jobContext: { keywords: [] },
    });
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("Some resume body.");
    expect(text).toContain('"title": null');
  });
});
