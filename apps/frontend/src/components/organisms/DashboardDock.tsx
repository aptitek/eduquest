import type { Guild, StudentCohort } from '@eduquest/shared';
import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
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
  const { user, student, character } = useGameStore();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const playerName = user ? formatUserDisplayName(user) : 'Player';
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;

  if (!student || !character) return null;

  const podiumCards = buildPodiumCards(playerGuild);
  const cohortDeckCards = buildFaceDownDeckCards(latestMembership?.cohort?.name || 'Cohort deck');
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
        'fixed inset-x-0 bottom-0 z-40 h-36 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl xl:h-40',
        className
      )}
    >
      <div className="absolute inset-x-0 bottom-0 hidden h-72 w-screen overflow-visible px-3 xl:block">
        <div className="flex h-full w-full items-end gap-3 overflow-visible">
          <AnnouncementTickerPlaceholder />

          <div className="w-2 shrink-0" />

          <CohortRewardsDeck />

          <div className="w-3 shrink-0" />

          <DashboardMiniDeck
            cards={[podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards]}
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

          <RewardTickerPlaceholder />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-start gap-1 overflow-visible px-1 xl:hidden sm:gap-2 sm:px-2">
        <CohortRewardsDeck compact />

        <DashboardMiniDeck
          cards={[podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards]}
          stackSide="left"
          revealedCardCount={2}
          className="h-64 w-40 shrink-0 sm:w-52"
          cardClassName="w-32 translate-y-0 sm:w-36"
          stackCardClassName="w-28 translate-y-0 sm:w-32"
        />

        <GlobalProgressGauge
          currentPoints={460}
          targetPoints={1000}
          label="Current milestone"
          variant="circle"
          className="mb-3"
        />

        <GuildMemberDeck
          guild={playerGuild}
          memberCards={buildGuildMemberCards(characterCard)}
          compact
        />
      </div>

      <div className="xl:hidden">
        <SideDashboardTab side="left" offsetClassName="bottom-40" label="Feed">
          <AnnouncementTickerPlaceholder />
        </SideDashboardTab>
        <SideDashboardTab side="right" offsetClassName="bottom-40" label="Rewards">
          <RewardTickerPlaceholder />
        </SideDashboardTab>
      </div>
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

function CohortRewardsDeck({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn('relative h-72 w-52 shrink-0 overflow-visible', compact && 'h-56 w-40')}
      aria-label="Cohort reward cards"
    >
      <DashboardMiniDeck
        cards={buildCohortRewardCards()}
        variant={compact ? 'vertical' : 'horizontal'}
        stackSide="right"
        revealedCardCount={compact ? 2 : 3}
        className={cn('absolute bottom-0 left-0 h-72 w-36', compact && 'h-64 w-28')}
        cardClassName={cn('w-32 translate-y-0', compact && 'w-28')}
        stackCardClassName={cn('w-28 translate-y-0', compact && 'w-24')}
      />
    </div>
  );
}

function AnnouncementTickerPlaceholder() {
  return (
    <div className="flex h-44 w-36 shrink-0 flex-col justify-between rounded-t-2xl border-x border-t border-solarized-cyan/40 bg-gaming-card/95 p-3 shadow-2xl">
      <div>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-solarized-cyan/40 bg-solarized-cyan/10 text-solarized-cyan">
          <Bell size={18} aria-hidden />
        </div>
        <p className="font-display text-sm font-bold text-text-primary">Cohort feed</p>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-text-muted">
          Votes and global announcements.
        </p>
      </div>
      <div className="space-y-1">
        <div className="h-1.5 w-4/5 rounded-full bg-solarized-cyan/30" />
        <div className="h-1.5 w-1/2 rounded-full bg-gaming-base" />
      </div>
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
      stackSide="right"
      revealedCardCount={memberCards.length}
      expandOnHover={!compact}
      className={cn(
        'h-72 w-64 shrink-0 hover:w-[34rem] focus-within:w-[34rem]',
        compact && 'h-64 w-40 hover:w-40 focus-within:w-40'
      )}
      cardClassName={cn('translate-y-0', compact && 'w-32')}
      stackCardClassName={cn('translate-y-0', compact && 'w-28')}
    />
  );
}

function RewardTickerPlaceholder() {
  return (
    <div className="flex h-44 w-36 shrink-0 flex-col justify-between rounded-t-2xl border-x border-t border-gaming-border bg-gaming-card/95 p-3 shadow-2xl">
      <div>
        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Bell size={18} aria-hidden />
        </div>
        <p className="font-display text-sm font-bold text-text-primary">Reward ticker</p>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-text-muted">
          Reward toast feed placeholder.
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-gaming-base">
        <div className="h-full w-1/2 rounded-full bg-primary/40" />
      </div>
    </div>
  );
}

function SideDashboardTab({
  side,
  offsetClassName,
  label,
  children,
}: {
  side: 'left' | 'right';
  offsetClassName: string;
  label: string;
  children: ReactNode;
}) {
  const isLeft = side === 'left';

  return (
    <div
      className={cn(
        'group fixed z-50 flex items-start',
        offsetClassName,
        isLeft ? 'left-0' : 'right-0 flex-row-reverse'
      )}
    >
      <button
        type="button"
        className={cn(
          'min-h-24 rounded-t-xl border border-gaming-border bg-gaming-card px-2 py-3 font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-text-secondary shadow-xl outline-none transition-colors hover:text-text-primary focus:text-text-primary',
          isLeft
            ? 'rounded-r-xl [writing-mode:vertical-rl]'
            : 'rounded-l-xl [writing-mode:vertical-rl]'
        )}
      >
        {label}
      </button>
      <div
        className={cn(
          'pointer-events-none opacity-0 transition duration-300 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100',
          isLeft ? '-translate-x-4 pl-2' : 'translate-x-4 pr-2'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export default DashboardDock;
