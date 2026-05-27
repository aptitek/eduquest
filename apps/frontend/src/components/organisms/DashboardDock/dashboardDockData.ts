import type { CohortMembership, GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardData, PlayingHandData } from '../../molecules/PlayingCard';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import type { DockGuild } from './types';

type Translate = (path: string) => string;

interface GuildHandOptions {
  guild: DockGuild;
  guildName: string;
  playerName: string;
  playerAvatar: string;
  characterClass: GameCharacterClass;
  characterClassLabel: string;
  characterStats: GameStats;
  activeCardIndex: number;
}

interface ClassGuildHandOptions {
  guild: DockGuild;
  guildName?: string;
  layoutPrefix?: string;
  activeCardIndex?: number;
}

export function buildPodiumCards(
  t: Translate,
  guilds: readonly DockGuild[]
): PlayingCardData[] {
  const podiumGuilds = [...guilds].sort((a, b) => (b.gold || 0) - (a.gold || 0));

  const toCard = (guild: DockGuild): PlayingCardData => ({
    kind: 'guild',
    id: `class-guild-${slugify(guild.name)}-guild`,
    layoutId: `class-guild-${slugify(guild.name)}-guild`,
    guild,
    title: guild.name,
    subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(guild.gold || 0)),
    ribbonIcon: renderGuildIcon(guild, 18),
  });

  const podiumRibbonClassNames = [
    'bg-status-campfire',
    'bg-accent-neutral',
    'bg-solarized-orange',
  ];

  return podiumGuilds.slice(0, 3).map((guild, index) => ({
    ...toCard(guild),
    ribbonLabel: `#${index + 1}`,
    ribbonClassName: podiumRibbonClassNames[index],
  }));
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

export function buildGuildCardHands(t: Translate, options: GuildHandOptions): [PlayingHandData] {
  const guildColor = resolveCardColor(options.guild.color);
  const cards: [PlayingCardData, ...PlayingCardData[]] = [
    {
      id: 'guild',
      layoutId: 'guild-hand-guild',
      kind: 'guild',
      guild: options.guild,
      title: options.guildName,
      subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.gold || 0)),
      front: {
        title: options.guildName,
        description:
          'A tactical guild card that tracks collective momentum, shared gold, and the next reward push.',
        color: guildColor,
        illustration: renderGuildIcon(options.guild, 72, 'drop-shadow-lg'),
        ribbonText: t('dashboard.dock.playerGuild'),
        ribbonIcon: renderGuildIcon(options.guild, 18),
        stats: [
          { id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.gold || 0, max: 250 },
          { id: 'quests', label: 'Quest', value: 74 },
          { id: 'support', label: 'Aid', value: 68 },
          { id: 'focus', label: 'Focus', value: 82 },
          { id: 'luck', label: 'Luck', value: 55 },
        ],
      },
      back: {
        title: `${options.guildName} strategy`,
        description: 'Guild planning notes for the next shared action.',
        color: guildColor,
        ribbonText: 'Plan',
        ribbonIcon: renderGuildIcon(options.guild, 18),
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
      subtitle: options.characterClassLabel,
      illustrationUrl: options.playerAvatar,
      illustrationAlt: options.playerName,
      front: {
        title: options.playerName,
        description: `${options.characterClassLabel}. A reliable active member ready to turn boosts into progress.`,
        color: 'var(--color-status-quest)',
        illustrationUrl: options.playerAvatar,
        ribbonText: options.characterClassLabel,
        stats: [
          { id: 'strength', label: 'STR', value: options.characterStats.strength ?? 0 },
          { id: 'dexterity', label: 'DEX', value: options.characterStats.dexterity ?? 0 },
          { id: 'intelligence', label: 'INT', value: options.characterStats.intelligence ?? 0 },
          { id: 'charisma', label: 'CHA', value: options.characterStats.charisma ?? 0 },
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
        description: t('dashboard.dock.hiddenMember'),
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
        description: t('dashboard.dock.hiddenMember'),
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
      description: options.guild.description,
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
    description: options.guild.description,
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
        subtitle: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.gold || 0)),
        front: {
          title: guildName,
          description:
            'A class guild card tracking collective progress, ranking momentum, and team contribution.',
          color: guildColor,
          illustration: renderGuildIcon(options.guild, 72, 'drop-shadow-lg'),
          ribbonText: t('dashboard.dock.playerGuild'),
          ribbonIcon: renderGuildIcon(options.guild, 18),
          stats: [
            { id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.gold || 0, max: 250 },
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
          description: t('dashboard.dock.hiddenMember'),
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
          description: t('dashboard.dock.hiddenMember'),
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

export function getLatestCohortMembership(memberships?: CohortMembership[]) {
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

function renderGuildIcon(guild: DockGuild, size: number, className?: string) {
  return renderLucideIcon(guild.iconKey || 'Shield', size, className);
}
