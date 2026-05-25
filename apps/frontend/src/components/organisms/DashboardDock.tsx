import type { Guild, StudentCohort } from '@eduquest/shared';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import {
  DashboardMiniCard,
  DashboardMiniDeck,
  DashboardMiniPodium,
} from '../molecules/DashboardMiniCard';
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
  const guildDeckCards = buildGuildDeckCards(playerGuild);
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
      <div className="absolute inset-x-0 bottom-0 mx-auto h-72 max-w-7xl overflow-visible px-4">
        <div className="grid h-full min-w-[80rem] grid-cols-[18rem_12rem_minmax(24rem,1fr)_12rem_9rem] items-end gap-4">
          <DashboardMiniPodium
            cards={podiumCards}
            className="max-w-none"
            cardClassName="translate-y-0"
          />

          <DashboardMiniDeck
            cards={cohortDeckCards}
            cardClassName="translate-y-0"
            stackCardClassName="translate-y-0"
          />

          <GlobalProgressGauge
            currentPoints={460}
            targetPoints={1000}
            milestones={GAUGE_MILESTONES}
            label="Current milestone"
            className="mb-8"
          />

          <DashboardMiniDeck
            cards={guildDeckCards}
            cardClassName="translate-y-0"
            stackCardClassName="translate-y-0"
          />

          <DashboardMiniCard {...characterCard} className="translate-y-0" />
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

function buildGuildDeckCards(playerGuild: DockGuild) {
  return [
    {
      kind: 'guild' as const,
      guild: playerGuild,
      title: playerGuild?.name || 'Player guild',
      subtitle: `${playerGuild?.totalPoints || 0} gold`,
    },
    ...RIVAL_GUILDS.map((guild) => ({
      kind: 'guild' as const,
      guild,
      title: guild.name,
      subtitle: `${guild.totalPoints || 0} gold`,
      faceDown: true,
    })),
  ] as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;

  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

export default DashboardDock;
