import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateMock } = vi.hoisted(() => ({ generateMock: vi.fn() }));
vi.mock("@/lib/claude", async (orig) => {
  const real = await orig<typeof import("@/lib/claude")>();
  return { ...real, generateResume: generateMock };
});

import { POST } from "@/app/api/generate/route";
import type { ResumeJson, FormData } from "@/lib/schema";

const validFormData: FormData = {
  identity: { fullName: "Ada", phone: "555", email: "a@b.c", location: "L" },
  target: { title: "SWE", pitch: "p" },
  recentJob: { company: "C", title: "T", start: "2024", current: true, description: "d" },
  priorJobs: [],
  education: [{ institution: "I", credential: "BSc" }],
  skills: ["s"],
  links: {},
};

const validResume: ResumeJson = {
  header: {
    fullName: "Ada",
    contact: { phone: "555", email: "a@b.c", location: "L" },
    links: {},
  },
  summary: "s",
  experience: [{ company: "C", title: "T", dates: "2024", bullets: ["b"] }],
  education: [{ institution: "I", credential: "BSc", dates: "n/a" }],
  skills: ["s"],
};

function makeReq(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  generateMock.mockReset();
});

describe("POST /api/generate", () => {
  it("returns 200 + ResumeJson on success", async () => {
    generateMock.mockResolvedValueOnce(validResume);
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(validResume);
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeReq({ formData: { bogus: true }, jobContext: {} }));
    expect(res.status).toBe(400);
  });

  it("returns 502 on upstream failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    generateMock.mockRejectedValueOnce(new ResumeGenerationError("upstream", "boom"));
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(502);
  });

  it("returns 422 on schema failure", async () => {
    const { ResumeGenerationError } = await import("@/lib/claude");
    generateMock.mockRejectedValueOnce(new ResumeGenerationError("schema", "bad"));
    const res = await POST(makeReq({ formData: validFormData, jobContext: { keywords: [] } }));
    expect(res.status).toBe(422);
  });

  it("passes nudge through to generateResume", async () => {
    generateMock.mockResolvedValueOnce(validResume);
    await POST(
      makeReq({ formData: validFormData, jobContext: { keywords: [] }, nudge: "shorter" })
    );
    expect(generateMock).toHaveBeenCalledWith(expect.objectContaining({ nudge: "shorter" }));
  });
});
