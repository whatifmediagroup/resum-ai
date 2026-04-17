import { describe, it, expect } from "vitest";
import { generateMockJobs } from "@/lib/mockJobs";

describe("generateMockJobs", () => {
  it("returns five jobs with descending match scores", () => {
    const jobs = generateMockJobs("Backend Engineer", []);
    expect(jobs).toHaveLength(5);
    const scores = jobs.map((j) => j.matchScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("uses the provided title in every entry", () => {
    const jobs = generateMockJobs("Data Scientist", []);
    for (const job of jobs) {
      expect(job.title.toLowerCase()).toContain("data scientist");
    }
  });

  it("falls back to a default title when none is given", () => {
    const jobs = generateMockJobs(undefined, []);
    expect(jobs[1].title).toBe("Software Engineer");
  });

  it("annotates the top result with up to two keywords", () => {
    const jobs = generateMockJobs("SRE", ["aws", "k8s", "terraform"]);
    expect(jobs[0].title).toContain("aws");
    expect(jobs[0].title).toContain("k8s");
    expect(jobs[0].title).not.toContain("terraform");
  });
});
