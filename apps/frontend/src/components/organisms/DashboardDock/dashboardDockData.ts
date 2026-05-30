import type { CohortMembership, GameCharacterClass, GameStats } from '@eduquest/shared';
import type { CardStatValue, PlayingCardProps, PlayingHandData } from '../../molecules/PlayingCard';
import { resolveUiColorTokenValue } from '../../../styles/colorTokens';
import { getCharacterClassIconKey, toPlayingCardStats } from '../../../features/game/characterStats';
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

export function buildPodiumCards(t: Translate, guilds: readonly DockGuild[]): PlayingCardProps[] {
  const podiumGuilds = guilds
    .filter((guild) => guild.boostPointsSpent === undefined || guild.boostPointsSpent > 0)
    .sort(sortByBoostPointsSpentThenName);

  const toCard = (guild: DockGuild, index: number): PlayingCardProps => ({
    kind: 'guild',
    id: `class-guild-${slugify(guild.name)}-guild`,
    layoutId: `class-guild-${slugify(guild.name)}-guild`,
    model: {
      front: {
        title: { value: guild.name, variant: 'title' },
        subtitle: {
          value: t('dashboard.dock.boostPointsSpent').replace('{amount}', String(guild.boostPointsSpent || 0)),
          variant: 'subtitle',
        },
        art: { value: guild.iconUrl, alt: guild.name },
        type: {
          variant: 'rank',
          value: index + 1,
          text: { value: `#${index + 1}`, variant: 'ribbon' },
          className: podiumRibbonClassNames[index],
        },
        icon: { value: guild.iconKey || 'Shield', colored: true },
      },
    },
  });

  const podiumRibbonClassNames = ['bg-status-campfire', 'bg-accent-neutral', 'bg-solarized-orange'];

  return podiumGuilds.slice(0, 3).map((guild, index) => toCard(guild, index));
}

export function buildProgressBonusCards(
  t: Translate,
  cards: readonly [PlayingCardProps, ...PlayingCardProps[]],
  layoutPrefix = 'progress-bonus'
) {
  return cards.map((card, index) => {
    const front = card.model.front && card.model.front !== 'none' ? card.model.front : undefined;
    const title = front?.title?.value || front?.title?.fallback || `bonus-${index}`;
    const slug = slugify(card.id || title);

    return {
      ...card,
      id: `${layoutPrefix}-${slug}`,
      layoutId: `${layoutPrefix}-${slug}`,
      model: {
        ...card.model,
        front: front
          ? {
              ...front,
              title: front.title || {
                value: t('dashboard.rewards.fallbackTitle').replace('{index}', String(index + 1)),
                variant: 'title',
              },
              subtitle: front.subtitle,
              color: front.color || { value: resolveCardColor(card.accentToken) },
              info: front.info || {
                sections: [
                  {
                    id: 'description',
                    description: {
                      value: t('dashboard.rewards.fallbackDescription'),
                      variant: 'description',
                    },
                  },
                ],
              },
            }
          : 'none',
      },
    };
  }) as [PlayingCardProps, ...PlayingCardProps[]];
}

