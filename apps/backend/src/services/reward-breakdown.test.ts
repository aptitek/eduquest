import { describe, expect, it } from 'vitest';
import type { GuildStudents } from '../services/rewards';
import { RewardBreakdownBuilder } from '../services/reward-breakdown';

const guild = {
  id: 'guild-1',
  gold: 100,
  students: [
    {
      id: 'student-1',
      strength: 2,
      dexterity: 1,
      constitution: 1,
      intelligence: 3,
      wisdom: 1,
      charisma: 1,
    },
    {
      id: 'student-2',
      strength: 1,
      dexterity: 1,
      constitution: 1,
      intelligence: 1,
      wisdom: 1,
      charisma: 2,
    },
  ] as GuildStudents,
};

describe('RewardBreakdownBuilder', () => {
  it('returns a base-only breakdown when no target attribute is set', async () => {
    const breakdown = await RewardBreakdownBuilder.build({
      guild,
      guildId: guild.id,
      studentId: 'student-1',
      cohortId: 'cohort-1',
      trigger: 'activity.completed',
      activity: {
        id: 'activity-1',
        basePoints: 40,
        targetAttribute: null,
      },
    });

    expect(breakdown.finalAmount).toBe(40);
    expect(breakdown.modifiers).toHaveLength(1);
    expect(breakdown.modifiers[0]).toMatchObject({
      id: 'base',
      kind: 'base',
      effect: 40,
    });
  });

  it('includes guild stat and charisma modifiers when a target attribute is set', async () => {
    const breakdown = await RewardBreakdownBuilder.build({
      guild,
      guildId: guild.id,
      studentId: 'student-1',
      cohortId: 'cohort-1',
      trigger: 'activity.completed',
      activity: {
        id: 'activity-2',
        basePoints: 100,
        targetAttribute: 'intelligence',
      },
    });

    expect(breakdown.finalAmount).toBeGreaterThan(100);
    expect(breakdown.modifiers.map((modifier) => modifier.kind)).toEqual(
      expect.arrayContaining(['base', 'attribute', 'charisma_passive'])
    );
  });
});
