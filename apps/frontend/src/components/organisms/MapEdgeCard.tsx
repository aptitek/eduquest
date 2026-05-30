import { useEffect, useMemo, useState } from 'react';
import type {
  Activity,
  GameActivityEdge,
  GameActivityEdgeAnimation,
  GameActivityEdgeStyleWindow,
} from '@eduquest/shared';
import { Route } from 'lucide-react';
import { EdgeAnimationSelector } from '../atoms/EdgeAnimationSelector';
import { EditableList } from '../molecules/EditableList';
import { ColorSwatchPicker } from '../molecules/ColorSwatchPicker';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../utils/cn';

interface MapEdgeCardProps {
  edge: GameActivityEdge;
  activities: Activity[];
  currentStep: number;
  isSaving?: boolean;
  error?: string | null;
  onChange: (
    edge: GameActivityEdge,
    styleWindows: GameActivityEdgeStyleWindow[],
    unlockPrerequisiteActivityIds: string[]
  ) => void | Promise<void>;
}

type TranslateFn = (path: string) => string;

export function MapEdgeCard({ edge, activities, currentStep, isSaving, error, onChange }: MapEdgeCardProps) {
  const { t } = useTranslation();
  const [styleWindows, setStyleWindows] = useState<GameActivityEdgeStyleWindow[]>(
    () => getStyleWindows(edge)
  );
  const [unlockPrerequisiteActivityIds, setUnlockPrerequisiteActivityIds] = useState<string[]>(
    () => getUnlockPrerequisiteActivityIds(edge)
  );
  const validationError = useMemo(() => validateStyleWindows(styleWindows, t), [styleWindows, t]);
  const fromActivity = activities.find((activity) => activity.id === edge.fromActivityId);
  const toActivity = activities.find((activity) => activity.id === edge.toActivityId);
  const selectableActivities = activities.filter((activity) => activity.id !== edge.toActivityId);
  const defaultAnimation = getDefaultEdgeAnimation(fromActivity, toActivity);

  useEffect(() => {
    setStyleWindows(getStyleWindows(edge));
    setUnlockPrerequisiteActivityIds(getUnlockPrerequisiteActivityIds(edge));
  }, [edge]);

  const updateWindow = (
    index: number,
    patch: Partial<GameActivityEdgeStyleWindow>
  ) => {
    applyStyleWindows(
      styleWindows.map((window, windowIndex) => (windowIndex === index ? { ...window, ...patch } : window))
    );
  };
  const addWindow = () => {
    applyStyleWindows([...styleWindows, { startStep: getNextStartStep(styleWindows), animation: defaultAnimation }]);
  };
  const removeWindow = (_window: GameActivityEdgeStyleWindow, index: number) => {
    applyStyleWindows(styleWindows.filter((_, windowIndex) => windowIndex !== index));
  };
  const applyStyleWindows = (nextWindows: GameActivityEdgeStyleWindow[]) => {
    setStyleWindows(nextWindows);
    if (!validateStyleWindows(nextWindows)) {
      void onChange(edge, nextWindows, unlockPrerequisiteActivityIds);
    }
  };
  const applyUnlockPrerequisites = (nextActivityIds: string[]) => {
    setUnlockPrerequisiteActivityIds(nextActivityIds);
    if (!validationError) {
      void onChange(edge, styleWindows, nextActivityIds);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-gaming-border bg-gaming-card/95 shadow-card">
      <div className="border-b border-gaming-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-status-quest/40 bg-status-quest/10 text-status-quest">
            <Route size={22} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-black text-text-primary">{t('mapEdgeCard.title')}</h2>
            <p className="text-sm leading-snug text-text-muted">
              <span className="block break-words">{fromActivity?.title || edge.fromActivityId}</span>
              <span className="block break-words">
                {formatTranslation(t('mapEdgeCard.edgePathTarget'), {
                  to: toActivity?.title || edge.toActivityId,
                })}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <section className="space-y-2">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
                {t('mapEdgeCard.fogConditions')}
              </h3>
              {isSaving ? <span className="text-xs font-bold text-status-quest">{t('mapEdgeCard.saving')}</span> : null}
            </div>
            <p className="text-xs text-text-muted">
              {formatTranslation(t('mapEdgeCard.help'), { currentStep })}
            </p>
          </div>

          <EditableList
            items={styleWindows}
            getKey={(_window, index) => `style-window-${index}`}
            renderItem={(window, index) => (
              <StyleWindowEditor
                window={window}
                index={index}
                currentStep={currentStep}
                defaultAnimation={defaultAnimation}
                t={t}
                onChange={(patch) => updateWindow(index, patch)}
              />
            )}
            onAdd={addWindow}
            onRemove={removeWindow}
            addLabel={t('mapEdgeCard.addInterval')}
            removeLabel={t('mapEdgeCard.removeInterval')}
            emptyState={t('mapEdgeCard.emptyState')}
            itemClassName="bg-gaming-base/60"
          />
        </section>

        <section className="space-y-2">
          <div>
            <h3 className="font-display text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
              {t('mapEdgeCard.unlockPrerequisites')}
            </h3>
            <p className="text-xs text-text-muted">
              {formatTranslation(t('mapEdgeCard.unlockPrerequisitesHelp'), {
                from: fromActivity?.title || edge.fromActivityId,
              })}
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-gaming-border bg-gaming-base/60 p-3">
            {selectableActivities.map((activity) => {
              const isChecked = unlockPrerequisiteActivityIds.includes(activity.id);

              return (
                <label
                  key={activity.id}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-text-secondary transition hover:bg-gaming-card/70"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(event) => {
                      const nextActivityIds = event.currentTarget.checked
                        ? [...unlockPrerequisiteActivityIds, activity.id]
                        : unlockPrerequisiteActivityIds.filter((id) => id !== activity.id);
                      applyUnlockPrerequisites(nextActivityIds);
                    }}
                    className="checkbox checkbox-sm border-gaming-border"
                  />
                  <span className="min-w-0 flex-1 truncate">{activity.title}</span>
                </label>
              );
            })}
            {selectableActivities.length === 0 ? (
              <p className="text-xs font-semibold text-text-muted">{t('mapEdgeCard.noUnlockPrerequisites')}</p>
            ) : null}
            <button
              type="button"
              onClick={() => applyUnlockPrerequisites([])}
              className="text-xs font-bold text-text-muted transition hover:text-status-quest"
            >
              {formatTranslation(t('mapEdgeCard.defaultUnlockPrerequisite'), {
                from: fromActivity?.title || edge.fromActivityId,
              })}
            </button>
          </div>
        </section>

        {validationError ? (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs font-semibold text-status-danger">
            {validationError}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs font-semibold text-status-danger">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StyleWindowEditor({
  window,
  index,
  currentStep,
  defaultAnimation,
  t,
  onChange,
}: {
  window: GameActivityEdgeStyleWindow;
  index: number;
  currentStep: number;
  defaultAnimation: GameActivityEdgeAnimation;
  t: TranslateFn;
  onChange: (patch: Partial<GameActivityEdgeStyleWindow>) => void;
}) {
  const isActive = isStepInsideStyleWindow(currentStep, window);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-text-muted">
          {formatTranslation(t('mapEdgeCard.intervalTitle'), { index: index + 1 })}
        </p>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.12em]',
            isActive
              ? 'border-status-quest/50 bg-status-quest/10 text-status-quest'
              : 'border-gaming-border bg-gaming-card text-text-muted'
          )}
        >
          {isActive ? t('mapEdgeCard.activeNow') : t('mapEdgeCard.inactive')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label={t('activityCard.afterStep')}
          value={window.startStep}
          min={0}
          onChange={(value) => onChange({ startStep: Number(value) || 0 })}
        />
        <NumberField
          label={t('activityCard.beforeStep')}
          value={window.endStep ?? ''}
          min={0}
          onChange={(value) => onChange({ endStep: value === '' ? undefined : Number(value) || 0 })}
        />
      </div>

      <ColorSelector
        value={window.color}
        onChange={(color) => onChange({ color })}
        onClear={() => onChange({ color: undefined })}
        t={t}
      />
      <EdgeAnimationSelector
        value={window.animation || defaultAnimation}
        onChange={(animation: GameActivityEdgeAnimation) => onChange({ animation })}
      />
    </div>
  );
}

