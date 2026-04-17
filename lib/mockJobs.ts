export type MockJob = {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  posted: string;
  matchScore: number;
};

export function generateMockJobs(
  title: string | undefined,
  keywords: string[]
): MockJob[] {
  const baseTitle = title?.trim() || "Software Engineer";
  const jobs: MockJob[] = [
    {
      id: "1",
      title: `Senior ${baseTitle}`,
      company: "TechCorp Inc.",
      location: "San Francisco, CA",
      type: "Full-time",
      posted: "2 days ago",
      matchScore: 95,
    },
    {
      id: "2",
      title: baseTitle,
      company: "StartupXYZ",
      location: "Remote",
      type: "Full-time",
      posted: "1 day ago",
      matchScore: 92,
    },
    {
      id: "3",
      title: `${baseTitle} II`,
      company: "MegaSoft",
      location: "New York, NY",
      type: "Full-time",
      posted: "3 days ago",
      matchScore: 88,
    },
    {
      id: "4",
      title: `Lead ${baseTitle}`,
      company: "DataDriven Co.",
      location: "Austin, TX",
      type: "Full-time",
      posted: "5 days ago",
      matchScore: 85,
    },
    {
      id: "5",
      title: `Junior ${baseTitle}`,
      company: "GrowthLabs",
      location: "Remote",
      type: "Contract",
      posted: "1 day ago",
      matchScore: 80,
    },
  ];

  if (keywords.length > 0) {
    jobs[0] = {
      ...jobs[0],
      title: `${baseTitle} (${keywords.slice(0, 2).join(", ")})`,
    };
  }

  return jobs;
}
