import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GameBonusVoteState, GameRewardCard, GameRewardCardPayload } from '@eduquest/shared';
import { PlayingCard, PlayingHand, type PlayingCardProps } from '../../molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../molecules/ResponsiveCardGrid';
import { DeleteButton } from '../../atoms/DeleteButton';
import {
  createGameRewardCard,
  deleteGameRewardCard,
  fetchGameBonusVoteState,
  fetchGameRewardCards,
  updateGameRewardCard,
} from '../../../features/game/api';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';
import { getUserErrorMessage } from '../../../features/errors/api';
import { useErrorReporter } from '../../../features/errors/notifications';
import {
  SOLARIZED_SWATCH_OPTIONS,
  resolveUiColorTokenName,
} from '../../../styles/colorTokens';
import { uploadAsset } from '../../../features/assets/api';

const DEFAULT_BONUS_COLOR = SOLARIZED_SWATCH_OPTIONS[5].value;
type RewardCardEditableField = 'title' | 'subtitle' | 'description' | 'art';

const EMPTY_REWARD_CARD: GameRewardCardPayload = {
  title: '',
  subtitle: '',
  description: '',
  cost: 0,
  accentToken: 'quest',
  iconKey: 'Gift',
  color: DEFAULT_BONUS_COLOR,
};

export interface GameRewardCardManagerProps {
  gameId: string | null;
  className?: string;
}