function ColorSelector({
  value,
  onChange,
  onClear,
  t,
}: {
  value?: string;
  onChange: (value: string) => void;
  onClear: () => void;
  t: TranslateFn;
}) {
  return (
    <fieldset className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <legend className="font-bold text-text-secondary">{t('mapEdgeCard.color')}</legend>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-bold text-text-muted transition hover:text-status-quest"
        >
          {t('mapEdgeCard.defaultColor')}
        </button>
      </div>
      <ColorSwatchPicker
        value={value}
        onChange={onChange}
        variant="grid"
        useColorLabelKey="mapEdgeCard.useColor"
      />
    </fieldset>
  );
}

function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number | '';
  min?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="block font-bold text-text-secondary">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 font-mono text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
      />
    </label>
  );
}

function getStyleWindows(edge: GameActivityEdge): GameActivityEdgeStyleWindow[] {
  const windows = edge.metadata?.styleWindows;
  return Array.isArray(windows)
    ? windows.map((window) => {
        const animation = (window as { animation?: unknown }).animation;
        const endStep = (window as { endStep?: unknown }).endStep;
        return {
          ...window,
          endStep: endStep == null ? undefined : window.endStep,
          animation: animation === 'glow' ? 'pulse' : window.animation,
        };
      })
    : [];
}