export function buildGuildCardHands(t: Translate, options: GuildHandOptions): [PlayingHandData] {
  const guildColor = resolveCardColor(options.guild.color);
  const playerClassColor = resolveCardColor(options.characterClass);
  const otherMemberCards = (options.guild.members || [])
    .filter((member) => member.id !== options.playerStudentId)
    .map((member, index) => buildGuildMemberCard(t, member, 'guild-hand', index));
  const cards: [PlayingCardProps, ...PlayingCardProps[]] = [
    {
      id: 'guild',
      layoutId: 'guild-hand-guild',
      kind: 'guild',
      model: {
        front: {
          title: { value: options.guildName, variant: 'title' },
          subtitle: {
            value: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.gold || 0)),
            variant: 'subtitle',
          },
          color: { value: guildColor },
          art: { value: options.guild.iconUrl, alt: options.guildName },
          icon: { value: options.guild.iconKey || 'Shield', colored: true },
          info: {
            sections: descriptionSection(options.guild.description || t('dashboard.dock.guildCardDescription')),
            stats: {
              values: options.guild.stats
                ? buildGuildStatLines(options.guild.stats)
                : [{ id: 'gold', label: t('dashboard.dock.gold'), value: options.guild.gold || 0, max: 250 }],
              label: options.guildName,
            },
          },
        },
      },
    },
    {
      id: 'player',
      layoutId: 'guild-hand-player',
      kind: 'character',
      accentToken: options.characterClass,
      model: {
        front: {
          title: { value: options.playerName, variant: 'title' },
          subtitle: { value: options.characterClassLabel, variant: 'subtitle' },
          color: { value: playerClassColor },
          art: { value: options.playerAvatar, alt: options.playerName },
          icon: { value: getCharacterClassIconKey(options.characterClass), colored: true },
          type: { variant: 'class', text: { value: options.characterClassLabel, variant: 'ribbon' } },
          info: {
            sections: descriptionSection(
              t('dashboard.dock.playerCardDescription').replace('{class}', options.characterClassLabel)
            ),
            stats: {
              values: toPlayingCardStats(options.characterStats),
              label: options.playerName,
            },
          },
        },
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
        model: {
          front: {
            title: { value: guildName, variant: 'title' },
            subtitle: {
              value: t('dashboard.dock.goldSpent').replace('{amount}', String(options.guild.gold || 0)),
              variant: 'subtitle',
            },
            color: { value: guildColor },
            art: { value: options.guild.iconUrl, alt: guildName },
            icon: { value: options.guild.iconKey || 'Shield', colored: true },
            info: {
              sections: descriptionSection(options.guild.description || t('dashboard.dock.classGuildCardDescription')),
              stats: {
                values: options.guild.stats
                  ? buildGuildStatLines(options.guild.stats)
                  : [
                      {
                        id: 'gold',
                        label: t('dashboard.dock.gold'),
                        value: options.guild.gold || 0,
                        max: 250,
                      },
                    ],
                label: guildName,
              },
            },
          },
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
): PlayingCardProps {
  const classLabel = member.characterClass
    ? t(`game.classes.${member.characterClass}`)
    : t('dashboard.dock.guildmate');
  const subtitle = member.institutionalEmail || member.email || classLabel;
  const illustrationUrl = member.characterIllustrationUrl || member.avatarUrl;
  const characterClass = member.characterClass || 'scholar';

  return {
    id: `${layoutPrefix}-member-${member.id || index}`,
    layoutId: `${layoutPrefix}-member-${member.id || index}`,
    kind: 'character',
    accentToken: characterClass,
    model: {
      front: {
        title: { value: member.displayName, variant: 'title' },
        subtitle: { value: subtitle, variant: 'subtitle' },
        color: { value: resolveCardColor(characterClass) },
        art: { value: illustrationUrl, alt: member.displayName },
        icon: { value: getCharacterClassIconKey(characterClass), colored: true },
        type: { variant: 'class', text: { value: classLabel, variant: 'ribbon' } },
        info: {
          sections: descriptionSection(t('dashboard.dock.hiddenMember')),
          stats: member.stats
            ? {
                values: [
                  { id: 'strength', label: 'STR', value: member.stats.strength, max: 5 },
                  { id: 'dexterity', label: 'DEX', value: member.stats.dexterity, max: 5 },
                  { id: 'constitution', label: 'CON', value: member.stats.constitution, max: 5 },
                  { id: 'intelligence', label: 'INT', value: member.stats.intelligence, max: 5 },
                  { id: 'wisdom', label: 'WIS', value: member.stats.wisdom, max: 5 },
                  { id: 'charisma', label: 'CHA', value: member.stats.charisma, max: 5 },
                ],
                label: member.displayName,
              }
            : undefined,
        },
      },
    },
  };
}

function buildGuildStatLines(stats: GameStats | undefined): CardStatValue[] {
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

function descriptionSection(description: string | undefined) {
  return description
    ? [
        {
          id: 'description',
          description: { value: description, variant: 'description' as const },
        },
      ]
    : undefined;
}
