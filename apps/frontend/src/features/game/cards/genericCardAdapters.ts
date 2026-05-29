import type { Activity, Guild } from '@eduquest/shared';
import type { PlayingCardData } from '../../../components/molecules/PlayingCard';
import { toPlayingCardStats } from '../characterStats';

export function buildGuildPlayingCardData(guild: Pick<Guild, 'id' | 'name' | 'description' | 'color' | 'iconUrl' | 'iconKey' | 'stats' | 'gold'>): PlayingCardData {
  return {
    id: guild.id,
    kind: 'guild',
    title: guild.name,
    subtitle: guild.gold !== undefined ? `${guild.gold} gold` : undefined,
    description: guild.description,
    color: guild.color,
    illustrationUrl: guild.iconUrl,
    ribbonIconKey: guild.iconKey,
    stats: toPlayingCardStats(guild.stats),
    model: {
      front: {
        title: { value: guild.name, variant: 'title' },
        subtitle: guild.gold !== undefined ? { value: `${guild.gold} gold`, variant: 'subtitle' } : undefined,
        description: guild.description ? { value: guild.description, variant: 'description' } : undefined,
        color: { value: guild.color },
        art: { value: guild.iconUrl, alt: guild.name },
        ribbon: {
          icon: { value: guild.iconKey },
        },
        stats: {
          values: toPlayingCardStats(guild.stats),
          label: guild.name,
        },
      },
    },
  };
}

export function buildActivityPlayingCardData(
  activity: Pick<Activity, 'id' | 'title' | 'type' | 'cardColor' | 'metadata'>
): PlayingCardData {
  const description = activity.metadata?.description;
  const illustrationUrl = activity.metadata?.illustrationUrl;

  return {
    id: activity.id,
    kind: 'activity',
    title: activity.title,
    subtitle: activity.type,
    description,
    color: activity.cardColor,
    illustrationUrl,
    model: {
      front: {
        title: { value: activity.title, variant: 'title' },
        subtitle: { value: activity.type, variant: 'subtitle' },
        description: description ? { value: description, variant: 'description' } : undefined,
        color: { value: activity.cardColor },
        art: { value: illustrationUrl, alt: activity.title },
      },
    },
  };
}

export function buildGenericBackFace(title: string, iconKey?: string, svgUrl?: string): PlayingCardData['model'] {
  return {
    front: {
      mode: 'genericBack',
      title: { value: title },
      genericBack: {
        mode: svgUrl ? 'svg' : iconKey ? 'icon' : 'css',
        icon: iconKey ? { value: iconKey } : undefined,
        svgUrl,
        svgAlt: title,
      },
    },
  };
}
