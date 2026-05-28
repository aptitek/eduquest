import { useCallback, useEffect, useState } from 'react';
import type { CohortProgressData, GameMilestonePayload } from '@eduquest/shared';
import {
  createGameMilestone,
  deleteGameMilestone,
  fetchGameMilestones,
  updateGameMilestone,
} from '../../../features/game/api';
import { AddButton } from '../../atoms/AddButton';
import { DeleteButton } from '../../atoms/DeleteButton';
import { cn } from '../../../utils/cn';
import { useTranslation } from '../../../hooks/useTranslation';
import { getUserErrorMessage } from '../../../features/errors/api';
import { useErrorReporter } from '../../../features/errors/notifications';

type GameMilestone = CohortProgressData['gauge']['milestones'][number];

const EMPTY_MILESTONE: GameMilestonePayload = {
  label: 'New milestone',
  description: '',
  cost: 0,
};

export interface GameMilestoneManagerProps {
  gameId: string | null;
  className?: string;
}

export function GameMilestoneManager({ gameId, className }: GameMilestoneManagerProps) {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const [milestones, setMilestones] = useState<GameMilestone[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMilestones = useCallback(() => {
    if (!gameId) {
      setMilestones([]);
      return undefined;
    }

    const token = localStorage.getItem('eduquest_token');
    if (!token) return undefined;

    let isMounted = true;
    fetchGameMilestones(token, gameId)
      .then((items) => {
        if (isMounted) setMilestones(items);
      })
      .catch((loadError) => {
        reportError(loadError, {
          messageKey: 'milestones.loadError',
          id: 'milestones.loadError',
          logMessage: 'Could not load milestones.',
        });
        if (isMounted) {
          setError(`Impossible de charger les milestones. ${getUserErrorMessage(loadError, t)}`);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [gameId, reportError, t]);

  useEffect(() => refreshMilestones(), [refreshMilestones]);

  const notifyUpdated = () => {
    window.dispatchEvent(new CustomEvent('eduquest:milestones-updated'));
  };

  const createMilestone = async () => {
    if (!gameId || isSaving) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      const created = await createGameMilestone(token, gameId, {
        ...EMPTY_MILESTONE,
        sortOrder: milestones.length,
      });
      setMilestones((current) => [...current, created].sort(sortMilestones));
      notifyUpdated();
    } catch (saveError) {
      reportError(saveError, {
        messageKey: 'milestones.saveError',
        id: 'milestones.saveError',
        logMessage: 'Could not create milestone.',
      });
      setError(`Impossible de créer le milestone. ${getUserErrorMessage(saveError, t)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMilestone = async (milestone: GameMilestone, patch: Partial<GameMilestonePayload>) => {
    if (!gameId || isSaving) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    const payload = toPayload({ ...milestone, ...patch });
    const previousMilestones = milestones;
    setMilestones((current) =>
      current.map((item) => (item.id === milestone.id ? { ...item, ...patch } : item)).sort(sortMilestones)
    );
    setIsSaving(true);
    setError(null);
    try {
      const saved = await updateGameMilestone(token, gameId, milestone.id, payload);
      setMilestones((current) => current.map((item) => (item.id === saved.id ? saved : item)).sort(sortMilestones));
      notifyUpdated();
    } catch (saveError) {
      setMilestones(previousMilestones);
      reportError(saveError, {
        messageKey: 'milestones.saveError',
        id: 'milestones.saveError',
        logMessage: 'Could not save milestone.',
      });
      setError(`Impossible d’enregistrer le milestone. ${getUserErrorMessage(saveError, t)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const removeMilestone = async (milestone: GameMilestone) => {
    if (!gameId || isSaving) return;
    const token = localStorage.getItem('eduquest_token');
    if (!token) return;

    setIsSaving(true);
    setError(null);
    try {
      await deleteGameMilestone(token, gameId, milestone.id);
      setMilestones((current) => current.filter((item) => item.id !== milestone.id));
      notifyUpdated();
    } catch (deleteError) {
      reportError(deleteError, {
        messageKey: 'milestones.deleteError',
        id: 'milestones.deleteError',
        logMessage: 'Could not delete milestone.',
      });
      setError(`Impossible de supprimer le milestone. ${getUserErrorMessage(deleteError, t)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={cn('space-y-4', className)} aria-labelledby="milestone-manager-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-xs font-black uppercase tracking-[0.22em] text-status-quest">
            Milestones
          </p>
          <h3 id="milestone-manager-title" className="text-2xl font-bold">
            Jauge de progression
          </h3>
        </div>
        <AddButton
          onClick={createMilestone}
          disabled={!gameId || isSaving}
          className="text-xs"
        >
          Ajouter
        </AddButton>
      </div>

      {error ? <p className="text-sm font-semibold text-status-danger">{error}</p> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {milestones.map((milestone) => (
          <article
            key={milestone.id}
            className="rounded-2xl border border-gaming-border bg-gaming-card/95 p-4 shadow-card"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <EditableText
                  value={milestone.labelI18nKey}
                  ariaLabel="Nom du milestone"
                  className="font-display text-lg font-black text-text-primary"
                  onCommit={(label) => updateMilestone(milestone, { label })}
                />
                <EditableText
                  value={milestone.descriptionI18nKey || ''}
                  ariaLabel="Description du milestone"
                  placeholder="Description..."
                  className="text-sm font-medium text-text-muted"
                  onCommit={(description) => updateMilestone(milestone, { description })}
                />
                <label className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                  Seuil
                  <input
                    type="number"
                    min={0}
                    value={milestone.cost}
                    disabled={isSaving}
                    onChange={(event) =>
                      updateMilestone(milestone, { cost: Number(event.currentTarget.value || 0) })
                    }
                    className="input input-bordered input-sm w-28 bg-gaming-base text-text-primary"
                  />
                </label>
              </div>
              <DeleteButton
                onConfirm={() => removeMilestone(milestone)}
                holdDuration={1000}
                disabled={isSaving}
                aria-label={`Supprimer ${milestone.labelI18nKey}`}
                className="btn-sm h-8 w-8"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function EditableText({
  value,
  ariaLabel,
  placeholder,
  className,
  onCommit,
}: {
  value: string;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue !== value) onCommit(nextValue);
  };

  return (
    <input
      type="text"
      value={draft}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      className={cn('w-full rounded-lg bg-transparent outline-none focus:ring-2 focus:ring-status-quest', className)}
    />
  );
}

function toPayload(milestone: Partial<GameMilestone & GameMilestonePayload>): GameMilestonePayload {
  return {
    label: milestone.label || milestone.labelI18nKey || '',
    description: milestone.description || milestone.descriptionI18nKey || undefined,
    cost: Number(milestone.cost || 0),
    sortOrder: milestone.sortOrder,
  };
}

function sortMilestones(first: GameMilestone, second: GameMilestone) {
  return (first.sortOrder || 0) - (second.sortOrder || 0) || first.cost - second.cost;
}

export default GameMilestoneManager;
