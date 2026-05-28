import { useCallback, useEffect, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type {
  CohortProgressData,
  GameBonusVoteState,
  GameMilestonePayload,
  RewardSystemConfig,
} from '@eduquest/shared';
import type { PlayingCardData, PlayingCardEditableField, PlayingCardSide } from '../molecules/PlayingCard';
import { PlayingHand, PlayingHandPanel } from '../molecules/PlayingCard';
import { GlobalProgressGauge } from '../molecules/GlobalProgressGauge/GlobalProgressGauge';
import { HoldToConfirmButton } from '../atoms/HoldToConfirmButton';
import { AddButton } from '../atoms/AddButton';
import { DeleteButton } from '../atoms/DeleteButton';
import { GaugeIndicator } from '../atoms/GaugeIndicator';
import { StepSelector } from '../molecules/StepSelector';
import { useGameStore } from '../../features/game/gameStore';
import {
  boostMilestoneBonusVote,
  createGameMilestone,
  deleteGameMilestone,
  fetchCohortStep,
  fetchGameBonusVoteState,
  fetchGameRewardCards,
  fetchGuilds,
  fetchRewardBalanceConfig,
  updateCohortStep,
  updateGameMilestone,
  updateGuild,
  updateRewardBalanceConfig,
  type GuildFieldsPayload,
  type RewardBalanceConfigState,
} from '../../features/game/api';
import { useCohortProgressData } from '../../features/game/useCohortProgressData';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';
import { formatUserDisplayName } from '../../utils/displayName';
import mascotUrl from '../../assets/mascot.svg';
import { Coins, GripVertical } from 'lucide-react';
import {
  buildClassGuildHand,
  buildGuildCardHands,
  buildPodiumCards,
  buildProgressBonusCards,
  getLatestCohortMembership,
} from './DashboardDock/dashboardDockData';
import type { DockGuild } from './DashboardDock/types';
import { motion, useReducedMotion } from 'framer-motion';
import { useErrorReporter } from '../../features/errors/notifications';
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';

export interface DashboardDockProps {
  className?: string;
}

type EditableCardSideOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};
type ProgressMilestone = CohortProgressData['gauge']['milestones'][number];
type VoteCostConfig = Pick<
  RewardSystemConfig['voting'],
  'baseVoteCost' | 'quadraticExponent' | 'baseVotesPerGuild'
>;

