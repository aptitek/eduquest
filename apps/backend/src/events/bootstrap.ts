import {
  createDomainEvent,
  type DomainEvent,
  type DomainEventInput,
  type DomainEventType,
} from '@eduquest/shared';
import { EventBus } from './bus';
import type { EventBindings, EventContext, EventHandler, PublishResult } from './context';
import { auditEventHandler, notificationEventHandler } from './handlers';
import { rewardComputationHandler } from './handlers/reward-handler';
import { EventProviderRegistry } from './provider';
import { registerDefaultEventProviders } from './providers';

let appEventBus: EventBus | undefined;
let appProviderRegistry: EventProviderRegistry | undefined;

function createProviderRegistry(): EventProviderRegistry {
  const registry = new EventProviderRegistry();
  registerDefaultEventProviders(registry);
  return registry;
}

function registerDefaultHandlers(bus: EventBus): void {
  bus.subscribeAll(auditEventHandler, 'audit-log');
  bus.subscribeMany(
    ['activity.completed', 'activity.validated', 'github.ci.passed', 'github.pr.merged'],
    rewardComputationHandler,
    'reward-computation'
  );
  bus.subscribeMany(
    ['reward.calculated', 'guild.votes.spent', 'github.ci.passed', 'github.pr.merged'],
    notificationEventHandler,
    'push-notification'
  );
}

export function getAppEventBus(): EventBus {
  if (!appEventBus) {
    appEventBus = new EventBus();
    registerDefaultHandlers(appEventBus);
  }

  return appEventBus;
}

export function getEventProviderRegistry(): EventProviderRegistry {
  if (!appProviderRegistry) {
    appProviderRegistry = createProviderRegistry();
  }

  return appProviderRegistry;
}

export function registerEventHandler<TType extends DomainEventType>(
  type: TType | '*',
  handler: EventHandler<TType>,
  name?: string
): () => void {
  const bus = getAppEventBus();
  if (type === '*') {
    return bus.subscribeAll(handler as EventHandler, name);
  }

  return bus.subscribe(type, handler as EventHandler, name);
}

export function registerEventProvider(
  provider: Parameters<EventProviderRegistry['register']>[0]
): void {
  getEventProviderRegistry().register(provider);
}

export function createEventContext(input: {
  db?: EventContext['db'];
  env?: EventBindings;
  userId?: string;
}): EventContext {
  return {
    db: input.db,
    env: input.env,
    userId: input.userId,
  };
}

export async function publishEvent<TType extends DomainEventType>(
  input: DomainEventInput<TType>,
  context: EventContext
): Promise<PublishResult> {
  const event = createDomainEvent(input);
  return getAppEventBus().publish(event, context);
}

export async function publishEvents(
  events: DomainEvent[],
  context: EventContext
): Promise<PublishResult[]> {
  const bus = getAppEventBus();
  const results: PublishResult[] = [];

  for (const event of events) {
    results.push(await bus.publish(event, context));
  }

  return results;
}

export function resetEventSystemForTests(): void {
  appEventBus = undefined;
  appProviderRegistry = undefined;
}

export { EventBus } from './bus';
export { EventProviderRegistry } from './provider';
export type {
  EventBindings,
  EventContext,
  EventHandler,
  PublishResult,
} from './context';
export type { EventProvider } from './provider';
