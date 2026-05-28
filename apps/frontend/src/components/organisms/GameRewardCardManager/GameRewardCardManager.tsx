import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameRewardCard, GameRewardCardPayload } from '@eduquest/shared';
import { Plus, Trash2 } from 'lucide-react';
import { PlayingCard, type PlayingCardData, type PlayingCardEditableField } from '../../molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../molecules/ResponsiveCardGrid';
import { HoldToConfirmButton } from '../../atoms/HoldToConfirmButton';
import {
  createGameRewardCard,
  deleteGameRewardCard,
  fetchGameRewardCards,
  updateGameRewardCard,
} from '../../../features/game/api';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';
import { getUserErrorMessage } from '../../../features/errors/api';
import { useErrorReporter } from '../../../features/errors/notifications';
import {
  SOLARIZED_SWATCH_OPTIONS,
  resolveColorBackgroundClassName,
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
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [openColorCardId, setOpenColorCardId] = useState<string | null>(null);
  const [activeCardTarget, setActiveCardTarget] = useState<HTMLElement | null>(null);
  const [inactiveCardIds, setInactiveCardIds] = useState<Set<string>>(() => new Set());
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
      setInactiveCardIds(new Set());
      return undefined;
    }

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    setIsLoading(true);
    fetchGameRewardCards(token, gameId)
      .then((cards) => {
        if (isMounted) {
          setRewardCards(cards);
          setInactiveCardIds(new Set());
        }
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
      setInactiveCardIds((current) => new Set(current).add(created.id));
      setEditingCardId(created.id);
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

  const renderRewardCard = (card: GameRewardCard) => (
    <RewardFullSizeCard
      key={card.id}
      card={card}
      isEditing={editingCardId === card.id}
      isColorPickerOpen={openColorCardId === card.id}
      isSaving={isSaving}
      onFocus={() => setEditingCardId(card.id)}
      onColorPickerOpenChange={(isOpen) => setOpenColorCardId(isOpen ? card.id : null)}
      onUpdate={(patch) => updateRewardCard(card, patch)}
      onIllustrationUpload={(file) => uploadRewardIllustration(card, file)}
      onDelete={() => removeRewardCard(card)}
      t={t}
    />
  );

  const activeCards = rewardCards.filter((card) => !inactiveCardIds.has(card.id));
  const gridCards = rewardCards.filter((card) => inactiveCardIds.has(card.id));
  const activeCardView = (
    <ResponsiveCardGrid
      items={activeCards}
      getKey={(card) => card.id}
      renderItem={renderRewardCard}
      className="pt-2 xl:grid-cols-3 2xl:grid-cols-4"
    />
  );

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
      setInactiveCardIds((current) => {
        const next = new Set(current);
        next.delete(card.id);
        return next;
      });
      if (editingCardId === card.id) setEditingCardId(null);
      if (openColorCardId === card.id) setOpenColorCardId(null);
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
        <div className="flex items-center gap-3">
          {isLoading ? <span className="text-sm text-text-muted">{t('common.loading')}</span> : null}
          <button
            type="button"
            onClick={createRewardCard}
            disabled={!gameId || isSaving}
            className="btn btn-primary font-display text-xs font-black uppercase tracking-[0.16em]"
          >
            <Plus size={16} aria-hidden />
            {t('rewardCards.createReward')}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm font-semibold text-status-danger">{error}</p> : null}

      {activeCardTarget ? createPortal(activeCardView, activeCardTarget) : activeCardView}

      {gridCards.length > 0 ? (
        <ResponsiveCardGrid
          items={gridCards}
          getKey={(card) => card.id}
          className="xl:grid-cols-3 2xl:grid-cols-4"
          renderItem={renderRewardCard}
        />
      ) : null}
    </section>
  );
}

