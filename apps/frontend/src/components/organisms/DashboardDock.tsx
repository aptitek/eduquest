import type { Guild, StudentCohort } from '@eduquest/shared';
import { useState } from 'react';
import { Gift, Trophy } from 'lucide-react';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import { DashboardMiniDeck } from '../molecules/DashboardMiniCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge';
import { useGameStore } from '../../features/game/gameStore';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';

const RIVAL_GUILDS = [
  {
    id: 'rival-1',
    cohortId: 'demo',
    name: 'Crimson Compilers',
    color: '#dc322f',
    totalPoints: 168,
  },
  { id: 'rival-2', cohortId: 'demo', name: 'Violet Oracles', color: '#6c71c4', totalPoints: 132 },
  {
    id: 'rival-3',
    cohortId: 'demo',
    name: 'Solarized Sentinels',
    color: '#268bd2',
    totalPoints: 116,
  },
];

const GAUGE_MILESTONES = [
  { id: 'campfire', label: 'Campfire', positionPercent: 18, description: 'Warm-up' },
  { id: 'quest', label: 'Quest', positionPercent: 46, description: 'Current' },
  { id: 'boss', label: 'Boss', positionPercent: 78, description: 'Unlock' },
];

type DockGuild = Pick<Guild, 'name' | 'color' | 'iconUrl' | 'totalPoints'>;

export interface DashboardDockProps {
  className?: string;
}

export function DashboardDock({ className }: DashboardDockProps) {
  const [showBonusCards, setShowBonusCards] = useState(false);
  const { user, student, character } = useGameStore();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const playerName = user ? formatUserDisplayName(user) : 'Player';
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;

  if (!student || !character) return null;

  const podiumCards = buildPodiumCards(playerGuild);
  const cohortDeckCards = buildFaceDownDeckCards(latestMembership?.cohort?.name || 'Cohort deck');
  const bonusCards = buildCohortRewardCards();
  const podiumDeckCards = showBonusCards
    ? bonusCards
    : ([podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards] as [
        DashboardMiniCardProps,
        ...DashboardMiniCardProps[],
      ]);
  const characterCard: DashboardMiniCardProps = {
    kind: 'character',
    title: playerName,
    subtitle: `Level ${character.currentLevel}`,
    characterClass: character.characterClass,
    illustrationUrl: playerAvatar,
    illustrationAlt: playerName,
  };

  return (
    <aside
      aria-label="Dashboard dock"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 h-36 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl 2xl:h-40',
        className
      )}
    >
      <div className="absolute inset-x-0 bottom-0 hidden h-72 w-screen overflow-visible px-3 2xl:block">
        <div className="flex h-full w-full items-end gap-3 overflow-visible">
          <ToggleablePodiumDeck
            cards={podiumDeckCards}
            showBonusCards={showBonusCards}
            onToggle={() => setShowBonusCards((current) => !current)}
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            className="h-72 w-64 shrink-0 hover:w-[28rem] focus-within:w-[28rem]"
            cardClassName="w-44 translate-y-0"
            stackCardClassName="w-40 translate-y-0"
          />

          <GlobalProgressGauge
            currentPoints={460}
            targetPoints={1000}
            milestones={GAUGE_MILESTONES}
            label="Current milestone"
            className="mb-8 min-w-[20rem] flex-1 transition-[width] duration-300"
          />

          <GuildMemberDeck guild={playerGuild} memberCards={buildGuildMemberCards(characterCard)} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-center gap-2 overflow-visible px-2 2xl:hidden sm:gap-3">
        <ToggleablePodiumDeck
          cards={podiumDeckCards}
          showBonusCards={showBonusCards}
          onToggle={() => setShowBonusCards((current) => !current)}
          variant="vertical"
          stackSide="left"
          revealedCardCount={3}
          expandOnHover
          className="h-64 w-32 shrink-0 sm:w-36"
          cardClassName="w-32 translate-y-0 sm:w-36"
          stackCardClassName="w-28 translate-y-0 sm:w-32"
        />

        <GlobalProgressGauge
          currentPoints={460}
          targetPoints={1000}
          label="Current milestone"
          variant="circle"
          className="mb-0"
        />

        <GuildMemberDeck
          guild={playerGuild}
          memberCards={buildGuildMemberCards(characterCard)}
          compact
        />
      </div>

      <DashboardToastAreas />
    </aside>
  );
}

