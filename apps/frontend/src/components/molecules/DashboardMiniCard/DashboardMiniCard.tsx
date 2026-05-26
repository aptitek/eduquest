import { PlayingCard } from '../PlayingCard';
import type {
  PlayingCardAccent,
  PlayingCardData,
  PlayingCardProps,
} from '../PlayingCard';

export type DashboardMiniCardAccent = PlayingCardAccent;
export type DashboardMiniCardProps = PlayingCardData;

export function DashboardMiniCard(props: PlayingCardProps) {
  return <PlayingCard {...props} size="mini" />;
}

export default DashboardMiniCard;
