import { z } from "zod";

export const MAX_SKILLS = 15;

export const JobContextSchema = z.object({
  title: z.string().optional(),
  keywords: z.array(z.string()).default([]),
  jobId: z.string().optional(),
});
export type JobContext = z.infer<typeof JobContextSchema>;

const JobSchema = z.object({
  company: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string().optional(),
  current: z.boolean(),
  description: z.string(),
});

const FilledJobSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().optional(),
  current: z.boolean(),
  description: z.string(),
});

const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  credential: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
});

export const FormDataSchema = z.object({
  identity: z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
    email: z.email(),
    location: z.string().min(1),
  }),
  target: z.object({
    title: z.string().min(1),
    pitch: z.string().min(1),
  }),
  recentJob: JobSchema,
  priorJobs: z.array(FilledJobSchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string().min(1)).min(1),
  links: z.object({
    linkedIn: z.string().url().optional(),
    portfolio: z.string().url().optional(),
    github: z.string().url().optional(),
  }),
});
export type FormData = z.infer<typeof FormDataSchema>;

export const ResumeJsonSchema = z.object({
  header: z.object({
    fullName: z.string().min(1),
    contact: z.object({
      phone: z.string().min(1),
      email: z.email(),
      location: z.string().min(1),
    }),
    links: z
      .object({
        linkedIn: z.string().url().optional(),
        portfolio: z.string().url().optional(),
        github: z.string().url().optional(),
      })
      .default({}),
  }),
  summary: z.string().min(1),
  experience: z
    .array(
      z.object({
        company: z.string().min(1),
        title: z.string().min(1),
        dates: z.string().min(1),
        bullets: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
  education: z.array(
    z.object({
      institution: z.string().min(1),
      credential: z.string().min(1),
      dates: z.string().min(1),
    })
  ),
  skills: z.array(z.string().min(1)).min(1),
});
export type ResumeJson = z.infer<typeof ResumeJsonSchema>;

export const emptyFormData: FormData = {
  identity: { fullName: "", phone: "", email: "", location: "" },
  target: { title: "", pitch: "" },
  recentJob: { company: "", title: "", start: "", current: true, description: "" },
  priorJobs: [],
  education: [],
  skills: [],
  links: {},
};
