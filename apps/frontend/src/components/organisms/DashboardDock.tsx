import { useState } from 'react';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge';
import { useGameStore } from '../../features/game/gameStore';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import { DashboardToastAreas } from './DashboardDock/DashboardToastAreas';
import { GuildMemberDeck } from './DashboardDock/GuildMemberDeck';
import { ToggleablePodiumDeck } from './DashboardDock/ToggleablePodiumDeck';
import {
  GAUGE_MILESTONES,
  RIVAL_GUILDS,
  buildCohortRewardCards,
  buildFaceDownDeckCards,
  buildGuildMemberCards,
  buildPodiumCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';

export interface DashboardDockProps {
  className?: string;
}

export function DashboardDock({ className }: DashboardDockProps) {
  const [showBonusCards, setShowBonusCards] = useState(false);
  const { user, student, character } = useGameStore();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const playerName = user ? formatUserDisplayName(user) : 'Player';
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;

  if (!student || !character) return null;

  const podiumCards = buildPodiumCards(playerGuild);
  const cohortDeckCards = buildFaceDownDeckCards(latestMembership?.cohort?.name || 'Cohort deck');
  const bonusCards = buildCohortRewardCards();
  const podiumDeckCards = showBonusCards
    ? bonusCards
    : ([podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards] as [
        DashboardMiniCardProps,
        ...DashboardMiniCardProps[],
      ]);
  const characterCard: DashboardMiniCardProps = {
    kind: 'character',
    title: playerName,
    subtitle: `Level ${character.currentLevel}`,
    characterClass: character.characterClass,
    illustrationUrl: playerAvatar,
    illustrationAlt: playerName,
  };

  return (
    <aside
      aria-label="Dashboard dock"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 h-36 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:h-40',
        className
      )}
    >
      <div className="absolute inset-x-0 bottom-0 hidden h-72 w-screen overflow-visible px-3 lg:block">
        <div className="flex h-full w-full items-end gap-3 overflow-visible">
          <ToggleablePodiumDeck
            cards={podiumDeckCards}
            showBonusCards={showBonusCards}
            onToggle={() => setShowBonusCards((current) => !current)}
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            className="h-72 w-64 shrink-0 hover:w-[28rem] focus-within:w-[28rem]"
            cardClassName="w-44 translate-y-0"
            stackCardClassName="w-40 translate-y-0"
          />

          <GlobalProgressGauge
            currentPoints={460}
            targetPoints={1000}
            milestones={GAUGE_MILESTONES}
            label="Current milestone"
            className="mb-8 min-w-[20rem] flex-1 transition-[width] duration-300"
          />

          <GuildMemberDeck guild={playerGuild} memberCards={buildGuildMemberCards(characterCard)} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-center gap-2 overflow-visible px-2 lg:hidden sm:gap-3">
        <ToggleablePodiumDeck
          cards={podiumDeckCards}
          showBonusCards={showBonusCards}
          onToggle={() => setShowBonusCards((current) => !current)}
          variant="vertical"
          stackSide="left"
          revealedCardCount={3}
          expandOnHover
          className="h-64 w-32 shrink-0 sm:w-36"
          cardClassName="w-32 translate-y-0 sm:w-36"
          stackCardClassName="w-28 translate-y-0 sm:w-32"
        />

        <GlobalProgressGauge
          currentPoints={460}
          targetPoints={1000}
          label="Current milestone"
          variant="circle"
          className="mb-0"
        />

        <GuildMemberDeck
          guild={playerGuild}
          memberCards={buildGuildMemberCards(characterCard)}
          compact
        />
      </div>

      <DashboardToastAreas />
    </aside>
  );
}

export default DashboardDock;
