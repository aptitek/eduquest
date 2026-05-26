import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayingCardData, PlayingCardEditableField, PlayingCardSide } from '../molecules/PlayingCard';
import { PlayingHand } from '../molecules/PlayingCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge/GlobalProgressGauge';
import { HoldToConfirmButton } from '../atoms/HoldToConfirmButton';
import { GaugeIndicator } from '../atoms/GaugeIndicator';
import { useGameStore } from '../../features/game/gameStore';
import { useDashboardData } from '../../features/game/useDashboardData';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import { ENABLE_MOCK_DATA } from '../../config/deployment';
import mascotUrl from '../../assets/mascot.svg';
import { Coins } from 'lucide-react';
import {
  RIVAL_GUILDS,
  buildClassGuildHand,
  buildCohortRewardCards,
  buildGaugeMilestones,
  buildMockGuildCardHands,
  buildPodiumCards,
  buildProgressBonusCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';
import { motion, useReducedMotion } from 'framer-motion';

export interface DashboardDockProps {
  className?: string;
}

type EditableCardSideOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};

export function DashboardDock({ className }: DashboardDockProps) {
  const prefersReducedMotion = useReducedMotion();
  const layoutTransition = prefersReducedMotion
    ? { layout: { duration: 0 } }
    : { layout: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } };
  const [route, setRoute] = useState(() => getHashRoute());
  const [usesWideGuildDeck, setUsesWideGuildDeck] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [classPodiumTarget, setClassPodiumTarget] = useState<HTMLElement | null>(null);
  const [guildHandTarget, setGuildHandTarget] = useState<HTMLElement | null>(null);
  const [progressBonusTarget, setProgressBonusTarget] = useState<HTMLElement | null>(null);
  const [editableCardSides, setEditableCardSides] = useState<Record<string, EditableCardSideOverride>>({});
  const { user, student, character } = useGameStore();
  const dashboardData = useDashboardData();
  const { t } = useTranslation();
  const latestMembership = getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild || (ENABLE_MOCK_DATA ? RIVAL_GUILDS[0] : undefined);
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;
  const isGuildPage = route === 'guild';
  const isClassPage = route === 'class';
  const isProgressPage = route === 'progress';

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

  const updateEditableCardField = useCallback(
    (sideKey: string, field: PlayingCardEditableField, value: string) => {
      setEditableCardSides((current) => ({
        ...current,
        [sideKey]: {
          ...current[sideKey],
          [field]: value,
        },
      }));
    },
    []
  );

  const updateEditableCardStat = useCallback((sideKey: string, statId: string, value: number) => {
    setEditableCardSides((current) => ({
      ...current,
      [sideKey]: {
        ...current[sideKey],
        stats: {
          ...current[sideKey]?.stats,
          [statId]: value,
        },
      },
    }));
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
    if (route !== 'progress') {
      setProgressBonusTarget(null);
      return undefined;
    }

    const updateTarget = () => setProgressBonusTarget(document.getElementById('progress-bonus-hand-target'));
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

  if (!student || !character || !playerGuild) return null;

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
    : ENABLE_MOCK_DATA
      ? buildCohortRewardCards(t)
      : ([
          {
            kind: 'guild' as const,
            id: 'empty-reward',
            title: t('dashboard.rewards.empty.title'),
            subtitle: t('dashboard.rewards.empty.subtitle'),
            accentToken: 'neutral' as const,
            faceDown: true,
          },
        ] as [PlayingCardData, ...PlayingCardData[]]);
  const progressBonusCards = buildProgressBonusCards(bonusCards, 'progress-active-bonus');
  const gaugeMilestones = dashboardData?.gauge.milestones.length
    ? dashboardData.gauge.milestones.map((milestone) => ({
        id: milestone.id,
        label: t(milestone.labelI18nKey),
        description: milestone.descriptionI18nKey ? t(milestone.descriptionI18nKey) : undefined,
        positionPercent: milestone.positionPercent,
        value: milestone.value,
      }))
    : ENABLE_MOCK_DATA
      ? buildGaugeMilestones(t)
      : [];
  const gaugeCurrentPoints = dashboardData?.gauge.currentPoints ?? 0;
  const gaugeTargetPoints = dashboardData?.gauge.targetPoints ?? 1;
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
  const classPodiumHandsBase = podiumCards.map((card) =>
    buildClassGuildHand(t, {
      guild: card.guild || playerGuild,
      guildName: card.title,
    })
  );
  const classPodiumHands = classPodiumHandsBase.map((hand) => ({
    ...hand,
    cards: hand.cards.map((card) =>
      card.kind === 'guild' && card.guild?.name === playerGuild.name
        ? makeEditableDashboardCard({
            card,
            cardKey: 'guild',
            sideOverrides: editableCardSides,
            onFieldChange: updateEditableCardField,
            onStatChange: updateEditableCardStat,
          })
        : card
    ) as [PlayingCardData, ...PlayingCardData[]],
  }));
  const openCharacterPage = () => {
    window.location.hash = 'character';
  };
  const guildHandBase = buildMockGuildCardHands(t, {
    guild: playerGuild,
    guildName: playerGuild.name || t('dashboard.dock.playerGuild'),
    playerName,
    playerAvatar,
    characterLevel: character.currentLevel,
    characterClass: character.characterClass,
    characterClassLabel: t(`game.classes.${character.characterClass}`),
    activeCardIndex: 0,
  })[0];
  const guildHand = {
    ...guildHandBase,
    cards: guildHandBase.cards.map((card) => {
      if (card.id === 'guild') {
        return makeEditableDashboardCard({
          card,
          cardKey: 'guild',
          sideOverrides: editableCardSides,
          onFieldChange: updateEditableCardField,
          onStatChange: updateEditableCardStat,
        });
      }

      if (card.id === 'player') {
        const playerCard = makeEditableDashboardCard({
          card,
          cardKey: 'player',
          sideOverrides: editableCardSides,
          onFieldChange: updateEditableCardField,
          onStatChange: updateEditableCardStat,
        });

        return {
          ...playerCard,
          onRibbonClick: openCharacterPage,
          front: playerCard.front
            ? {
                ...playerCard.front,
                onRibbonClick: openCharacterPage,
              }
            : playerCard.front,
        };
      }

      return card;
    }) as [PlayingCardData, ...PlayingCardData[]],
  };
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
      className={cn(
        'h-24 w-24 min-h-0 border-primary/40 bg-primary text-primary-content font-display text-base font-black shadow-glow-primary',
        isProgressPage && 'h-32 w-32 text-lg sm:h-36 sm:w-36 sm:text-xl'
      )}
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
      transition={layoutTransition}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isClassPage
          ? 'relative z-0 w-full'
          : 'relative z-50 h-64 w-32 shrink-0 sm:w-36 lg:h-72 xl:w-40 2xl:w-52'
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
          className="h-full w-full"
          cardClassName="w-32 translate-y-0 sm:w-36 xl:w-36 2xl:w-40"
          stackCardClassName="w-28 translate-y-0 sm:w-32 xl:w-32 2xl:w-36"
        />
      )}
    </motion.div>
  );
  const guildContent = (
    <motion.div
      layout
      transition={layoutTransition}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isGuildPage
          ? 'relative z-0 w-full'
          : 'relative z-50 h-64 w-32 shrink-0 sm:w-36 lg:h-72 xl:w-40'
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
          isGuildPage && 'mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]'
        )}
        cardClassName={cn(!isGuildPage && 'w-32 translate-y-0 sm:w-36 xl:w-40')}
        stackCardClassName={cn(!isGuildPage && 'w-28 translate-y-0 sm:w-32 xl:w-36')}
      />
    </motion.div>
  );
  const bonusContent = (
    <motion.div
      layout
      transition={layoutTransition}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isProgressPage
          ? 'relative z-0 w-full'
          : 'relative z-40 hidden h-72 w-36 shrink-0 xl:block'
      )}
    >
      <PlayingHand
        hand={{
          id: 'progress-active-bonus-hand',
          title: t('progress.activeBonuses'),
          cards: progressBonusCards,
          mainCardIndex: 0,
          variant: 'horizontal',
        }}
        mode={isProgressPage ? 'full' : 'mini'}
        visibleCardCount={progressBonusCards.length}
        expandOnHover={!isProgressPage}
        onCardSelect={isProgressPage ? undefined : () => {
          window.location.hash = 'progress';
        }}
        stackSide="left"
        className={cn(
          isProgressPage
            ? 'mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]'
            : 'h-full w-full'
        )}
        cardClassName={cn(!isProgressPage && 'w-32 translate-y-0')}
        stackCardClassName={cn(!isProgressPage && 'w-28 translate-y-0')}
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
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 flex h-64 w-full items-end justify-start gap-4 overflow-x-auto overflow-y-visible px-3 sm:justify-center sm:gap-6 lg:h-72 lg:gap-8 lg:px-4 xl:gap-10 2xl:gap-12',
            isProgressPage && 'h-72 lg:h-80'
          )}
        >
          {!isProgressPage ? bonusContent : null}

          {!isClassPage ? podiumContent : null}

          <GlobalProgressGauge
            currentPoints={gaugeCurrentPoints}
            targetPoints={gaugeTargetPoints}
            milestones={gaugeMilestones}
            label={gaugeLabel}
            centerContent={boostButton}
            goldIndicator={goldIndicator}
            rightIndicatorCompactValue={(playerGuild.totalPoints || 0).toLocaleString()}
            boostLabel={t('dashboard.dock.boost')}
            milestoneBadgesExpanded={isProgressPage}
            className={cn(
              'h-40 w-40 shrink-0 rounded-none border-0 bg-transparent shadow-none lg:h-52 lg:w-auto lg:min-w-[26rem] lg:max-w-[50rem] lg:flex-1 lg:shrink xl:min-w-[30rem] 2xl:min-w-[34rem]',
              isProgressPage && 'h-56 w-56 sm:h-64 sm:w-64 lg:h-72 lg:min-w-[34rem] 2xl:min-w-[40rem]'
            )}
          />

          {!isGuildPage ? guildContent : null}
        </div>
      </aside>

      {isClassPage ? (classPodiumTarget ? createPortal(podiumContent, classPodiumTarget) : podiumContent) : null}

      {isGuildPage ? (guildHandTarget ? createPortal(guildContent, guildHandTarget) : guildContent) : null}

      {isProgressPage ? (progressBonusTarget ? createPortal(bonusContent, progressBonusTarget) : bonusContent) : null}
    </>
  );
}

