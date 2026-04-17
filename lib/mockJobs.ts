export type MockJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  description: string;
  url: string;
  matchScore: number;
  atsScore: number;
};

type Template = {
  idSuffix: string;
  titleFn: (base: string) => string;
  company: string;
  location: string;
  type: string;
  posted: string;
  descriptionFn: (base: string, keywords: string[]) => string;
  matchScore: number;
  atsScore: number;
};

const templates: Template[] = [
  {
    idSuffix: "1",
    titleFn: (base) => `Senior ${base}`,
    company: "TechCorp Inc.",
    location: "San Francisco, CA",
    type: "Full-time",
    posted: "2 days ago",
    descriptionFn: (base, kw) =>
      `Lead cross-functional initiatives as a Senior ${base}${
        kw.length ? `, driving work across ${kw.slice(0, 2).join(" and ")}` : ""
      }. Mentor peers and own delivery of high-impact projects.`,
    matchScore: 95,
    atsScore: 91,
  },
  {
    idSuffix: "2",
    titleFn: (base) => base,
    company: "StartupXYZ",
    location: "Remote",
    type: "Full-time",
    posted: "1 day ago",
    descriptionFn: (base, kw) =>
      `Join a fast-moving team as a ${base}. Ship features end-to-end${
        kw.length ? ` with exposure to ${kw.slice(0, 3).join(", ")}` : ""
      } and help shape product direction.`,
    matchScore: 92,
    atsScore: 84,
  },
  {
    idSuffix: "3",
    titleFn: (base) => `${base} II`,
    company: "MegaSoft",
    location: "New York, NY",
    type: "Full-time",
    posted: "3 days ago",
    descriptionFn: (base) =>
      `Mid-level ${base} role on a mature platform team. Collaborate on scalable systems and contribute to long-term architecture.`,
    matchScore: 88,
    atsScore: 79,
  },
  {
    idSuffix: "4",
    titleFn: (base) => `Lead ${base}`,
    company: "DataDriven Co.",
    location: "Austin, TX",
    type: "Full-time",
    posted: "5 days ago",
    descriptionFn: (base, kw) =>
      `Technical lead for a small team. Define standards${
        kw.length ? ` in ${kw[0]}` : ""
      }, unblock engineers, and partner with product to prioritize the roadmap.`,
    matchScore: 85,
    atsScore: 88,
  },
  {
    idSuffix: "5",
    titleFn: (base) => `Junior ${base}`,
    company: "GrowthLabs",
    location: "Remote",
    type: "Contract",
    posted: "1 day ago",
    descriptionFn: (base) =>
      `Entry-level ${base} contract engagement. Pair with senior engineers on greenfield work with a clear path to full-time.`,
    matchScore: 80,
    atsScore: 72,
  },
];

export function generateMockJobs(
  title: string | undefined,
  keywords: string[]
): MockJob[] {
  const baseTitle = title?.trim() || "Software Engineer";

  return templates.map((t) => {
    const resolvedTitle =
      t.idSuffix === "1" && keywords.length > 0
        ? `${t.titleFn(baseTitle)} (${keywords.slice(0, 2).join(", ")})`
        : t.titleFn(baseTitle);

    return {
      id: t.idSuffix,
      title: resolvedTitle,
      company: t.company,
      location: t.location,
      type: t.type,
      posted: t.posted,
      description: t.descriptionFn(baseTitle, keywords),
      url: `https://example.com/jobs/${t.idSuffix}`,
      matchScore: t.matchScore,
      atsScore: t.atsScore,
    };
  });
}
