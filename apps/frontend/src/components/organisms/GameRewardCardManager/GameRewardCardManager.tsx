import { useEffect, useMemo, useState } from 'react';
import type { GameRewardCard, GameRewardCardPayload } from '@eduquest/shared';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { PlayingCard, type PlayingCardAccent, type PlayingCardData } from '../../molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../molecules/ResponsiveCardGrid';
import {
  createGameRewardCard,
  deleteGameRewardCard,
  fetchGameRewardCards,
  updateGameRewardCard,
} from '../../../features/game/api';
import { cn } from '../../../utils/cn';

const ACCENT_OPTIONS: PlayingCardAccent[] = [
  'quest',
  'campfire',
  'completed',
  'boss',
  'danger',
  'neutral',
  'scholar',
  'champion',
  'guide',
  'specialist',
];

const EMPTY_DRAFT: GameRewardCardPayload = {
  title: '',
  subtitle: '',
  description: '',
  cost: 0,
  accentToken: 'quest',
};

export interface GameRewardCardManagerProps {
  gameId: string | null;
  className?: string;
}

export function GameRewardCardManager({ gameId, className }: GameRewardCardManagerProps) {
  const [rewardCards, setRewardCards] = useState<GameRewardCard[]>([]);
  const [draft, setDraft] = useState<GameRewardCardPayload>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editingCard = rewardCards.find((card) => card.id === editingId);

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
        console.warn('Could not load reward cards.', loadError);
        if (isMounted) setError('Reward cards could not be loaded.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [gameId]);

  const previewCard = useMemo(() => toPlayingCard(editingCard ? { ...editingCard, ...draft } : draft), [draft, editingCard]);

  const startEditing = (card: GameRewardCard) => {
    setEditingId(card.id);
    setDraft({
      title: card.title,
      subtitle: card.subtitle || '',
      description: card.description || '',
      cost: card.cost,
      accentToken: card.accentToken || 'quest',
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
      console.warn('Could not save reward card.', saveError);
      setError('Reward card could not be saved.');
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
      console.warn('Could not delete reward card.', deleteError);
      setError('Reward card could not be deleted.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={cn('space-y-6', className)} aria-labelledby="reward-card-manager-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-status-campfire">
            Game rewards
          </p>
          <h3 id="reward-card-manager-title" className="text-2xl font-bold">
            Reward Cards
          </h3>
        </div>
        {isLoading ? <span className="text-sm text-text-muted">Loading...</span> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ResponsiveCardGrid
          items={rewardCards}
          getKey={(card) => card.id}
          className="xl:grid-cols-2 2xl:grid-cols-3"
          renderItem={(card) => (
            <div className="space-y-3">
              <PlayingCard {...toPlayingCard(card)} size="full" className="w-full" />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(card)}
                  className="btn btn-sm flex-1 border-gaming-border bg-gaming-card font-display text-xs uppercase tracking-[0.14em] text-text-secondary hover:text-text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeRewardCard(card)}
                  disabled={isSaving}
                  className="btn btn-sm border-status-danger/40 bg-status-danger/10 text-status-danger hover:bg-status-danger hover:text-gaming-base"
                  aria-label={`Delete ${card.title}`}
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
              {editingId ? 'Edit reward' : 'Create reward'}
            </h4>
            {editingId ? (
              <button type="button" onClick={resetDraft} className="btn btn-ghost btn-xs text-text-muted">
                <X size={14} aria-hidden />
                Cancel
              </button>
            ) : null}
          </div>

          <div className="mb-5 flex justify-center">
            <PlayingCard {...previewCard} size="full" className="w-full max-w-[15rem]" />
          </div>

          <div className="space-y-3">
            <TextInput label="Title" value={draft.title} onChange={(title) => setDraft((current) => ({ ...current, title }))} />
            <TextInput
              label="Subtitle"
              value={draft.subtitle || ''}
              onChange={(subtitle) => setDraft((current) => ({ ...current, subtitle }))}
            />
            <TextInput
              label="Description"
              value={draft.description || ''}
              onChange={(description) => setDraft((current) => ({ ...current, description }))}
            />
            <label className="block space-y-1.5 text-sm">
              <span className="font-bold text-text-secondary">Cost</span>
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
            <label className="block space-y-1.5 text-sm">
              <span className="font-bold text-text-secondary">Accent</span>
              <select
                value={draft.accentToken || 'quest'}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, accentToken: event.target.value }))
                }
                className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
              >
                {ACCENT_OPTIONS.map((accent) => (
                  <option key={accent} value={accent}>
                    {accent}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <p className="mt-3 text-sm font-semibold text-status-danger">{error}</p> : null}

          <button
            type="button"
            onClick={saveRewardCard}
            disabled={!gameId || !draft.title.trim() || isSaving}
            className="btn btn-primary mt-5 w-full font-display text-xs font-black uppercase tracking-[0.16em]"
          >
            {editingId ? <Save size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
            {editingId ? 'Save reward' : 'Create reward'}
          </button>
        </div>
      </div>
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-bold text-text-secondary">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
      />
    </label>
  );
}

function toPlayingCard(card: Partial<GameRewardCardPayload & GameRewardCard>): PlayingCardData {
  return {
    id: card.id,
    kind: 'guild',
    title: card.title || 'Reward title',
    subtitle: card.subtitle || 'Reward subtitle',
    description: card.description,
    accentToken: (card.accentToken || 'quest') as PlayingCardAccent,
    ribbonLabel: `${card.cost ?? 0} pts`,
    ribbonClassName: 'bg-status-quest',
    front: {
      title: card.title || 'Reward title',
      subtitle: card.subtitle || 'Reward subtitle',
      description: card.description || 'Describe the reward unlocked by this card.',
      ribbonText: `${card.cost ?? 0} pts`,
    },
  };
}

export default GameRewardCardManager;
