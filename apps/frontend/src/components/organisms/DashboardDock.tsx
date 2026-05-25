import type { Guild, StudentCohort } from '@eduquest/shared';
import { Bell } from 'lucide-react';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import { DashboardMiniDeck } from '../molecules/DashboardMiniCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge';
import { GoldPile } from '../molecules/GoldPile';
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
        'fixed inset-x-0 bottom-0 z-40 h-40 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl',
        className
      )}
    >
      <div className="absolute inset-x-0 bottom-0 h-72 w-screen overflow-visible px-4">
        <div className="grid h-full w-full grid-cols-[34rem_minmax(34rem,1fr)_5rem_18rem_9rem] items-end gap-4">
          <DashboardMiniDeck
            cards={[podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards]}
            stackSide="left"
            revealedCardCount={3}
            className="h-72 w-[34rem]"
            cardClassName="w-44 translate-y-0"
            stackCardClassName="w-40 translate-y-0"
          />

          <GlobalProgressGauge
            currentPoints={460}
            targetPoints={1000}
            milestones={GAUGE_MILESTONES}
            label="Current milestone"
            className="mb-8"
          />

          <GoldPile amount={playerGuild.totalPoints || 0} className="translate-y-0" />

          <GuildMemberDeck guild={playerGuild} memberCards={buildGuildMemberCards(characterCard)} />

          <RewardTickerPlaceholder />
        </div>
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
}: {
  guild: DockGuild;
  memberCards: readonly [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
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
      expandOnHover
      className="h-72 w-64 hover:w-[34rem] focus-within:w-[34rem]"
      cardClassName="translate-y-0"
      stackCardClassName="translate-y-0"
    />
  );
}

function RewardTickerPlaceholder() {
  return (
    <div className="flex h-44 w-full flex-col justify-between rounded-t-2xl border-x border-t border-gaming-border bg-gaming-card/95 p-3 shadow-2xl">
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

export default DashboardDock;