const PROGRESS_BONUS_SEEN_STORAGE_PREFIX = 'eduquest_progress_seen_bonus_cards';
const DEFAULT_VOTE_COST_CONFIG: VoteCostConfig = {
  baseVoteCost: 1,
  quadraticExponent: 2,
  baseVotesPerGuild: 1,
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
  const [guilds, setGuilds] = useState<DockGuild[]>([]);
  const [rewardCards, setRewardCards] = useState<PlayingCardData[]>([]);
  const [bonusVoteState, setBonusVoteState] = useState<GameBonusVoteState | null>(null);
  const [activeRewardCardIds, setActiveRewardCardIds] = useState<Set<string>>(() => new Set());
  const [adminStep, setAdminStep] = useState(0);
  const [isSavingAdminStep, setIsSavingAdminStep] = useState(false);
  const [savingMilestoneId, setSavingMilestoneId] = useState<string | null>(null);
  const [draggedMilestoneId, setDraggedMilestoneId] = useState<string | null>(null);
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [rewardBalanceConfig, setRewardBalanceConfig] = useState<RewardBalanceConfigState | null>(null);
  const [isSavingVoteCost, setIsSavingVoteCost] = useState(false);
  const [seenProgressBonusCardIds, setSeenProgressBonusCardIds] = useState<Set<string>>(() => new Set());
  const { user, student, character, selectedGameId } = useGameStore();
  const { t, tMaybe } = useTranslation();
  const reportError = useErrorReporter();
  const showDockError = useCallback((messageKey: string, error: unknown) => {
    reportError(error, { messageKey, id: messageKey });
  }, [reportError]);
  const handleProgressError = useCallback(
    (error: unknown) => showDockError('dashboard.dock.errors.loadProgress', error),
    [showDockError]
  );
  const dashboardData = useCohortProgressData(
    Boolean(user?.isAdmin || character),
    selectedGameId,
    handleProgressError
  );
  const latestMembership =
    (selectedGameId &&
      student?.cohortMemberships?.find((membership) => membership.cohortId === selectedGameId)) ||
    getLatestCohortMembership(student?.cohortMemberships);
  const playerGuild = latestMembership?.guild;
  const playerName = user ? formatUserDisplayName(user) : t('dashboard.dock.player');
  const playerAvatar = user?.avatarUrl || user?.githubAvatarUrl || mascotUrl;
  const isGuildPage = route === 'guild';
  const isClassPage = route === 'class';
  const isProgressPage = route === 'bonus';
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

      if (!sideKey.startsWith('guild:') || !playerGuild?.id) return;

      const payload = getGuildFieldPayload(field, value);
      if (!payload) return;

      const token = localStorage.getItem('eduquest_token');
      if (!token) return;

      updateGuild(token, playerGuild.id, payload)
        .then((updatedGuild) => {
          setGuilds((current) => upsertGuild(current, updatedGuild));
        })
        .catch((error) => {
          console.warn('Could not update guild.', error);
          showDockError('dashboard.dock.errors.updateGuildIcon', error);
        });
    },
    [playerGuild?.id, showDockError]
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
    if (route !== 'bonus') {
      setProgressBonusTarget(null);
      return undefined;
    }

    const updateTarget = () => setProgressBonusTarget(document.getElementById('bonus-hand-target'));
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
        showDockError('dashboard.dock.errors.loadGuilds', error);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token || !selectedGameId) {
      setRewardCards([]);
      setBonusVoteState(null);
      setActiveRewardCardIds(new Set());
      return undefined;
    }

    let isMounted = true;
    const loadRewardCards = () => {
      Promise.all([
        fetchGameRewardCards(token, selectedGameId),
        fetchGameBonusVoteState(token, selectedGameId).catch(() => null),
      ])
        .then(([cards, voteState]) => {
          if (!isMounted) return;
          setRewardCards(
            cards.map((card) => ({
              kind: 'reward' as const,
              id: card.id,
              title: card.title,
              subtitle: card.subtitle,
              description: card.description,
              color: card.color,
              accentToken: card.accentToken as PlayingCardData['accentToken'],
              illustrationUrl: card.illustrationUrl,
              illustration: card.illustrationUrl
                ? undefined
                : renderLucideIcon(card.iconKey || 'Gift', 132, 'drop-shadow-lg'),
            }))
          );
          setBonusVoteState(voteState);
          setActiveRewardCardIds(getActiveRewardCardIds(voteState));
        })
        .catch((error) => {
          console.warn('Could not load dashboard reward cards.', error);
          showDockError('dashboard.dock.errors.loadProgress', error);
        });
    };

    loadRewardCards();
    window.addEventListener('eduquest:reward-cards-updated', loadRewardCards);
    return () => {
      isMounted = false;
      window.removeEventListener('eduquest:reward-cards-updated', loadRewardCards);
    };
  }, [selectedGameId, showDockError]);

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
        showDockError('dashboard.dock.errors.loadStep', error);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.isAdmin, selectedGameId]);

  useEffect(() => {
    if (!user?.isAdmin) {
      setRewardBalanceConfig(null);
      return undefined;
    }

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchRewardBalanceConfig(token, selectedGameId)
      .then((config) => {
        if (isMounted) setRewardBalanceConfig(config);
      })
      .catch((error) => {
        console.warn('Could not load reward balance config.', error);
        showDockError('dashboard.dock.errors.loadProgress', error);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId, user?.isAdmin, showDockError]);

  const activeRewardCards = rewardCards.filter((card) => card.id && activeRewardCardIds.has(card.id));
  const progressBonusCards = activeRewardCards.length
    ? withProgressBonusNewRibbonState(
        buildProgressBonusCards(
          t,
          activeRewardCards as [PlayingCardData, ...PlayingCardData[]],
          'progress-active-bonus'
        ),
        seenProgressBonusCardIds,
        markProgressBonusCardSeen,
        isProgressPage
      )
    : null;
  const notifyMilestonesUpdated = () => {
    window.dispatchEvent(new CustomEvent('eduquest:milestones-updated'));
  };
  const createMilestone = async () => {
    if (!selectedGameId || savingMilestoneId) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    const milestones = dashboardData?.gauge.milestones || [];
    const lastMilestone = milestones[milestones.length - 1];
    const nextCost = Math.max((lastMilestone?.cost || 0) + 100, 100);
    setSavingMilestoneId('new');
    try {
      await createGameMilestone(token, selectedGameId, {
        label: 'New milestone',
        description: '',
        cost: nextCost,
        sortOrder: milestones.length,
      });
      notifyMilestonesUpdated();
    } catch (error) {
      console.warn('Could not create dashboard milestone.', error);
      showDockError('dashboard.dock.errors.loadProgress', error);
    } finally {
      setSavingMilestoneId(null);
    }
  };
  const updateMilestone = async (milestone: ProgressMilestone, patch: Partial<GameMilestonePayload>) => {
    if (!selectedGameId || savingMilestoneId) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setSavingMilestoneId(milestone.id);
    try {
      await updateGameMilestone(token, selectedGameId, milestone.id, toMilestonePayload(milestone, patch));
      notifyMilestonesUpdated();
    } catch (error) {
      console.warn('Could not update dashboard milestone.', error);
      showDockError('dashboard.dock.errors.loadProgress', error);
    } finally {
      setSavingMilestoneId(null);
    }
  };
  const removeMilestone = async (milestone: ProgressMilestone) => {
    if (!selectedGameId || savingMilestoneId) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setSavingMilestoneId(milestone.id);
    try {
      await deleteGameMilestone(token, selectedGameId, milestone.id);
      notifyMilestonesUpdated();
    } catch (error) {
      console.warn('Could not delete dashboard milestone.', error);
      showDockError('dashboard.dock.errors.loadProgress', error);
    } finally {
      setSavingMilestoneId(null);
    }
  };
  const reorderMilestone = async (sourceMilestoneId: string | null, targetMilestoneId: string) => {
    const draggedId = sourceMilestoneId || draggedMilestoneId;
    if (!selectedGameId || savingMilestoneId || !draggedId || draggedId === targetMilestoneId) {
      setDraggedMilestoneId(null);
      return;
    }

    const token = localStorage.getItem('eduquest_token');
    const milestones = sortProgressMilestones(dashboardData?.gauge.milestones || []);
    const draggedIndex = milestones.findIndex((milestone) => milestone.id === draggedId);
    const targetIndex = milestones.findIndex((milestone) => milestone.id === targetMilestoneId);
    if (!token || draggedIndex < 0 || targetIndex < 0) {
      setDraggedMilestoneId(null);
      return;
    }

    const [dragged] = milestones.splice(draggedIndex, 1);
    const insertionIndex = draggedIndex < targetIndex ? targetIndex : targetIndex;
    milestones.splice(insertionIndex, 0, dragged);
    const updates = milestones
      .map((milestone, sortOrder) => ({ milestone, sortOrder }))
      .filter(({ milestone, sortOrder }) => milestone.sortOrder !== sortOrder);

    if (updates.length === 0) {
      setDraggedMilestoneId(null);
      return;
    }

    setSavingMilestoneId('reorder');
    try {
      await Promise.all(
        updates.map(({ milestone, sortOrder }) =>
          updateGameMilestone(token, selectedGameId, milestone.id, toMilestonePayload(milestone, { sortOrder }))
        )
      );
      notifyMilestonesUpdated();
    } catch (error) {
      console.warn('Could not reorder dashboard milestones.', error);
      showDockError('dashboard.dock.errors.loadProgress', error);
    } finally {
      setDraggedMilestoneId(null);
      setSavingMilestoneId(null);
    }
  };
  const gaugeMilestones = dashboardData?.gauge.milestones.length
    ? dashboardData.gauge.milestones.map((milestone) => ({
        id: milestone.id,
        label: user?.isAdmin ? milestone.labelI18nKey : tMaybe(milestone.labelI18nKey),
        description: user?.isAdmin
          ? milestone.descriptionI18nKey || undefined
          : milestone.descriptionI18nKey
            ? tMaybe(milestone.descriptionI18nKey)
            : undefined,
        value: milestone.cost,
        editor: user?.isAdmin ? (
          <InlineMilestoneEditor
            milestone={milestone}
            disabled={Boolean(savingMilestoneId)}
            isSaving={savingMilestoneId === milestone.id}
            isDragging={draggedMilestoneId === milestone.id}
            onDragStart={() => setDraggedMilestoneId(milestone.id)}
            onDragEnd={() => setDraggedMilestoneId(null)}
            onDrop={(sourceMilestoneId) => reorderMilestone(sourceMilestoneId, milestone.id)}
            onUpdate={(patch) => updateMilestone(milestone, patch)}
            onDelete={() => removeMilestone(milestone)}
          />
        ) : undefined,
      }))
    : [];
  const gaugeCurrentPoints = dashboardData?.gauge.currentPoints ?? 0;
  const gaugeTargetPoints = dashboardData?.gauge.targetPoints ?? 1;
  const gaugeLabel = dashboardData?.gauge.labelI18nKey ? t(dashboardData.gauge.labelI18nKey) : t('dashboard.dock.milestone');
  const podiumGuilds = mergeGuilds(playerGuild ? [playerGuild] : [], guilds);
  const podiumCards = buildPodiumCards(t, podiumGuilds);
  const podiumSentinelCard: PlayingCardData = {
    id: 'class-remaining-guilds-list',
    layoutId: 'class-remaining-guilds-list',
    kind: 'guild',
    title: t('class.remaining'),
    subtitle: latestMembership?.cohort?.name || t('dashboard.dock.cohortDeck'),
    accentToken: 'neutral',
    ribbonLabel: t('class.guilds'),
    faceDown: true,
  };
  const podiumDeckCards = buildPodiumDeckCards(podiumCards, podiumGuilds.length, podiumSentinelCard);
  const podiumSentinelCards = podiumDeckCards.length > podiumCards.length
    ? toNonEmptyCards([podiumDeckCards[podiumCards.length]])
    : null;
  const openClassPage = (card?: PlayingCardData) => {
    const guildName = card?.guild?.name || (card?.kind === 'guild' && !card.faceDown ? card.title : undefined);
    if (guildName) {
      sessionStorage.setItem('eduquest_class_scroll_target', JSON.stringify({ guildName }));
    }

    window.location.hash = 'class';
  };
  const openProgressPage = () => {
    window.location.hash = 'bonus';
  };
  const adminBonusContent = progressBonusCards ? (
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
          title: t('bonus.activeBonuses'),
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
  ) : null;

  if (user?.isAdmin) {
    const adminPodiumCards = podiumDeckCards;
    const adminPodiumHands = podiumCards.map((card) =>
      buildClassGuildHand(t, {
        guild: card.guild || {
          id: card.id || 'guild',
          name: card.title || t('dashboard.dock.playerGuild'),
          gold: 0,
          boostPointsSpent: 0,
        },
        guildName: card.title,
      })
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
        {isClassPage && adminPodiumHands.length > 0 ? (
          <div className="space-y-5">
            {adminPodiumHands.map((hand, index) => (
              <PlayingHandPanel
                key={hand.id}
                id={`class-guild-${slugify(hand.title || 'guild')}`}
                hand={hand}
                rank={index + 1}
              />
            ))}
            {podiumSentinelCards ? (
              <PlayingHand
                hand={{
                  id: 'admin-class-podium-sentinel-deck',
                  cards: podiumSentinelCards,
                  mainCardIndex: 0,
                  variant: 'horizontal',
                }}
                mode="mini"
                variant="horizontal"
                visibleCardCount={1}
                expandOnHover={false}
                className="mx-auto h-64 w-32 sm:w-36"
                cardClassName="w-28 translate-y-0 sm:w-32 2xl:w-36"
              />
            ) : null}
          </div>
        ) : (
          <PlayingHand
            hand={{
              id: 'admin-class-podium-deck',
              cards: adminPodiumCards,
              mainCardIndex: 0,
              variant: usesWideGuildDeck ? 'horizontal' : 'vertical',
            }}
            mode="mini"
            variant={usesWideGuildDeck ? 'horizontal' : 'vertical'}
            stackSide="left"
            visibleCardCount={adminPodiumCards.length}
            expandOnHover
            onCardSelect={openClassPage}
            className={cn(isClassPage ? 'mx-auto h-64 w-32 sm:w-36' : 'h-full w-full')}
            cardClassName="w-28 translate-y-0 sm:w-32 2xl:w-36"
            stackCardClassName="w-24 translate-y-0 sm:w-28 2xl:w-32"
          />
        )}
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
    const voteCostConfig = rewardBalanceConfig?.rewardSystem.voting
      ? {
          baseVoteCost: rewardBalanceConfig.rewardSystem.voting.baseVoteCost,
          quadraticExponent: rewardBalanceConfig.rewardSystem.voting.quadraticExponent,
          baseVotesPerGuild: rewardBalanceConfig.rewardSystem.voting.baseVotesPerGuild,
        }
      : DEFAULT_VOTE_COST_CONFIG;
    const updateVoteCostConfig = async (patch: Partial<VoteCostConfig>) => {
      if (!rewardBalanceConfig || isSavingVoteCost) return;

      const nextVoting = {
        ...rewardBalanceConfig.rewardSystem.voting,
        ...patch,
      };
      setIsSavingVoteCost(true);
      try {
        const token = localStorage.getItem('eduquest_token');
        if (!token) throw new Error('Missing session token.');
        const nextConfig = await updateRewardBalanceConfig(
          token,
          {
            label: `Vote cost update ${new Date().toISOString()}`,
            rewardSystem: {
              ...rewardBalanceConfig.rewardSystem,
              voting: nextVoting,
            },
          },
          selectedGameId
        );
        setRewardBalanceConfig(nextConfig);
        window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
      } catch (error) {
        console.warn('Could not update vote cost config.', error);
        showDockError('dashboard.dock.errors.loadProgress', error);
      } finally {
        setIsSavingVoteCost(false);
      }
    };
    const voteControls = (
      <div className="grid grid-cols-[2.5rem_auto_2.5rem] items-center gap-2">
        <span aria-hidden className="h-10 w-10" />
        <div className="flex justify-center">
          {voteButton}
        </div>
        <AddButton
          onClick={createMilestone}
          disabled={!selectedGameId || Boolean(savingMilestoneId)}
          aria-label="Ajouter un milestone"
          title="Ajouter un milestone"
          iconSize={20}
          className="h-10 w-10 shadow-glow-primary hover:scale-105 disabled:cursor-wait"
        />
      </div>
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
        showDockError('dashboard.dock.errors.updateStep', error);
      } finally {
        setIsSavingAdminStep(false);
      }
    };
    const adminGaugeContent = (gaugeClassName?: string) => (
      <GlobalProgressGauge
        currentPoints={gaugeCurrentPoints}
        targetPoints={gaugeTargetPoints}
        milestones={gaugeMilestones}
        label={gaugeLabel}
        centerContent={voteControls}
        boostLabel={isVoteOpen ? 'Close vote' : 'Open vote'}
        milestoneBadgesExpanded={isProgressPage}
        className={cn(
          'rounded-none border-0 bg-transparent shadow-none',
          gaugeClassName
        )}
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
          <div className="absolute inset-x-0 bottom-0 flex h-56 w-full items-end justify-center gap-2 overflow-visible px-2 sm:gap-3 lg:h-60 lg:gap-4 lg:px-3 xl:gap-5 2xl:gap-6">
            {!isProgressPage ? adminBonusContent : null}

            {!isClassPage ? adminPodiumContent : null}

            {adminGaugeContent('h-36 w-36 shrink sm:h-40 sm:w-40 lg:h-44 lg:w-auto lg:min-w-[20rem] lg:max-w-[42rem] lg:flex-1 xl:min-w-[22rem] 2xl:min-w-[24rem]')}

            <div className="flex items-end gap-2 sm:gap-3">
              <VoteCostEditor
                value={voteCostConfig}
                disabled={!rewardBalanceConfig || isSavingVoteCost}
                isSaving={isSavingVoteCost}
                onUpdate={updateVoteCostConfig}
              />
              <StepSelector
                value={adminStep}
                label={t('dashboard.dock.step')}
                disabled={!selectedGameId || isSavingAdminStep}
                onChange={updateAdminStep}
                className="h-48 w-20 gap-1.5 sm:w-24 lg:h-52 xl:w-28"
              />
            </div>
          </div>
        </aside>

        {isClassPage ? (classPodiumTarget ? createPortal(adminPodiumContent, classPodiumTarget) : adminPodiumContent) : null}

      </>
    );
  }

  if (!student || !character) return null;

  const hasPlayerGuild = Boolean(playerGuild?.id);
  const activePlayerGuild =
    (playerGuild
      ? guilds.find((guild) => guild.id === playerGuild.id || guild.name === playerGuild.name) ||
        podiumGuilds.find((guild) => guild.id === playerGuild.id || guild.name === playerGuild.name) ||
        playerGuild
      : undefined) || {
        id: '',
        name: t('dashboard.dock.noGuildTitle'),
        description: t('dashboard.dock.noGuildDescription'),
        gold: 0,
        boostPointsSpent: 0,
      };
  const classPodiumHands = podiumCards.map((card) => {
    const hand = buildClassGuildHand(t, {
      guild: card.guild || activePlayerGuild,
      guildName: card.title,
    });

    return {
      ...hand,
      cards: hand.cards.map((handCard) =>
        handCard.kind === 'guild' && handCard.guild?.name === activePlayerGuild.name
          ? makeEditableDashboardCard({
              card: handCard,
              cardKey: 'guild',
              sideOverrides: editableCardSides,
              onFieldChange: updateEditableCardField,
              onStatChange: updateEditableCardStat,
            })
          : handCard
      ) as [PlayingCardData, ...PlayingCardData[]],
    };
  });
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
  const visibleGuildHandCards = hasPlayerGuild
    ? guildHandBase.cards
    : toNonEmptyCards(guildHandBase.cards.filter((card) => card.id !== 'guild'));
  const guildHand = {
    ...guildHandBase,
    cards: visibleGuildHandCards.map((card) => {
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
  const boostGuild = async () => {
    const token = localStorage.getItem('eduquest_token');
    if (!token || !selectedGameId || !activePlayerGuild.id) return;

    try {
      const latestVoteState = bonusVoteState || await fetchGameBonusVoteState(token, selectedGameId);
      const boostableVoteState = getBoostableGuildVoteState(latestVoteState);
      if (!boostableVoteState) {
        throw new Error('No closed guild vote is available to boost.');
      }

      const boosted = await boostMilestoneBonusVote(token, selectedGameId, boostableVoteState.milestone.id, 1);
      const nextVoteState = await fetchGameBonusVoteState(token, selectedGameId);
      setBonusVoteState(nextVoteState);
      setActiveRewardCardIds(getActiveRewardCardIds(nextVoteState));
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));

      const voteSpend = boosted.voteSpend;
      setGuilds((current) => {
        const updatedGuild = {
          ...activePlayerGuild,
          gold: voteSpend?.balance ?? activePlayerGuild.gold,
          boostPointsSpent: (activePlayerGuild.boostPointsSpent || 0) + (voteSpend?.cost || 0),
        };
        return [updatedGuild, ...current.filter((guild) => guild?.id !== activePlayerGuild.id)];
      });
    } catch (error) {
      console.warn('Could not spend guild vote.', error);
      showDockError('dashboard.dock.errors.spendVote', error);
    }
  };
  const boostButton = (
    <HoldToConfirmButton
      onConfirm={boostGuild}
      holdDuration={1200}
      shape="round"
      variant="btn-primary"
      disabled={!selectedGameId || !hasPlayerGuild}
      className={cn(
        'h-28 w-28 min-h-0 -translate-y-4 border-primary/40 bg-primary text-primary-content font-display text-lg font-black shadow-glow-primary',
        !hasPlayerGuild && 'cursor-not-allowed opacity-50',
        isProgressPage && 'h-36 w-36 -translate-y-6 text-xl sm:h-40 sm:w-40 sm:text-2xl'
      )}
    >
      {hasPlayerGuild ? t('dashboard.dock.boost') : t('dashboard.dock.noGuildBoost')}
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
          {classPodiumHands.length > 0 ? (
            classPodiumHands.map((hand, index) => (
              <PlayingHandPanel
                key={hand.id}
                id={`class-guild-${slugify(hand.title || 'guild')}`}
                hand={hand}
                rank={index + 1}
              />
            ))
          ) : (
            podiumSentinelCards ? (
              <PlayingHand
                hand={{
                  id: 'class-podium-sentinel-deck',
                  cards: podiumSentinelCards,
                  mainCardIndex: 0,
                  variant: 'horizontal',
                }}
                mode="mini"
                variant="horizontal"
                visibleCardCount={1}
                expandOnHover={false}
                className="mx-auto h-64 w-32 sm:w-36"
                cardClassName="w-32 translate-y-0 sm:w-36"
              />
            ) : null
          )}
          {classPodiumHands.length > 0 && podiumSentinelCards ? (
            <PlayingHand
              hand={{
                id: 'class-podium-sentinel-deck',
                cards: podiumSentinelCards,
                mainCardIndex: 0,
                variant: 'horizontal',
              }}
              mode="mini"
              variant="horizontal"
              visibleCardCount={1}
              expandOnHover={false}
              className="mx-auto h-64 w-32 sm:w-36"
              cardClassName="w-32 translate-y-0 sm:w-36"
            />
          ) : null}
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
          onCardSelect={hasPlayerGuild ? openGuildPage : openCharacterPage}
          className="h-full w-full"
          cardClassName="w-32 translate-y-0 sm:w-36 xl:w-40"
          stackCardClassName="w-28 translate-y-0 sm:w-32 xl:w-36"
        />
      )}
    </motion.div>
  );
  const bonusContent = progressBonusCards ? (
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
          title: t('bonus.activeBonuses'),
          cards: progressBonusCards,
          mainCardIndex: 0,
          variant: 'horizontal',
        }}
        mode={isProgressPage ? 'full' : 'mini'}
        visibleCardCount={progressBonusCards.length}
        expandOnHover={!isProgressPage}
        onCardSelect={isProgressPage ? undefined : () => {
          window.location.hash = 'bonus';
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
  ) : null;

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

          {hasPlayerGuild ? (
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
          ) : null}

          {!isGuildPage ? guildContent : null}
        </div>
      </aside>

      {isClassPage ? (classPodiumTarget ? createPortal(podiumContent, classPodiumTarget) : podiumContent) : null}

      {isGuildPage ? (guildHandTarget ? createPortal(guildContent, guildHandTarget) : guildContent) : null}

      {isProgressPage && !user?.isAdmin && progressBonusTarget
        ? createPortal(bonusContent, progressBonusTarget)
        : null}
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
    const shouldMarkSeen = Boolean(isProgressPage && card.id && !card.faceDown && !seenCardIds.has(card.id));
    const ribbonText = card.front?.ribbonText || card.ribbonLabel || card.ribbonText;

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
      onPointerEnter: shouldMarkSeen ? () => markCardSeen(card.id) : undefined,
    };
  }) as [PlayingCardData, ...PlayingCardData[]];
}

