import { Gift } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameBonusVoteState, GameRewardCard } from '@eduquest/shared';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardProps } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { HoldToConfirmButton } from '../../components/atoms/HoldToConfirmButton';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameStore } from '../../features/game/gameStore';
import { GameRewardCardManager } from '../../components/organisms/GameRewardCardManager';
import { buildPodiumCards } from '../../components/organisms/DashboardDock/dashboardDockData';
import {
  boostMilestoneBonusVote,
  fetchGameBonusVoteState,
  fetchGuilds,
  type ClassRosterGuild,
} from '../../features/game/api';

const BONUS_VOTE_SELECTION_STORAGE_KEY = 'eduquest_bonus_vote_selection';
const BONUS_VOTE_SELECTION_PROMPT_STORAGE_KEY = 'eduquest_bonus_vote_selection_prompt';

export function ProgressPage() {
  const { t } = useTranslation();
  const { user, selectedGameId } = useGameStore();
  const [voteState, setVoteState] = useState<GameBonusVoteState | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedBonusCardId, setSelectedBonusCardId] = useState<string | null>(null);
  const [showSelectCardPrompt, setShowSelectCardPrompt] = useState(false);
  const [guilds, setGuilds] = useState<ClassRosterGuild[]>([]);
  const [isVoting, setIsVoting] = useState(false);

  const loadVoteState = () => {
    if (!selectedGameId) return undefined;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchGameBonusVoteState(token, selectedGameId)
      .then((state) => {
        if (!isMounted) return;
        setVoteState(state);
        setSelectedMilestoneId((current) => current || state.selectedMilestoneId || state.milestones[0]?.id || null);
      })
      .catch((error) => {
        console.warn('Could not load bonus vote state.', error);
      });

    return () => {
      isMounted = false;
    };
  };

  useEffect(() => loadVoteState(), [selectedGameId, user?.isAdmin]);

  useEffect(() => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    const loadGuilds = () => {
      fetchGuilds(token, selectedGameId)
        .then((nextGuilds) => {
          if (isMounted) setGuilds(nextGuilds);
        })
        .catch((error) => {
          console.warn('Could not load reward page guild podium.', error);
        });
    };

    loadGuilds();
    window.addEventListener('eduquest:guilds-updated', loadGuilds);
    return () => {
      isMounted = false;
      window.removeEventListener('eduquest:guilds-updated', loadGuilds);
    };
  }, [selectedGameId]);

  useEffect(() => {
    if (!selectedGameId) return undefined;

    const refreshVoteState = () => {
      const token = localStorage.getItem('eduquest_token');
      if (!token) return;
      fetchGameBonusVoteState(token, selectedGameId)
        .then(setVoteState)
        .catch((error) => {
          console.warn('Could not refresh bonus vote state.', error);
        });
    };

    window.addEventListener('eduquest:reward-cards-updated', refreshVoteState);
    return () => {
      window.removeEventListener('eduquest:reward-cards-updated', refreshVoteState);
    };
  }, [selectedGameId]);

  const selectedVoteState = voteState?.voteStates.find(
    (state) => state.milestone.id === selectedMilestoneId
  ) || voteState?.voteStates[0];
  useEffect(() => {
    setSelectedBonusCardId(selectedVoteState?.guildVote?.bonusCardId ?? null);
  }, [selectedVoteState?.guildVote?.bonusCardId, selectedVoteState?.milestone.id]);

  useEffect(() => {
    if (!selectedGameId || !selectedVoteState?.isVoteOpen) return;

    try {
      const rawValue = localStorage.getItem(BONUS_VOTE_SELECTION_PROMPT_STORAGE_KEY);
      if (!rawValue) return;
      const value = JSON.parse(rawValue) as Partial<{ gameId: string; milestoneId: string }>;
      if (value.gameId !== selectedGameId || value.milestoneId !== selectedVoteState.milestone.id) return;

      setShowSelectCardPrompt(true);
      localStorage.removeItem(BONUS_VOTE_SELECTION_PROMPT_STORAGE_KEY);
    } catch {
      localStorage.removeItem(BONUS_VOTE_SELECTION_PROMPT_STORAGE_KEY);
    }
  }, [selectedGameId, selectedVoteState?.isVoteOpen, selectedVoteState?.milestone.id]);

  const activeRewardCardIds = useMemo(() => getActiveRewardCardIds(voteState), [voteState]);
  const voteCards = useMemo(
    () =>
      buildVoteCards(
        t,
        (voteState?.bonusCards || []).filter((card) => !activeRewardCardIds.has(card.id)),
        selectedVoteState
      ),
    [activeRewardCardIds, selectedVoteState, t, voteState?.bonusCards]
  );
  const tieBreakVoteCards = useMemo(
    () => voteCards.filter((card) => card.id && selectedVoteState?.leadingBonusCardIds.includes(card.id)),
    [selectedVoteState?.leadingBonusCardIds, voteCards]
  );
  const podiumCards = useMemo(() => buildPodiumCards(t, guilds), [guilds, t]);

  useEffect(() => {
    if (!selectedGameId || !selectedVoteState?.isVoteOpen || !selectedBonusCardId) return;

    localStorage.setItem(
      BONUS_VOTE_SELECTION_STORAGE_KEY,
      JSON.stringify({
        gameId: selectedGameId,
        milestoneId: selectedVoteState.milestone.id,
        bonusCardId: selectedBonusCardId,
      })
    );
    window.dispatchEvent(new CustomEvent('eduquest:bonus-vote-selection-updated'));
  }, [selectedBonusCardId, selectedGameId, selectedVoteState?.isVoteOpen, selectedVoteState?.milestone.id]);

  const boostVote = async () => {
    if (!selectedGameId || !selectedVoteState || selectedVoteState.isVoteOpen || isVoting) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsVoting(true);
    try {
      await boostMilestoneBonusVote(token, selectedGameId, selectedVoteState.milestone.id, 1);
      await fetchGameBonusVoteState(token, selectedGameId).then(setVoteState);
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
      window.dispatchEvent(new CustomEvent('eduquest:guilds-updated'));
    } catch (error) {
      console.warn('Could not boost bonus vote.', error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <GameLayout>
      <GameHeader currentView="bonus" />

      <div className="space-y-8">
        <h2 className="sr-only">{t('bonus.title')}</h2>

        <GuildPodium cards={podiumCards} />

        {user?.isAdmin ? (
          <>
            <section aria-labelledby="progress-active-title" className="space-y-4">
              <div className="flex items-center gap-3">
                <Gift className="text-status-campfire" size={22} aria-hidden />
                <h3 id="progress-active-title" className="text-xl font-bold">
                  {t('bonus.activeBonuses')}
                </h3>
              </div>
              <div id="bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
            </section>

            <GameRewardCardManager gameId={selectedGameId} />

            {selectedVoteState?.isVoteOpen && selectedVoteState.hasTie ? (
              <AdminTieBreakPanel
                selectedBonusCardId={selectedBonusCardId}
                voteCards={tieBreakVoteCards}
                onSelectCard={setSelectedBonusCardId}
              />
            ) : null}
          </>
        ) : null}

        {!user?.isAdmin ? <section aria-labelledby="progress-active-title" className="relative z-0 space-y-4 pb-8">
          <div className="flex items-center gap-3">
            <Gift className="text-status-campfire" size={22} aria-hidden />
            <h3 id="progress-active-title" className="text-xl font-bold">
              {t('bonus.activeBonuses')}
            </h3>
          </div>
          <div id="bonus-hand-target" className="relative z-0 min-h-[32rem] overflow-visible" />
        </section> : null}

        {!user?.isAdmin ? (
          <BonusVotePanel
            t={t}
            selectedMilestoneId={selectedMilestoneId}
            voteState={voteState}
            selectedVoteState={selectedVoteState}
            voteCards={voteCards}
            selectedBonusCardId={selectedBonusCardId}
            isVoting={isVoting}
            onSelectMilestone={setSelectedMilestoneId}
            onSelectCard={(bonusCardId) => {
              setSelectedBonusCardId(bonusCardId);
              if (bonusCardId) setShowSelectCardPrompt(false);
            }}
            showSelectCardPrompt={showSelectCardPrompt}
            onBoost={boostVote}
          />
        ) : null}
      </div>
    </GameLayout>
  );
}

export default ProgressPage;

function GuildPodium({ cards }: { cards: PlayingCardProps[] }) {
  if (cards.length === 0) return null;

  const rankedSlots = [
    { card: cards[1], rank: 2, className: 'order-1 translate-y-10 scale-90 sm:translate-y-12' },
    { card: cards[0], rank: 1, className: 'order-2 z-10 translate-y-2 scale-105 sm:translate-y-4' },
    { card: cards[2], rank: 3, className: 'order-3 translate-y-14 scale-[0.85] sm:translate-y-16' },
  ].filter((slot): slot is { card: PlayingCardProps; rank: number; className: string } => Boolean(slot.card));

  return (
    <section aria-labelledby="guild-podium-title" className="space-y-3">
      <h3 id="guild-podium-title" className="sr-only">
        Podium des guildes
      </h3>
      <div className="relative mx-auto h-64 max-w-4xl overflow-hidden rounded-[2rem] border border-gaming-border bg-gaming-base/60 px-3 pt-4 shadow-inner sm:h-72">
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gaming-base via-gaming-base/85 to-transparent" />
        <div className="relative flex h-full items-end justify-center gap-2 sm:gap-5">
          {rankedSlots.map(({ card, rank, className }) => (
            <div
              key={card.id || `guild-podium-${rank}`}
              className={`w-28 shrink-0 transition-transform sm:w-36 md:w-40 ${className}`}
            >
              <PlayingCard
                {...card}
                size="mini"
                presentation={{ width: rank === 1 ? 'dockLarge' : 'dockMedium' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AdminTieBreakPanel({
  selectedBonusCardId,
  voteCards,
  onSelectCard,
}: {
  selectedBonusCardId: string | null;
  voteCards: PlayingCardProps[];
  onSelectCard: (bonusCardId: string | null) => void;
}) {
  return (
    <section aria-labelledby="bonus-tie-break-title" className="space-y-4">
      <div className="rounded-2xl border border-status-warning/50 bg-status-warning/10 px-4 py-3">
        <h3 id="bonus-tie-break-title" className="font-display text-sm font-black uppercase tracking-[0.16em] text-status-warning">
          Égalité à trancher
        </h3>
        <p className="mt-1 text-sm font-semibold text-text-secondary">
          Sélectionnez la carte qui doit devenir active, puis fermez le vote avec le bouton du dashboard.
        </p>
      </div>
      <ResponsiveCardGrid
        items={voteCards}
        getKey={(card, index) => card.id || `tie-break-${index}`}
        renderItem={(card) => {
          const isSelected = selectedBonusCardId === card.id;
          return (
            <button
              type="button"
              onClick={() => card.id && onSelectCard(card.id)}
              disabled={!card.id}
              className={`group relative w-full text-left transition ${
                isSelected ? 'rounded-[1.4rem] ring-4 ring-status-warning ring-offset-4 ring-offset-gaming-base' : ''
              }`}
            >
              <PlayingCard {...card} size="full" presentation={{ fit: 'fillWidth' }} />
            </button>
          );
        }}
      />
    </section>
  );
}

function getRequiredBoostApprovals(memberCount?: number) {
  return Math.max(1, Math.ceil(Math.max(1, memberCount || 1) / 2));
}

function getBoostApprovalState(
  guildVote: GameBonusVoteState['voteStates'][number]['guildVote'],
  memberCount?: number
) {
  const requiredFallback = getRequiredBoostApprovals(memberCount);
  const approval = guildVote?.metadata?.boostApproval;
  const requiredVotes =
    typeof approval?.requiredVotes === 'number' && approval.requiredVotes > 0
      ? approval.requiredVotes
      : requiredFallback;
  const receivedVotes =
    typeof approval?.receivedVotes === 'number' && approval.receivedVotes > 0
      ? approval.receivedVotes
      : 0;
  const currentProgress = Math.min(1, receivedVotes / requiredVotes);
  const hasVoted = approval?.hasVoted === true && approval?.status !== 'complete';

  return {
    hasVoted,
    currentProgress,
    nextProgress: Math.min(1, (receivedVotes + (hasVoted ? 0 : 1)) / requiredVotes),
  };
}

function BonusVotePanel({
  t,
  selectedMilestoneId,
  voteState,
  selectedVoteState,
  voteCards,
  selectedBonusCardId,
  isVoting,
  showSelectCardPrompt,
  onSelectMilestone,
  onSelectCard,
  onBoost,
}: {
  t: (path: string) => string;
  selectedMilestoneId: string | null;
  voteState: GameBonusVoteState | null;
  selectedVoteState?: GameBonusVoteState['voteStates'][number];
  voteCards: PlayingCardProps[];
  selectedBonusCardId: string | null;
  isVoting: boolean;
  showSelectCardPrompt: boolean;
  onSelectMilestone: (milestoneId: string) => void;
  onSelectCard: (bonusCardId: string | null) => void;
  onBoost: () => void;
}) {
  const guildVote = selectedVoteState?.guildVote;
  const boostCost = voteState?.boostCostPreview?.finalCost ?? 0;
  const guildVoteBalance = voteState?.guildVoteBalance ?? 0;
  const baseVotesAvailable = guildVote ? 0 : Math.max(1, voteState?.baseVotesPerGuild ?? 1);
  const availableVotes = baseVotesAvailable + guildVoteBalance;
  const boostApproval = getBoostApprovalState(guildVote, voteState?.currentGuildMemberCount);
  const isVoteOpen = selectedVoteState?.isVoteOpen ?? false;
  const canBoostVote = Boolean(selectedVoteState) && !isVoteOpen && !isVoting && !boostApproval.hasVoted;

  return (
    <section aria-labelledby="progress-next-vote-title" className="relative z-20 space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gaming-base/95 px-3 py-2 backdrop-blur">
        <h3
          id="progress-next-vote-title"
          className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted"
        >
          {t('bonus.nextVote')}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
          isVoteOpen ? 'bg-status-completed/15 text-status-completed' : 'bg-status-warning/15 text-status-warning'
        }`}>
          {isVoteOpen ? 'Vote ouvert' : 'Boost ouvert'}
        </span>
        <span className="rounded-full border border-gaming-border bg-gaming-card px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-text-secondary">
          {availableVotes} vote{availableVotes > 1 ? 's' : ''} disponible{availableVotes > 1 ? 's' : ''}
        </span>
        <div className="flex flex-wrap gap-2">
          {(voteState?.milestones || []).map((milestone) => (
            <button
              key={milestone.id}
              type="button"
              onClick={() => onSelectMilestone(milestone.id)}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                selectedMilestoneId === milestone.id
                  ? 'border-status-quest bg-status-quest text-gaming-base'
                  : 'border-gaming-border bg-gaming-card text-text-secondary hover:border-status-quest'
              }`}
            >
              {milestone.labelI18nKey}
            </button>
          ))}
        </div>
        {!isVoteOpen ? (
          <div className="ml-auto flex items-center gap-3">
            <HoldToConfirmButton
              onConfirm={onBoost}
              holdDuration={1200}
              shape="round"
              variant="btn-primary"
              disabled={!canBoostVote}
              progressTarget={boostApproval.nextProgress}
              progressValue={boostApproval.currentProgress}
              className={
                boostApproval.hasVoted
                  ? 'h-16 w-16 min-h-0 border-status-completed/50 bg-gaming-card text-status-completed font-display text-[0.6rem] font-black uppercase leading-tight tracking-[0.08em] opacity-100 shadow-[0_0_18px_rgba(133,153,0,0.28)]'
                  : 'h-16 w-16 min-h-0 border-primary/40 bg-primary text-primary-content font-display text-[0.6rem] font-black uppercase leading-tight tracking-[0.08em] shadow-glow-primary'
              }
              title={`Booster +1 vote${boostCost ? ` (${boostCost} or)` : ''}`}
            >
              <span className="flex flex-col items-center gap-0.5">
                <Gift size={14} aria-hidden />
                <span>{isVoting ? '…' : '+1'}</span>
              </span>
            </HoldToConfirmButton>
            <div className="min-w-0 text-xs font-bold uppercase tracking-[0.12em]">
              <p className={boostApproval.hasVoted ? 'text-status-completed' : 'text-text-primary'}>
                {boostApproval.hasVoted ? 'En attente de la guilde' : `Booster +1 vote${boostCost ? ` (${boostCost} or)` : ''}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {isVoteOpen ? (
        <p
          className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
            showSelectCardPrompt
              ? 'border-status-warning/50 bg-status-warning/10 text-status-warning'
              : 'border-status-quest/40 bg-status-quest/10 text-status-quest'
          }`}
        >
          {showSelectCardPrompt
            ? 'Sélectionnez une carte pour pouvoir valider le vote avec le bouton du dashboard.'
            : 'Sélectionnez une carte, puis validez avec le bouton Vote en bas du dashboard.'}
        </p>
      ) : null}

      {selectedVoteState?.hasTie ? (
        <p className="rounded-xl border border-status-warning/50 bg-status-warning/10 px-4 py-2 text-sm font-semibold text-status-warning">
          Égalité en cours : la majorité relative n’est pas encore tranchée.
        </p>
      ) : null}

      <ResponsiveCardGrid
        items={voteCards}
        getKey={(card, index) => card.id || `next-vote-${index}`}
        renderItem={(card) => {
          const result = selectedVoteState?.results.find((item) => item.bonusCardId === card.id);
          const isSelected = selectedBonusCardId === card.id;
          const isFaceDown = isFaceDownCard(card);
          const showVoteOverlays = isVoteOpen && !isFaceDown;
          return (
            <button
              type="button"
              onClick={() => card.id && isVoteOpen && onSelectCard(card.id)}
              disabled={isVoting || !card.id || isFaceDown || !isVoteOpen}
              className={`group relative w-full text-left transition ${
                isSelected ? 'rounded-[1.4rem] ring-4 ring-status-quest ring-offset-4 ring-offset-gaming-base' : ''
              }`}
            >
              <PlayingCard
                {...card}
                size="full"
                presentation={{ fit: 'fillWidth' }}
                overlays={
                  showVoteOverlays
                    ? [
                        ...(result?.isLeader
                          ? [
                              {
                                id: 'leader',
                                placement: 'top-left-inside' as const,
                                content: (
                                  <span className="rounded-full bg-status-completed px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gaming-base shadow-card">
                                    Leader
                                  </span>
                                ),
                              },
                            ]
                          : []),
                      ]
                    : undefined
                }
              />
            </button>
          );
        }}
        className="pt-2"
      />
    </section>
  );
}

function isFaceDownCard(card: PlayingCardProps) {
  const front = card.model.front;
  return !front || front === 'none' || Boolean(front.back);
}

function buildVoteCards(
  t: (path: string) => string,
  bonusCards: GameRewardCard[],
  selectedVoteState?: GameBonusVoteState['voteStates'][number]
) {
  const cards: PlayingCardProps[] = bonusCards.length
    ? bonusCards.map((card) => {
        const voteCount = selectedVoteState?.results.find((item) => item.bonusCardId === card.id)?.voteCount ?? 0;

        return {
          kind: 'reward' as const,
          id: card.id,
          accentToken: card.accentToken,
          model: {
            front: {
              title: { value: card.title, variant: 'title' },
              subtitle: card.subtitle ? { value: card.subtitle, variant: 'subtitle' } : undefined,
              color: { value: card.color },
              art: {
                value: card.illustrationUrl,
                alt: card.title,
              },
              icon: { value: card.iconKey || 'Gift', colored: true },
              type: {
                variant: 'votes',
                value: voteCount,
                text: { value: String(voteCount), variant: 'ribbon' },
                icon: { value: 'Vote' },
              },
              info: {
                sections: [
                  {
                    id: 'description',
                    description: {
                      value: card.description || card.subtitle || t('dashboard.rewards.fallbackDescription'),
                      variant: 'description',
                    },
                  },
                ],
              },
            },
          },
        };
      })
    : [
        {
          kind: 'reward' as const,
          id: 'empty-progress-reward',
          accentToken: 'neutral' as const,
          model: {
            front: {
              back: { mode: 'icon', icon: { value: 'Gift' } },
            },
          },
        },
      ];

  return cards.map((card) => ({
    ...card,
    layoutId: `progress-next-vote-${card.id}`,
  }));
}

function getActiveRewardCardIds(voteState: GameBonusVoteState | null) {
  if (!voteState) return new Set<string>();

  return new Set(
    voteState.voteStates.flatMap((state) =>
      state.isVoteClosed && !state.hasTie ? state.leadingBonusCardIds : []
    )
  );
}
