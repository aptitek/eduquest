import { PlayingHand } from '../../molecules/PlayingCard';
import type { PlayingCardProps } from '../../molecules/PlayingCard';
import { cn } from '../../../utils/cn';
import type { DockGuild } from './types';

export interface GuildMemberDeckProps {
  guild: DockGuild;
  memberCards: readonly [PlayingCardProps, PlayingCardProps, PlayingCardProps];
  fallbackGuildName: string;
  goldLabel: string;
  compact?: boolean;
  onCardSelect?: (card: PlayingCardProps, index: number) => void;
}

export function GuildMemberDeck({
  guild,
  memberCards,
  fallbackGuildName,
  goldLabel,
  compact = false,
  onCardSelect,
}: GuildMemberDeckProps) {
  const guildCard: PlayingCardProps = {
    id: 'guild-hand-guild',
    layoutId: 'guild-hand-guild',
    kind: 'guild',
    model: {
      front: {
        title: { value: guild.name || fallbackGuildName, variant: 'title' },
        subtitle: { value: `${guild.gold || 0} ${goldLabel}`, variant: 'subtitle' },
        color: { value: guild.color },
        art: { value: guild.iconUrl, alt: guild.name || fallbackGuildName },
        icon: { value: guild.iconKey || 'Shield', colored: true },
      },
    },
  };

  return (
    <PlayingHand
      hand={{
        id: 'guild-member-deck',
        cards: [guildCard, ...memberCards],
        mainCardIndex: 0,
        variant: compact ? 'vertical' : 'horizontal',
      }}
      mode="mini"
      stackSide="right"
      visibleCardCount={memberCards.length}
      expandOnHover
      onCardSelect={onCardSelect}
      className={cn(
        'h-72 w-52 shrink-0 hover:w-[28rem] focus-within:w-[28rem]',
        compact && 'h-64 w-32 hover:w-32 focus:w-32 focus-within:w-32 sm:w-36'
      )}
      cardPresentation={{ width: compact ? 'dockMedium' : 'dockLarge' }}
      stackCardPresentation={{ width: compact ? 'dockMediumStack' : 'dockLargeStack' }}
    />
  );
}
