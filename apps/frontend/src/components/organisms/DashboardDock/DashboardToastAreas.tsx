import { useEffect, useState } from 'react';
import { Bell, Coins } from 'lucide-react';
import { cn } from '../../../utils/cn';

type TickerChannel = 'cohort' | 'reward';

interface DashboardTickerEvent {
  id: string;
  channel: TickerChannel;
  title: string;
  description: string;
  meta: string;
}

const TICKER_EVENTS: DashboardTickerEvent[] = [
  {
    id: 'cohort-quest',
    channel: 'cohort',
    title: 'Quest window opened',
    description: 'New cohort quest available on the map.',
    meta: '2 min ago',
  },
  {
    id: 'cohort-campfire',
    channel: 'cohort',
    title: 'Campfire milestone',
    description: 'The warm-up milestone is now complete.',
    meta: '12 min ago',
  },
  {
    id: 'reward-gold',
    channel: 'reward',
    title: '+120 guild gold',
    description: 'Crimson Compilers gained gold from a completed quest.',
    meta: 'Just now',
  },
  {
    id: 'reward-spend',
    channel: 'reward',
    title: 'Reward unlocked',
    description: 'Deadline +24h entered the reward pool.',
    meta: '8 min ago',
  },
];

const CHANNELS = [
  {
    id: 'cohort' as const,
    label: 'Cohort events',
    icon: Bell,
    toastClassName: 'left-3 items-start',
    railClassName: 'left-0 rounded-r-2xl border-l-0',
    panelClassName: 'left-12',
  },
  {
    id: 'reward' as const,
    label: 'Rewards',
    icon: Coins,
    toastClassName: 'right-3 items-end',
    railClassName: 'right-0 rounded-l-2xl border-r-0',
    panelClassName: 'right-12',
  },
];

export function DashboardToastAreas() {
  const [activeHistory, setActiveHistory] = useState<TickerChannel | null>(null);
  const [visibleToastIds, setVisibleToastIds] = useState(() => TICKER_EVENTS.map((event) => event.id));

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisibleToastIds([]), 5500);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div className="fixed inset-x-0 bottom-40 z-50 lg:bottom-44">
      {CHANNELS.map((channel) => {
        const events = TICKER_EVENTS.filter((event) => event.channel === channel.id);
        const visibleEvents = events.filter((event) => visibleToastIds.includes(event.id));

        return (
          <div
            key={channel.id}
            aria-live="polite"
            aria-label={`${channel.label} toast area`}
            className={cn(
              'pointer-events-none absolute bottom-12 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2',
              channel.toastClassName
            )}
          >
            {visibleEvents.map((event) => (
              <TickerToast key={event.id} event={event} />
            ))}
          </div>
        );
      })}

      {CHANNELS.map((channel) => {
        const Icon = channel.icon;
        const isActive = activeHistory === channel.id;

        return (
          <button
            key={channel.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setActiveHistory(isActive ? null : channel.id)}
            className={cn(
              'pointer-events-auto fixed bottom-52 z-[60] flex items-center gap-2 border border-gaming-border bg-gaming-card/95 px-2 py-3 text-xs font-bold text-text-muted shadow-2xl backdrop-blur-md transition hover:bg-gaming-base hover:text-text-primary',
              isActive && 'bg-primary text-primary-content',
              channel.railClassName
            )}
          >
            <Icon size={15} aria-hidden />
            <span className="[writing-mode:vertical-rl]">{channel.label}</span>
          </button>
        );
      })}

      {activeHistory
        ? CHANNELS.filter((channel) => channel.id === activeHistory).map((channel) => (
          <div
            key={channel.id}
            className={cn(
              'pointer-events-auto fixed bottom-52 z-[55] max-w-[calc(100vw-6rem)]',
              channel.panelClassName
            )}
          >
          <TickerHistoryCard
            title={channel.label}
            events={TICKER_EVENTS.filter((event) => event.channel === activeHistory)}
          />
          </div>
        ))
        : null}
    </div>
  );
}

function TickerToast({ event }: { event: DashboardTickerEvent }) {
  const Icon = event.channel === 'cohort' ? Bell : Coins;

  return (
    <article className="pointer-events-auto rounded-2xl border border-gaming-border bg-gaming-card/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-solarized-yellow/40 bg-solarized-yellow/10 text-solarized-yellow">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-sm font-bold text-text-primary">{event.title}</h2>
          <p className="mt-0.5 text-xs text-text-secondary">{event.description}</p>
          <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
            {event.meta}
          </p>
        </div>
      </div>
    </article>
  );
}

function TickerHistoryCard({
  title,
  events,
}: {
  title: string;
  events: DashboardTickerEvent[];
}) {
  return (
    <section className="w-[22rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-gaming-border bg-gaming-card/95 p-4 shadow-2xl backdrop-blur-md">
      <h2 className="font-display text-sm font-black uppercase tracking-[0.18em] text-text-primary">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-xl border border-gaming-border bg-gaming-base/45 p-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-sm font-bold text-text-primary">{event.title}</h3>
              <span className="shrink-0 text-[0.65rem] font-semibold text-text-muted">{event.meta}</span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">{event.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
