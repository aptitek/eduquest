import type { GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardProps } from '../../../components/molecules/PlayingCard';
import { getCharacterClassIconKey, toPlayingCardStats } from '../characterStats';

export interface CharacterCardAdapterInput {
  id?: string;
  layoutId?: string;
  displayName: string;
  subtitle?: string;
  description?: string;
  characterClass?: GameCharacterClass;
  classLabel: string;
  illustrationUrl?: string;
  stats?: GameStats;
  typeText?: string;
  editable?: boolean;
}

export function buildCharacterPlayingCardData({
  id,
  layoutId,
  displayName,
  subtitle,
  description,
  characterClass = 'scholar',
  classLabel,
  illustrationUrl,
  stats,
  typeText = classLabel,
  editable,
}: CharacterCardAdapterInput): PlayingCardProps {
  const resolvedSubtitle = subtitle || classLabel;

  return {
    id,
    layoutId,
    kind: 'character',
    accentToken: characterClass,
    model: {
      front: {
        title: { value: displayName, variant: 'title' },
        subtitle: { value: resolvedSubtitle, variant: 'subtitle' },
        art: { value: illustrationUrl, alt: displayName },
        icon: { value: getCharacterClassIconKey(characterClass), colored: true },
        type: {
          variant: 'class',
          text: { value: typeText, variant: 'ribbon' },
        },
        info: {
          sections: description
            ? [
                {
                  id: 'description',
                  description: { value: description, variant: 'description' },
                },
              ]
            : undefined,
          stats: {
            values: toPlayingCardStats(stats),
            label: displayName,
            editable,
          },
        },
      },
    },
  };
}
