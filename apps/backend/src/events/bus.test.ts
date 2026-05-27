import { describe, expect, it, beforeEach } from 'vitest';
import {
  createDomainEvent,
  type DomainEvent,
  type DomainEventType,
  type GuildGoldEarnedPayload,
} from '@eduquest/shared';
import { EventBus } from './bus';
import { createEventContext } from './bootstrap';
import { GitHubEventProvider } from './providers/github-provider';
import { EventProviderRegistry } from './provider';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('delivers events to typed subscribers', async () => {
    const received: DomainEvent[] = [];
    bus.subscribe('guild.gold.earned', async (event) => {
      received.push(event);
    });

    const event = createDomainEvent({
      type: 'guild.gold.earned',
      source: 'test',
      payload: {
        guildId: 'guild-1',
        amount: 10,
        balance: 110,
        source: 'activity',
      },
    });

    const result = await bus.publish(event, createEventContext({}));

    expect(result.handlerCount).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(received).toHaveLength(1);
    expect((received[0]?.payload as GuildGoldEarnedPayload).amount).toBe(10);
  });

  it('delivers events to wildcard subscribers', async () => {
    const types: DomainEventType[] = [];
    bus.subscribeAll(async (event) => {
      types.push(event.type);
    });

    await bus.publish(
      createDomainEvent({
        type: 'guild.votes.spent',
        source: 'test',
        payload: {
          guildId: 'guild-1',
          votes: 1,
          cost: 1,
          balance: 99,
        },
      }),
      createEventContext({})
    );

    expect(types).toEqual(['guild.votes.spent']);
  });

  it('collects handler failures without stopping other handlers', async () => {
    bus.subscribe('activity.completed', async () => {
      throw new Error('handler failed');
    }, 'failing-handler');
    bus.subscribe('activity.completed', async () => undefined, 'healthy-handler');

    const result = await bus.publish(
      createDomainEvent({
        type: 'activity.completed',
        source: 'test',
        payload: {
          activityId: 'activity-1',
          studentId: 'student-1',
          cohortId: 'cohort-1',
          completionType: 'read',
        },
      }),
      createEventContext({})
    );

    expect(result.handlerCount).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.handler).toBe('failing-handler');
  });
});

describe('GitHubEventProvider', () => {
  const provider = new GitHubEventProvider();

  it('maps successful workflow runs to github.ci.passed', () => {
    const event = provider.parse({
      repository: {
        name: 'eduquest',
        full_name: 'aptitek/eduquest',
        owner: { login: 'aptitek' },
      },
      workflow_run: {
        name: 'CI',
        head_branch: 'main',
        head_sha: 'abc123',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/aptitek/eduquest/actions/runs/1',
      },
    });

    expect(event).toMatchObject({
      type: 'github.ci.passed',
      payload: {
        repository: { fullName: 'aptitek/eduquest' },
        workflowName: 'CI',
        branch: 'main',
      },
    });
  });

  it('maps pull request lifecycle events', () => {
    const opened = provider.parse({
      action: 'opened',
      repository: {
        name: 'eduquest',
        full_name: 'aptitek/eduquest',
        owner: { login: 'aptitek' },
      },
      pull_request: {
        number: 42,
        title: 'Add event bus',
        html_url: 'https://github.com/aptitek/eduquest/pull/42',
        user: { login: 'dev' },
      },
    });

    const merged = provider.parse({
      action: 'closed',
      repository: {
        name: 'eduquest',
        full_name: 'aptitek/eduquest',
        owner: { login: 'aptitek' },
      },
      pull_request: {
        number: 42,
        title: 'Add event bus',
        merged: true,
        html_url: 'https://github.com/aptitek/eduquest/pull/42',
        user: { login: 'dev' },
      },
    });

    expect(opened).toMatchObject({ type: 'github.pr.opened' });
    expect(merged).toMatchObject({ type: 'github.pr.merged' });
  });
});

describe('EventProviderRegistry', () => {
  it('registers and resolves providers', () => {
    const registry = new EventProviderRegistry();
    registry.register(new GitHubEventProvider());

    const providers = registry.list();
    expect(providers).toHaveLength(1);
    expect(providers[0]?.id).toBe('github');
  });
});
