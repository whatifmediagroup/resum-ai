import type { FC } from "react";
import type { FormData } from "@/lib/schema";
import { Identity, validateIdentity } from "./Identity";
import { Target, validateTarget } from "./Target";
import { RecentJob, validateRecentJob } from "./RecentJob";
import { PriorJobs, validatePriorJobs } from "./PriorJobs";
import { Education, validateEducation } from "./Education";
import { Skills, validateSkills } from "./Skills";

export type StepDef = {
  id: string;
  label: string;
  Component: FC;
  validate: (data: FormData) => string[];
};

export const steps: StepDef[] = [
  { id: "identity", label: "About you", Component: Identity, validate: validateIdentity },
  { id: "target", label: "Target role", Component: Target, validate: validateTarget },
  { id: "recent-job", label: "Current role", Component: RecentJob, validate: validateRecentJob },
  { id: "prior-jobs", label: "Earlier jobs", Component: PriorJobs, validate: validatePriorJobs },
  { id: "education", label: "Education", Component: Education, validate: validateEducation },
  { id: "skills", label: "Skills & links", Component: Skills, validate: validateSkills },
];

export function findStep(id: string): { step: StepDef; index: number } | null {
  const index = steps.findIndex((s) => s.id === id);
  if (index === -1) return null;
  return { step: steps[index], index };
}
