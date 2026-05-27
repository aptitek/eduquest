import type { DomainEvent, DomainEventType } from '@eduquest/shared';
import type {
  EventContext,
  EventHandler,
  PublishResult,
  Unsubscribe,
} from './context';

type HandlerEntry = {
  name: string;
  handler: EventHandler;
};

export class EventBus {
  private readonly handlers = new Map<DomainEventType | '*', HandlerEntry[]>();

  subscribe<TType extends DomainEventType>(
    type: TType,
    handler: EventHandler<TType>,
    name = 'anonymous'
  ): Unsubscribe {
    return this.addHandler(type, handler as EventHandler, name);
  }

  subscribeAll(handler: EventHandler, name = 'anonymous'): Unsubscribe {
    return this.addHandler('*', handler, name);
  }

  subscribeMany(
    types: DomainEventType[],
    handler: EventHandler,
    name = 'anonymous'
  ): Unsubscribe {
    const unsubscribers = types.map((type) => this.subscribe(type, handler, name));

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe();
      }
    };
  }

  async publish(event: DomainEvent, context: EventContext): Promise<PublishResult> {
    const entries = this.collectHandlers(event.type);
    const errors: PublishResult['errors'] = [];

    await Promise.all(
      entries.map(async ({ name, handler }) => {
        try {
          await handler(event, context);
        } catch (error) {
          errors.push({
            handler: name,
            eventType: event.type,
            eventId: event.id,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      })
    );

    if (errors.length > 0) {
      console.error('Event bus handler failures:', errors);
    }

    return {
      eventId: event.id,
      eventType: event.type,
      handlerCount: entries.length,
      errors,
    };
  }

  listSubscriptions(): Array<{ type: DomainEventType | '*'; handlers: string[] }> {
    return [...this.handlers.entries()].map(([type, entries]) => ({
      type,
      handlers: entries.map((entry) => entry.name),
    }));
  }

  private addHandler(
    type: DomainEventType | '*',
    handler: EventHandler,
    name: string
  ): Unsubscribe {
    const entries = this.handlers.get(type) ?? [];
    const entry = { name, handler };
    entries.push(entry);
    this.handlers.set(type, entries);

    return () => {
      const current = this.handlers.get(type);
      if (!current) return;

      const next = current.filter((candidate) => candidate !== entry);
      if (next.length === 0) {
        this.handlers.delete(type);
      } else {
        this.handlers.set(type, next);
      }
    };
  }

  private collectHandlers(type: DomainEventType): HandlerEntry[] {
    const specific = this.handlers.get(type) ?? [];
    const wildcard = this.handlers.get('*') ?? [];
    return [...specific, ...wildcard];
  }
}
