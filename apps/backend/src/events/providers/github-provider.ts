import { createDomainEvent, type DomainEvent } from '@eduquest/shared';
import type { EventProvider, EventProviderParseContext } from '../provider';

type GitHubWebhookPayload = {
  action?: string;
  repository?: {
    name?: string;
    full_name?: string;
    owner?: { login?: string };
  };
  workflow_run?: {
    name?: string;
    head_branch?: string;
    head_sha?: string;
    html_url?: string;
    conclusion?: string;
    status?: string;
  };
  pull_request?: {
    number?: number;
    title?: string;
    html_url?: string;
    merged?: boolean;
    user?: { login?: string };
  };
  review?: {
    state?: string;
    user?: { login?: string };
  };
};

function repositoryRef(payload: GitHubWebhookPayload) {
  const owner = payload.repository?.owner?.login;
  const name = payload.repository?.name;
  const fullName = payload.repository?.full_name;

  if (!owner || !name || !fullName) {
    return null;
  }

  return { owner, name, fullName };
}

export class GitHubEventProvider implements EventProvider {
  readonly id = 'github';
  readonly label = 'GitHub Webhooks';

  parse(input: unknown, _context?: EventProviderParseContext): DomainEvent | DomainEvent[] | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const payload = input as GitHubWebhookPayload;
    const repository = repositoryRef(payload);
    if (!repository) {
      return null;
    }

    if (payload.workflow_run) {
      const run = payload.workflow_run;
      if (run.status === 'completed' && run.conclusion === 'success') {
        return createDomainEvent({
          type: 'github.ci.passed',
          source: this.id,
          payload: {
            repository,
            workflowName: run.name || 'workflow',
            branch: run.head_branch || 'unknown',
            commitSha: run.head_sha || 'unknown',
            htmlUrl: run.html_url,
          },
        });
      }

      return null;
    }

    if (payload.pull_request) {
      const pullRequest = payload.pull_request;
      const basePayload = {
        repository,
        pullRequestNumber: pullRequest.number || 0,
        title: pullRequest.title || 'Pull request',
        authorLogin: pullRequest.user?.login,
        htmlUrl: pullRequest.html_url,
        merged: pullRequest.merged,
      };

      if (payload.action === 'opened') {
        return createDomainEvent({
          type: 'github.pr.opened',
          source: this.id,
          payload: basePayload,
        });
      }

      if (payload.action === 'closed' && pullRequest.merged) {
        return createDomainEvent({
          type: 'github.pr.merged',
          source: this.id,
          payload: basePayload,
        });
      }

      if (payload.action === 'submitted' && payload.review) {
        const reviewState = payload.review.state;
        if (
          reviewState === 'approved' ||
          reviewState === 'changes_requested' ||
          reviewState === 'commented' ||
          reviewState === 'dismissed'
        ) {
          return createDomainEvent({
            type: 'github.pr.reviewed',
            source: this.id,
            payload: {
              ...basePayload,
              reviewState,
              reviewerLogin: payload.review.user?.login,
            },
          });
        }
      }
    }

    return null;
  }
}
