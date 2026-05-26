import type {
  PlayingCardBack,
  PlayingCardData,
  PlayingCardProps,
  PlayingCardSide,
  PlayingCardStat as CanonicalPlayingCardStat,
} from './PlayingCard';
import { PlayingCard } from './PlayingCard';

export type FullSizePlayingCardSideProps = PlayingCardSide;
export type FullSizePlayingCardBack = PlayingCardBack;
export interface FullSizePlayingCardProps extends PlayingCardData {}

export function FullSizePlayingCard(props: PlayingCardProps) {
  return <PlayingCard {...props} size="full" />;
}

export function FullSizePlayingCardSide(props: PlayingCardSide) {
  return <PlayingCard front={props} size="full" />;
}

export type { CanonicalPlayingCardStat as PlayingCardStat };

export default FullSizePlayingCard;