function mergeGuilds(primaryGuilds: readonly DockGuild[], secondaryGuilds: readonly DockGuild[]) {
  const guildMap = new Map<string, DockGuild>();

  [...primaryGuilds, ...secondaryGuilds].forEach((guild) => {
    if (!guild?.name) return;
    guildMap.set(guild.id || slugify(guild.name), guild);
  });

  return Array.from(guildMap.values());
}

function upsertGuild(guilds: readonly DockGuild[], guild: DockGuild) {
  const previousGuild = guilds.find((item) => item.id === guild.id || slugify(item.name) === slugify(guild.name));
  const nextGuild = previousGuild
    ? {
        ...previousGuild,
        ...guild,
        members: guild.members ?? previousGuild.members,
        boostPointsSpent: guild.boostPointsSpent ?? previousGuild.boostPointsSpent,
      }
    : guild;

  return [
    nextGuild,
    ...guilds.filter((item) => item.id !== nextGuild.id && slugify(item.name) !== slugify(nextGuild.name)),
  ];
}

function getGuildFieldPayload(field: PlayingCardEditableField, value: string): GuildFieldsPayload | null {
  if (field === 'title') return { name: value };
  if (field === 'description') return { description: value };
  if (field === 'ribbonIcon') return { iconKey: value };
  return null;
}

