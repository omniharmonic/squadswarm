import { z } from 'zod';
import { GovernanceModel, DeliverableFormat, DeliverableStatus, SkillCategory } from '../constants';

export const GovernanceConfigSchema = z.object({
  model: z.nativeEnum(GovernanceModel),
  votingThreshold: z.number().min(0).max(100).optional(),
  actionPermissions: z.record(z.string(), z.enum(['admin', 'member', 'vote'])).optional(),
});

export const RevenueSplitSchema = z.object({
  type: z.enum(['equal', 'role_weighted', 'custom']),
  allocations: z.array(z.object({
    memberId: z.string().uuid(),
    percentage: z.number().min(0).max(100),
  })).optional(),
});

export const AcceptanceCriterionSchema = z.object({
  description: z.string().min(1),
  measurableCondition: z.string().min(1),
});

export const DeliverableSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  format: z.nativeEnum(DeliverableFormat),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  estimatedEffortHours: z.number().positive().optional(),
  requiredSkills: z.array(z.string()).default([]),
  suggestedRole: z.string().optional(),
});

export const WorkstreamSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  deliverables: z.array(DeliverableSchema),
  dependencies: z.array(z.string().uuid()).optional(),
  orderIndex: z.number().int().min(0),
});

export const WorkPlanSchema = z.object({
  summary: z.string().min(1),
  workstreams: z.array(WorkstreamSchema).min(1),
  estimatedTotalHours: z.number().positive().optional(),
  suggestedTimelineDays: z.number().positive().optional(),
  roles: z.array(z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    isRequired: z.boolean().default(true),
  })).optional(),
});

export const RoleAssignmentsSchema = z.record(
  z.string(),
  z.object({
    memberId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    rationale: z.string().optional(),
  }),
);

export const PaymentScheduleSchema = z.object({
  upfrontPercentage: z.number().min(0).max(50),
  milestones: z.array(z.object({
    workstreamId: z.string().uuid(),
    percentage: z.number().min(0).max(100),
    description: z.string().optional(),
  })).optional(),
  finalPercentage: z.number().min(0).max(100),
});

export const DisputeSplitSchema = z.object({
  clientPercentage: z.number().min(0).max(100),
  squadPercentage: z.number().min(0).max(100),
  platformPercentage: z.number().min(0).max(100),
}).refine((data) => data.clientPercentage + data.squadPercentage + data.platformPercentage === 100, {
  message: 'Percentages must sum to 100',
});

export const SufficiencyDimensionSchema = z.object({
  dimension: z.string(),
  score: z.number().min(0).max(100),
  questions: z.array(z.string()).optional(),
  feedback: z.string().optional(),
});

export const SufficiencyAssessmentSchema = z.object({
  dimensions: z.array(SufficiencyDimensionSchema),
  overallScore: z.number().min(0).max(100),
  isReady: z.boolean(),
});

export type GovernanceConfig = z.infer<typeof GovernanceConfigSchema>;
export type RevenueSplit = z.infer<typeof RevenueSplitSchema>;
export type WorkPlan = z.infer<typeof WorkPlanSchema>;
export type Workstream = z.infer<typeof WorkstreamSchema>;
export type Deliverable = z.infer<typeof DeliverableSchema>;
export type RoleAssignments = z.infer<typeof RoleAssignmentsSchema>;
export type PaymentSchedule = z.infer<typeof PaymentScheduleSchema>;
export type DisputeSplit = z.infer<typeof DisputeSplitSchema>;
export type SufficiencyAssessment = z.infer<typeof SufficiencyAssessmentSchema>;
export const SkillSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  category: z.nativeEnum(SkillCategory),
  description: z.string().optional(),
  synonyms: z.array(z.string()).default([]),
});

export type Skill = z.infer<typeof SkillSchema>;
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;
