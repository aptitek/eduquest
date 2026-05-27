import type { DomainEvent } from '@eduquest/shared';

export interface EventProviderParseContext {
  headers?: Headers;
}

export interface EventProvider {
  readonly id: string;
  readonly label: string;
  parse(input: unknown, context?: EventProviderParseContext): DomainEvent | DomainEvent[] | null;
}

export class EventProviderRegistry {
  private readonly providers = new Map<string, EventProvider>();

  register(provider: EventProvider): this {
    if (this.providers.has(provider.id)) {
      throw new Error(`Event provider "${provider.id}" is already registered.`);
    }

    this.providers.set(provider.id, provider);
    return this;
  }

  get(id: string): EventProvider | undefined {
    return this.providers.get(id);
  }

  list(): readonly EventProvider[] {
    return [...this.providers.values()];
  }

  parse(
    providerId: string,
    input: unknown,
    context?: EventProviderParseContext
  ): DomainEvent | DomainEvent[] | null {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Event provider "${providerId}" is not registered.`);
    }

    return provider.parse(input, context);
  }
}
