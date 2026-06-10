import { describe, it, expect } from 'vitest';
import { DisputeSplitSchema, PaymentScheduleSchema, WorkPlanSchema } from './index';

describe('DisputeSplitSchema', () => {
  it('accepts splits that sum to 100', () => {
    const ok = DisputeSplitSchema.safeParse({
      clientPercentage: 30,
      squadPercentage: 60,
      platformPercentage: 10,
    });
    expect(ok.success).toBe(true);
  });

  it('rejects splits that do not sum to 100', () => {
    const bad = DisputeSplitSchema.safeParse({
      clientPercentage: 50,
      squadPercentage: 60,
      platformPercentage: 10,
    });
    expect(bad.success).toBe(false);
  });
});

describe('PaymentScheduleSchema', () => {
  it('rejects an upfront percentage above the 50% cap', () => {
    const bad = PaymentScheduleSchema.safeParse({
      upfrontPercentage: 80,
      milestones: [],
      finalPercentage: 20,
    });
    expect(bad.success).toBe(false);
  });

  it('accepts a valid schedule', () => {
    const ok = PaymentScheduleSchema.safeParse({
      upfrontPercentage: 25,
      milestones: [],
      finalPercentage: 75,
    });
    expect(ok.success).toBe(true);
  });
});

describe('WorkPlanSchema', () => {
  it('requires at least one workstream', () => {
    const bad = WorkPlanSchema.safeParse({ summary: 'x', workstreams: [] });
    expect(bad.success).toBe(false);
  });
});