function buildPodiumCards(
  playerGuild: DockGuild
): [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps] {
  const podiumGuilds = [
    { ...playerGuild, totalPoints: playerGuild?.totalPoints ?? 180 },
    RIVAL_GUILDS[1],
    RIVAL_GUILDS[2],
  ].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  const toCard = (guild: DockGuild): DashboardMiniCardProps => ({
    kind: 'guild' as const,
    guild,
    title: guild.name,
    subtitle: `${guild.totalPoints || 0} gold spent`,
  });

  return [toCard(podiumGuilds[0]), toCard(podiumGuilds[1]), toCard(podiumGuilds[2])];
}

function buildFaceDownDeckCards(title: string) {
  return Array.from({ length: 4 }, () => ({
    kind: 'guild' as const,
    title,
    subtitle: 'Face down',
    accentColor: '#586e75',
    faceDown: true,
  })) as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

function buildCohortRewardCards() {
  return [
    {
      kind: 'guild' as const,
      title: 'Deadline +24h',
      subtitle: 'Extension',
      accentColor: '#b58900',
    },
    {
      kind: 'guild' as const,
      title: 'Mini game',
      subtitle: 'Quiz unlock',
      accentColor: '#2aa198',
    },
    {
      kind: 'guild' as const,
      title: 'Tech help',
      subtitle: 'Bonus support',
      accentColor: '#268bd2',
    },
    {
      kind: 'guild' as const,
      title: 'Reroll',
      subtitle: 'Late grading',
      accentColor: '#6c71c4',
    },
  ] as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

function ToggleablePodiumDeck({
  cards,
  showBonusCards,
  onToggle,
  variant = 'horizontal',
  stackSide,
  revealedCardCount,
  expandOnHover,
  className,
  cardClassName,
  stackCardClassName,
}: {
  cards: readonly [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
  showBonusCards: boolean;
  onToggle: () => void;
  variant?: 'horizontal' | 'vertical';
  stackSide: 'left' | 'right';
  revealedCardCount: number;
  expandOnHover?: boolean;
  className?: string;
  cardClassName?: string;
  stackCardClassName?: string;
}) {
  return (
    <div className="relative shrink-0 overflow-visible">
      <DashboardMiniDeck
        cards={cards}
        variant={variant}
        stackSide={stackSide}
        revealedCardCount={revealedCardCount}
        expandOnHover={expandOnHover}
        className={className}
        cardClassName={cardClassName}
        stackCardClassName={stackCardClassName}
      />
      <button
        type="button"
        aria-pressed={showBonusCards}
        aria-label={showBonusCards ? 'Show podium cards' : 'Show bonus cards'}
        onClick={onToggle}
        className="absolute bottom-[-0.35rem] right-[-1.85rem] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-solarized-yellow/60 bg-gaming-card text-solarized-yellow shadow-xl transition hover:translate-x-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-solarized-yellow"
      >
        {showBonusCards ? <Trophy size={18} aria-hidden /> : <Gift size={18} aria-hidden />}
      </button>
    </div>
  );
}

function buildGuildMemberCards(characterCard: DashboardMiniCardProps) {
  return [
    characterCard,
    {
      kind: 'character' as const,
      title: 'Guildmate',
      subtitle: 'Hidden member',
      accentColor: '#859900',
      faceDown: true,
    },
    {
      kind: 'character' as const,
      title: 'Guildmate',
      subtitle: 'Hidden member',
      accentColor: '#6c71c4',
      faceDown: true,
    },
  ] as [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
}

function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;

  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function GuildMemberDeck({
  guild,
  memberCards,
  compact = false,
}: {
  guild: DockGuild;
  memberCards: readonly [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
  compact?: boolean;
}) {
  const guildCard: DashboardMiniCardProps = {
    kind: 'guild',
    guild,
    title: guild.name || 'Player guild',
    subtitle: `${guild.totalPoints || 0} gold`,
  };

  return (
    <DashboardMiniDeck
      cards={[guildCard, ...memberCards]}
      variant={compact ? 'vertical' : 'horizontal'}
      stackSide="right"
      revealedCardCount={memberCards.length}
      expandOnHover
      className={cn(
        'h-72 w-64 shrink-0 hover:w-[34rem] focus-within:w-[34rem]',
        compact && 'h-64 w-32 hover:w-32 focus:w-32 focus-within:w-32 sm:w-36'
      )}
      cardClassName={cn('translate-y-0', compact && 'w-32')}
      stackCardClassName={cn('translate-y-0', compact && 'w-28')}
    />
  );
}

function DashboardToastAreas() {
  return (
    <>
      <div
        aria-live="polite"
        aria-label="Cohort announcement toast area"
        className="pointer-events-none fixed left-3 top-20 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2"
      />
      <div
        aria-live="polite"
        aria-label="Reward toast area"
        className="pointer-events-none fixed right-3 top-20 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2"
      />
    </>
  );
}

export default DashboardDock;
