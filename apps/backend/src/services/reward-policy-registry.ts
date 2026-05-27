import type { DomainEvent, DomainEventType, RewardPolicy, RewardPolicyId } from '@eduquest/shared';
import { DEFAULT_REWARD_POLICIES } from '@eduquest/shared';
import type { ResolvedRewardBalanceConfig } from './reward-balance-config';

export class RewardPolicyRegistry {
  constructor(private readonly policies: Record<RewardPolicyId, RewardPolicy>) {}

  static fromBalanceConfig(config: ResolvedRewardBalanceConfig): RewardPolicyRegistry {
    return new RewardPolicyRegistry(config.policies);
  }

  resolveForEvent(event: DomainEvent): RewardPolicy | null {
    if (event.type === 'activity.validated') {
      return this.policies['activity.validated'];
    }

    if (event.type === 'github.ci.passed') {
      const workflowName =
        (event.payload as { workflowName?: string }).workflowName?.toLowerCase() || '';
      if (workflowName.includes('lint') || workflowName.includes('quality')) {
        return this.policies['github.ci.advanced'];
      }
      return this.policies['github.ci.core'];
    }

    if (event.type === 'github.pr.reviewed') {
      const reviewState = (event.payload as { reviewState?: string }).reviewState;
      if (reviewState === 'approved') {
        return this.policies['github.pr.reviewed'];
      }
      return null;
    }

    if (event.type === 'github.pr.merged') {
      return this.policies['github.pr.merged'];
    }

    return null;
  }

  get(id: RewardPolicyId): RewardPolicy {
    return this.policies[id] || DEFAULT_REWARD_POLICIES[id];
  }
}

export function isRewardTriggerEvent(eventType: DomainEventType): boolean {
  return (
    eventType === 'activity.validated' ||
    eventType === 'github.ci.passed' ||
    eventType === 'github.pr.reviewed' ||
    eventType === 'github.pr.merged'
  );
}
