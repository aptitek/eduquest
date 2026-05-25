import type { StudentCohort } from '@eduquest/shared';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';
import type { DockGuild } from './types';

export const RIVAL_GUILDS = [
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

export const GAUGE_MILESTONES = [
  { id: 'campfire', label: 'Campfire', positionPercent: 18, description: 'Warm-up' },
  { id: 'quest', label: 'Quest', positionPercent: 46, description: 'Current' },
  { id: 'boss', label: 'Boss', positionPercent: 78, description: 'Unlock' },
];

export function buildPodiumCards(
  playerGuild: DockGuild
): [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps] {
  const podiumGuilds = [
    { ...playerGuild, totalPoints: playerGuild?.totalPoints ?? 180 },
    RIVAL_GUILDS[1],
    RIVAL_GUILDS[2],
  ].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  const toCard = (guild: DockGuild): DashboardMiniCardProps => ({
    kind: 'guild',
    guild,
    title: guild.name,
    subtitle: `${guild.totalPoints || 0} gold spent`,
  });

  return [toCard(podiumGuilds[0]), toCard(podiumGuilds[1]), toCard(podiumGuilds[2])];
}

export function buildFaceDownDeckCards(title: string) {
  return Array.from({ length: 4 }, () => ({
    kind: 'guild' as const,
    title,
    subtitle: 'Face down',
    accentColor: '#586e75',
    faceDown: true,
  })) as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

export function buildCohortRewardCards() {
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

export function buildGuildMemberCards(characterCard: DashboardMiniCardProps) {
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

export function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;

  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}
