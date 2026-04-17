import { describe, it, expect } from "vitest";
import {
  JobContextSchema,
  FormDataSchema,
  ResumeJsonSchema,
  type ResumeJson,
  type FormData,
} from "@/lib/schema";

const validFormData: FormData = {
  identity: { fullName: "Ada Lovelace", phone: "555-0100", email: "ada@example.com", location: "London" },
  target: { title: "Software Engineer", pitch: "Build things that matter." },
  recentJob: {
    company: "Analytical Engines Ltd",
    title: "Engineer",
    start: "2024-01",
    current: true,
    description: "Wrote algorithms.",
  },
  priorJobs: [],
  education: [
    { institution: "University of London", credential: "BSc Math", start: "2018-09", end: "2022-06" },
  ],
  skills: ["Algorithms", "Notation"],
  links: { linkedIn: "https://linkedin.com/in/ada" },
};

const validResumeJson: ResumeJson = {
  header: {
    fullName: "Ada Lovelace",
    contact: { phone: "555-0100", email: "ada@example.com", location: "London" },
    links: { linkedIn: "https://linkedin.com/in/ada" },
  },
  summary: "Engineer who writes clear algorithms.",
  experience: [
    { company: "Analytical Engines Ltd", title: "Engineer", dates: "2024-01 – Present", bullets: ["Wrote algorithms."] },
  ],
  education: [{ institution: "University of London", credential: "BSc Math", dates: "2018-09 – 2022-06" }],
  skills: ["Algorithms", "Notation"],
};

describe("schemas", () => {
  it("JobContextSchema accepts title/keywords/jobId", () => {
    const parsed = JobContextSchema.parse({ title: "SWE", keywords: ["python"], jobId: "123" });
    expect(parsed.keywords).toEqual(["python"]);
  });

  it("JobContextSchema allows missing title and jobId", () => {
    expect(() => JobContextSchema.parse({ keywords: [] })).not.toThrow();
  });

  it("FormDataSchema parses a valid payload", () => {
    expect(() => FormDataSchema.parse(validFormData)).not.toThrow();
  });

  it("FormDataSchema rejects missing required identity fields", () => {
    const bad = { ...validFormData, identity: { fullName: "", phone: "", email: "", location: "" } };
    expect(() => FormDataSchema.parse(bad)).toThrow();
  });

  it("ResumeJsonSchema parses a valid AI output", () => {
    expect(() => ResumeJsonSchema.parse(validResumeJson)).not.toThrow();
  });

  it("ResumeJsonSchema requires at least one experience entry", () => {
    const bad = { ...validResumeJson, experience: [] };
    expect(() => ResumeJsonSchema.parse(bad)).toThrow();
  });
});
