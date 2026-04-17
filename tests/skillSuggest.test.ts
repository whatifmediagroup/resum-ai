import { describe, it, expect, vi } from "vitest";
import {
  buildSuggestSkillsMessages,
  buildSuggestSkillsTool,
  SKILL_SUGGEST_SYSTEM_PROMPT,
  suggestSkills,
  __test__,
} from "@/lib/skillSuggest";
import type { AnthropicLike } from "@/lib/claude";
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

function fakeClient(toolInput: unknown): AnthropicLike {
  return {
    messages: {
      create: vi.fn(async () => ({
        id: "m_1",
        type: "message",
        role: "assistant",
        model: "test",
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
        content: [
          {
            type: "tool_use",
            id: "t_1",
            name: "suggest_skills",
            input: toolInput,
          },
        ],
      })) as unknown as AnthropicLike["messages"]["create"],
    },
  };
}

describe("suggestSkills", () => {
  it("returns the deduped list from a tool call", async () => {
    const client = fakeClient({
      suggestions: ["GraphQL", "React", "Next.js"],
    });
    const out = await suggestSkills(
      {
        baseSkill: "TypeScript",
        existingSkills: ["React"],
      },
      client
    );
    expect(out).toEqual(["GraphQL", "Next.js"]);
  });

  it("throws schema error when no tool block is returned", async () => {
    const client: AnthropicLike = {
      messages: {
        create: vi.fn(async () => ({
          id: "m",
          type: "message",
          role: "assistant",
          model: "test",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 0, output_tokens: 0 },
          content: [{ type: "text", text: "no tool" }],
        })) as unknown as AnthropicLike["messages"]["create"],
      },
    };
    await expect(
      suggestSkills({ baseSkill: "x", existingSkills: [] }, client)
    ).rejects.toBeInstanceOf(ResumeGenerationError);
  });

  it("throws schema error when all suggestions are duplicates", async () => {
    const client = fakeClient({ suggestions: ["React", "react"] });
    await expect(
      suggestSkills(
        { baseSkill: "x", existingSkills: ["React"] },
        client
      )
    ).rejects.toBeInstanceOf(ResumeGenerationError);
  });

  it("wraps upstream errors", async () => {
    const client: AnthropicLike = {
      messages: {
        create: vi.fn(async () => {
          throw new Error("net");
        }) as unknown as AnthropicLike["messages"]["create"],
      },
    };
    await expect(
      suggestSkills({ baseSkill: "x", existingSkills: [] }, client)
    ).rejects.toMatchObject({ code: "upstream" });
  });
});
