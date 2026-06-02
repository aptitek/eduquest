import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_REWARD_POLICIES, DEFAULT_REWARD_SYSTEM_CONFIG, type DomainEvent } from '@eduquest/shared';
import { RewardContextResolver } from './reward-context-resolver';

function selectBuilder(result: unknown[]) {
  const builder = {
    from: vi.fn(() => builder),
    innerJoin: vi.fn(() => builder),
    where: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result)),
    then: Promise.resolve(result).then.bind(Promise.resolve(result)),
  };
  return builder;
}

describe('RewardContextResolver', () => {
  it('skips onboarding activity rewards unless the event marks guild creation', async () => {
    const db = {
      select: vi.fn().mockReturnValue(
        selectBuilder([
          {
            id: 'activity-onboarding',
            basePoints: 100,
            targetAttribute: 'intelligence',
            endDate: null,
            metadata: { onboardingTask: 'character_card' },
          },
        ])
      ),
    };
    const resolver = new RewardContextResolver(db as any, {
      version: 1,
      rewardSystem: DEFAULT_REWARD_SYSTEM_CONFIG,
      policies: DEFAULT_REWARD_POLICIES,
    });

    const context = await resolver.resolve(
      {
        id: 'event-1',
        type: 'activity.validated',
        occurredAt: new Date().toISOString(),
        source: 'test',
        payload: {
          guildId: 'guild-1',
          activityId: 'activity-onboarding',
          cohortId: 'cohort-1',
          studentId: 'student-1',
          validatedBy: 'system',
        },
      } as DomainEvent<'activity.validated'>,
      DEFAULT_REWARD_POLICIES['activity.validated']
    );

    expect(context).toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('skips guild rally onboarding rewards unless the event marks the first guild bonus', async () => {
    const db = {
      select: vi.fn().mockReturnValue(
        selectBuilder([
          {
            id: 'activity-guild-rally',
            basePoints: 100,
            targetAttribute: 'charisma',
            endDate: null,
            metadata: { onboardingTask: 'guild_rally' },
          },
        ])
      ),
    };
    const resolver = new RewardContextResolver(db as any, {
      version: 1,
      rewardSystem: DEFAULT_REWARD_SYSTEM_CONFIG,
      policies: DEFAULT_REWARD_POLICIES,
    });

    const context = await resolver.resolve(
      {
        id: 'event-1',
        type: 'activity.validated',
        occurredAt: new Date().toISOString(),
        source: 'test',
        payload: {
          guildId: 'guild-1',
          activityId: 'activity-guild-rally',
          cohortId: 'cohort-1',
          studentId: 'student-1',
          validatedBy: 'system',
        },
        metadata: { onboardingRewardAction: 'guild_created' },
      } as DomainEvent<'activity.validated'>,
      DEFAULT_REWARD_POLICIES['activity.validated']
    );

    expect(context).toBeNull();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it('allows a dexterity bonus when the event marks the first guild creation', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectBuilder([
            {
              id: 'activity-guild-rally',
              basePoints: 100,
              targetAttribute: 'charisma',
              endDate: null,
              metadata: { onboardingTask: 'guild_rally' },
            },
          ])
        )
        .mockReturnValueOnce(
          selectBuilder([
            {
              studentId: 'student-1',
              baseStrength: 1,
              baseDexterity: 1,
              baseConstitution: 1,
              baseIntelligence: 1,
              baseWisdom: 1,
              baseCharisma: 1,
              manualStrength: 0,
              manualDexterity: 0,
              manualConstitution: 0,
              manualIntelligence: 0,
              manualWisdom: 0,
              manualCharisma: 0,
            },
          ])
        ),
    };
    const resolver = new RewardContextResolver(db as any, {
      version: 1,
      rewardSystem: DEFAULT_REWARD_SYSTEM_CONFIG,
      policies: DEFAULT_REWARD_POLICIES,
    });

    const context = await resolver.resolve(
      {
        id: 'event-1',
        type: 'activity.validated',
        occurredAt: new Date().toISOString(),
        source: 'test',
        payload: {
          guildId: 'guild-1',
          activityId: 'activity-guild-rally',
          cohortId: 'cohort-1',
          studentId: 'student-1',
          validatedBy: 'system',
        },
        metadata: { onboardingRewardAction: 'guild_created', firstGuildBonus: true },
      } as DomainEvent<'activity.validated'>,
      DEFAULT_REWARD_POLICIES['activity.validated']
    );

    expect(context).toMatchObject({
      guildId: 'guild-1',
      activityId: 'activity-guild-rally',
      studentId: 'student-1',
      basePoints: 0,
      targetAttribute: 'dexterity',
      hoursEarly: 168,
    });
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it('skips activity rewards when a guild has no eligible RPG members', async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(
          selectBuilder([
            {
              id: 'activity-1',
              basePoints: 100,
              targetAttribute: 'intelligence',
              endDate: null,
              metadata: {},
            },
          ])
        )
        .mockReturnValueOnce(selectBuilder([])),
    };
    const resolver = new RewardContextResolver(db as any, {
      version: 1,
      rewardSystem: DEFAULT_REWARD_SYSTEM_CONFIG,
      policies: DEFAULT_REWARD_POLICIES,
    });

    const context = await resolver.resolve(
      {
        id: 'event-1',
        type: 'activity.validated',
        occurredAt: new Date().toISOString(),
        source: 'test',
        payload: {
          guildId: 'guild-empty',
          activityId: 'activity-1',
          cohortId: 'cohort-1',
          studentId: 'student-1',
        },
      } as DomainEvent<'activity.validated'>,
      DEFAULT_REWARD_POLICIES['activity.validated']
    );

    expect(context).toBeNull();
  });
});
