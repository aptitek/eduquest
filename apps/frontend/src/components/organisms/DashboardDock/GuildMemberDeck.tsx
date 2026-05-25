import { DashboardMiniDeck } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';
import { cn } from '../../../utils/cn';
import type { DockGuild } from './types';

export interface GuildMemberDeckProps {
  guild: DockGuild;
  memberCards: readonly [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
  fallbackGuildName: string;
  goldLabel: string;
  compact?: boolean;
}

export function GuildMemberDeck({
  guild,
  memberCards,
  fallbackGuildName,
  goldLabel,
  compact = false,
}: GuildMemberDeckProps) {
  const guildCard: DashboardMiniCardProps = {
    kind: 'guild',
    guild,
    title: guild.name || fallbackGuildName,
    subtitle: `${guild.totalPoints || 0} ${goldLabel}`,
  };

  return (
    <DashboardMiniDeck
      cards={[guildCard, ...memberCards]}
      variant={compact ? 'vertical' : 'horizontal'}
      stackSide="right"
      revealedCardCount={memberCards.length}
      expandOnHover
      className={cn(
        'h-72 w-52 shrink-0 hover:w-[28rem] focus-within:w-[28rem]',
        compact && 'h-64 w-32 hover:w-32 focus:w-32 focus-within:w-32 sm:w-36'
      )}
      cardClassName={cn('w-40 translate-y-0', compact && 'w-32')}
      stackCardClassName={cn('w-36 translate-y-0', compact && 'w-28')}
    />
  );
}
