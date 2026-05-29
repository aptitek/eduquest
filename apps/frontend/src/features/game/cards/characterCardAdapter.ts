import type { GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardData } from '../../../components/molecules/PlayingCard';
import { toPlayingCardStats } from '../characterStats';

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
  ribbonText?: string;
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
  ribbonText = classLabel,
  editable,
}: CharacterCardAdapterInput): PlayingCardData {
  const resolvedSubtitle = subtitle || classLabel;

  return {
    id,
    layoutId,
    kind: 'character',
    characterClass,
    accentToken: characterClass,
    title: displayName,
    subtitle: resolvedSubtitle,
    illustrationUrl,
    illustrationAlt: displayName,
    ribbonText,
    editable,
    model: {
      front: {
        title: { value: displayName, variant: 'title' },
        subtitle: { value: resolvedSubtitle, variant: 'subtitle' },
        description: description ? { value: description, variant: 'description' } : undefined,
        art: { value: illustrationUrl, alt: displayName },
        ribbon: {
          text: { value: ribbonText, variant: 'ribbon' },
        },
        stats: {
          values: toPlayingCardStats(stats),
          label: displayName,
        },
      },
    },
    front: {
      title: displayName,
      subtitle: resolvedSubtitle,
      description,
      illustrationUrl,
      illustrationAlt: displayName,
      ribbonText,
      stats: toPlayingCardStats(stats),
    },
  };
}
