import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import type { GameRewardCard, GameRewardCardPayload } from '@eduquest/shared';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { PlayingCard, type PlayingCardData, type PlayingCardEditableField } from '../../molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../molecules/ResponsiveCardGrid';
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
import { SOLARIZED_SWATCH_OPTIONS, resolveUiColorTokenName } from '../../../styles/colorTokens';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import { EditableIcon } from '../../atoms/EditableIcon';
import { uploadAsset } from '../../../features/assets/api';

const DEFAULT_BONUS_COLOR = SOLARIZED_SWATCH_OPTIONS[5].value;

const EMPTY_DRAFT: GameRewardCardPayload = {
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
  const [draft, setDraft] = useState<GameRewardCardPayload>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editingCard = rewardCards.find((card) => card.id === editingId);

  const uploadRewardIllustration = useCallback(async (file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('rewardCards.missingSession');

    const asset = await uploadAsset(token, 'reward-illustration', file, editingId || undefined);
    setDraft((current) => ({ ...current, illustrationUrl: asset.url }));
    return asset.url;
  }, [editingId]);

  useEffect(() => {
    if (!gameId) {
      setRewardCards([]);
      return undefined;
    }

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    setIsLoading(true);
    fetchGameRewardCards(token, gameId)
      .then((cards) => {
        if (isMounted) setRewardCards(cards);
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

  const previewCard = useMemo(
    () =>
      toPlayingCard(t, editingCard ? { ...editingCard, ...draft } : draft, {
        editable: true,
        onFieldChange: (field, value) => updateDraftFromCardField(field, value, setDraft),
        onIllustrationUpload: uploadRewardIllustration,
      }),
    [draft, editingCard, t, uploadRewardIllustration]
  );

  const startEditing = (card: GameRewardCard) => {
    setEditingId(card.id);
    setDraft({
      title: card.title,
      subtitle: card.subtitle || '',
      description: card.description || '',
      cost: card.cost,
      accentToken: card.accentToken || 'quest',
      iconKey: card.iconKey || 'Gift',
      illustrationUrl: card.illustrationUrl || '',
      color: card.color || DEFAULT_BONUS_COLOR,
      sortOrder: card.sortOrder,
    });
  };

  const resetDraft = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError(null);
  };

  const saveRewardCard = async () => {
    if (!gameId || !draft.title.trim() || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        title: draft.title.trim(),
        subtitle: draft.subtitle?.trim() || undefined,
        description: draft.description?.trim() || undefined,
        cost: Number(draft.cost),
        accentToken: resolveUiColorTokenName(draft.color || draft.accentToken || DEFAULT_BONUS_COLOR),
        iconKey: draft.iconKey || 'Gift',
        illustrationUrl: draft.illustrationUrl?.trim() || undefined,
        color: draft.color || DEFAULT_BONUS_COLOR,
      };
      const saved = editingId
        ? await updateGameRewardCard(token, gameId, editingId, payload)
        : await createGameRewardCard(token, gameId, payload);

      setRewardCards((current) =>
        editingId
          ? current.map((card) => (card.id === saved.id ? saved : card))
          : [...current, saved].sort((a, b) => a.sortOrder - b.sortOrder)
      );
      resetDraft();
      window.dispatchEvent(new CustomEvent('eduquest:reward-cards-updated'));
    } catch (saveError) {
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

  const removeRewardCard = async (card: GameRewardCard) => {
    if (!gameId || isSaving) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      await deleteGameRewardCard(token, gameId, card.id);
      setRewardCards((current) => current.filter((item) => item.id !== card.id));
      if (editingId === card.id) resetDraft();
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ResponsiveCardGrid
          items={rewardCards}
          getKey={(card) => card.id}
          className="xl:grid-cols-2 2xl:grid-cols-3"
          renderItem={(card) => (
            <div className="space-y-3">
              <PlayingCard {...toPlayingCard(t, card)} size="full" className="w-full" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(card)}
                  className="btn btn-sm flex-1 border-gaming-border bg-gaming-card font-display text-xs uppercase tracking-[0.14em] text-text-secondary hover:text-text-primary"
                >
                  {t('rewardCards.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => removeRewardCard(card)}
                  disabled={isSaving}
                  className="btn btn-sm border-status-danger/40 bg-status-danger/10 text-status-danger hover:bg-status-danger hover:text-gaming-base"
                  aria-label={t('rewardCards.deleteNamed').replace('{title}', card.title)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </div>
          )}
        />

        <div className="rounded-3xl border border-gaming-border bg-gaming-card/70 p-4 shadow-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="font-display text-sm font-black uppercase tracking-[0.18em] text-text-secondary">
              {editingId ? t('rewardCards.editReward') : t('rewardCards.createReward')}
            </h4>
            {editingId ? (
              <button type="button" onClick={resetDraft} className="btn btn-ghost btn-xs text-text-muted">
                <X size={14} aria-hidden />
                {t('common.cancel')}
              </button>
            ) : null}
          </div>

          <div className="mb-5 flex justify-center">
            <PlayingCard
              {...previewCard}
              size="full"
              flipLabel={t('rewardCards.flipEditor')}
              className="w-full max-w-[15rem]"
            />
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm">
              <span className="font-bold text-text-secondary">{t('rewardCards.fields.cost')}</span>
              <input
                type="number"
                min={0}
                value={draft.cost}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, cost: Number(event.target.value) }))
                }
                className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
              />
            </label>
            <BonusIconSelector
              value={draft.iconKey || 'Gift'}
              onChange={(iconKey) => setDraft((current) => ({ ...current, iconKey }))}
              t={t}
            />
            <BonusColorSelector
              value={draft.color || DEFAULT_BONUS_COLOR}
              onChange={(color) =>
                setDraft((current) => ({
                  ...current,
                  color,
                  accentToken: resolveUiColorTokenName(color),
                }))
              }
              t={t}
            />
          </div>

          {error ? <p className="mt-3 text-sm font-semibold text-status-danger">{error}</p> : null}

          <button
            type="button"
            onClick={saveRewardCard}
            disabled={!gameId || !draft.title.trim() || isSaving}
            className="btn btn-primary mt-5 w-full font-display text-xs font-black uppercase tracking-[0.16em]"
          >
            {editingId ? <Save size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
            {editingId ? t('rewardCards.saveReward') : t('rewardCards.createReward')}
          </button>
        </div>
      </div>
    </section>
  );
}

function toPlayingCard(
  t: (path: string) => string,
  card: Partial<GameRewardCardPayload & GameRewardCard>,
  options?: {
    editable?: boolean;
    onFieldChange?: (field: PlayingCardEditableField, value: string) => void;
    onIllustrationUpload?: (file: File) => Promise<string | void>;
  }
): PlayingCardData {
  const color = card.color || DEFAULT_BONUS_COLOR;
  const iconKey = card.iconKey || 'Gift';
  const illustrationUrl = card.illustrationUrl || undefined;
  const fallbackTitle = card.title || t('rewardCards.previewTitle');
  const costText = String(card.cost ?? 0);

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
    illustration: illustrationUrl ? undefined : renderLucideIcon(iconKey, 132, 'drop-shadow-lg'),
    ribbonIconKey: iconKey,
    ribbonIcon: renderLucideIcon(iconKey, 18),
    ribbonLabel: costText,
    ribbonPosition: 'top-left',
    ribbonClassName: 'bg-status-quest',
    front: {
      title: fallbackTitle,
      subtitle: card.subtitle || t('rewardCards.previewSubtitle'),
      description: card.description || t('rewardCards.previewDescription'),
      color,
      illustrationUrl,
      illustrationAlt: fallbackTitle,
      illustration: illustrationUrl || options?.editable ? undefined : renderLucideIcon(iconKey, 132, 'drop-shadow-lg'),
      ribbonText: costText,
      ribbonIconKey: iconKey,
      ribbonIcon: renderLucideIcon(iconKey, 18),
      ribbonPosition: 'top-left',
      editable: options?.editable,
      ribbonEditable: options?.editable,
      onFieldChange: options?.onFieldChange,
      onIllustrationUpload: options?.onIllustrationUpload,
    },
    back: options?.editable
      ? {
          title: t('rewardCards.backTitle'),
          subtitle: t('rewardCards.backSubtitle'),
          description: t('rewardCards.backDescription'),
          color,
          illustration: renderLucideIcon(iconKey, 112, 'drop-shadow-lg'),
        }
      : undefined,
  };
}

function updateDraftFromCardField(
  field: PlayingCardEditableField,
  value: string,
  setDraft: Dispatch<SetStateAction<GameRewardCardPayload>>
) {
  setDraft((current) => {
    if (field === 'ribbonText') {
      return { ...current, cost: Number(value) || 0 };
    }
    if (field === 'ribbonIcon') {
      return { ...current, iconKey: value };
    }
    if (field === 'illustrationUrl') {
      return { ...current, illustrationUrl: value || undefined };
    }
    if (field === 'title' || field === 'subtitle' || field === 'description') {
      return { ...current, [field]: value };
    }
    return current;
  });
}

function BonusIconSelector({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (iconKey: string) => void;
  t: (path: string) => string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-bold text-text-secondary">{t('rewardCards.fields.icon')}</span>
      <div className="flex items-center gap-3 rounded-xl border border-gaming-border bg-gaming-base px-3 py-2">
        <EditableIcon
          value={value}
          onChange={onChange}
          size={24}
          label={t('rewardCards.fields.icon')}
          searchPlaceholder={t('rewardCards.iconSearchPlaceholder')}
          buttonClassName="h-10 w-10 bg-gaming-card"
        />
        <span className="text-sm font-semibold text-text-secondary">{value}</span>
      </div>
    </label>
  );
}

function BonusColorSelector({
  value,
  onChange,
  t,
}: {
  value: string;
  onChange: (color: string) => void;
  t: (path: string) => string;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="font-bold text-text-secondary">{t('rewardCards.fields.color')}</legend>
      <div className="grid grid-cols-9 gap-1.5">
        {SOLARIZED_SWATCH_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const label = t(option.labelKey);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'h-7 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-status-quest',
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
    </fieldset>
  );
}

export default GameRewardCardManager;
