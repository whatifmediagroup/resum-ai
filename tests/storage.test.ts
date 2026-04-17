import { describe, it, expect, beforeEach } from "vitest";
import { readSession, writeSession, keyFor, clearSession } from "@/lib/storage";
import { emptyFormData } from "@/lib/schema";

beforeEach(() => {
  localStorage.clear();
});

describe("storage", () => {
  it("keyFor prefers jobId, falls back to default", () => {
    expect(keyFor("abc123")).toBe("resume-ai:abc123");
    expect(keyFor(undefined)).toBe("resume-ai:default");
  });

  it("returns null when nothing saved", () => {
    expect(readSession("job1")).toBeNull();
  });

  it("round-trips a session", () => {
    const session = {
      jobContext: { title: "SWE", keywords: ["go"], jobId: "job1" },
      formData: emptyFormData,
      resumeJson: null,
      delivered: false,
    };
    writeSession("job1", session);
    expect(readSession("job1")).toEqual(session);
  });

  it("clearSession removes the entry", () => {
    writeSession("job1", {
      jobContext: { keywords: [] },
      formData: emptyFormData,
      resumeJson: null,
      delivered: false,
    });
    clearSession("job1");
    expect(readSession("job1")).toBeNull();
  });

  it("readSession returns null when stored JSON is corrupt", () => {
    localStorage.setItem("resume-ai:job1", "{not-json");
    expect(readSession("job1")).toBeNull();
  });

  it("writeSession does not throw when setItem fails", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(() =>
        writeSession("job1", {
          jobContext: { keywords: [] },
          formData: emptyFormData,
          resumeJson: null,
          delivered: false,
        })
      ).not.toThrow();
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});
