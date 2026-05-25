import { useState } from 'react';
import type { DashboardMiniCardProps } from '../molecules/DashboardMiniCard';
import { FullSizePlayingCardModal } from '../molecules/PlayingCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge/GlobalProgressGauge';
import { DashboardMiniDeck } from '../molecules/DashboardMiniCard';
import { HoldToConfirmButton } from '../atoms/HoldToConfirmButton';
import { GaugeIndicator } from '../atoms/GaugeIndicator';
import { useGameStore } from '../../features/game/gameStore';
import { useDashboardData } from '../../features/game/useDashboardData';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import { FlipDeck } from './DashboardDock/FlipDeck';
import { GuildMemberDeck } from './DashboardDock/GuildMemberDeck';
import { Coins } from 'lucide-react';
import {
  RIVAL_GUILDS,
  buildCohortRewardCards,
  buildFaceDownDeckCards,
  buildGaugeMilestones,
  buildGuildMemberCards,
  buildMockGuildCardHands,
  buildPodiumCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';

export interface DashboardDockProps {
  className?: string;
}

export function DashboardDock({ className }: DashboardDockProps) {
  const [showBonusCards, setShowBonusCards] = useState(false);
  const [guildHandModalCardIndex, setGuildHandModalCardIndex] = useState<number | null>(null);
  const { user, student, character } = useGameStore();
  const dashboardData = useDashboardData();
  const { t } = useTranslation();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;

  if (!student || !character) return null;

  const podiumCards = buildPodiumCards(t, playerGuild);
  const cohortDeckCards = buildFaceDownDeckCards(
    t,
    latestMembership?.cohort?.name || t('dashboard.dock.cohortDeck')
  );
  const bonusCards = dashboardData?.rewards.length
    ? (dashboardData.rewards.map((reward) => ({
        kind: 'guild' as const,
        title: t(reward.titleI18nKey),
        subtitle: reward.subtitleI18nKey ? t(reward.subtitleI18nKey) : undefined,
        accentToken: reward.accentToken as DashboardMiniCardProps['accentToken'],
        faceDown: reward.faceDown,
        ribbonLabel: t('dashboard.dock.newRibbon'),
        ribbonClassName: 'bg-status-quest',
      })) as [DashboardMiniCardProps, ...DashboardMiniCardProps[]])
    : buildCohortRewardCards(t);
  const gaugeMilestones = dashboardData?.gauge.milestones.length
    ? dashboardData.gauge.milestones.map((milestone) => ({
        id: milestone.id,
        label: t(milestone.labelI18nKey),
        description: milestone.descriptionI18nKey ? t(milestone.descriptionI18nKey) : undefined,
        positionPercent: milestone.positionPercent,
        value: milestone.value,
      }))
    : buildGaugeMilestones(t);
  const gaugeCurrentPoints = dashboardData?.gauge.currentPoints ?? 460;
  const gaugeTargetPoints = dashboardData?.gauge.targetPoints ?? 1000;
  const gaugeLabel = dashboardData?.gauge.labelI18nKey ? t(dashboardData.gauge.labelI18nKey) : t('dashboard.dock.milestone');
  const podiumDeckCards = [podiumCards[0], podiumCards[1], podiumCards[2], ...cohortDeckCards] as [
    DashboardMiniCardProps,
    ...DashboardMiniCardProps[],
  ];
  const characterCard: DashboardMiniCardProps = {
    kind: 'character',
    title: playerName,
    subtitle: t('dashboard.dock.characterLevel').replace('{level}', String(character.currentLevel)),
    characterClass: character.characterClass,
    illustrationUrl: playerAvatar,
    illustrationAlt: playerName,
  };
  const guildMemberCards = buildGuildMemberCards(t, characterCard);
  const guildHandModalHands = buildMockGuildCardHands(t, {
    guild: playerGuild,
    guildName: playerGuild.name || t('dashboard.dock.playerGuild'),
    playerName,
    playerAvatar,
    characterLevel: character.currentLevel,
    characterClassLabel: t(`game.classes.${character.characterClass}`),
    activeCardIndex: guildHandModalCardIndex ?? 0,
  });
  const openGuildHandModal = (_card: DashboardMiniCardProps, index: number) => {
    setGuildHandModalCardIndex(index);
  };
  const closeGuildHandModal = () => {
    setGuildHandModalCardIndex(null);
  };
  const boostButton = (
    <HoldToConfirmButton
      onConfirm={() => undefined}
      holdDuration={1200}
      shape="round"
      variant="btn-primary"
      className="h-24 w-24 min-h-0 border-primary/40 bg-primary text-primary-content font-display text-base font-black shadow-glow-primary"
    >
      {t('dashboard.dock.boost')}
    </HoldToConfirmButton>
  );
  const goldIndicator = (
    <GaugeIndicator
      label={t('dashboard.dock.gold')}
      value={(playerGuild.totalPoints || 0).toLocaleString()}
      icon={<Coins size={18} aria-hidden />}
      tone="gold"
    />
  );

  return (
    <>
      <aside
        aria-label={t('dashboard.dock.ariaLabel')}
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 h-36 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-dock backdrop-blur-xl lg:h-40',
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
            frontLabel={t('dashboard.dock.showPodiumCards')}
            backLabel={t('dashboard.dock.showBonusCards')}
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
            frontLabel={t('dashboard.dock.showPodiumCards')}
            backLabel={t('dashboard.dock.showBonusCards')}
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
            currentPoints={gaugeCurrentPoints}
            targetPoints={gaugeTargetPoints}
            milestones={gaugeMilestones}
            label={gaugeLabel}
            centerContent={boostButton}
            goldIndicator={goldIndicator}
            rightIndicatorCompactValue={(playerGuild.totalPoints || 0).toLocaleString()}
            boostLabel={t('dashboard.dock.boost')}
            className="mb-2 min-w-[26rem] max-w-[50rem] flex-1 shrink xl:min-w-[30rem] 2xl:min-w-[34rem]"
          />

          <div className="shrink-0 xl:hidden">
            <GuildMemberDeck
              guild={playerGuild}
              memberCards={guildMemberCards}
              fallbackGuildName={t('dashboard.dock.playerGuild')}
              goldLabel={t('dashboard.dock.gold')}
              onCardSelect={openGuildHandModal}
              compact
            />
          </div>

          <div className="hidden shrink-0 xl:block">
            <GuildMemberDeck
              guild={playerGuild}
              memberCards={guildMemberCards}
              fallbackGuildName={t('dashboard.dock.playerGuild')}
              goldLabel={t('dashboard.dock.gold')}
              onCardSelect={openGuildHandModal}
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-center gap-2 overflow-visible px-2 lg:hidden sm:gap-3">
        <FlipDeck
          frontCards={podiumDeckCards}
          backCards={bonusCards}
          flipped={showBonusCards}
          onFlip={() => setShowBonusCards((current) => !current)}
          frontLabel={t('dashboard.dock.showPodiumCards')}
          backLabel={t('dashboard.dock.showBonusCards')}
          variant="vertical"
          stackSide="left"
          revealedCardCount={3}
          expandOnHover
          className="h-64 w-32 sm:w-36"
          cardClassName="w-32 translate-y-0 sm:w-36"
          stackCardClassName="w-28 translate-y-0 sm:w-32"
        />

        <GlobalProgressGauge
          currentPoints={gaugeCurrentPoints}
          targetPoints={gaugeTargetPoints}
          milestones={gaugeMilestones}
          label={gaugeLabel}
          centerContent={boostButton}
          goldIndicator={goldIndicator}
          rightIndicatorCompactValue={(playerGuild.totalPoints || 0).toLocaleString()}
          boostLabel={t('dashboard.dock.boost')}
          className="mb-0 h-40 w-40 shrink-0"
        />

        <GuildMemberDeck
          guild={playerGuild}
          memberCards={guildMemberCards}
          fallbackGuildName={t('dashboard.dock.playerGuild')}
          goldLabel={t('dashboard.dock.gold')}
          onCardSelect={openGuildHandModal}
          compact
        />
      </div>
      </aside>

      <FullSizePlayingCardModal
        isOpen={guildHandModalCardIndex !== null}
        title={playerGuild.name || t('dashboard.dock.playerGuild')}
        subtitle={t('dashboard.dock.cardHandModalSubtitle')}
        closeLabel={t('dashboard.dock.closeCardHandModal')}
        hands={guildHandModalHands}
        onClose={closeGuildHandModal}
      />
    </>
  );
}

export default DashboardDock;
