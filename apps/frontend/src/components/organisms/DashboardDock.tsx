import { useState } from 'react';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge';
import { DashboardMiniDeck } from '../molecules/DashboardMiniCard';
import { useGameStore } from '../../features/game/gameStore';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import { DashboardToastAreas } from './DashboardDock/DashboardToastAreas';
import { FlipDeck } from './DashboardDock/FlipDeck';
import { GuildMemberDeck } from './DashboardDock/GuildMemberDeck';
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
  const podiumDeckCards = [podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards] as [
    DashboardMiniCardProps,
    ...DashboardMiniCardProps[],
  ];
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
        <div className="flex h-full w-full items-end justify-center gap-2 overflow-visible xl:gap-3">
          <DashboardMiniDeck
            cards={bonusCards}
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            className="mr-8 hidden h-72 w-36 shrink-0 hover:w-[18rem] focus-within:w-[18rem] 2xl:block"
            cardClassName="w-32 translate-y-0"
            stackCardClassName="w-28 translate-y-0"
          />

          <DashboardMiniDeck
            cards={podiumDeckCards}
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            className="hidden h-72 w-52 shrink-0 hover:w-[24rem] focus-within:w-[24rem] 2xl:block"
            cardClassName="w-40 translate-y-0"
            stackCardClassName="w-36 translate-y-0"
          />

          <FlipDeck
            frontCards={podiumDeckCards}
            backCards={bonusCards}
            flipped={showBonusCards}
            onFlip={() => setShowBonusCards((current) => !current)}
            frontLabel="Show podium cards"
            backLabel="Show bonus cards"
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            wrapperClassName="hidden xl:block 2xl:hidden"
            className="h-72 w-40 hover:w-[18rem] focus-within:w-[18rem]"
            cardClassName="w-36 translate-y-0"
            stackCardClassName="w-32 translate-y-0"
          />

          <FlipDeck
            frontCards={podiumDeckCards}
            backCards={bonusCards}
            flipped={showBonusCards}
            onFlip={() => setShowBonusCards((current) => !current)}
            frontLabel="Show podium cards"
            backLabel="Show bonus cards"
            variant="vertical"
            stackSide="left"
            revealedCardCount={3}
            expandOnHover
            wrapperClassName="xl:hidden"
            className="h-64 w-32"
            cardClassName="w-32 translate-y-0"
            stackCardClassName="w-28 translate-y-0"
          />

          <GlobalProgressGauge
            currentPoints={460}
            targetPoints={1000}
            milestones={GAUGE_MILESTONES}
            label="Current milestone"
            className="mb-8 min-w-[26rem] max-w-[50rem] flex-1 shrink xl:min-w-[30rem] 2xl:min-w-[34rem]"
          />

          <div className="shrink-0 xl:hidden">
            <GuildMemberDeck
              guild={playerGuild}
              memberCards={buildGuildMemberCards(characterCard)}
              compact
            />
          </div>

          <div className="hidden shrink-0 xl:block">
            <GuildMemberDeck guild={playerGuild} memberCards={buildGuildMemberCards(characterCard)} />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-center gap-2 overflow-visible px-2 lg:hidden sm:gap-3">
        <FlipDeck
          frontCards={podiumDeckCards}
          backCards={bonusCards}
          flipped={showBonusCards}
          onFlip={() => setShowBonusCards((current) => !current)}
          frontLabel="Show podium cards"
          backLabel="Show bonus cards"
          variant="vertical"
          stackSide="left"
          revealedCardCount={3}
          expandOnHover
          className="h-64 w-32 sm:w-36"
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
