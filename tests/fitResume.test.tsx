import { describe, it, expect, vi } from "vitest";
import {
  applyCandidate,
  detectOverlap,
  fitResume,
  generateCandidates,
} from "@/lib/fitResume";
import { FONT_SIZES } from "@/app/preview/_components/ResumeDocument";
import type { ResumeJson } from "@/lib/schema";

function makeJob(company: string, bullets: number) {
  return {
    company,
    title: "Engineer",
    dates: "2020–2024",
    bullets: Array.from({ length: bullets }, (_, i) => `Bullet ${i + 1}`),
  };
}

function fixture(jobs = 3, bulletsPerJob = 4): ResumeJson {
  return {
    header: {
      fullName: "Ada Lovelace",
      contact: { phone: "555", email: "a@b.c", location: "London" },
      links: {},
    },
    summary: "A summary.",
    experience: Array.from({ length: jobs }, (_, i) => makeJob(`Co${i}`, bulletsPerJob)),
    education: [{ institution: "U", credential: "BSc", dates: "2020" }],
    skills: ["skill"],
  };
}

describe("generateCandidates", () => {
  it("iterates all font sizes with full experience first, then trims", () => {
    const data = fixture(3, 4);
    const candidates = generateCandidates(data);
    expect(candidates[0]).toEqual({ fontSize: FONT_SIZES[0], experienceCount: 3, bulletTrimFromLast: 0 });
    expect(candidates[1]).toEqual({ fontSize: FONT_SIZES[0], experienceCount: 2, bulletTrimFromLast: 0 });
    expect(candidates[2]).toEqual({ fontSize: FONT_SIZES[0], experienceCount: 1, bulletTrimFromLast: 0 });
    expect(candidates[3].fontSize).toBe(FONT_SIZES[1]);
  });

  it("emits bullet-trim fallbacks at smallest font after exhausting experience trims", () => {
    const data = fixture(2, 5);
    const candidates = generateCandidates(data);
    const trims = candidates.filter((c) => c.bulletTrimFromLast > 0);
    expect(trims.length).toBeGreaterThan(0);
    expect(trims.every((c) => c.fontSize === FONT_SIZES[FONT_SIZES.length - 1])).toBe(true);
    expect(trims.every((c) => c.experienceCount === 1)).toBe(true);
  });
});

describe("applyCandidate", () => {
  it("slices experience to experienceCount (keeping most recent first)", () => {
    const data = fixture(3, 4);
    const config = applyCandidate(data, { fontSize: 11, experienceCount: 2, bulletTrimFromLast: 0 });
    expect(config.experience).toHaveLength(2);
    expect(config.experience[0].company).toBe("Co0");
    expect(config.experience[1].company).toBe("Co1");
  });

  it("trims bullets from the oldest kept job only", () => {
    const data = fixture(2, 5);
    const config = applyCandidate(data, { fontSize: 10, experienceCount: 2, bulletTrimFromLast: 2 });
    expect(config.experience[0].bullets).toHaveLength(5);
    expect(config.experience[1].bullets).toHaveLength(3);
  });

  it("keeps at least one bullet regardless of trim count", () => {
    const data = fixture(1, 3);
    const config = applyCandidate(data, { fontSize: 10, experienceCount: 1, bulletTrimFromLast: 99 });
    expect(config.experience[0].bullets).toHaveLength(1);
  });
});

describe("detectOverlap", () => {
  it("returns false when items are on different lines", () => {
    const items = [
      { x: 0, y: 700, width: 100, height: 11, str: "Top" },
      { x: 0, y: 680, width: 100, height: 11, str: "Bottom" },
    ];
    expect(detectOverlap(items)).toBe(false);
  });

  it("returns false when items on same line do not overlap in x", () => {
    const items = [
      { x: 0, y: 700, width: 100, height: 11, str: "Left" },
      { x: 120, y: 700, width: 50, height: 11, str: "Right" },
    ];
    expect(detectOverlap(items)).toBe(false);
  });

  it("returns true when two items on the same line overlap horizontally", () => {
    const items = [
      { x: 0, y: 700, width: 150, height: 11, str: "Long left text" },
      { x: 100, y: 700, width: 50, height: 11, str: "Dates" },
    ];
    expect(detectOverlap(items)).toBe(true);
  });

  it("ignores tiny overlaps below threshold (kerning)", () => {
    const items = [
      { x: 0, y: 700, width: 100, height: 11, str: "A" },
      { x: 99, y: 700, width: 50, height: 11, str: "B" },
    ];
    expect(detectOverlap(items)).toBe(false);
  });
});

describe("fitResume", () => {
  it("returns the first candidate that passes both checks", async () => {
    const data = fixture(3, 4);
    const renderer = vi.fn(async () => new Blob(["pdf"]));
    const inspector = vi
      .fn()
      .mockResolvedValueOnce({ pageCount: 2, overlap: false })
      .mockResolvedValueOnce({ pageCount: 1, overlap: true })
      .mockResolvedValueOnce({ pageCount: 1, overlap: false });

    const result = await fitResume(data, { renderer, inspector });

    expect(result.fits).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.config.experience).toHaveLength(1);
    expect(result.config.fontSize).toBe(FONT_SIZES[0]);
  });

  it("returns fits=false with the last blob if nothing passes", async () => {
    const data = fixture(1, 2);
    const renderer = vi.fn(async () => new Blob(["pdf"]));
    const inspector = vi.fn().mockResolvedValue({ pageCount: 2, overlap: false });

    const result = await fitResume(data, { renderer, inspector });

    expect(result.fits).toBe(false);
    expect(result.attempts).toBeGreaterThan(1);
    expect(result.blob).toBeTruthy();
  });

  it("prefers larger font over trimming experience", async () => {
    const data = fixture(3, 4);
    const renderer = vi.fn(async () => new Blob(["pdf"]));
    const inspector = vi.fn().mockResolvedValue({ pageCount: 1, overlap: false });

    const result = await fitResume(data, { renderer, inspector });

    expect(result.fits).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.config.fontSize).toBe(FONT_SIZES[0]);
    expect(result.config.experience).toHaveLength(3);
  });
});
