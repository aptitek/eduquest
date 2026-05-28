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
