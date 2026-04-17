import { describe, it, expect } from "vitest";
import {
  PROOFREAD_SYSTEM_PROMPT,
  buildProofreadMessages,
  sanitizeProofreadOutput,
} from "@/lib/proofread";
import { ResumeJsonSchema } from "@/lib/schema";

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

  it("buildProofreadMessages appends the nudge when provided", () => {
    const msgs = buildProofreadMessages({
      resumeText: "Resume body for Ada.",
      jobContext: { keywords: [] },
      nudge: "make the summary punchier",
    });
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("make the summary punchier");
    expect(text).toContain("User nudge for this revision");
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

describe("sanitizeProofreadOutput", () => {
  it("prefixes bare-domain links with https:// and drops unparseable ones", () => {
    const sanitized = sanitizeProofreadOutput({
      header: {
        fullName: "Ada",
        contact: { phone: "555", email: "a@b.co", location: "L" },
        links: {
          linkedIn: "linkedin.com/in/ada",
          github: "https://github.com/ada",
          portfolio: "n/a",
        },
      },
      summary: "s",
      experience: [{ company: "C", title: "T", dates: "2024", bullets: ["b"] }],
      education: [{ institution: "I", credential: "BSc", dates: "2020" }],
      skills: ["go"],
    }) as { header: { links: Record<string, string> } };

    expect(sanitized.header.links.linkedIn).toBe("https://linkedin.com/in/ada");
    expect(sanitized.header.links.github).toBe("https://github.com/ada");
    expect(sanitized.header.links.portfolio).toBeUndefined();
  });

  it("fills empty required strings with 'n/a' so a sparse resume still validates", () => {
    const cleaned = sanitizeProofreadOutput({
      header: {
        fullName: "",
        contact: { phone: "", email: "", location: "" },
        links: {},
      },
      summary: "",
      experience: [],
      education: [],
      skills: [],
    });
    const result = ResumeJsonSchema.safeParse(cleaned);
    expect(result.success).toBe(true);
  });

  it("normalizes individual experience entries with missing fields", () => {
    const cleaned = sanitizeProofreadOutput({
      header: {
        fullName: "Ada",
        contact: { phone: "x", email: "a@b.co", location: "L" },
        links: {},
      },
      summary: "s",
      experience: [{ company: "Acme" }],
      education: [{ institution: "MIT" }],
      skills: ["go"],
    });
    const result = ResumeJsonSchema.safeParse(cleaned);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.experience[0].title).toBe("n/a");
      expect(result.data.experience[0].bullets.length).toBeGreaterThan(0);
      expect(result.data.education[0].credential).toBe("n/a");
    }
  });
});