function getActiveRewardCardIds(voteState: GameBonusVoteState | null) {
  if (!voteState) return new Set<string>();

  return new Set(
    voteState.voteStates.flatMap((state) =>
      state.isVoteClosed && !state.hasTie ? state.leadingBonusCardIds : []
    )
  );
}

function getBoostableGuildVoteState(voteState: GameBonusVoteState | null) {
  return voteState?.voteStates.find((state) => state.isVoteClosed && state.guildVote);
}

function buildPodiumDeckCards(
  podiumCards: PlayingCardData[],
  guildCount: number,
  sentinelCard: PlayingCardData
) {
  const topPodiumCards = podiumCards.slice(0, 3);
  const shouldShowSentinel =
    topPodiumCards.length < 3 || (topPodiumCards.length === 3 && guildCount > topPodiumCards.length);

  return toNonEmptyCards(shouldShowSentinel ? [...topPodiumCards, sentinelCard] : topPodiumCards);
}

function toNonEmptyCards(cards: PlayingCardData[]): [PlayingCardData, ...PlayingCardData[]] {
  if (cards.length === 0) {
    throw new Error('Expected at least one card.');
  }

  return cards as [PlayingCardData, ...PlayingCardData[]];
}

function getHashRoute() {
  const route = window.location.hash.replace(/^#\/?/, '');
  return route === 'progress' ? 'bonus' : route;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function VoteCostEditor({
  value,
  disabled,
  isSaving,
  onUpdate,
}: {
  value: VoteCostConfig;
  disabled: boolean;
  isSaving: boolean;
  onUpdate: (patch: Partial<VoteCostConfig>) => void;
}) {
  const [draft, setDraft] = useState({
    baseVoteCost: String(value.baseVoteCost),
    quadraticExponent: String(value.quadraticExponent),
    baseVotesPerGuild: String(value.baseVotesPerGuild),
  });

  useEffect(() => {
    setDraft({
      baseVoteCost: String(value.baseVoteCost),
      quadraticExponent: String(value.quadraticExponent),
      baseVotesPerGuild: String(value.baseVotesPerGuild),
    });
  }, [value.baseVoteCost, value.baseVotesPerGuild, value.quadraticExponent]);

  const commitNumber = (field: keyof VoteCostConfig, options: { min: number; integer?: boolean }) => {
    const rawValue = Number(draft[field] || 0);
    if (!Number.isFinite(rawValue)) {
      setDraft((current) => ({ ...current, [field]: String(value[field]) }));
      return;
    }

    const nextValue = Math.max(options.min, options.integer ? Math.round(rawValue) : rawValue);
    setDraft((current) => ({ ...current, [field]: String(nextValue) }));
    if (nextValue !== value[field]) {
      onUpdate({ [field]: nextValue });
    }
  };

  const handleEnterBlur = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };

  return (
    <div className="hidden w-36 rounded-xl border border-gaming-border bg-gaming-card/95 p-1.5 text-left shadow-xl backdrop-blur-md sm:block">
      <p className="mb-1 px-1 font-display text-[0.58rem] font-black uppercase tracking-[0.14em] text-text-muted">
        Vote cost
      </p>
      <div className="grid gap-1">
        <label className="flex items-center gap-1 rounded-lg border border-gaming-border bg-gaming-base/80 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.08em] text-text-secondary">
          <span className="w-11 truncate">Base</span>
          <input
            type="number"
            min={0}
            step={1}
            value={draft.baseVoteCost}
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setDraft((current) => ({ ...current, baseVoteCost: nextValue }));
            }}
            onBlur={() => commitNumber('baseVoteCost', { min: 0, integer: true })}
            onKeyDown={handleEnterBlur}
            title="Base vote cost"
            className="w-full min-w-0 bg-transparent text-right text-[0.68rem] text-text-primary outline-none"
          />
        </label>
        <label className="flex items-center gap-1 rounded-lg border border-gaming-border bg-gaming-base/80 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.08em] text-text-secondary">
          <span className="w-11 truncate">Power</span>
          <input
            type="number"
            min={1}
            step={0.1}
            value={draft.quadraticExponent}
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setDraft((current) => ({ ...current, quadraticExponent: nextValue }));
            }}
            onBlur={() => commitNumber('quadraticExponent', { min: 1 })}
            onKeyDown={handleEnterBlur}
            title="Quadratic exponent"
            className="w-full min-w-0 bg-transparent text-right text-[0.68rem] text-text-primary outline-none"
          />
        </label>
        <label className="flex items-center gap-1 rounded-lg border border-gaming-border bg-gaming-base/80 px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.08em] text-text-secondary">
          <span className="w-11 truncate">Free</span>
          <input
            type="number"
            min={1}
            step={1}
            value={draft.baseVotesPerGuild}
            disabled={disabled}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              setDraft((current) => ({ ...current, baseVotesPerGuild: nextValue }));
            }}
            onBlur={() => commitNumber('baseVotesPerGuild', { min: 1, integer: true })}
            onKeyDown={handleEnterBlur}
            title="Free base votes per guild"
            className="w-full min-w-0 bg-transparent text-right text-[0.68rem] text-text-primary outline-none"
          />
        </label>
      </div>
      {isSaving ? (
        <p className="mt-0.5 px-1 text-[0.55rem] font-semibold text-status-quest">Saving...</p>
      ) : null}
    </div>
  );
}

