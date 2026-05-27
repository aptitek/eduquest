import type { DomainEventType } from '@eduquest/shared';
import {
  RewardComputationService,
  type RewardTriggerEvent,
} from '../../services/reward-computation';
import type { EventHandler } from '../context';

const REWARD_TRIGGER_EVENTS: RewardTriggerEvent[] = [
  'activity.completed',
  'activity.validated',
  'github.ci.passed',
  'github.pr.merged',
];

export const rewardComputationHandler: EventHandler = async (event, context) => {
  if (!context.db || !RewardComputationService.isRewardTrigger(event.type)) {
    return;
  }

  await new RewardComputationService(context.db).processEvent(
    event as Parameters<RewardComputationService['processEvent']>[0]
  );
};

export function isRewardTriggerEvent(eventType: DomainEventType): eventType is RewardTriggerEvent {
  return RewardComputationService.isRewardTrigger(eventType);
}
