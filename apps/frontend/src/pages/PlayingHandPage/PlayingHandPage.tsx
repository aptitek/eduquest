import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingHand } from '../../components/molecules/PlayingCard';
import type { PlayingHandData } from '../../components/molecules/PlayingCard';
import { useTranslation } from '../../hooks/useTranslation';

export interface PlayingHandPageProps {
  title: string;
  subtitle?: string;
  hands: readonly PlayingHandData[];
  currentView?: 'map' | 'management' | 'guild';
  emptyState?: string;
}

export function PlayingHandPage({
  title,
  hands,
  currentView = 'map',
  emptyState,
}: PlayingHandPageProps) {
  const { t } = useTranslation();
  const resolvedEmptyState = emptyState || t('common.emptyPlayingHands');

  return (
    <GameLayout>
      <GameHeader currentView={currentView} />

      <div>
        <h2 className="sr-only">{title}</h2>

        {hands.length ? (
          <div className="space-y-6">
            {hands.map((hand) => (
              <section
                key={hand.id}
                aria-label={hand.title || title}
                className="overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-2 shadow-2xl md:p-4"
              >
                <PlayingHand
                  hand={hand}
                  mode="full"
                  visibleCardCount={hand.cards.length}
                  expandOnHover={false}
                  className="mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]"
                  cardClassName="shadow-glow-primary"
                />
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-10 text-center font-display text-text-muted">
            {resolvedEmptyState}
          </div>
        )}
      </div>
    </GameLayout>
  );
}

export default PlayingHandPage;
