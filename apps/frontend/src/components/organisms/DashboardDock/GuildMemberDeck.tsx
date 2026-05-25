import { DashboardMiniDeck } from '../../molecules/DashboardMiniCard';
import type { DashboardMiniCardProps } from '../../molecules/DashboardMiniCard';
import { cn } from '../../../utils/cn';
import type { DockGuild } from './types';

export interface GuildMemberDeckProps {
  guild: DockGuild;
  memberCards: readonly [DashboardMiniCardProps, DashboardMiniCardProps, DashboardMiniCardProps];
  compact?: boolean;
}

export function GuildMemberDeck({ guild, memberCards, compact = false }: GuildMemberDeckProps) {
  const guildCard: DashboardMiniCardProps = {
    kind: 'guild',
    guild,
    title: guild.name || 'Player guild',
    subtitle: `${guild.totalPoints || 0} gold`,
  };

  return (
    <DashboardMiniDeck
      cards={[guildCard, ...memberCards]}
      variant={compact ? 'vertical' : 'horizontal'}
      stackSide="right"
      revealedCardCount={memberCards.length}
      expandOnHover
      className={cn(
        'h-72 w-64 shrink-0 hover:w-[34rem] focus-within:w-[34rem]',
        compact && 'h-64 w-32 hover:w-32 focus:w-32 focus-within:w-32 sm:w-36'
      )}
      cardClassName={cn('translate-y-0', compact && 'w-32')}
      stackCardClassName={cn('translate-y-0', compact && 'w-28')}
    />
  );
}
