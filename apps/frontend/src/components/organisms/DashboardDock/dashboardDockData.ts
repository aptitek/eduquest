import type { CohortMembership, GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardData, PlayingHandData } from '../../molecules/PlayingCard';
import { resolveUiColorTokenValue } from '../../../styles/colorTokens';
import type { DockGuild, DockGuildMember } from './types';

type Translate = (path: string) => string;

interface GuildHandOptions {
  guild: DockGuild;
  guildName: string;
  playerStudentId?: string;
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
  const podiumGuilds = guilds
    .filter((guild) => guild.boostPointsSpent === undefined || guild.boostPointsSpent > 0)
    .sort(sortByBoostPointsSpentThenName);

  const toCard = (guild: DockGuild): PlayingCardData => ({
    kind: 'guild',
    id: `class-guild-${slugify(guild.name)}-guild`,
    layoutId: `class-guild-${slugify(guild.name)}-guild`,
    guild,
    title: guild.name,
    subtitle: t('dashboard.dock.boostPointsSpent').replace(
      '{amount}',
      String(guild.boostPointsSpent || 0)
    ),
    illustrationUrl: guild.iconUrl,
    illustrationAlt: guild.name,
    ribbonIconKey: guild.iconKey || 'Shield',
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
        color: resolveCardColor(card.color || card.accentToken),
        illustrationUrl: card.illustrationUrl,
        illustrationAlt: card.illustrationAlt || card.title,
        illustration: card.illustration,
        ribbonText: card.ribbonLabel,
        ribbonIcon: card.ribbonIcon,
        ribbonPosition: card.ribbonPosition,
      },
    };
  }) as [PlayingCardData, ...PlayingCardData[]];
}

export function buildGuildCardHands(t: Translate, options: GuildHandOptions): [PlayingHandData] {
  const guildColor = resolveCardColor(options.guild.color);
  const playerClassColor = resolveCardColor(options.characterClass);
  const otherMemberCards = (options.guild.members || [])
    .filter((member) => member.id !== options.playerStudentId)
    .map((member, index) => buildGuildMemberCard(t, member, 'guild-hand', index));
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
        illustrationUrl: options.guild.iconUrl,
        illustrationAlt: options.guildName,
        ribbonIconKey: options.guild.iconKey || 'Shield',
        stats: options.guild.stats
          ? buildGuildStatLines(options.guild.stats)
          : [{ id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.gold || 0, max: 250 }],
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
        color: playerClassColor,
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
    ...otherMemberCards,
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
          illustrationUrl: options.guild.iconUrl,
          illustrationAlt: guildName,
          ribbonIconKey: options.guild.iconKey || 'Shield',
          stats: options.guild.stats
            ? buildGuildStatLines(options.guild.stats)
            : [
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

function sortByBoostPointsSpentThenName(a: DockGuild, b: DockGuild) {
  return (b.boostPointsSpent || 0) - (a.boostPointsSpent || 0) || a.name.localeCompare(b.name);
}

function slugify(value: string | undefined) {
  return (value || 'guild')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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
  const illustrationUrl = member.characterIllustrationUrl || member.avatarUrl;

  return {
    id: `${layoutPrefix}-member-${member.id || index}`,
    layoutId: `${layoutPrefix}-member-${member.id || index}`,
    kind: 'character',
    characterClass: member.characterClass || 'scholar',
    title: member.displayName,
    subtitle,
    illustrationUrl,
    illustrationAlt: member.displayName,
    accentToken: member.characterClass || 'neutral',
    front: {
      title: member.displayName,
      subtitle,
      description: t('dashboard.dock.hiddenMember'),
      color: resolveCardColor(member.characterClass || 'neutral'),
      illustrationUrl,
      illustrationAlt: member.displayName,
      ribbonText: classLabel,
      stats: member.stats
        ? [
            { id: 'strength', label: 'STR', value: member.stats.strength, max: 5 },
            { id: 'dexterity', label: 'DEX', value: member.stats.dexterity, max: 5 },
            { id: 'constitution', label: 'CON', value: member.stats.constitution, max: 5 },
            { id: 'intelligence', label: 'INT', value: member.stats.intelligence, max: 5 },
            { id: 'wisdom', label: 'WIS', value: member.stats.wisdom, max: 5 },
            { id: 'charisma', label: 'CHA', value: member.stats.charisma, max: 5 },
          ]
        : undefined,
    },
  };
}

function buildGuildStatLines(stats: GameStats | undefined) {
  if (!stats) return [];

  return [
    { id: 'strength', label: 'STR', value: stats.strength, max: 5 },
    { id: 'dexterity', label: 'DEX', value: stats.dexterity, max: 5 },
    { id: 'constitution', label: 'CON', value: stats.constitution, max: 5 },
    { id: 'intelligence', label: 'INT', value: stats.intelligence, max: 5 },
    { id: 'wisdom', label: 'WIS', value: stats.wisdom, max: 5 },
    { id: 'charisma', label: 'CHA', value: stats.charisma, max: 5 },
  ];
}
