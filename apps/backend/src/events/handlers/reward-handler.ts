import type { DomainEventType } from '@eduquest/shared';
import { RewardComputationService } from '../../services/reward-computation';
import type { EventHandler } from '../context';

export const rewardComputationHandler: EventHandler = async (event, context) => {
  if (!context.db || !RewardComputationService.isRewardTrigger(event.type)) {
    return;
  }

  await new RewardComputationService(context.db).processEvent(event);
};

export { isRewardTriggerEvent } from '../../services/reward-policy-registry';
