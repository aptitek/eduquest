import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { FullSizePlayingCardStack } from '../../components/molecules/PlayingCard';
import type { FullSizePlayingCardHand } from '../../components/molecules/PlayingCard';

export interface PlayingHandPageProps {
  title: string;
  subtitle?: string;
  hands: readonly FullSizePlayingCardHand[];
  currentView?: 'map' | 'management' | 'guild';
  emptyState?: string;
}

export function PlayingHandPage({
  title,
  hands,
  currentView = 'map',
  emptyState = 'No playing hands to display.',
}: PlayingHandPageProps) {
  return (
    <GameLayout>
      <GameHeader currentView={currentView} />

      <main className="pb-8 pt-4">
        <h2 className="sr-only">{title}</h2>

        {hands.length ? (
          <div className="space-y-6">
            {hands.map((hand) => (
              <section
                key={hand.id}
                aria-label={hand.title || title}
                className="overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-2 shadow-2xl md:p-4"
              >
                <FullSizePlayingCardStack
                  cards={hand.cards}
                  variant={hand.variant}
                  activeCardIndex={hand.activeCardIndex}
                  mainCardIndex={hand.mainCardIndex}
                  visibleCardCount={hand.cards.length}
                  expanded
                  expandOnHover={false}
                  dealOnMount
                  className="mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]"
                  cardClassName="shadow-glow-primary"
                />
              </section>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-10 text-center font-display text-text-muted">
            {emptyState}
          </div>
        )}
      </main>
    </GameLayout>
  );
}

export default PlayingHandPage;