export function RewardFullSizeCard({
  card,
  isEditing,
  isColorPickerOpen,
  isSaving,
  onFocus,
  onColorPickerOpenChange,
  onUpdate,
  onIllustrationUpload,
  onDelete,
  t,
}: {
  card: GameRewardCard;
  isEditing: boolean;
  isColorPickerOpen: boolean;
  isSaving: boolean;
  onFocus: () => void;
  onColorPickerOpenChange: (isOpen: boolean) => void;
  onUpdate: (patch: Partial<GameRewardCardPayload>) => void;
  onIllustrationUpload: (file: File) => Promise<string | void>;
  onDelete: () => void;
  t: (path: string) => string;
}) {
  return (
    <div className="group/reward-card relative" onFocusCapture={onFocus} onClick={onFocus}>
      <PlayingCard
        {...toPlayingCard(t, card, {
          editable: true,
          onFieldChange: (field, value) => updateCardField(field, value, onUpdate),
          onIconChange: (iconKey) => onUpdate({ iconKey }),
          onIllustrationUpload,
        })}
        size="full"
        className={cn(
          'w-full max-w-none',
          isEditing && 'ring-2 ring-status-quest ring-offset-2 ring-offset-gaming-base'
        )}
      />

      {isEditing ? (
        <BonusCardColorRibbon
          value={card.color || DEFAULT_BONUS_COLOR}
          onChange={(color) => onUpdate({ color, accentToken: resolveUiColorTokenName(color) })}
          isOpen={isColorPickerOpen}
          onOpenChange={onColorPickerOpenChange}
          t={t}
        />
      ) : null}

      <HoldToConfirmButton
        onConfirm={onDelete}
        holdDuration={1200}
        shape="round"
        variant="btn-error"
        disabled={isSaving}
        aria-label={t('rewardCards.deleteNamed').replace('{title}', card.title || t('rewardCards.previewTitle'))}
        className="absolute bottom-3 right-3 z-[80] h-10 w-10 border-status-danger/40 bg-status-danger/95 text-primary-content opacity-0 shadow-xl transition-opacity group-hover/reward-card:opacity-100 group-focus-within/reward-card:opacity-100"
      >
        <Trash2 size={16} aria-hidden />
      </HoldToConfirmButton>
    </div>
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

function BonusCardColorRibbon({
  value,
  onChange,
  isOpen,
  onOpenChange,
  t,
}: {
  value: string;
  onChange: (color: string) => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  t: (path: string) => string;
}) {
  const selectedOption = SOLARIZED_SWATCH_OPTIONS.find((option) => option.value === value);
  const colorLabel = selectedOption ? t(selectedOption.labelKey) : t('rewardCards.fields.color');

  return (
    <div className="pointer-events-none absolute inset-0 z-[90] overflow-visible">
      <div className="absolute inset-0 overflow-hidden rounded-[1.4rem]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenChange(!isOpen);
          }}
          className={cn(
            'pointer-events-auto absolute right-0 top-0 z-[95] h-20 w-52 translate-x-1/2 rotate-45 shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-status-quest',
            resolveColorBackgroundClassName(value)
          )}
          aria-label={t('rewardCards.useCardColor').replace('{color}', colorLabel)}
          aria-expanded={isOpen}
          title={colorLabel}
        />
      </div>

      {isOpen ? (
        <div
          className="pointer-events-auto absolute right-2 top-16 z-[100] grid w-40 grid-cols-3 gap-2 rounded-2xl border border-gaming-border bg-gaming-card/95 p-3 shadow-2xl backdrop-blur"
          onClick={(event) => event.stopPropagation()}
        >
          {SOLARIZED_SWATCH_OPTIONS.map((option) => {
            const isSelected = value === option.value;
            const label = t(option.labelKey);

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  onOpenChange(false);
                }}
                className={cn(
                  'h-8 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-status-quest',
                  isSelected
                    ? 'border-text-primary bg-gaming-card p-0.5 shadow-glow-primary'
                    : 'border-gaming-border bg-gaming-base p-1 hover:border-status-quest'
                )}
                aria-label={t('rewardCards.useCardColor').replace('{color}', label)}
                aria-pressed={isSelected}
                title={label}
              >
                <span className={cn('block h-full w-full rounded-md shadow-sm', option.className)} aria-hidden />
              </button>
            );
          })}
        </div>
      ) : null}
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

export default GameRewardCardManager;
