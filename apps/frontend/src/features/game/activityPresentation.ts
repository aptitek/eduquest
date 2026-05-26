import type { Activity, ActivityType } from '@eduquest/shared';

export type ActivityVisualVariant = 'campfire' | 'quest' | 'boss';

export const ACTIVITY_VISUAL_VARIANTS: Record<ActivityType, ActivityVisualVariant> = {
  onboarding: 'campfire',
  character_creation: 'quest',
  tavern: 'campfire',
  tutorial: 'quest',
  ice_breaker: 'campfire',
  campfire: 'campfire',
  quiz: 'quest',
  practical: 'quest',
  mini_boss: 'boss',
  boss: 'boss',
};

const DEFAULT_ACTIVITY_XP_REWARDS: Record<ActivityType, number> = {
  onboarding: 50,
  character_creation: 50,
  tavern: 50,
  tutorial: 50,
  ice_breaker: 50,
  campfire: 50,
  quiz: 100,
  practical: 100,
  mini_boss: 150,
  boss: 200,
};

export function getActivityVisualVariant(type: ActivityType): ActivityVisualVariant {
  return ACTIVITY_VISUAL_VARIANTS[type];
}

export function getActivityXpReward(activity: Pick<Activity, 'type' | 'basePoints'>): number {
  return activity.basePoints && activity.basePoints > 0
    ? activity.basePoints
    : DEFAULT_ACTIVITY_XP_REWARDS[activity.type];
}

export function isBossActivity(type: ActivityType): boolean {
  return getActivityVisualVariant(type) === 'boss';
}