function InlineMilestoneEditor({
  milestone,
  disabled,
  isSaving,
  isDragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onUpdate,
  onDelete,
}: {
  milestone: ProgressMilestone;
  disabled: boolean;
  isSaving: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: (sourceMilestoneId: string | null) => void;
  onUpdate: (patch: Partial<GameMilestonePayload>) => void;
  onDelete: () => void;
}) {
  const [labelDraft, setLabelDraft] = useState(milestone.labelI18nKey);
  const [descriptionDraft, setDescriptionDraft] = useState(milestone.descriptionI18nKey || '');
  const [costDraft, setCostDraft] = useState(String(milestone.cost));

  useEffect(() => {
    setLabelDraft(milestone.labelI18nKey);
    setDescriptionDraft(milestone.descriptionI18nKey || '');
    setCostDraft(String(milestone.cost));
  }, [milestone.cost, milestone.descriptionI18nKey, milestone.labelI18nKey]);

  const commitText = (field: 'label' | 'description') => {
    const nextLabel = labelDraft.trim();
    const nextDescription = descriptionDraft.trim();
    if (field === 'label' && nextLabel && nextLabel !== milestone.labelI18nKey) {
      onUpdate({ label: nextLabel });
    }
    if (field === 'description' && nextDescription !== (milestone.descriptionI18nKey || '')) {
      onUpdate({ description: nextDescription });
    }
  };
  const commitCost = () => {
    const nextCost = Math.max(0, Number(costDraft || 0));
    setCostDraft(String(nextCost));
    if (Number.isFinite(nextCost) && nextCost !== milestone.cost) {
      onUpdate({ cost: nextCost });
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        const sourceMilestoneId = event.dataTransfer.getData('application/x-eduquest-milestone-id') ||
          event.dataTransfer.getData('text/plain') ||
          null;
        onDrop(sourceMilestoneId);
      }}
      className={cn(
        'group/editor min-w-36 max-w-52 rounded-2xl border border-gaming-border/80 bg-gaming-card/95 p-2 text-left shadow-xl backdrop-blur-md transition',
        isDragging && 'scale-95 border-status-quest opacity-70'
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          draggable={!disabled}
          onDragStart={(event: DragEvent<HTMLButtonElement>) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('application/x-eduquest-milestone-id', milestone.id);
            event.dataTransfer.setData('text/plain', milestone.id);
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          disabled={disabled}
          aria-label={`Déplacer ${milestone.labelI18nKey}`}
          title="Déplacer le milestone"
          className="mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-lg border border-gaming-border bg-gaming-base/80 text-text-muted transition hover:border-status-quest hover:text-status-quest active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        >
          <GripVertical size={15} aria-hidden />
        </button>
        <div className="min-w-0 flex-1 space-y-1">
          <input
            type="text"
            value={labelDraft}
            disabled={disabled}
            aria-label="Nom du milestone"
            onChange={(event) => setLabelDraft(event.currentTarget.value)}
            onBlur={() => commitText('label')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="w-full rounded-lg bg-transparent px-1 font-display text-xs font-black text-text-primary outline-none focus:bg-gaming-base focus:ring-2 focus:ring-status-quest"
          />
          <input
            type="text"
            value={descriptionDraft}
            disabled={disabled}
            aria-label="Description du milestone"
            placeholder="Description..."
            onChange={(event) => setDescriptionDraft(event.currentTarget.value)}
            onBlur={() => commitText('description')}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="w-full rounded-lg bg-transparent px-1 text-[0.65rem] font-semibold text-text-muted outline-none focus:bg-gaming-base focus:ring-2 focus:ring-status-quest"
          />
          <label className="flex items-center gap-1 rounded-full border border-gaming-border bg-gaming-base/80 px-2 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-text-secondary">
            Seuil
            <input
              type="number"
              min={0}
              value={costDraft}
              disabled={disabled}
              onChange={(event) => setCostDraft(event.currentTarget.value)}
              onBlur={commitCost}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
              }}
              className="w-14 bg-transparent text-right text-text-primary outline-none"
            />
          </label>
        </div>
        <DeleteButton
          onConfirm={onDelete}
          holdDuration={1000}
          disabled={disabled}
          aria-label={`Supprimer ${milestone.labelI18nKey}`}
          className="h-7 w-7 shadow-card hover:scale-105 disabled:cursor-wait"
        />
      </div>
      {isSaving ? (
        <p className="mt-1 px-1 text-[0.62rem] font-semibold text-status-quest">Sauvegarde...</p>
      ) : null}
    </div>
  );
}

function toMilestonePayload(
  milestone: ProgressMilestone,
  patch: Partial<GameMilestonePayload>
): GameMilestonePayload {
  return {
    label: patch.label ?? milestone.labelI18nKey,
    description: patch.description ?? milestone.descriptionI18nKey ?? undefined,
    cost: patch.cost ?? milestone.cost,
    sortOrder: patch.sortOrder ?? milestone.sortOrder,
  };
}

function sortProgressMilestones(milestones: ProgressMilestone[]) {
  return [...milestones].sort(
    (first, second) => (first.sortOrder || 0) - (second.sortOrder || 0) || first.cost - second.cost
  );
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

