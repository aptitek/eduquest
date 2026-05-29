import { Gift } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { GameBonusVoteState, GameRewardCard } from '@eduquest/shared';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { HoldToConfirmButton } from '../../components/atoms/HoldToConfirmButton';
import { useTranslation } from '../../hooks/useTranslation';
import { useGameStore } from '../../features/game/gameStore';
import { GameRewardCardManager } from '../../components/organisms/GameRewardCardManager';
import { renderLucideIcon } from '../../features/game/lucideIconCatalog';
import {
  boostMilestoneBonusVote,
  castMilestoneBonusVote,
  fetchGameBonusVoteState,
} from '../../features/game/api';

export function ProgressPage() {
  const { t } = useTranslation();
  const { user, selectedGameId } = useGameStore();
  const [voteState, setVoteState] = useState<GameBonusVoteState | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedBonusCardId, setSelectedBonusCardId] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const loadVoteState = () => {
    if (!selectedGameId || user?.isAdmin) return undefined;
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

  const selectedVoteState = voteState?.voteStates.find(
    (state) => state.milestone.id === selectedMilestoneId
  ) || voteState?.voteStates[0];
  const voteCards = useMemo(
    () => buildVoteCards(t, voteState?.bonusCards || []),
    [t, voteState?.bonusCards]
  );

  useEffect(() => {
    setSelectedBonusCardId(selectedVoteState?.guildVote?.bonusCardId ?? null);
  }, [selectedVoteState?.guildVote?.bonusCardId, selectedVoteState?.milestone.id]);

  const castVote = async (bonusCardId: string) => {
    if (!selectedGameId || !selectedVoteState?.isVoteOpen || isVoting) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsVoting(true);
    try {
      await castMilestoneBonusVote(token, selectedGameId, selectedVoteState.milestone.id, bonusCardId);
      await fetchGameBonusVoteState(token, selectedGameId).then(setVoteState);
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
    } catch (error) {
      console.warn('Could not cast bonus vote.', error);
    } finally {
      setIsVoting(false);
    }
  };

  const boostVote = async () => {
    if (!selectedGameId || !selectedVoteState?.isVoteClosed || isVoting) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsVoting(true);
    try {
      await boostMilestoneBonusVote(token, selectedGameId, selectedVoteState.milestone.id, 1);
      await fetchGameBonusVoteState(token, selectedGameId).then(setVoteState);
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
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
            onSelectCard={setSelectedBonusCardId}
            onVote={castVote}
            onBoost={boostVote}
          />
        ) : null}
      </div>
    </GameLayout>
  );
}

export default ProgressPage;

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
  onSelectMilestone,
  onSelectCard,
  onVote,
  onBoost,
}: {
  t: (path: string) => string;
  selectedMilestoneId: string | null;
  voteState: GameBonusVoteState | null;
  selectedVoteState?: GameBonusVoteState['voteStates'][number];
  voteCards: PlayingCardData[];
  selectedBonusCardId: string | null;
  isVoting: boolean;
  onSelectMilestone: (milestoneId: string) => void;
  onSelectCard: (bonusCardId: string | null) => void;
  onVote: (bonusCardId: string) => void;
  onBoost: () => void;
}) {
  const guildVote = selectedVoteState?.guildVote;
  const boostCost = voteState?.boostCostPreview?.finalCost ?? 0;
  const boostApproval = getBoostApprovalState(guildVote, voteState?.currentGuildMemberCount);
  const isVoteOpen = selectedVoteState?.isVoteOpen ?? false;
  const isVoteClosed = selectedVoteState?.isVoteClosed ?? false;
  const canCastVote = isVoteOpen && Boolean(selectedBonusCardId) && !isVoting;
  const canBoostVote = isVoteClosed && Boolean(guildVote) && !isVoting && !boostApproval.hasVoted;

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
          {isVoteOpen ? 'Vote ouvert' : 'Vote fermé'}
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
        {isVoteOpen ? (
          <button
            type="button"
            onClick={() => selectedBonusCardId && onVote(selectedBonusCardId)}
            disabled={!canCastVote}
            className="btn btn-primary btn-sm ml-auto font-display text-xs font-black uppercase tracking-[0.14em]"
          >
            Voter pour cette carte
          </button>
        ) : (
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
                <span>{isVoting ? '...' : '+1'}</span>
              </span>
            </HoldToConfirmButton>
            <div className="min-w-0 text-xs font-bold uppercase tracking-[0.12em]">
              <p className={boostApproval.hasVoted ? 'text-status-completed' : 'text-text-primary'}>
                {boostApproval.hasVoted ? 'En attente de la guilde' : `Booster +1 vote${boostCost ? ` (${boostCost} or)` : ''}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {isVoteOpen ? (
        <p className="rounded-xl border border-status-quest/40 bg-status-quest/10 px-4 py-2 text-sm font-semibold text-status-quest">
          Sélectionnez une carte, puis validez le vote de guilde avec le bouton.
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
          const isGuildVote = guildVote?.bonusCardId === card.id;
          return (
            <button
              type="button"
              onClick={() => card.id && isVoteOpen && onSelectCard(card.id)}
              disabled={isVoting || !card.id || card.faceDown || !isVoteOpen}
              className={`group relative w-full text-left transition ${
                isSelected ? 'rounded-[1.4rem] ring-4 ring-status-quest ring-offset-4 ring-offset-gaming-base' : ''
              }`}
            >
              <PlayingCard
                {...card}
                size="full"
                presentation={{ fit: 'fillWidth' }}
                overlays={[
                  {
                    id: 'vote-count',
                    placement: 'top-right-inside',
                    content: (
                      <span className="rounded-full border border-gaming-border bg-gaming-base/95 px-3 py-1 text-sm font-black text-text-primary shadow-card">
                        {result?.voteCount || 0} vote{(result?.voteCount || 0) > 1 ? 's' : ''}
                      </span>
                    ),
                  },
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
                  ...(isGuildVote
                    ? [
                        {
                          id: 'guild-vote',
                          placement: 'bottom-left-inside' as const,
                          content: (
                            <span className="rounded-full border border-status-quest/60 bg-gaming-base/95 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-status-quest shadow-card">
                              Vote de guilde
                            </span>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </button>
          );
        }}
        className="pt-2"
      />
    </section>
  );
}

function buildVoteCards(t: (path: string) => string, bonusCards: GameRewardCard[]) {
  const cards: PlayingCardData[] = bonusCards.length
    ? bonusCards.map((card) => ({
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
    : [
        {
          kind: 'reward' as const,
          id: 'empty-progress-reward',
          title: t('dashboard.rewards.empty.title'),
          subtitle: t('dashboard.rewards.empty.subtitle'),
          description: t('dashboard.rewards.fallbackDescription'),
          accentToken: 'neutral' as const,
          faceDown: true,
        },
      ];

  return cards.map((card) => ({
    ...card,
    layoutId: `progress-next-vote-${card.id}`,
    front: {
      title: card.title || t('dashboard.rewards.fallbackTitle').replace('{index}', '1'),
      subtitle: card.subtitle,
      description: card.description || card.subtitle || t('dashboard.rewards.fallbackDescription'),
      color: card.color,
      illustrationUrl: card.illustrationUrl,
      illustrationAlt: card.title,
      illustration: card.illustration,
    },
  })) as PlayingCardData[];
}
