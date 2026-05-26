import type { GameCharacterClass, StudentCohort } from '@eduquest/shared';
import type { PlayingCardData, PlayingHandData } from '../../molecules/PlayingCard';
import type { DockGuild } from './types';

type Translate = (path: string) => string;

interface MockGuildHandOptions {
  guild: DockGuild;
  guildName: string;
  playerName: string;
  playerAvatar: string;
  characterLevel: number;
  characterClass: GameCharacterClass;
  characterClassLabel: string;
  activeCardIndex: number;
}

interface ClassGuildHandOptions {
  guild: DockGuild;
  guildName?: string;
  layoutPrefix?: string;
  activeCardIndex?: number;
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
): [PlayingCardData, PlayingCardData, PlayingCardData] {
  const podiumGuilds = [
    { ...playerGuild, totalPoints: playerGuild?.totalPoints ?? 180 },
    RIVAL_GUILDS[1],
    RIVAL_GUILDS[2],
  ].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

  const toCard = (guild: DockGuild): PlayingCardData => ({
    kind: 'guild',
    id: `class-guild-${slugify(guild.name)}-guild`,
    layoutId: `class-guild-${slugify(guild.name)}-guild`,
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
  })) as [PlayingCardData, PlayingCardData, PlayingCardData];
}

export function buildFaceDownDeckCards(t: Translate, title: string) {
  return Array.from({ length: 4 }, (_, index) => ({
    kind: 'guild' as const,
    id: `cohort-facedown-${index}`,
    layoutId: `cohort-facedown-${index}`,
    title,
    subtitle: t('dashboard.dock.faceDown'),
    accentToken: 'neutral',
    faceDown: true,
  })) as [PlayingCardData, ...PlayingCardData[]];
}

