import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { ResumeDocument } from "@/app/preview/_components/ResumeDocument";
import type { ResumeJson } from "@/lib/schema";

const fixture: ResumeJson = {
  header: {
    fullName: "Ada Lovelace",
    contact: { phone: "555-0100", email: "ada@example.com", location: "London" },
    links: { linkedIn: "https://linkedin.com/in/ada" },
  },
  summary: "Engineer who writes clear algorithms.",
  experience: [
    { company: "AE Ltd", title: "Engineer", dates: "2024 – Present", bullets: ["Designed the Analytical Engine."] },
  ],
  education: [{ institution: "U. London", credential: "BSc Math", dates: "2018–2022" }],
  skills: ["Algorithms", "Notation"],
};

describe("ResumeDocument", () => {
  it("constructs a React element tree for a valid fixture", () => {
    const el = createElement(ResumeDocument, { data: fixture });
    expect(el).toBeTruthy();
    expect(el.type).toBe(ResumeDocument);
  });
});
