export enum ScopeStatus {
  Draft = 'draft',
  Analyzing = 'analyzing',
  NeedsInfo = 'needs_info',
  Ready = 'ready',
  Published = 'published',
  Open = 'open',
  Contracted = 'contracted',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum BidStatus {
  Draft = 'draft',
  UnderReview = 'under_review',
  Submitted = 'submitted',
  Shortlisted = 'shortlisted',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Withdrawn = 'withdrawn',
}

export enum ContractStatus {
  PendingDeposit = 'pending_deposit',
  Active = 'active',
  InReview = 'in_review',
  RevisionRequested = 'revision_requested',
  Completed = 'completed',
  Disputed = 'disputed',
  Cancelled = 'cancelled',
}

export enum DeliverableStatus {
  NotStarted = 'not_started',
  InProgress = 'in_progress',
  InReview = 'in_review',
  RevisionRequested = 'revision_requested',
  Approved = 'approved',
  Blocked = 'blocked',
}

export enum DeliverableFormat {
  Document = 'document',
  Codebase = 'codebase',
  Dataset = 'dataset',
  Design = 'design',
  Presentation = 'presentation',
  Video = 'video',
  Audio = 'audio',
  Spreadsheet = 'spreadsheet',
  Prototype = 'prototype',
  Report = 'report',
  Other = 'other',
}

export enum GovernanceModel {
  Consent = 'consent',
  Majority = 'majority',
  Delegated = 'delegated',
}

export enum PaymentMode {
  Fiat = 'fiat',
  Crypto = 'crypto',
  Hybrid = 'hybrid',
}

export enum DisputeStatus {
  Raised = 'raised',
  UnderReview = 'under_review',
  Mediation = 'mediation',
  Resolved = 'resolved',
  Escalated = 'escalated',
}

export enum ChannelType {
  General = 'general',
  Workstream = 'workstream',
  Deliverable = 'deliverable',
  ClientSquad = 'client_squad',
  Internal = 'internal',
}

export const ROLE_TAXONOMY = [
  'Project Manager',
  'Technical Lead',
  'Frontend Developer',
  'Backend Developer',
  'Full-Stack Developer',
  'Designer',
  'UX Researcher',
  'Data Scientist',
  'Data Engineer',
  'DevOps Engineer',
  'Content Writer',
  'Technical Writer',
  'Marketing Strategist',
  'Business Analyst',
  'QA Engineer',
  'Security Specialist',
  'AI/ML Engineer',
  'Smart Contract Developer',
  'Community Manager',
  'Researcher',
  'Consultant',
  'Other',
] as const;

export enum SkillCategory {
  Frontend = 'frontend',
  Backend = 'backend',
  Design = 'design',
  Data = 'data',
  DevOps = 'devops',
  AiMl = 'ai_ml',
  Blockchain = 'blockchain',
  Business = 'business',
  Writing = 'writing',
  Other = 'other',
}

export enum ProficiencyLevel {
  Demonstrated = 'demonstrated', // 1-2 attestations
  Proficient = 'proficient',     // 3-5 attestations
  Expert = 'expert',             // 6+ attestations
}

export const FORMAT_TAXONOMY = Object.values(DeliverableFormat);

export type RoleName = (typeof ROLE_TAXONOMY)[number];
