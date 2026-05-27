// Domain events shared between backend producers and consumers (API, handlers, future clients).

export const DOMAIN_EVENT_TYPES = [
  'activity.completed',
  'activity.validated',
  'guild.gold.earned',
  'guild.gold.spent',
  'guild.votes.spent',
  'cohort.progress.updated',
  'progress.boosted',
  'reward.calculated',
  'github.ci.passed',
  'github.pr.opened',
  'github.pr.reviewed',
  'github.pr.merged',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export interface ActivityCompletedPayload {
  activityId: string;
  studentId: string;
  cohortId: string;
  guildId?: string;
  completionType: string;
}

export interface ActivityValidatedPayload {
  activityId: string;
  studentId: string;
  cohortId: string;
  guildId?: string;
  validatedBy: 'system' | 'instructor' | 'github';
  grade?: number;
}

export interface GuildGoldEarnedPayload {
  guildId: string;
  studentId?: string;
  activityId?: string;
  amount: number;
  balance: number;
  source: 'activity' | 'reward' | 'manual';
}

export interface GuildGoldSpentPayload {
  guildId: string;
  studentId?: string;
  amount: number;
  balance: number;
  reason: 'votes' | 'reward' | 'manual';
  breakdown?: VoteSpendBreakdown;
}

export interface GuildVotesSpentPayload {
  guildId: string;
  studentId?: string;
  votes: number;
  cost: number;
  balance: number;
}

export interface CohortProgressUpdatedPayload {
  cohortId: string;
  pointsAdded: number;
  currentPoints: number;
  source: 'activity' | 'boost' | 'manual';
}

export interface ProgressBoostedPayload {
  guildId: string;
  cohortId?: string;
  studentId?: string;
  votes: number;
  cost: number;
}

import type { RewardComputationBreakdown, VoteSpendBreakdown } from './rewards';

export interface RewardCalculatedPayload {
  guildId: string;
  cohortId?: string;
  activityId?: string;
  studentId?: string;
  trigger: string;
  breakdown: RewardComputationBreakdown;
  balance: number;
}

export interface GitHubRepositoryRef {
  owner: string;
  name: string;
  fullName: string;
}

export interface GitHubCiPassedPayload {
  repository: GitHubRepositoryRef;
  workflowName: string;
  branch: string;
  commitSha: string;
  htmlUrl?: string;
}

export interface GitHubPullRequestPayload {
  repository: GitHubRepositoryRef;
  pullRequestNumber: number;
  title: string;
  authorLogin?: string;
  htmlUrl?: string;
  merged?: boolean;
}

export interface GitHubPrReviewedPayload extends GitHubPullRequestPayload {
  reviewState: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  reviewerLogin?: string;
}

export type DomainEventPayloadMap = {
  'activity.completed': ActivityCompletedPayload;
  'activity.validated': ActivityValidatedPayload;
  'guild.gold.earned': GuildGoldEarnedPayload;
  'guild.gold.spent': GuildGoldSpentPayload;
  'guild.votes.spent': GuildVotesSpentPayload;
  'cohort.progress.updated': CohortProgressUpdatedPayload;
  'progress.boosted': ProgressBoostedPayload;
  'reward.calculated': RewardCalculatedPayload;
  'github.ci.passed': GitHubCiPassedPayload;
  'github.pr.opened': GitHubPullRequestPayload;
  'github.pr.reviewed': GitHubPrReviewedPayload;
  'github.pr.merged': GitHubPullRequestPayload;
};

export interface DomainEvent<TType extends DomainEventType = DomainEventType> {
  id: string;
  type: TType;
  occurredAt: string;
  source: string;
  payload: DomainEventPayloadMap[TType];
  metadata?: Record<string, unknown>;
}

export interface DomainEventInput<TType extends DomainEventType> {
  type: TType;
  source: string;
  payload: DomainEventPayloadMap[TType];
  metadata?: Record<string, unknown>;
  id?: string;
  occurredAt?: string;
}

export function createDomainEvent<TType extends DomainEventType>(
  input: DomainEventInput<TType>
): DomainEvent<TType> {
  return {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    source: input.source,
    payload: input.payload,
    metadata: input.metadata,
  };
}

export function isDomainEventType(value: string): value is DomainEventType {
  return (DOMAIN_EVENT_TYPES as readonly string[]).includes(value);
}
