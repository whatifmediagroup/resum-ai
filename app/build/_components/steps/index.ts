import type { FC } from "react";
import type { FormData } from "@/lib/schema";
import { Identity, validateIdentity } from "./Identity";
import { Target, validateTarget } from "./Target";
import { RecentJob, validateRecentJob, isRecentJobEmpty } from "./RecentJob";
import { PriorJobs, validatePriorJobs } from "./PriorJobs";
import { Education, validateEducation } from "./Education";
import { Skills, validateSkills } from "./Skills";

export type StepErrors = Record<string, string>;

export type StepProps = {
  errors: StepErrors;
  touched: Record<string, boolean>;
  markTouched: (field: string) => void;
};

export type StepDef = {
  id: string;
  label: string;
  Component: FC<StepProps>;
  validate: (data: FormData) => StepErrors;
  isSkippable?: (data: FormData) => boolean;
  skip?: (data: FormData) => Partial<FormData>;
};

export const steps: StepDef[] = [
  { id: "identity", label: "About you", Component: Identity, validate: validateIdentity },
  { id: "target", label: "Target role", Component: Target, validate: validateTarget },
  {
    id: "recent-job",
    label: "Current role",
    Component: RecentJob,
    validate: validateRecentJob,
    isSkippable: () => true,
    skip: () => ({
      recentJob: {
        company: "",
        title: "",
        start: "",
        end: undefined,
        current: true,
        description: "",
      },
    }),
  },
  {
    id: "prior-jobs",
    label: "Earlier jobs",
    Component: PriorJobs,
    validate: validatePriorJobs,
    isSkippable: () => true,
    skip: () => ({ priorJobs: [] }),
  },
  {
    id: "education",
    label: "Education",
    Component: Education,
    validate: validateEducation,
    isSkippable: () => true,
    skip: () => ({ education: [] }),
  },
  { id: "skills", label: "Skills & links", Component: Skills, validate: validateSkills },
];

export { isRecentJobEmpty };

export function findStep(id: string): { step: StepDef; index: number } | null {
  const index = steps.findIndex((s) => s.id === id);
  if (index === -1) return null;
  return { step: steps[index], index };
}
