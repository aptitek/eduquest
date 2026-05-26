import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayingCardData } from '../molecules/PlayingCard';
import { PlayingHand } from '../molecules/PlayingCard';
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
import { Coins } from 'lucide-react';
import {
  RIVAL_GUILDS,
  buildClassGuildHand,
  buildCohortRewardCards,
  buildGaugeMilestones,
  buildMockGuildCardHands,
  buildPodiumCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';
import { motion } from 'framer-motion';

export interface DashboardDockProps {
  className?: string;
}

export function DashboardDock({ className }: DashboardDockProps) {
  const [route, setRoute] = useState(() => getHashRoute());
  const [usesWideGuildDeck, setUsesWideGuildDeck] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [classPodiumTarget, setClassPodiumTarget] = useState<HTMLElement | null>(null);
  const [guildHandTarget, setGuildHandTarget] = useState<HTMLElement | null>(null);
  const { user, student, character } = useGameStore();
  const dashboardData = useDashboardData();
  const { t } = useTranslation();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || RIVAL_GUILDS[0];
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;
  const isGuildPage = route === 'guild';
  const isClassPage = route === 'class';

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = getHashRoute();
      setRoute(nextRoute);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    if (route !== 'class') {
      setClassPodiumTarget(null);
      return undefined;
    }

    const updateTarget = () => setClassPodiumTarget(document.getElementById('class-podium-hands-target'));
    updateTarget();

    const animationFrame = window.requestAnimationFrame(updateTarget);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [route]);

  useEffect(() => {
    if (route !== 'guild') {
      setGuildHandTarget(null);
      return undefined;
    }

    const updateTarget = () => setGuildHandTarget(document.getElementById('guild-hand-target'));
    updateTarget();

    const animationFrame = window.requestAnimationFrame(updateTarget);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [route]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const handleMediaChange = () => setUsesWideGuildDeck(mediaQuery.matches);

    handleMediaChange();
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  if (!student || !character) return null;

  const podiumCards = buildPodiumCards(t, playerGuild);
  const bonusCards = dashboardData?.rewards.length
    ? (dashboardData.rewards.map((reward) => ({
        kind: 'guild' as const,
        title: t(reward.titleI18nKey),
        subtitle: reward.subtitleI18nKey ? t(reward.subtitleI18nKey) : undefined,
        accentToken: reward.accentToken as PlayingCardData['accentToken'],
        faceDown: reward.faceDown,
        ribbonLabel: t('dashboard.dock.newRibbon'),
        ribbonClassName: 'bg-status-quest',
      })) as [PlayingCardData, ...PlayingCardData[]])
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
  const classRemainingCard: PlayingCardData = {
    id: 'class-remaining-guilds-list',
    layoutId: 'class-remaining-guilds-list',
    kind: 'guild',
    title: t('class.remaining'),
    subtitle: latestMembership?.cohort?.name || t('dashboard.dock.cohortDeck'),
    accentToken: 'neutral',
    ribbonLabel: t('class.guilds'),
  };
  const podiumDeckCards = [podiumCards[0], podiumCards[1], podiumCards[2], classRemainingCard] as [
    PlayingCardData,
    ...PlayingCardData[],
  ];
  const classPodiumHands = podiumCards.map((card) =>
    buildClassGuildHand(t, {
      guild: card.guild || playerGuild,
      guildName: card.title,
    })
  );
  const guildHand = buildMockGuildCardHands(t, {
    guild: playerGuild,
    guildName: playerGuild.name || t('dashboard.dock.playerGuild'),
    playerName,
    playerAvatar,
    characterLevel: character.currentLevel,
    characterClassLabel: t(`game.classes.${character.characterClass}`),
    activeCardIndex: 0,
  })[0];
  const openGuildPage = () => {
    window.location.hash = 'guild';
  };
  const openClassPage = () => {
    window.location.hash = 'class';
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
  const podiumContent = (
    <motion.div
      layout
      transition={{ layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } }}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isClassPage
          ? 'relative z-0 w-full'
          : 'fixed bottom-0 left-[max(0.5rem,calc(50vw-10.5rem))] z-50 h-64 w-32 sm:left-[max(0.5rem,calc(50vw-12.5rem))] sm:w-36 xl:left-[calc(50vw-23rem)] xl:h-72 xl:w-40 xl:hover:w-[18rem] xl:focus-within:w-[18rem] 2xl:left-[calc(50vw-27rem)] 2xl:w-52 2xl:hover:w-[24rem] 2xl:focus-within:w-[24rem]'
      )}
    >
      {isClassPage ? (
        <div className="space-y-5">
          {classPodiumHands.map((hand, index) => (
            <section
              key={hand.id}
              aria-label={hand.title}
              className="relative overflow-visible rounded-3xl border border-gaming-border bg-gaming-base/40 p-4 shadow-lg"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-status-campfire px-2 py-0.5 text-xs font-black text-gaming-base">
                  #{index + 1}
                </span>
                <h4 className="truncate font-display text-lg font-bold">{hand.title}</h4>
              </div>
              <PlayingHand
                hand={hand}
                mode="full"
                visibleCardCount={hand.cards.length}
                expandOnHover={false}
                className="mx-auto h-[28rem] min-h-0 max-w-7xl md:h-[30rem]"
              />
            </section>
          ))}
        </div>
      ) : (
        <PlayingHand
          hand={{
            id: 'class-podium-deck',
            cards: podiumDeckCards,
            mainCardIndex: 0,
            variant: usesWideGuildDeck ? 'horizontal' : 'vertical',
          }}
          mode="mini"
          variant={usesWideGuildDeck ? 'horizontal' : 'vertical'}
          stackSide="left"
          visibleCardCount={3}
          expandOnHover
          onCardSelect={openClassPage}
          className="h-full w-full xl:hover:w-[18rem] xl:focus-within:w-[18rem] 2xl:hover:w-[24rem] 2xl:focus-within:w-[24rem]"
          cardClassName="w-32 translate-y-0 sm:w-36 xl:w-36 2xl:w-40"
          stackCardClassName="w-28 translate-y-0 sm:w-32 xl:w-32 2xl:w-36"
        />
      )}
    </motion.div>
  );
  const guildContent = (
    <motion.div
      layout
      transition={{ layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } }}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isGuildPage
          ? 'relative z-0 w-full'
          : 'fixed bottom-0 left-[min(calc(100vw-8.5rem),calc(50vw+6.5rem))] z-50 h-64 w-32 sm:left-[min(calc(100vw-9.5rem),calc(50vw+6.5rem))] sm:w-36 xl:left-[calc(50vw+23rem)] xl:right-auto xl:h-72 xl:w-52 xl:hover:w-[28rem] xl:focus-within:w-[28rem] 2xl:left-[calc(50vw+27rem)]'
      )}
    >
      <PlayingHand
        hand={guildHand}
        mode={isGuildPage ? 'full' : 'mini'}
        variant={!isGuildPage && !usesWideGuildDeck ? 'vertical' : 'horizontal'}
        visibleCardCount={guildHand.cards.length}
        expandOnHover={!isGuildPage}
        onCardSelect={isGuildPage ? undefined : openGuildPage}
        className={cn(
          'h-full w-full',
          isGuildPage ? 'mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]' : 'xl:hover:w-[28rem] xl:focus-within:w-[28rem]'
        )}
        cardClassName={cn(!isGuildPage && 'w-32 translate-y-0 sm:w-36 xl:w-40')}
        stackCardClassName={cn(!isGuildPage && 'w-28 translate-y-0 sm:w-32 xl:w-36')}
      />
    </motion.div>
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

          <div className="hidden h-72 w-52 shrink-0 2xl:block" aria-hidden />
          <div className="hidden h-72 w-40 shrink-0 xl:block 2xl:hidden" aria-hidden />
          <div className="h-64 w-32 shrink-0 xl:hidden" aria-hidden />

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

          {!isGuildPage ? <div className="hidden h-72 w-52 shrink-0 xl:block" aria-hidden /> : null}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-64 w-screen items-end justify-center gap-2 overflow-visible px-2 lg:hidden sm:gap-3">
        <div className="h-64 w-32 shrink-0 sm:w-36" aria-hidden />

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

        {!isGuildPage ? <div className="h-64 w-32 shrink-0 sm:w-36" aria-hidden /> : null}
      </div>
      </aside>

      {isClassPage && classPodiumTarget ? createPortal(podiumContent, classPodiumTarget) : podiumContent}

      {isGuildPage && guildHandTarget ? createPortal(guildContent, guildHandTarget) : guildContent}
    </>
  );
}

export default DashboardDock;

function getHashRoute() {
  return window.location.hash.replace(/^#\/?/, '');
}