export default DashboardDock;

function getHashRoute() {
  return window.location.hash.replace(/^#\/?/, '');
}

function makeEditableDashboardCard({
  card,
  cardKey,
  sideOverrides,
  onFieldChange,
  onStatChange,
}: {
  card: PlayingCardData;
  cardKey: string;
  sideOverrides: Record<string, EditableCardSideOverride>;
  onFieldChange: (sideKey: string, field: PlayingCardEditableField, value: string) => void;
  onStatChange: (sideKey: string, statId: string, value: number) => void;
}): PlayingCardData {
  const frontSideKey = `${cardKey}:front`;
  const backSideKey = `${cardKey}:back`;
  const front = applyEditableSide({
    side: card.front || {
      title: card.title || 'Card',
      subtitle: card.subtitle,
      description: card.description,
      illustrationUrl: card.illustrationUrl,
      illustrationAlt: card.illustrationAlt,
      ribbonText: card.ribbonLabel || card.ribbonText,
      ribbonPosition: card.ribbonPosition,
      stats: card.stats,
      statsLabel: card.statsLabel,
      footer: card.footer,
    },
    sideKey: frontSideKey,
    override: sideOverrides[frontSideKey],
    onFieldChange,
    onStatChange,
  });
  const back = isEditablePlayingCardSide(card.back)
    ? applyEditableSide({
        side: card.back,
        sideKey: backSideKey,
        override: sideOverrides[backSideKey],
        onFieldChange,
        onStatChange,
      })
    : card.back;

  return {
    ...card,
    title: front.title,
    subtitle: front.subtitle,
    illustrationUrl: front.illustrationUrl,
    ribbonLabel: front.ribbonText,
    front,
    back,
    editable: true,
  };
}

function applyEditableSide({
  side,
  sideKey,
  override,
  onFieldChange,
  onStatChange,
}: {
  side: PlayingCardSide;
  sideKey: string;
  override?: EditableCardSideOverride;
  onFieldChange: (sideKey: string, field: PlayingCardEditableField, value: string) => void;
  onStatChange: (sideKey: string, statId: string, value: number) => void;
}): PlayingCardSide {
  return {
    ...side,
    title: override?.title ?? side.title,
    subtitle: override?.subtitle ?? side.subtitle,
    description: override?.description ?? side.description,
    illustrationUrl: override?.illustrationUrl ?? side.illustrationUrl,
    ribbonText: override?.ribbonText ?? side.ribbonText,
    stats: side.stats?.map((stat) => ({
      ...stat,
      value: override?.stats?.[stat.id] ?? stat.value,
    })),
    editable: true,
    onFieldChange: (field, value) => onFieldChange(sideKey, field, value),
    onStatChange: (statId, value) => onStatChange(sideKey, statId, value),
  };
}

function isEditablePlayingCardSide(value: PlayingCardData['back']): value is PlayingCardSide {
  return Boolean(value && typeof value === 'object' && !('type' in value) && 'title' in value);
}
