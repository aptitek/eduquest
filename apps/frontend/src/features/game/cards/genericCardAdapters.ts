import type { Activity, Guild } from '@eduquest/shared';
import type { PlayingCardModel, PlayingCardProps } from '../../../components/molecules/PlayingCard';
import { toPlayingCardStats } from '../characterStats';

export function buildGuildPlayingCardData(guild: Pick<Guild, 'id' | 'name' | 'description' | 'color' | 'iconUrl' | 'iconKey' | 'stats' | 'gold'>): PlayingCardProps {
  return {
    id: guild.id,
    kind: 'guild',
    model: {
      front: {
        title: { value: guild.name, variant: 'title' },
        subtitle: guild.gold !== undefined ? { value: `${guild.gold} gold`, variant: 'subtitle' } : undefined,
        color: { value: guild.color },
        art: { value: guild.iconUrl, alt: guild.name },
        type: {
          variant: 'custom',
          icon: { value: guild.iconKey },
        },
        info: {
          sections: guild.description
            ? [
                {
                  id: 'description',
                  description: { value: guild.description, variant: 'description' },
                },
              ]
            : undefined,
          stats: {
            values: toPlayingCardStats(guild.stats),
            label: guild.name,
          },
        },
      },
    },
  };
}

export function buildActivityPlayingCardData(
  activity: Pick<Activity, 'id' | 'title' | 'type' | 'cardColor' | 'metadata'>
): PlayingCardProps {
  const description = activity.metadata?.description;
  const illustrationUrl = activity.metadata?.illustrationUrl;

  return {
    id: activity.id,
    kind: 'activity',
    model: {
      front: {
        title: { value: activity.title, variant: 'title' },
        subtitle: { value: activity.type, variant: 'subtitle' },
        color: { value: activity.cardColor },
        art: { value: illustrationUrl, alt: activity.title },
        type: { variant: 'custom', text: { value: activity.type, variant: 'ribbon' } },
        info: {
          sections: description
            ? [
                {
                  id: 'description',
                  description: { value: description, variant: 'description' },
                },
              ]
            : undefined,
        },
      },
    },
  };
}

export function buildGenericBackFace(title: string, iconKey?: string, svgUrl?: string): PlayingCardModel {
  return {
    front: 'none',
    back: {
      title: { value: title },
      back: {
        mode: svgUrl ? 'svg' : iconKey ? 'icon' : 'css',
        icon: iconKey ? { value: iconKey } : undefined,
        svgUrl,
        svgAlt: title,
      },
    },
  };
}
