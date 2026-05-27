import { describe, expect, it } from 'vitest';
import { DEFAULT_REWARD_POLICIES, DEFAULT_REWARD_SYSTEM_CONFIG } from '@eduquest/shared';
import { CharacterStatCalculator } from './character-stat-calculator';
import { GuildStatCalculator } from './guild-stat-calculator';
import { RewardPipeline } from './reward-pipeline';

const config = DEFAULT_REWARD_SYSTEM_CONFIG;

function buildGuildProfile() {
  const members = {
    'student-1': CharacterStatCalculator.compute(
      {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 3,
        wisdom: 1,
        charisma: 1,
      },
      {
        strength: 1,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      config
    ),
    'student-2': CharacterStatCalculator.compute(
      {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 2,
      },
      {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      },
      config
    ),
  };

  return GuildStatCalculator.compute('guild-1', members, config);
}

describe('RewardPipeline integration', () => {
  it('returns a base-only breakdown when no target attribute is set', async () => {
    const breakdown = await RewardPipeline.compute({
      guildProfile: buildGuildProfile(),
      studentId: 'student-1',
      cohortId: 'cohort-1',
      trigger: 'activity.validated',
      policy: DEFAULT_REWARD_POLICIES['activity.validated'],
      basePoints: 40,
      targetAttribute: null,
      balanceConfig: {
        version: 1,
        rewardSystem: config,
        policies: DEFAULT_REWARD_POLICIES,
      },
    });

    expect(breakdown.finalAmount).toBeGreaterThanOrEqual(40);
    expect(breakdown.modifiers[0]).toMatchObject({
      id: 'base',
      kind: 'base',
      effect: 40,
    });
  });

  it('includes guild stat and charisma modifiers when a target attribute is set', async () => {
    const breakdown = await RewardPipeline.compute({
      guildProfile: buildGuildProfile(),
      studentId: 'student-1',
      cohortId: 'cohort-1',
      trigger: 'activity.validated',
      policy: {
        ...DEFAULT_REWARD_POLICIES['activity.validated'],
        primaryStrategy: 'intelligence',
      },
      basePoints: 100,
      targetAttribute: 'intelligence',
      balanceConfig: {
        version: 1,
        rewardSystem: config,
        policies: DEFAULT_REWARD_POLICIES,
      },
    });

    expect(breakdown.finalAmount).toBeGreaterThan(100);
    expect(breakdown.modifiers.map((modifier) => modifier.kind)).toEqual(
      expect.arrayContaining(['base', 'attribute', 'charisma_passive'])
    );
  });
});
