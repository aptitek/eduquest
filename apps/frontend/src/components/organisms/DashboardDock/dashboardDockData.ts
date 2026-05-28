import type { CohortMembership, GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardData, PlayingHandData } from '../../molecules/PlayingCard';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import { resolveUiColorTokenValue } from '../../../styles/colorTokens';
import type { DockGuild, DockGuildMember } from './types';

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

export function buildPodiumCards(t: Translate, guilds: readonly DockGuild[]): PlayingCardData[] {
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

  const podiumRibbonClassNames = ['bg-status-campfire', 'bg-accent-neutral', 'bg-solarized-orange'];

  return podiumGuilds.slice(0, 3).map((guild, index) => ({
    ...toCard(guild),
    ribbonLabel: `#${index + 1}`,
    ribbonClassName: podiumRibbonClassNames[index],
  }));
}

export function buildProgressBonusCards(
  t: Translate,
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
        title:
          card.title || t('dashboard.rewards.fallbackTitle').replace('{index}', String(index + 1)),
        subtitle: card.subtitle,
        description:
          card.description || card.subtitle || t('dashboard.rewards.fallbackDescription'),
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
        description: options.guild.description || t('dashboard.dock.guildCardDescription'),
        color: guildColor,
        illustration: renderGuildIcon(options.guild, 72, 'drop-shadow-lg'),
        ribbonText: t('dashboard.dock.playerGuild'),
        ribbonIcon: renderGuildIcon(options.guild, 18),
        stats: [
          { id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.gold || 0, max: 250 },
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
        description: t('dashboard.dock.playerCardDescription').replace(
          '{class}',
          options.characterClassLabel
        ),
        color: resolveUiColorTokenValue('quest'),
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
  const memberCards = (options.guild.members || []).map((member, index) =>
    buildGuildMemberCard(t, member, layoutPrefix, index)
  );

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
        subtitle: t('dashboard.dock.goldSpent').replace(
          '{amount}',
          String(options.guild.gold || 0)
        ),
        front: {
          title: guildName,
          description: options.guild.description || t('dashboard.dock.classGuildCardDescription'),
          color: guildColor,
          illustration: renderGuildIcon(options.guild, 72, 'drop-shadow-lg'),
          ribbonText: t('dashboard.dock.playerGuild'),
          ribbonIcon: renderGuildIcon(options.guild, 18),
          stats: [
            {
              id: 'gold',
              label: t('dashboard.dock.gold'),
              value: options.guild.gold || 0,
              max: 250,
            },
          ],
        },
      },
      ...memberCards,
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
  return resolveUiColorTokenValue(value);
}

function slugify(value: string | undefined) {
  return (value || 'guild')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function renderGuildIcon(guild: DockGuild, size: number, className?: string) {
  return renderLucideIcon(guild.iconKey || 'Shield', size, className);
}

function buildGuildMemberCard(
  t: Translate,
  member: DockGuildMember,
  layoutPrefix: string,
  index: number
): PlayingCardData {
  const classLabel = member.characterClass
    ? t(`game.classes.${member.characterClass}`)
    : t('dashboard.dock.guildmate');
  const subtitle = member.institutionalEmail || member.email || classLabel;

  return {
    id: `${layoutPrefix}-member-${member.id || index}`,
    layoutId: `${layoutPrefix}-member-${member.id || index}`,
    kind: 'character',
    characterClass: member.characterClass || 'scholar',
    title: member.displayName,
    subtitle,
    illustrationUrl: member.avatarUrl,
    illustrationAlt: member.displayName,
    accentToken: member.characterClass || 'neutral',
    front: {
      title: member.displayName,
      subtitle,
      description: t('dashboard.dock.hiddenMember'),
      color: resolveCardColor(member.characterClass || 'neutral'),
      illustrationUrl: member.avatarUrl,
      illustrationAlt: member.displayName,
      ribbonText: classLabel,
      stats: member.stats
        ? [
            { id: 'strength', label: 'STR', value: member.stats.strength, max: 20 },
            { id: 'dexterity', label: 'DEX', value: member.stats.dexterity, max: 20 },
            { id: 'constitution', label: 'CON', value: member.stats.constitution, max: 20 },
            { id: 'intelligence', label: 'INT', value: member.stats.intelligence, max: 20 },
            { id: 'wisdom', label: 'WIS', value: member.stats.wisdom, max: 20 },
            { id: 'charisma', label: 'CHA', value: member.stats.charisma, max: 20 },
          ]
        : undefined,
    },
  };
}