function getUnlockPrerequisiteActivityIds(edge: GameActivityEdge) {
  const value = edge.metadata?.unlockPrerequisiteActivityIds;
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

function getNextStartStep(windows: GameActivityEdgeStyleWindow[]) {
  const lastEnd = windows.reduce((max, window) => Math.max(max, window.endStep ?? window.startStep + 2), 0);
  return lastEnd;
}

export function validateStyleWindows(windows: GameActivityEdgeStyleWindow[], t?: TranslateFn) {
  const translate = (path: string, fallback: string) => t?.(path) || fallback;
  const sorted = [...windows].sort((a, b) => a.startStep - b.startStep);

  for (const window of sorted) {
    if (!Number.isInteger(window.startStep) || window.startStep < 0) {
      return translate('mapEdgeCard.errors.startStep', 'Start step must be a non-negative integer.');
    }
    if (
      window.endStep != null &&
      (!Number.isInteger(window.endStep) || window.endStep <= window.startStep)
    ) {
      return translate('mapEdgeCard.errors.endStep', 'End step must be greater than start step.');
    }
  }

  for (let index = 1; index < sorted.length; index++) {
    if (styleWindowsOverlap(sorted[index - 1], sorted[index])) {
      return translate('mapEdgeCard.errors.overlap', 'Intervals cannot overlap.');
    }
  }

  return null;
}

function styleWindowsOverlap(
  first: Pick<GameActivityEdgeStyleWindow, 'startStep' | 'endStep'>,
  second: Pick<GameActivityEdgeStyleWindow, 'startStep' | 'endStep'>
) {
  const firstMin = first.startStep;
  const firstMax = first.endStep == null ? Number.POSITIVE_INFINITY : first.endStep - 1;
  const secondMin = second.startStep;
  const secondMax = second.endStep == null ? Number.POSITIVE_INFINITY : second.endStep - 1;

  return firstMin <= secondMax && secondMin <= firstMax;
}

function isStepInsideStyleWindow(step: number, window: GameActivityEdgeStyleWindow) {
  return step >= window.startStep && (window.endStep == null || step < window.endStep);
}

function getDefaultEdgeAnimation(
  fromActivity: Activity | undefined,
  toActivity: Activity | undefined
): GameActivityEdgeAnimation {
  return !fromActivity ||
    !toActivity ||
    !fromActivity.isRevealed ||
    !toActivity.isRevealed ||
    fromActivity.isLocked ||
    toActivity.isLocked
    ? 'disabled'
    : 'none';
}

function formatTranslation(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );
}

export default MapEdgeCard;
