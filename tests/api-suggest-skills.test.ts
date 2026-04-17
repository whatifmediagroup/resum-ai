import { describe, it, expect, vi, beforeEach } from "vitest";

const { suggestMock } = vi.hoisted(() => ({ suggestMock: vi.fn() }));
vi.mock("@/lib/skillSuggest", async (orig) => {
  const real = await orig<typeof import("@/lib/skillSuggest")>();
  return { ...real, suggestSkills: suggestMock };
});

import { POST } from "@/app/api/suggest-skills/route";

const goodBody = {
  baseSkill: "TypeScript",
  targetTitle: "Frontend Engineer",
  existingSkills: ["TypeScript"],
};

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/suggest-skills", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  suggestMock.mockReset();
});

describe("POST /api/suggest-skills", () => {
  it("returns 200 with suggestions on success", async () => {
    suggestMock.mockResolvedValueOnce(["React", "Next.js"]);
    const res = await POST(makeReq(goodBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ suggestions: ["React", "Next.js"] });
  });

  it("returns 400 when baseSkill is empty", async () => {
    const res = await POST(makeReq({ ...goodBody, baseSkill: "  " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/suggest-skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{nope",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 502 on upstream failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    suggestMock.mockRejectedValueOnce(
      new ResumeGenerationError("upstream", "boom")
    );
    const res = await POST(makeReq(goodBody));
    expect(res.status).toBe(502);
  });

  it("returns 422 on schema failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    suggestMock.mockRejectedValueOnce(
      new ResumeGenerationError("schema", "no tool")
    );
    const res = await POST(makeReq(goodBody));
    expect(res.status).toBe(422);
  });
});
