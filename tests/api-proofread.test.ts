import { describe, it, expect, vi, beforeEach } from "vitest";

const { proofreadMock } = vi.hoisted(() => ({ proofreadMock: vi.fn() }));
vi.mock("@/lib/proofread", async (orig) => {
  const real = await orig<typeof import("@/lib/proofread")>();
  return { ...real, proofreadResume: proofreadMock };
});

import { POST } from "@/app/api/proofread/route";
import type { ResumeJson } from "@/lib/schema";

const validResume: ResumeJson = {
  header: {
    fullName: "Ada",
    contact: { phone: "555", email: "a@b.co", location: "L" },
    links: {},
  },
  summary: "s",
  experience: [{ company: "C", title: "T", dates: "2024", bullets: ["b"] }],
  education: [{ institution: "I", credential: "BSc", dates: "n/a" }],
  skills: ["s"],
};

const validBody = {
  resumeText:
    "Ada Lovelace — Software Engineer with 5 years of experience building reliable systems.",
  jobContext: { keywords: [] },
};

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/proofread", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  proofreadMock.mockReset();
});

describe("POST /api/proofread", () => {
  it("returns 200 + ResumeJson on success", async () => {
    proofreadMock.mockResolvedValueOnce(validResume);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(validResume);
  });

  it("returns 400 when resumeText is too short", async () => {
    const res = await POST(
      makeReq({ resumeText: "too short", jobContext: { keywords: [] } })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new Request("http://localhost/api/proofread", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 502 on upstream failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    proofreadMock.mockRejectedValueOnce(new ResumeGenerationError("upstream", "boom"));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(502);
  });

  it("returns 422 on schema failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    proofreadMock.mockRejectedValueOnce(new ResumeGenerationError("schema", "bad"));
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(422);
  });
});
