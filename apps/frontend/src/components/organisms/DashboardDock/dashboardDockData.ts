import type { StudentCohort } from '@eduquest/shared';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';
import type { DockGuild } from './types';

type Translate = (path: string) => string;

export const RIVAL_GUILDS = [
  {
    id: 'rival-1',
    cohortId: 'demo',
    name: 'Crimson Compilers',
    color: 'danger',
    totalPoints: 168,
  },
  { id: 'rival-2', cohortId: 'demo', name: 'Violet Oracles', color: 'specialist', totalPoints: 132 },
  {
    id: 'rival-3',
    cohortId: 'demo',
    name: 'Solarized Sentinels',
    color: 'quest',
    totalPoints: 116,
  },
];

const MILESTONE_SLOTS = [
  { id: 'spark', positionPercent: 12 },
  { id: 'campfire', positionPercent: 24 },
  { id: 'quest', positionPercent: 38 },
  { id: 'rally', positionPercent: 52 },
  { id: 'treasure', positionPercent: 66 },
  { id: 'boss', positionPercent: 78 },
  { id: 'legend', positionPercent: 90 },
  { id: 'ascend', positionPercent: 100 },
];

export function buildGaugeMilestones(t: Translate) {
  return MILESTONE_SLOTS.map((milestone) => ({
    ...milestone,
    label: t(`dashboard.milestones.${milestone.id}.label`),
    description: t(`dashboard.milestones.${milestone.id}.description`),
  }));
}

export function buildPodiumCards(
  t: Translate,
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
    subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(guild.totalPoints || 0)),
  });

  return [toCard(podiumGuilds[0]), toCard(podiumGuilds[1]), toCard(podiumGuilds[2])];
}

export function buildFaceDownDeckCards(t: Translate, title: string) {
  return Array.from({ length: 4 }, () => ({
    kind: 'guild' as const,
    title,
    subtitle: t('dashboard.dock.faceDown'),
    accentToken: 'neutral',
    faceDown: true,
  })) as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

export function buildCohortRewardCards(t: Translate) {
  return [
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.deadline.title'),
      subtitle: t('dashboard.rewards.deadline.subtitle'),
      accentToken: 'campfire',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.miniGame.title'),
      subtitle: t('dashboard.rewards.miniGame.subtitle'),
      accentToken: 'completed',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.techHelp.title'),
      subtitle: t('dashboard.rewards.techHelp.subtitle'),
      accentToken: 'quest',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.reroll.title'),
      subtitle: t('dashboard.rewards.reroll.subtitle'),
      accentToken: 'specialist',
    },
  ] as [DashboardMiniCardProps, ...DashboardMiniCardProps[]];
}

export function buildGuildMemberCards(t: Translate, characterCard: DashboardMiniCardProps) {
  return [
    characterCard,
    {
      kind: 'character' as const,
      title: t('dashboard.dock.guildmate'),
      subtitle: t('dashboard.dock.hiddenMember'),
      accentToken: 'guide',
      faceDown: true,
    },
    {
      kind: 'character' as const,
      title: t('dashboard.dock.guildmate'),
      subtitle: t('dashboard.dock.hiddenMember'),
      accentToken: 'specialist',
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
