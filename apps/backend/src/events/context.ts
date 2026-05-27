import type { DomainEvent, DomainEventType } from '@eduquest/shared';
import type { getDb } from '../db';

export type EventDb = ReturnType<typeof getDb>;

export interface EventBindings {
  APP_ENV?: string;
  DATABASE_URL?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  [key: string]: string | R2Bucket | undefined;
}

export interface EventContext {
  db?: EventDb;
  env?: EventBindings;
  userId?: string;
}

export type EventHandler<TType extends DomainEventType = DomainEventType> = (
  event: DomainEvent<TType>,
  context: EventContext
) => void | Promise<void>;

export interface HandlerError {
  handler: string;
  eventType: DomainEventType;
  eventId: string;
  message: string;
}

export interface PublishResult {
  eventId: string;
  eventType: DomainEventType;
  handlerCount: number;
  errors: HandlerError[];
}

export type Unsubscribe = () => void;
