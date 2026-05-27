import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PlayingCardData, PlayingCardEditableField, PlayingCardSide } from '../molecules/PlayingCard';
import { PlayingHand, PlayingHandPanel } from '../molecules/PlayingCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge/GlobalProgressGauge';
import { HoldToConfirmButton } from '../atoms/HoldToConfirmButton';
import { GaugeIndicator } from '../atoms/GaugeIndicator';
import { StepSelector } from '../molecules/StepSelector';
import { useGameStore } from '../../features/game/gameStore';
import { fetchCohortStep, fetchGuilds, spendGuildVotes, updateCohortStep, updateGuildIcon } from '../../features/game/api';
import { useCohortProgressData } from '../../features/game/useCohortProgressData';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import { Coins } from 'lucide-react';
import {
  buildClassGuildHand,
  buildGuildCardHands,
  buildPodiumCards,
  buildProgressBonusCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';
import type { DockGuild } from './DashboardDock/types';
import { motion, useReducedMotion } from 'framer-motion';

const LucideIconSelector = lazy(() =>
  import('../atoms/LucideIconSelector').then((module) => ({
    default: module.LucideIconSelector,
  }))
);

export interface DashboardDockProps {
  className?: string;
}

type EditableCardSideOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};

const PROGRESS_BONUS_SEEN_STORAGE_PREFIX = 'eduquest_progress_seen_bonus_cards';

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
  const [guilds, setGuilds] = useState<DockGuild[]>([]);
  const [adminStep, setAdminStep] = useState(0);
  const [isSavingAdminStep, setIsSavingAdminStep] = useState(false);
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [seenProgressBonusCardIds, setSeenProgressBonusCardIds] = useState<Set<string>>(() => new Set());
  const { user, student, character, selectedGameId } = useGameStore();
  const dashboardData = useCohortProgressData(Boolean(user), selectedGameId);
  const { t } = useTranslation();
  const latestMembership =
    (selectedGameId &&
      student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild;
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;
  const isGuildPage = route === 'guild';
  const isClassPage = route === 'class';
  const isProgressPage = route === 'progress';
  const progressBonusSeenStorageKey = getProgressBonusSeenStorageKey(user?.id, selectedGameId);

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
    setSeenProgressBonusCardIds(readSeenProgressBonusCardIds(progressBonusSeenStorageKey));
  }, [progressBonusSeenStorageKey]);

  const markProgressBonusCardSeen = useCallback(
    (cardId: string | undefined) => {
      if (!isProgressPage || !cardId) return;

      setSeenProgressBonusCardIds((current) => {
        if (current.has(cardId)) return current;

        const next = new Set(current).add(cardId);
        writeSeenProgressBonusCardIds(progressBonusSeenStorageKey, next);
        return next;
      });
    },
    [isProgressPage, progressBonusSeenStorageKey]
  );

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

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchGuilds(token, selectedGameId)
      .then((nextGuilds) => {
        if (isMounted) setGuilds(nextGuilds);
      })
      .catch((error) => {
        console.warn('Could not load dashboard guilds.', error);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  useEffect(() => {
    if (!user?.isAdmin || !selectedGameId) return undefined;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchCohortStep(token, selectedGameId)
      .then((step) => {
        if (isMounted) setAdminStep(step);
      })
      .catch((error) => {
        console.warn('Could not load dashboard cohort step.', error);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.isAdmin, selectedGameId]);

  const milestoneRewards = dashboardData?.gauge.milestones.map((milestone) => milestone.reward) || [];
  const bonusCards = milestoneRewards.length
    ? (milestoneRewards.map((reward) => ({
        kind: 'reward' as const,
        id: reward.id,
        title: t(reward.titleI18nKey),
        subtitle: reward.subtitleI18nKey ? t(reward.subtitleI18nKey) : undefined,
        accentToken: reward.accentToken as PlayingCardData['accentToken'],
        ribbonLabel: t('dashboard.dock.newRibbon'),
        ribbonClassName: 'bg-status-quest',
      })) as [PlayingCardData, ...PlayingCardData[]])
    : ([
        {
          kind: 'reward' as const,
          id: 'empty-reward',
          title: t('dashboard.rewards.empty.title'),
          subtitle: t('dashboard.rewards.empty.subtitle'),
          accentToken: 'neutral' as const,
          faceDown: true,
        },
      ] as [PlayingCardData, ...PlayingCardData[]]);
  const progressBonusCards = withProgressBonusNewRibbonState(
    buildProgressBonusCards(bonusCards, 'progress-active-bonus'),
    seenProgressBonusCardIds,
    markProgressBonusCardSeen,
    isProgressPage
  );
  const gaugeMilestones = dashboardData?.gauge.milestones.length
    ? dashboardData.gauge.milestones.map((milestone) => ({
        id: milestone.id,
        label: t(milestone.labelI18nKey),
        description: milestone.descriptionI18nKey ? t(milestone.descriptionI18nKey) : undefined,
        value: milestone.cost,
      }))
    : [];
  const gaugeCurrentPoints = dashboardData?.gauge.currentPoints ?? 0;
  const gaugeTargetPoints = dashboardData?.gauge.targetPoints ?? 1;
  const gaugeLabel = dashboardData?.gauge.labelI18nKey ? t(dashboardData.gauge.labelI18nKey) : t('dashboard.dock.milestone');
  const podiumGuilds = mergeGuilds(playerGuild ? [playerGuild] : [], guilds);
  const podiumCards = buildPodiumCards(t, podiumGuilds);
  const openClassPage = (card?: PlayingCardData) => {
    const guildName = card?.guild?.name || (card?.kind === 'guild' && !card.faceDown ? card.title : undefined);
    if (guildName) {
      sessionStorage.setItem('eduquest_class_scroll_target', JSON.stringify({ guildName }));
    }

    window.location.hash = 'class';
  };
  const openProgressPage = () => {
    window.location.hash = 'progress';
  };
  const adminBonusContent = (
    <motion.div
      layout
      transition={layoutTransition}
      className={cn(
        'overflow-visible [perspective:1600px]',
        isProgressPage
          ? 'relative z-0 w-full'
          : 'relative z-40 hidden h-56 w-28 shrink-0 xl:block 2xl:w-32'
      )}
    >
      <PlayingHand
        hand={{
          id: 'admin-progress-active-bonus-hand',
          title: t('progress.activeBonuses'),
          cards: progressBonusCards,
          mainCardIndex: 0,
          variant: 'horizontal',
        }}
        mode={isProgressPage ? 'full' : 'mini'}
        visibleCardCount={progressBonusCards.length}
        expandOnHover={!isProgressPage}
        onCardSelect={isProgressPage ? undefined : openProgressPage}
        stackSide="left"
        className={cn(
          isProgressPage
            ? 'mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]'
            : 'h-full w-full'
        )}
        cardClassName={cn(!isProgressPage && 'w-28 translate-y-0 2xl:w-32')}
        stackCardClassName={cn(!isProgressPage && 'w-24 translate-y-0 2xl:w-28')}
      />
    </motion.div>
  );

  if (user?.isAdmin) {
    const adminPodiumCards = toNonEmptyCards(
      podiumCards.length
        ? podiumCards
        : [
            {
              id: 'admin-empty-podium',
              kind: 'guild',
              title: t('class.podium'),
              subtitle: t('dashboard.rewards.empty.subtitle'),
              accentToken: 'neutral',
              faceDown: true,
            },
          ]
    );
    const adminPodiumContent = (
      <motion.div
        layout
        transition={layoutTransition}
        className={cn(
          'overflow-visible [perspective:1600px]',
          isClassPage
            ? 'relative z-0 w-full'
            : 'relative z-50 h-56 w-28 shrink-0 sm:w-32 lg:h-60 xl:w-32 2xl:w-36'
        )}
      >
        <PlayingHand
          hand={{
            id: 'admin-class-podium-deck',
            cards: adminPodiumCards,
            mainCardIndex: 0,
            variant: usesWideGuildDeck ? 'horizontal' : 'vertical',
          }}
          mode={isClassPage ? 'full' : 'mini'}
          variant={isClassPage || usesWideGuildDeck ? 'horizontal' : 'vertical'}
          stackSide="left"
          visibleCardCount={adminPodiumCards.length}
          expandOnHover={!isClassPage}
          onCardSelect={isClassPage ? undefined : openClassPage}
          className={cn(
            'h-full w-full',
            isClassPage && 'mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]'
          )}
          cardClassName={cn(!isClassPage && 'w-28 translate-y-0 sm:w-32 2xl:w-36')}
          stackCardClassName={cn(!isClassPage && 'w-24 translate-y-0 sm:w-28 2xl:w-32')}
        />
      </motion.div>
    );
    const voteButton = (
      <HoldToConfirmButton
        onConfirm={() => setIsVoteOpen((current) => !current)}
        holdDuration={1200}
        shape="round"
        variant={isVoteOpen ? 'btn-error' : 'btn-primary'}
        className={cn(
          'h-20 w-20 min-h-0 font-display text-xs font-black uppercase tracking-[0.12em] shadow-glow-primary lg:h-24 lg:w-24 lg:text-sm',
          isVoteOpen
            ? 'border-status-danger/40 bg-status-danger text-primary-content'
            : 'border-primary/40 bg-primary text-primary-content'
        )}
      >
        {isVoteOpen ? 'Close vote' : 'Open vote'}
      </HoldToConfirmButton>
    );
    const updateAdminStep = async (nextStep: number) => {
      if (!selectedGameId || isSavingAdminStep) return;

      setIsSavingAdminStep(true);
      try {
        const token = localStorage.getItem('eduquest_token');
        if (!token) throw new Error('Missing session token.');
        const savedStep = await updateCohortStep(token, selectedGameId, nextStep);
        setAdminStep(savedStep);
        window.dispatchEvent(new CustomEvent('eduquest:cohort-step-updated'));
      } catch (error) {
        console.warn('Could not update dashboard cohort step.', error);
      } finally {
        setIsSavingAdminStep(false);
      }
    };

    return (
      <>
        <aside
          aria-label={t('dashboard.dock.ariaLabel')}
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 h-36 overflow-visible border-t border-gaming-border bg-gaming-base/90 shadow-dock backdrop-blur-xl lg:h-40',
            className
          )}
        >
          <div className="absolute inset-x-0 bottom-0 flex h-56 w-full items-end justify-center gap-2 overflow-visible px-2 sm:gap-3 lg:h-60 lg:gap-4 lg:px-3 xl:gap-5 2xl:gap-6">
            {!isProgressPage ? adminBonusContent : null}

            {!isClassPage ? adminPodiumContent : null}

            <GlobalProgressGauge
              currentPoints={gaugeCurrentPoints}
              targetPoints={gaugeTargetPoints}
              milestones={gaugeMilestones}
              label={gaugeLabel}
              centerContent={voteButton}
              boostLabel={isVoteOpen ? 'Close vote' : 'Open vote'}
              className="h-36 w-36 shrink rounded-none border-0 bg-transparent shadow-none sm:h-40 sm:w-40 lg:h-44 lg:w-auto lg:min-w-[20rem] lg:max-w-[42rem] lg:flex-1 xl:min-w-[22rem] 2xl:min-w-[24rem]"
            />

            <StepSelector
              value={adminStep}
              label="Step"
              disabled={!selectedGameId || isSavingAdminStep}
              onChange={updateAdminStep}
              className="h-48 w-20 gap-1.5 sm:w-24 lg:h-52 xl:w-28"
            />
          </div>
        </aside>

        {isClassPage ? (classPodiumTarget ? createPortal(adminPodiumContent, classPodiumTarget) : adminPodiumContent) : null}

        {isProgressPage ? (progressBonusTarget ? createPortal(adminBonusContent, progressBonusTarget) : adminBonusContent) : null}
      </>
    );
  }

  if (!student || !character || !playerGuild) return null;

  const activePlayerGuild =
    podiumGuilds.find((guild) => guild.id === playerGuild.id || guild.name === playerGuild.name) ||
    playerGuild;
  const updateActiveGuildIcon = async (iconKey: string) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token || !activePlayerGuild.id) return;

    try {
      const updatedGuild = await updateGuildIcon(token, activePlayerGuild.id, iconKey);
      setGuilds((current) => upsertGuild(current, updatedGuild));
    } catch (error) {
      console.warn('Could not update guild icon.', error);
    }
  };
  const classRemainingCard: PlayingCardData = {
    id: 'class-remaining-guilds-list',
    layoutId: 'class-remaining-guilds-list',
    kind: 'guild',
    title: t('class.remaining'),
    subtitle: latestMembership?.cohort?.name || t('dashboard.dock.cohortDeck'),
    accentToken: 'neutral',
    ribbonLabel: t('class.guilds'),
    faceDown: true,
  };
  const podiumDeckCards = toNonEmptyCards([...podiumCards, classRemainingCard]);
  const classPodiumHandsBase = podiumCards.map((card) =>
    buildClassGuildHand(t, {
      guild: card.guild || activePlayerGuild,
      guildName: card.title,
    })
  );
  const classPodiumHands = classPodiumHandsBase.map((hand) => ({
    ...hand,
    cards: hand.cards.map((card) =>
      card.kind === 'guild' && card.guild?.name === activePlayerGuild.name
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
  const guildHandBase = buildGuildCardHands(t, {
    guild: activePlayerGuild,
    guildName: activePlayerGuild.name || t('dashboard.dock.playerGuild'),
    playerName,
    playerAvatar,
    characterClass: character.characterClass,
    characterClassLabel: t(`game.classes.${character.characterClass}`),
    characterStats: character.stats,
    activeCardIndex: 0,
  })[0];
  const guildHand = {
    ...guildHandBase,
    cards: guildHandBase.cards.map((card) => {
      if (card.id === 'guild') {
        const editableGuildCard = makeEditableDashboardCard({
          card,
          cardKey: 'guild',
          sideOverrides: editableCardSides,
          onFieldChange: updateEditableCardField,
          onStatChange: updateEditableCardStat,
        });
        const back = isEditablePlayingCardSide(editableGuildCard.back)
          ? {
              ...editableGuildCard.back,
              footer: (
                <GuildIconSelectionPanel
                  value={activePlayerGuild.iconKey || 'Shield'}
                  onChange={updateActiveGuildIcon}
                />
              ),
            }
          : editableGuildCard.back;

        return {
          ...editableGuildCard,
          back,
        };
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
  const boostGuild = async () => {
    const token = localStorage.getItem('eduquest_token');
    if (!token || !activePlayerGuild.id) return;

    try {
      const voteSpend = await spendGuildVotes(token, activePlayerGuild.id, 1);
      setGuilds((current) => {
        const updatedGuild = { ...activePlayerGuild, gold: voteSpend.balance };
        return [updatedGuild, ...current.filter((guild) => guild?.id !== activePlayerGuild.id)];
      });
    } catch (error) {
      console.warn('Could not spend guild vote.', error);
    }
  };
  const boostButton = (
    <HoldToConfirmButton
      onConfirm={boostGuild}
      holdDuration={1200}
      shape="round"
      variant="btn-primary"
      className={cn(
        'h-28 w-28 min-h-0 -translate-y-4 border-primary/40 bg-primary text-primary-content font-display text-lg font-black shadow-glow-primary',
        isProgressPage && 'h-36 w-36 -translate-y-6 text-xl sm:h-40 sm:w-40 sm:text-2xl'
      )}
    >
      {t('dashboard.dock.boost')}
    </HoldToConfirmButton>
  );
  const goldIndicator = (
    <GaugeIndicator
      label={t('dashboard.dock.gold')}
      value={(activePlayerGuild.gold || 0).toLocaleString()}
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
            <PlayingHandPanel
              key={hand.id}
              id={`class-guild-${slugify(hand.title || 'guild')}`}
              hand={hand}
              rank={index + 1}
            />
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
          visibleCardCount={podiumDeckCards.length}
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
      {isGuildPage ? (
        <PlayingHandPanel
          hand={guildHand}
          className="border-0 bg-transparent p-0 shadow-none"
          handClassName="h-[30rem] md:h-[32rem]"
        />
      ) : (
        <PlayingHand
          hand={guildHand}
          mode="mini"
          variant={!usesWideGuildDeck ? 'vertical' : 'horizontal'}
          visibleCardCount={guildHand.cards.length}
          expandOnHover
          onCardSelect={openGuildPage}
          className="h-full w-full"
          cardClassName="w-32 translate-y-0 sm:w-36 xl:w-40"
          stackCardClassName="w-28 translate-y-0 sm:w-32 xl:w-36"
        />
      )}
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
            'absolute inset-x-0 bottom-0 flex h-64 w-full items-end justify-center gap-4 overflow-visible px-3 sm:gap-6 lg:h-72 lg:gap-8 lg:px-4 xl:gap-10 2xl:gap-12',
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
            rightIndicatorCompactValue={(activePlayerGuild.gold || 0).toLocaleString()}
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

function getProgressBonusSeenStorageKey(userId: string | undefined, gameId: string | null) {
  return `${PROGRESS_BONUS_SEEN_STORAGE_PREFIX}:${userId || 'anonymous'}:${gameId || 'default'}`;
}

function readSeenProgressBonusCardIds(storageKey: string) {
  try {
    const rawValue = localStorage.getItem(storageKey);
    if (!rawValue) return new Set<string>();

    const parsedValue = JSON.parse(rawValue);
    return new Set(
      Array.isArray(parsedValue)
        ? parsedValue.filter((value): value is string => typeof value === 'string')
        : []
    );
  } catch {
    return new Set<string>();
  }
}

function writeSeenProgressBonusCardIds(storageKey: string, seenCardIds: ReadonlySet<string>) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...seenCardIds]));
  } catch {
    // Local persistence is best-effort; the ribbon will simply return next session.
  }
}

function withProgressBonusNewRibbonState(
  cards: [PlayingCardData, ...PlayingCardData[]],
  seenCardIds: ReadonlySet<string>,
  markCardSeen: (cardId: string | undefined) => void,
  isProgressPage: boolean
): [PlayingCardData, ...PlayingCardData[]] {
  return cards.map((card) => {
    const shouldShowNewRibbon = Boolean(isProgressPage && card.id && !card.faceDown && !seenCardIds.has(card.id));
    const ribbonText = shouldShowNewRibbon ? card.front?.ribbonText || card.ribbonLabel || card.ribbonText : undefined;

    return {
      ...card,
      ribbonLabel: ribbonText,
      ribbonText,
      front: card.front
        ? {
            ...card.front,
            ribbonText,
          }
        : card.front,
      onPointerEnter: isProgressPage ? () => markCardSeen(card.id) : undefined,
    };
  }) as [PlayingCardData, ...PlayingCardData[]];
}

function mergeGuilds(primaryGuilds: readonly DockGuild[], secondaryGuilds: readonly DockGuild[]) {
  const guildMap = new Map<string, DockGuild>();

  [...primaryGuilds, ...secondaryGuilds].forEach((guild) => {
    if (!guild?.name) return;
    guildMap.set(slugify(guild.name), guild);
  });

  return Array.from(guildMap.values());
}

function upsertGuild(guilds: readonly DockGuild[], guild: DockGuild) {
  return [guild, ...guilds.filter((item) => item.id !== guild.id && slugify(item.name) !== slugify(guild.name))];
}

function GuildIconSelectionPanel({
  value,
  onChange,
}: {
  value: string;
  onChange: (iconKey: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-gaming-border bg-gaming-base/60 p-3">
      <h4 className="font-display text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
        Guild icon
      </h4>
      <Suspense
        fallback={
          <div className="rounded-xl border border-gaming-border bg-gaming-base px-3 py-4 text-sm text-text-muted">
            Loading icon selector...
          </div>
        }
      >
        <LucideIconSelector
          value={value}
          onChange={onChange}
          searchPlaceholder="Search guild icons, e.g. shield, gem, crown..."
        />
      </Suspense>
    </div>
  );
}

function toNonEmptyCards(cards: PlayingCardData[]): [PlayingCardData, ...PlayingCardData[]] {
  if (cards.length === 0) {
    throw new Error('Expected at least one card.');
  }

  return cards as [PlayingCardData, ...PlayingCardData[]];
}

function getHashRoute() {
  return window.location.hash.replace(/^#\/?/, '');
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
  const canEditStats = card.kind !== 'guild';
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
    canEditStats,
  });
  const back = isEditablePlayingCardSide(card.back)
    ? applyEditableSide({
        side: card.back,
        sideKey: backSideKey,
        override: sideOverrides[backSideKey],
        onFieldChange,
        onStatChange,
        canEditStats,
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
  canEditStats,
}: {
  side: PlayingCardSide;
  sideKey: string;
  override?: EditableCardSideOverride;
  onFieldChange: (sideKey: string, field: PlayingCardEditableField, value: string) => void;
  onStatChange: (sideKey: string, statId: string, value: number) => void;
  canEditStats: boolean;
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
      value: canEditStats ? override?.stats?.[stat.id] ?? stat.value : stat.value,
    })),
    editable: true,
    onFieldChange: (field, value) => onFieldChange(sideKey, field, value),
    onStatChange: canEditStats ? (statId, value) => onStatChange(sideKey, statId, value) : undefined,
  };
}

function isEditablePlayingCardSide(value: PlayingCardData['back']): value is PlayingCardSide {
  return Boolean(value && typeof value === 'object' && !('type' in value) && 'title' in value);
}
