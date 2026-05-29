import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GameBonusVoteState, GameRewardCard, GameRewardCardPayload } from '@eduquest/shared';
import { PlayingCard, PlayingHand, type PlayingCardData, type PlayingCardEditableField } from '../../molecules/PlayingCard';
import { ColorSwatchPicker } from '../../molecules/ColorSwatchPicker';
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
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import { EditableIcon } from '../../atoms/EditableIcon';
import { uploadAsset } from '../../../features/assets/api';

const DEFAULT_BONUS_COLOR = SOLARIZED_SWATCH_OPTIONS[5].value;

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

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const createRewardCard = async () => {
    if (!gameId || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      const created = await createGameRewardCard(token, gameId, EMPTY_REWARD_CARD);
      setRewardCards((current) => [...current, created].sort((a, b) => a.sortOrder - b.sortOrder));
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
      ? activeRewardCards.map((card) => toEditablePlayingCard(card))
      : [
          {
            kind: 'reward' as const,
            id: 'empty-active-reward-card-manager',
            title: 'Aucun bonus actif',
            subtitle: 'Les bonus deviennent actifs après un vote gagné.',
            accentToken: 'neutral' as const,
            faceDown: true,
          },
        ]
  );
  const spareRewardCard: PlayingCardData = {
    kind: 'reward',
    id: 'spare-create-reward-card',
    title: t('rewardCards.createReward'),
    subtitle: t('rewardCards.previewSubtitle'),
    accentToken: 'neutral',
    faceDown: true,
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

  function toEditablePlayingCard(card: GameRewardCard): PlayingCardData {
    return toPlayingCard(t, card, {
      editable: true,
      onFieldChange: (field, value) => updateCardField(field, value, (patch) => updateRewardCard(card, patch)),
      onIconChange: (iconKey) => updateRewardCard(card, { iconKey }),
      onIllustrationUpload: (file) => uploadRewardIllustration(card, file),
      isEditing: editingCardId === card.id,
      footer: (
        <RewardCardControls
          color={card.color || DEFAULT_BONUS_COLOR}
          isSaving={isSaving}
          onFocus={() => setEditingCardId(card.id)}
          onColorChange={(color) => updateRewardCard(card, { color, accentToken: resolveUiColorTokenName(color) })}
          onDelete={() => removeRewardCard(card)}
        />
      ),
    });
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
          getKey={(card) => card.id || card.title || 'candidate-reward-card'}
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
    onFieldChange: (field: PlayingCardEditableField, value: string) => void;
    onIconChange: (iconKey: string) => void;
    onIllustrationUpload: (file: File) => Promise<string | void>;
    footer?: ReactNode;
    isEditing?: boolean;
  }
): PlayingCardData {
  const color = card.color || DEFAULT_BONUS_COLOR;
  const iconKey = card.iconKey || 'Gift';
  const illustrationUrl = card.illustrationUrl || undefined;
  const fallbackTitle = card.title || t('rewardCards.previewTitle');

  return {
    id: card.id,
    kind: 'reward',
    title: fallbackTitle,
    subtitle: card.subtitle || t('rewardCards.previewSubtitle'),
    description: card.description,
    color,
    accentToken: resolveUiColorTokenName(card.accentToken || color),
    illustrationUrl,
    illustrationAlt: fallbackTitle,
    illustration: illustrationUrl
      ? undefined
      : renderRewardIcon(iconKey, options.editable, options.onIconChange, t),
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
        description: {
          value: card.description || t('rewardCards.previewDescription'),
          variant: 'description',
          editable: options.editable,
          onChange: (value) => options.onFieldChange('description', value),
          placeholder: t('playingCard.placeholders.description'),
        },
        color: {
          value: color,
        },
        art: {
          value: illustrationUrl,
          alt: fallbackTitle,
          node: illustrationUrl ? undefined : renderRewardIcon(iconKey, options.editable, options.onIconChange, t),
          editable: options.editable,
          upload: options.onIllustrationUpload,
          onChange: (value) => options.onFieldChange('illustrationUrl', value),
        },
        footer: options.footer,
      },
    },
    front: {
      title: fallbackTitle,
      subtitle: card.subtitle || t('rewardCards.previewSubtitle'),
      description: card.description || t('rewardCards.previewDescription'),
      color,
      illustrationUrl,
      illustrationAlt: fallbackTitle,
      illustration: illustrationUrl
        ? undefined
        : renderRewardIcon(iconKey, options.editable, options.onIconChange, t),
      ribbonHidden: true,
      editable: options.editable,
      ribbonEditable: false,
      footer: options.footer,
      onFieldChange: options.onFieldChange,
      onIllustrationUpload: options.onIllustrationUpload,
    },
  };
}

function updateCardField(
  field: PlayingCardEditableField,
  value: string,
  onUpdate: (patch: Partial<GameRewardCardPayload>) => void
) {
  if (field === 'illustrationUrl') {
    onUpdate({ illustrationUrl: value || undefined });
  }
  if (field === 'title' || field === 'subtitle' || field === 'description') {
    onUpdate({ [field]: value });
  }
}

function RewardCardControls({
  color,
  isSaving,
  onFocus,
  onColorChange,
  onDelete,
}: {
  color: string;
  isSaving: boolean;
  onFocus: () => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="relative flex flex-wrap items-center gap-2" onFocus={onFocus} onClick={(event) => event.stopPropagation()}>
      <ColorSwatchPicker
        value={color}
        onChange={onColorChange}
        variant="popover"
        buttonClassName="h-8 w-8 rounded-lg"
        ariaLabel={t('rewardCards.fields.color')}
        useColorLabelKey="rewardCards.useCardColor"
      />
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

function renderRewardIcon(
  iconKey: string,
  editable: boolean,
  onChange: (iconKey: string) => void,
  t: (path: string) => string
) {
  if (!editable) return renderLucideIcon(iconKey, 132, 'drop-shadow-lg');

  return (
    <div className="flex h-full w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
      <EditableIcon
        value={iconKey}
        onChange={onChange}
        size={132}
        label={t('rewardCards.fields.icon')}
        searchPlaceholder={t('rewardCards.iconSearchPlaceholder')}
        buttonClassName="h-full w-full rounded-none bg-transparent text-[color:var(--playing-card-accent)] hover:bg-transparent focus-visible:ring-status-quest/70"
        iconClassName="drop-shadow-lg"
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

function toNonEmptyCards(cards: PlayingCardData[]): [PlayingCardData, ...PlayingCardData[]] {
  if (cards.length === 0) {
    throw new Error('Expected at least one card.');
  }

  return cards as [PlayingCardData, ...PlayingCardData[]];
}

export default GameRewardCardManager;