export function buildCohortRewardCards(t: Translate) {
  return [
    {
      kind: 'guild' as const,
      id: 'reward-deadline',
      title: t('dashboard.rewards.deadline.title'),
      subtitle: t('dashboard.rewards.deadline.subtitle'),
      accentToken: 'campfire',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      id: 'reward-mini-game',
      title: t('dashboard.rewards.miniGame.title'),
      subtitle: t('dashboard.rewards.miniGame.subtitle'),
      accentToken: 'completed',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      id: 'reward-tech-help',
      title: t('dashboard.rewards.techHelp.title'),
      subtitle: t('dashboard.rewards.techHelp.subtitle'),
      accentToken: 'quest',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
    {
      kind: 'guild' as const,
      id: 'reward-reroll',
      title: t('dashboard.rewards.reroll.title'),
      subtitle: t('dashboard.rewards.reroll.subtitle'),
      accentToken: 'specialist',
      ribbonLabel: t('dashboard.dock.newRibbon'),
      ribbonClassName: 'bg-status-quest',
    },
  ] as [PlayingCardData, ...PlayingCardData[]];
}

export function buildProgressBonusCards(
  cards: readonly [PlayingCardData, ...PlayingCardData[]],
  layoutPrefix = 'progress-bonus'
) {
  return cards.map((card, index) => {
    const slug = slugify(card.id || card.title || `bonus-${index}`);

    return {
      ...card,
      id: `${layoutPrefix}-${slug}`,
      layoutId: `${layoutPrefix}-${slug}`,
      front: {
        title: card.title || `Bonus ${index + 1}`,
        subtitle: card.subtitle,
        description: card.description || card.subtitle || 'Bonus card available to the cohort.',
        color: resolveCardColor(card.accentToken),
        illustrationUrl: card.illustrationUrl,
        illustrationAlt: card.illustrationAlt || card.title,
        ribbonText: card.ribbonLabel,
        ribbonPosition: card.ribbonPosition,
      },
    };
  }) as [PlayingCardData, ...PlayingCardData[]];
}

export function buildGuildMemberCards(t: Translate, characterCard: PlayingCardData) {
  return [
    {
      ...characterCard,
      id: 'guild-hand-player',
      layoutId: 'guild-hand-player',
    },
    {
      kind: 'character' as const,
      id: 'guild-hand-guide',
      layoutId: 'guild-hand-guide',
      title: t('dashboard.dock.guildmate'),
      subtitle: t('dashboard.dock.hiddenMember'),
      accentToken: 'guide',
      faceDown: true,
    },
    {
      kind: 'character' as const,
      id: 'guild-hand-specialist',
      layoutId: 'guild-hand-specialist',
      title: t('dashboard.dock.guildmate'),
      subtitle: t('dashboard.dock.hiddenMember'),
      accentToken: 'specialist',
      faceDown: true,
    },
  ] as [PlayingCardData, PlayingCardData, PlayingCardData];
}

export function buildMockGuildCardHands(t: Translate, options: MockGuildHandOptions): [PlayingHandData] {
  const guildColor = resolveCardColor(options.guild.color);
  const cards: [PlayingCardData, ...PlayingCardData[]] = [
    {
      id: 'guild',
      layoutId: 'guild-hand-guild',
      kind: 'guild',
      guild: options.guild,
      title: options.guildName,
      subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.totalPoints || 0)),
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
      layoutId: 'guild-hand-player',
      kind: 'character',
      characterClass: options.characterClass,
      title: options.playerName,
      subtitle: `LVL ${options.characterLevel}`,
      illustrationUrl: options.playerAvatar,
      illustrationAlt: options.playerName,
      front: {
        title: options.playerName,
        description: `${options.characterClassLabel} level ${options.characterLevel}. A reliable active member ready to turn boosts into progress.`,
        color: 'var(--color-status-quest)',
        illustrationUrl: options.playerAvatar,
        ribbonText: options.characterClassLabel,
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
      layoutId: 'guild-hand-guide',
      kind: 'character',
      characterClass: 'guide',
      title: t('dashboard.dock.guildmate'),
      subtitle: t('game.classes.guide'),
      accentToken: 'guide',
      front: {
        title: t('dashboard.dock.guildmate'),
        description: 'Mock support member. This card previews how hidden guildmates will appear once real data is connected.',
        color: 'var(--color-accent-guide)',
        ribbonText: t('game.classes.guide'),
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
      layoutId: 'guild-hand-specialist',
      kind: 'character',
      characterClass: 'specialist',
      title: t('dashboard.dock.guildmate'),
      subtitle: t('game.classes.specialist'),
      accentToken: 'specialist',
      front: {
        title: t('dashboard.dock.guildmate'),
        description: 'Mock specialist member with a more technical profile and a strong reward conversion angle.',
        color: 'var(--color-accent-specialist)',
        ribbonText: t('game.classes.specialist'),
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

export function buildClassGuildHand(t: Translate, options: ClassGuildHandOptions): PlayingHandData {
  const guildName = options.guildName || options.guild.name || t('dashboard.dock.playerGuild');
  const guildSlug = slugify(guildName);
  const layoutPrefix = options.layoutPrefix || `class-guild-${guildSlug}`;
  const guildColor = resolveCardColor(options.guild.color);

  return {
    id: `${layoutPrefix}-hand`,
    title: guildName,
    description: 'Mock class guild hand used until real guild member data is connected.',
    activeCardIndex: options.activeCardIndex,
    mainCardIndex: 0,
    variant: 'fan',
    cards: [
      {
        id: `${layoutPrefix}-guild`,
        layoutId: `${layoutPrefix}-guild`,
        kind: 'guild',
        guild: options.guild,
        title: guildName,
        subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.totalPoints || 0)),
        front: {
          title: guildName,
          description:
            'A class guild card tracking collective progress, ranking momentum, and team contribution.',
          color: guildColor,
          illustrationUrl: options.guild.iconUrl,
          ribbonText: t('dashboard.dock.playerGuild'),
          stats: [
            { id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.totalPoints || 0, max: 250 },
            { id: 'quests', label: 'Quest', value: 72 },
            { id: 'support', label: 'Aid', value: 64 },
            { id: 'focus', label: 'Focus', value: 78 },
            { id: 'luck', label: 'Luck', value: 58 },
          ],
        },
      },
      {
        id: `${layoutPrefix}-member-1`,
        layoutId: `${layoutPrefix}-member-1`,
        kind: 'character',
        characterClass: 'guide',
        title: t('dashboard.dock.guildmate'),
        subtitle: t('game.classes.guide'),
        accentToken: 'guide',
        front: {
          title: t('dashboard.dock.guildmate'),
          description: 'Mock support member. This previews where class member details will appear.',
          color: 'var(--color-accent-guide)',
          ribbonText: t('game.classes.guide'),
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
        id: `${layoutPrefix}-member-2`,
        layoutId: `${layoutPrefix}-member-2`,
        kind: 'character',
        characterClass: 'specialist',
        title: t('dashboard.dock.guildmate'),
        subtitle: t('game.classes.specialist'),
        accentToken: 'specialist',
        front: {
          title: t('dashboard.dock.guildmate'),
          description: 'Mock specialist member with a technical profile and reward conversion angle.',
          color: 'var(--color-accent-specialist)',
          ribbonText: t('game.classes.specialist'),
          stats: [
            { id: 'logic', label: 'Logic', value: 88 },
            { id: 'speed', label: 'Speed', value: 49 },
            { id: 'team', label: 'Team', value: 61 },
            { id: 'xp', label: 'XP', value: 67 },
            { id: 'focus', label: 'Focus', value: 76 },
          ],
        },
      },
    ],
  };
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

function slugify(value: string | undefined) {
  return (value || 'guild').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