export function GameRewardCardManager({ gameId, className }: GameRewardCardManagerProps) {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const [rewardCards, setRewardCards] = useState<GameRewardCard[]>([]);
  const [revealingRewardCardIds, setRevealingRewardCardIds] = useState<Set<string>>(() => new Set());
  const [activeRewardCardIds, setActiveRewardCardIds] = useState<Set<string>>(() => new Set());
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [activeCardTarget, setActiveCardTarget] = useState<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replaceRewardCard = useCallback((saved: GameRewardCard) => {
    setRewardCards((current) =>
      current.map((card) => (card.id === saved.id ? saved : card)).sort((a, b) => a.sortOrder - b.sortOrder)
    );
    window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
  }, []);

  useEffect(() => {
    const updateTarget = () => setActiveCardTarget(document.getElementById('bonus-hand-target'));
    updateTarget();
    window.addEventListener('hashchange', updateTarget);
    return () => window.removeEventListener('hashchange', updateTarget);
  }, []);

  useEffect(() => {
    if (!gameId) {
      setRewardCards([]);
      setActiveRewardCardIds(new Set());
      return undefined;
    }

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    const loadRewardCards = () => {
      setIsLoading(true);
      Promise.all([
        fetchGameRewardCards(token, gameId),
        fetchGameBonusVoteState(token, gameId).catch(() => null),
      ])
        .then(([cards, voteState]) => {
          if (!isMounted) return;
          setRewardCards(cards);
          setActiveRewardCardIds(getActiveRewardCardIds(voteState));
        })
        .catch((loadError) => {
          reportError(loadError, {
            messageKey: 'rewardCards.loadError',
            id: 'rewardCards.loadError',
            logMessage: 'Could not load reward cards.',
          });
          if (isMounted) {
            setError(t('rewardCards.loadError').replace('{detail}', getUserErrorMessage(loadError, t)));
          }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    loadRewardCards();
    window.addEventListener('eduquest:reward-cards-updated', loadRewardCards);
    return () => {
      isMounted = false;
      window.removeEventListener('eduquest:reward-cards-updated', loadRewardCards);
    };
  }, [gameId, reportError, t]);

  const createRewardCard = async () => {
    if (!gameId || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      const created = await createGameRewardCard(token, gameId, EMPTY_REWARD_CARD);
      setRewardCards((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setRevealingRewardCardIds((current) => new Set(current).add(created.id));
      window.setTimeout(() => {
        setRevealingRewardCardIds((current) => {
          const next = new Set(current);
          next.delete(created.id);
          return next;
        });
      }, 80);
      setEditingCardId(created.id);
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
    } catch (saveError) {
      reportError(saveError, {
        messageKey: 'rewardCards.saveError',
        id: 'rewardCards.saveError',
        logMessage: 'Could not create reward card.',
      });
      setError(t('rewardCards.saveError').replace('{detail}', getUserErrorMessage(saveError, t)));
    } finally {
      setIsSaving(false);
    }
  };

  const activeRewardCards = rewardCards.filter((card) => activeRewardCardIds.has(card.id));
  const candidateRewardCards = rewardCards.filter((card) => !activeRewardCardIds.has(card.id));
  const activeCardData = toNonEmptyCards(
    activeRewardCards.length
      ? activeRewardCards.map((card) => toActivePlayingCard(card))
      : [
          {
            kind: 'reward' as const,
            id: 'empty-active-reward-card-manager',
            accentToken: 'neutral' as const,
            model: {
              front: {
                back: { mode: 'icon', icon: { value: 'Gift' } },
              },
            },
          },
        ]
  );
  const spareRewardCard: PlayingCardProps = {
    kind: 'reward',
    id: 'spare-create-reward-card',
    accentToken: 'neutral',
    model: {
      front: {
        back: { mode: 'icon', icon: { value: 'Gift' } },
      },
    },
    interactive: true,
    onClick: createRewardCard,
    className: isSaving ? 'cursor-wait opacity-60' : undefined,
  };
  const candidateCardData = [...candidateRewardCards.map((card) => toEditablePlayingCard(card)), spareRewardCard];
  const activeCardView = (
    <PlayingHand
      hand={{
        id: 'admin-editable-bonus-hand',
        title: t('bonus.activeBonuses'),
        cards: activeCardData,
        mainCardIndex: 0,
        variant: 'horizontal',
      }}
      mode="full"
      visibleCardCount={activeCardData.length}
      expandOnHover={false}
      onCardSelect={(card) => {
        if (card.id) setEditingCardId(card.id);
      }}
      stackSide="left"
      className="mx-auto h-[30rem] min-h-0 max-w-7xl md:h-[32rem]"
    />
  );

  function toEditablePlayingCard(card: GameRewardCard): PlayingCardProps {
    const playingCard = toPlayingCard(t, card, {
      editable: true,
      onFieldChange: (field, value) => updateCardField(field, value, (patch) => updateRewardCard(card, patch)),
      onIconChange: (iconKey) => updateRewardCard(card, { iconKey }),
      onIllustrationUpload: (file) => uploadRewardIllustration(card, file),
      isEditing: editingCardId === card.id,
      onColorChange: (color) => updateRewardCard(card, { color, accentToken: resolveUiColorTokenName(color) }),
      actions: (
        <RewardCardControls
          isSaving={isSaving}
          onFocus={() => setEditingCardId(card.id)}
          onDelete={() => removeRewardCard(card)}
        />
      ),
    });
    if (!revealingRewardCardIds.has(card.id)) return playingCard;

    return {
      ...playingCard,
      model: {
        ...playingCard.model,
        front: {
          title: { value: card.title },
          back: { mode: 'icon', icon: { value: card.iconKey || 'Gift' } },
        },
      },
    };
  }

  function toActivePlayingCard(card: GameRewardCard): PlayingCardProps {
    const playingCard = toEditablePlayingCard(card);
    const front = playingCard.model.front && playingCard.model.front !== 'none' ? playingCard.model.front : undefined;
    if (!front) return playingCard;

    return {
      ...playingCard,
      model: {
        ...playingCard.model,
        front: {
          ...front,
          type: undefined,
        },
      },
    };
  }

  const updateRewardCard = async (card: GameRewardCard, patch: Partial<GameRewardCardPayload>) => {
    if (!gameId || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    const payload = toRewardCardPayload({ ...card, ...patch });
    setRewardCards((current) =>
      current.map((item) => (item.id === card.id ? { ...item, ...payload } : item))
    );
    setIsSaving(true);
    setError(null);
    try {
      const saved = await updateGameRewardCard(token, gameId, card.id, payload);
      replaceRewardCard(saved);
    } catch (saveError) {
      setRewardCards((current) => current.map((item) => (item.id === card.id ? card : item)));
      reportError(saveError, {
        messageKey: 'rewardCards.saveError',
        id: 'rewardCards.saveError',
        logMessage: 'Could not save reward card.',
      });
      setError(t('rewardCards.saveError').replace('{detail}', getUserErrorMessage(saveError, t)));
    } finally {
      setIsSaving(false);
    }
  };

  const uploadRewardIllustration = async (card: GameRewardCard, file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('rewardCards.missingSession');

    const asset = await uploadAsset(token, 'reward-illustration', file, card.id);
    return asset.url;
  };

  const removeRewardCard = async (card: GameRewardCard) => {
    if (!gameId || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      await deleteGameRewardCard(token, gameId, card.id);
      setRewardCards((current) => current.filter((item) => item.id !== card.id));
      if (editingCardId === card.id) setEditingCardId(null);
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
    } catch (deleteError) {
      reportError(deleteError, {
        messageKey: 'rewardCards.deleteError',
        id: 'rewardCards.deleteError',
        logMessage: 'Could not delete reward card.',
      });
      setError(t('rewardCards.deleteError').replace('{detail}', getUserErrorMessage(deleteError, t)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={cn('space-y-6', className)} aria-labelledby="reward-card-manager-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-status-campfire">
            {t('rewardCards.eyebrow')}
          </p>
          <h3 id="reward-card-manager-title" className="text-2xl font-bold">
            {t('rewardCards.title')}
          </h3>
        </div>
        {isLoading ? <span className="text-sm text-text-muted">{t('common.loading')}</span> : null}
      </div>

      {error ? <p className="text-sm font-semibold text-status-danger">{error}</p> : null}

      {activeCardTarget ? createPortal(activeCardView, activeCardTarget) : activeCardView}

      {candidateCardData.length > 0 ? (
        <ResponsiveCardGrid
          items={candidateCardData}
          getKey={(card) => card.id || 'candidate-reward-card'}
          className="xl:grid-cols-3 2xl:grid-cols-4"
          renderItem={(card) => (
            <PlayingCard
              {...card}
              size="full"
              presentation={{ fit: 'fillWidth' }}
              interactive
              onClick={
                card.id === spareRewardCard.id
                  ? card.onClick
                  : () => card.id && setEditingCardId(card.id)
              }
            />
          )}
        />
      ) : null}
    </section>
  );
}

function toRewardCardPayload(card: Partial<GameRewardCardPayload & GameRewardCard>): GameRewardCardPayload {
  return {
    title: card.title?.trim() || '',
    subtitle: card.subtitle?.trim() || undefined,
    description: card.description?.trim() || undefined,
    cost: Number(card.cost ?? 0),
    accentToken: resolveUiColorTokenName(card.color || card.accentToken || DEFAULT_BONUS_COLOR),
    iconKey: card.iconKey || 'Gift',
    illustrationUrl: card.illustrationUrl?.trim() || undefined,
    color: card.color || DEFAULT_BONUS_COLOR,
    sortOrder: card.sortOrder,
  };
}

function toPlayingCard(
  t: (path: string) => string,
  card: Partial<GameRewardCardPayload & GameRewardCard>,
  options: {
    editable: boolean;
    onFieldChange: (field: RewardCardEditableField, value: string) => void;
    onIconChange: (iconKey: string) => void;
    onIllustrationUpload: (file: File) => Promise<string | void>;
    onColorChange?: (color: string) => void;
    actions?: ReactNode;
    isEditing?: boolean;
  }
): PlayingCardProps {
  const color = card.color || DEFAULT_BONUS_COLOR;
  const iconKey = card.iconKey || 'Gift';
  const illustrationUrl = card.illustrationUrl || undefined;
  const fallbackTitle = card.title || t('rewardCards.previewTitle');

  return {
    id: card.id,
    kind: 'reward',
    accentToken: resolveUiColorTokenName(card.accentToken || color),
    className: options.isEditing ? 'ring-2 ring-status-quest ring-offset-2 ring-offset-gaming-base' : undefined,
    model: {
      front: {
        title: {
          value: fallbackTitle,
          variant: 'title',
          editable: options.editable,
          onChange: (value) => options.onFieldChange('title', value),
          placeholder: t('playingCard.placeholders.title'),
        },
        subtitle: {
          value: card.subtitle || t('rewardCards.previewSubtitle'),
          variant: 'subtitle',
          editable: options.editable,
          onChange: (value) => options.onFieldChange('subtitle', value),
          placeholder: t('playingCard.placeholders.subtitle'),
        },
        color: {
          value: color,
          editable: options.editable,
          onChange: options.onColorChange,
        },
        art: {
          value: illustrationUrl,
          alt: fallbackTitle,
          editable: options.editable,
          upload: options.onIllustrationUpload,
          onChange: (value) => options.onFieldChange('art', value),
        },
        icon: {
          value: iconKey,
          editable: options.editable,
          onChange: options.onIconChange,
          label: t('rewardCards.fields.icon'),
          searchPlaceholder: t('rewardCards.iconSearchPlaceholder'),
          colored: true,
        },
        type: {
          variant: 'votes',
          value: card.cost ?? 0,
          text: { value: String(card.cost ?? 0), variant: 'ribbon' },
          icon: { value: 'Vote' },
        },
        info: {
          sections: [
            {
              id: 'description',
              description: {
                value: card.description || t('rewardCards.previewDescription'),
                variant: 'description',
                editable: options.editable,
                onChange: (value) => options.onFieldChange('description', value),
                placeholder: t('playingCard.placeholders.description'),
              },
            },
          ],
        },
        actions: options.actions,
      },
    },
  };
}

function updateCardField(
  field: RewardCardEditableField,
  value: string,
  onUpdate: (patch: Partial<GameRewardCardPayload>) => void
) {
  if (field === 'art') {
    onUpdate({ illustrationUrl: value || undefined });
  }
  if (field === 'title' || field === 'subtitle' || field === 'description') {
    onUpdate({ [field]: value });
  }
}

function RewardCardControls({
  isSaving,
  onFocus,
  onDelete,
}: {
  isSaving: boolean;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-wrap items-center gap-2" onFocus={onFocus} onClick={(event) => event.stopPropagation()}>
      <DeleteButton
        onConfirm={onDelete}
        holdDuration={1200}
        disabled={isSaving}
        aria-label={t('rewardCards.deleteNamed').replace('{title}', t('rewardCards.previewTitle'))}
        className="h-8 w-8 shadow-md"
      />

    </div>
  );
}

function getActiveRewardCardIds(voteState: GameBonusVoteState | null) {
  if (!voteState) return new Set<string>();

  return new Set(
    voteState.voteStates.flatMap((state) =>
      state.isVoteClosed && !state.hasTie ? state.leadingBonusCardIds : []
    )
  );
}

function toNonEmptyCards(cards: PlayingCardProps[]): [PlayingCardProps, ...PlayingCardProps[]] {
  if (cards.length === 0) {
    throw new Error('Expected at least one card.');
  }

  return cards as [PlayingCardProps, ...PlayingCardProps[]];
}

export default GameRewardCardManager;
