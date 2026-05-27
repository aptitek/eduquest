import type { DomainEventType } from './events';
import type { RewardActivityType } from './rewards';

export type RewardPolicyId =
  | 'activity.validated'
  | 'github.ci.core'
  | 'github.ci.advanced'
  | 'github.pr.reviewed'
  | 'github.pr.merged'
  | 'github.milestone.labeled';

export type RewardActorScope = 'student' | 'guild';

export interface RewardPolicy {
  id: RewardPolicyId;
  trigger: DomainEventType;
  primaryStrategy: RewardActivityType | 'dexterity' | null;
  actorScope: RewardActorScope;
  basePointsSource: 'activity' | 'fixed' | 'none';
  fixedBasePoints?: number;
  difficultyMultiplier?: boolean;
  requiresValidation: boolean;
  applyConstitutionOverlay: boolean;
}

export const DEFAULT_REWARD_POLICIES: Record<RewardPolicyId, RewardPolicy> = {
  'activity.validated': {
    id: 'activity.validated',
    trigger: 'activity.validated',
    primaryStrategy: null,
    actorScope: 'student',
    basePointsSource: 'activity',
    requiresValidation: true,
    applyConstitutionOverlay: true,
  },
  'github.ci.core': {
    id: 'github.ci.core',
    trigger: 'github.ci.passed',
    primaryStrategy: 'strength',
    actorScope: 'student',
    basePointsSource: 'fixed',
    fixedBasePoints: 30,
    requiresValidation: true,
    applyConstitutionOverlay: true,
  },
  'github.ci.advanced': {
    id: 'github.ci.advanced',
    trigger: 'github.ci.passed',
    primaryStrategy: 'intelligence',
    actorScope: 'student',
    basePointsSource: 'fixed',
    fixedBasePoints: 25,
    requiresValidation: true,
    applyConstitutionOverlay: true,
  },
  'github.pr.reviewed': {
    id: 'github.pr.reviewed',
    trigger: 'github.pr.reviewed',
    primaryStrategy: 'wisdom',
    actorScope: 'student',
    basePointsSource: 'fixed',
    fixedBasePoints: 20,
    requiresValidation: true,
    applyConstitutionOverlay: true,
  },
  'github.pr.merged': {
    id: 'github.pr.merged',
    trigger: 'github.pr.merged',
    primaryStrategy: 'strength',
    actorScope: 'student',
    basePointsSource: 'fixed',
    fixedBasePoints: 15,
    requiresValidation: true,
    applyConstitutionOverlay: true,
  },
  'github.milestone.labeled': {
    id: 'github.milestone.labeled',
    trigger: 'github.ci.passed',
    primaryStrategy: 'dexterity',
    actorScope: 'student',
    basePointsSource: 'none',
    requiresValidation: true,
    applyConstitutionOverlay: false,
  },
};
