import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import {
  buildSuggestSkillsMessages,
  buildSuggestSkillsTool,
  SKILL_SUGGEST_SYSTEM_PROMPT,
  suggestSkills,
  __test__,
} from "@/lib/skillSuggest";
import { ResumeGenerationError } from "@/lib/claude";

describe("skillSuggest helpers", () => {
  it("system prompt asks for distinct skills", () => {
    expect(SKILL_SUGGEST_SYSTEM_PROMPT.toLowerCase()).toContain("distinct");
  });

  it("buildSuggestSkillsTool emits a suggestions array schema", () => {
    const tool = buildSuggestSkillsTool();
    expect(tool.name).toBe("suggest_skills");
    expect(tool.input_schema.properties).toHaveProperty("suggestions");
  });

  it("buildSuggestSkillsMessages embeds the base skill and existing list", () => {
    const msgs = buildSuggestSkillsMessages({
      baseSkill: "TypeScript",
      targetTitle: "Frontend Engineer",
      existingSkills: ["TypeScript", "React"],
    });
    const text = typeof msgs[0].content === "string" ? msgs[0].content : "";
    expect(text).toContain("TypeScript");
    expect(text).toContain("React");
    expect(text).toContain("Frontend Engineer");
  });

  it("dedupeAgainst removes case-insensitive duplicates and trims", () => {
    const out = __test__.dedupeAgainst(
      [" Node.js ", "react", "Kubernetes", "node.js"],
      ["React"]
    );
    expect(out).toEqual(["Node.js", "Kubernetes"]);
  });
});

function textResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload) }],
    finishReason: { unified: "stop" as const, original: "stop" },
    usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
    warnings: [],
  };
}

function mockModel(result: unknown | (() => Promise<never>)) {
  return new MockLanguageModelV3({
    doGenerate: typeof result === "function"
      ? (result as () => Promise<never>)
      : async () => textResult(result) as never,
  });
}

describe("suggestSkills", () => {
  it("returns the deduped list from a tool call", async () => {
    const out = await suggestSkills(
      { baseSkill: "TypeScript", existingSkills: ["React"] },
      mockModel({ suggestions: ["GraphQL", "React", "Next.js"] })
    );
    expect(out).toEqual(["GraphQL", "Next.js"]);
  });

  it("throws schema error when the model returns no text", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () =>
        ({
          content: [],
          finishReason: { unified: "stop" as const, original: "stop" },
          usage: { inputTokens: { total: 0 }, outputTokens: { total: 0 } },
          warnings: [],
        }) as never,
    });
    await expect(
      suggestSkills({ baseSkill: "x", existingSkills: [] }, model)
    ).rejects.toBeInstanceOf(ResumeGenerationError);
  });

  it("throws schema error when all suggestions are duplicates", async () => {
    await expect(
      suggestSkills(
        { baseSkill: "x", existingSkills: ["React"] },
        mockModel({ suggestions: ["React", "react"] })
      )
    ).rejects.toBeInstanceOf(ResumeGenerationError);
  });

  it("wraps upstream errors", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error("net");
      },
    });
    await expect(
      suggestSkills({ baseSkill: "x", existingSkills: [] }, model)
    ).rejects.toMatchObject({ code: "upstream" });
  });
});
