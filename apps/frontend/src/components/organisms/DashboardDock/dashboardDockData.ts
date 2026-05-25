import type { StudentCohort } from '@eduquest/shared';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';
import type { FullSizePlayingCardHand, FullSizePlayingCardStackItem } from '../../molecules/PlayingCard';
import type { DockGuild } from './types';

type Translate = (path: string) => string;

interface MockGuildHandOptions {
  guild: DockGuild;
  guildName: string;
  playerName: string;
  playerAvatar: string;
  characterLevel: number;
  characterClassLabel: string;
  activeCardIndex: number;
}

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

  const podiumRibbonClassNames = [
    'bg-status-campfire',
    'bg-accent-neutral',
    'bg-solarized-orange',
  ];

  return [
    toCard(podiumGuilds[0]),
    toCard(podiumGuilds[1]),
    toCard(podiumGuilds[2]),
  ].map((card, index) => ({
    ...card,
    ribbonLabel: `#${index + 1}`,
    ribbonClassName: podiumRibbonClassNames[index],
  })) as [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
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
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.miniGame.title'),
      subtitle: t('dashboard.rewards.miniGame.subtitle'),
      accentToken: 'completed',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.techHelp.title'),
      subtitle: t('dashboard.rewards.techHelp.subtitle'),
      accentToken: 'quest',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      title: t('dashboard.rewards.reroll.title'),
      subtitle: t('dashboard.rewards.reroll.subtitle'),
      accentToken: 'specialist',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
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

export function buildMockGuildCardHands(t: Translate, options: MockGuildHandOptions): [FullSizePlayingCardHand] {
  const guildColor = resolveCardColor(options.guild.color);
  const cards: [FullSizePlayingCardStackItem, ...FullSizePlayingCardStackItem[]] = [
    {
      id: 'guild',
      front: {
        title: options.guildName,
        description:
          'A tactical guild card that tracks collective momentum, shared gold, and the next reward push.',
        color: guildColor,
        illustrationUrl: options.guild.iconUrl,
        ribbonText: t('dashboard.dock.playerGuild'),
        stats: [
          { id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.totalPoints || 0, max: 250 },
          { id: 'quests', label: 'Quest', value: 74 },
          { id: 'support', label: 'Aid', value: 68 },
          { id: 'focus', label: 'Focus', value: 82 },
          { id: 'luck', label: 'Luck', value: 55 },
        ],
      },
      back: {
        title: `${options.guildName} strategy`,
        description: 'Mock tactical notes for the next guild action. This side will later host real guild effects.',
        color: guildColor,
        ribbonText: 'Plan',
        stats: [
          { id: 'risk', label: 'Risk', value: 42 },
          { id: 'gain', label: 'Gain', value: 86 },
          { id: 'cost', label: 'Cost', value: 38 },
          { id: 'tempo', label: 'Tempo', value: 72 },
        ],
      },
    },
    {
      id: 'player',
      front: {
        title: options.playerName,
        description: `${options.characterClassLabel} level ${options.characterLevel}. A reliable active member ready to turn boosts into progress.`,
        color: 'var(--color-status-quest)',
        illustrationUrl: options.playerAvatar,
        ribbonText: `LVL ${options.characterLevel}`,
        stats: [
          { id: 'logic', label: 'Logic', value: 78 },
          { id: 'speed', label: 'Speed', value: 63 },
          { id: 'team', label: 'Team', value: 71 },
          { id: 'xp', label: 'XP', value: Math.min(options.characterLevel * 8, 100) },
          { id: 'focus', label: 'Focus', value: 84 },
        ],
      },
    },
    {
      id: 'guide',
      front: {
        title: t('dashboard.dock.guildmate'),
        description: 'Mock support member. This card previews how hidden guildmates will appear once real data is connected.',
        color: 'var(--color-accent-guide)',
        ribbonText: t('dashboard.dock.hiddenMember'),
        stats: [
          { id: 'logic', label: 'Logic', value: 54 },
          { id: 'speed', label: 'Speed', value: 58 },
          { id: 'team', label: 'Team', value: 90 },
          { id: 'xp', label: 'XP', value: 46 },
          { id: 'focus', label: 'Focus', value: 62 },
        ],
      },
    },
    {
      id: 'specialist',
      front: {
        title: t('dashboard.dock.guildmate'),
        description: 'Mock specialist member with a more technical profile and a strong reward conversion angle.',
        color: 'var(--color-accent-specialist)',
        ribbonText: t('dashboard.dock.hiddenMember'),
        stats: [
          { id: 'logic', label: 'Logic', value: 88 },
          { id: 'speed', label: 'Speed', value: 49 },
          { id: 'team', label: 'Team', value: 61 },
          { id: 'xp', label: 'XP', value: 67 },
          { id: 'focus', label: 'Focus', value: 76 },
        ],
      },
    },
  ];

  return [
    {
      id: 'guild-hand',
      title: options.guildName,
      description: 'Mock full-size guild hand used to refine the modal layout, animation, and active-card highlight.',
      cards,
      activeCardIndex: options.activeCardIndex,
      mainCardIndex: 0,
      variant: 'fan',
    },
  ];
}

export function getLatestCohortMembership(memberships?: StudentCohort[]) {
  if (!memberships || memberships.length === 0) return undefined;

  return [...memberships].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function resolveCardColor(value: string | undefined) {
  const colorMap: Record<string, string> = {
    scholar: 'var(--color-accent-scholar)',
    champion: 'var(--color-accent-champion)',
    guide: 'var(--color-accent-guide)',
    specialist: 'var(--color-accent-specialist)',
    quest: 'var(--color-status-quest)',
    campfire: 'var(--color-status-campfire)',
    completed: 'var(--color-status-completed)',
    boss: 'var(--color-status-boss)',
    danger: 'var(--color-status-danger)',
    neutral: 'var(--color-accent-neutral)',
  };

  return value ? colorMap[value] || value : 'var(--color-status-quest)';
}
