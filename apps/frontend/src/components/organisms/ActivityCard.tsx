import { lazy, Suspense, useEffect, useState } from 'react';
import {
  BookOpen,
  Castle,
  Coins,
  Compass,
  ExternalLink,
  Flame,
  Hammer,
  Map,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  TreePine,
  Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ActivityParticipationMode, ActivityStepRange } from '@eduquest/shared';
import { PlayingCard, type PlayingCardEditableField, type PlayingCardSide } from '../molecules/PlayingCard';
import { EditableList } from '../molecules/EditableList';
import { QuestCompletionAction } from '../molecules/QuestCompletionAction';
import { EditableText } from '../atoms/EditableText';
import { cn } from '../../utils/cn';

const LucideIconSelector = lazy(() =>
  import('../molecules/LucideIconSelector').then((module) => ({
    default: module.LucideIconSelector,
  }))
);

const PUBLIC_ICON_MAP: Record<string, LucideIcon> = {
  TreePine,
  ScrollText,
  Swords,
  Flame,
  Compass,
  BookOpen,
  Shield,
  Hammer,
  Sparkles,
  Trophy,
  Castle,
  Map,
  onboarding: Compass,
  character_creation: Sparkles,
  tavern: Castle,
  tutorial: BookOpen,
  ice_breaker: Sparkles,
  campfire: Flame,
  quiz: ScrollText,
  practical: Hammer,
  mini_boss: Shield,
  boss: Swords,
};

const CARD_COLOR_OPTIONS = [
  { label: 'Yellow', value: 'var(--color-solarized-yellow)', className: 'bg-solarized-yellow' },
  { label: 'Orange', value: 'var(--color-solarized-orange)', className: 'bg-solarized-orange' },
  { label: 'Red', value: 'var(--color-solarized-red)', className: 'bg-solarized-red' },
  { label: 'Magenta', value: 'var(--color-solarized-magenta)', className: 'bg-solarized-magenta' },
  { label: 'Violet', value: 'var(--color-solarized-violet)', className: 'bg-solarized-violet' },
  { label: 'Blue', value: 'var(--color-solarized-blue)', className: 'bg-solarized-blue' },
  { label: 'Cyan', value: 'var(--color-solarized-cyan)', className: 'bg-solarized-cyan' },
  { label: 'Green', value: 'var(--color-solarized-green)', className: 'bg-solarized-green' },
  { label: 'Base0', value: 'var(--color-solarized-base0)', className: 'bg-solarized-base0' },
] as const;

export interface ActivityResourceLink {
  title?: string;
  url: string;
}

export interface ActivityCardData {
  title: string;
  subtitle: string;
  description: string;
  illustrationUrl?: string;
  illustrationAlt: string;
  goldReward: number;
  cardColor?: string;
  participationMode: ActivityParticipationMode;
  resources: ActivityResourceLink[];
  selectedIcon: string;
  mapX: number;
  mapY: number;
  stepRanges: ActivityStepRange[];
  adjacentNodes: string[];
}

export interface ActivityCardProps {
  activity?: ActivityCardData;
  canEdit?: boolean;
  showCompletionAction?: boolean;
  isCompleted?: boolean;
  isResolving?: boolean;
  resolveError?: string | null;
  onResolve?: () => void | Promise<void>;
  className?: string;
}

export const MOCK_ACTIVITY_CARD: ActivityCardData = {
  title: 'La Forêt des Variables',
  subtitle: 'Pratique · Non gamifié',
  description:
    'Une clairière ancienne cache des fragments de logique. Les aventuriers doivent retrouver les constantes perdues et stabiliser les variables avant que la tempête ne referme le chemin.',
  illustrationUrl:
    'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=900&q=80',
  illustrationAlt: 'Mystical forest path for an EduQuest activity',
  goldReward: 120,
  cardColor: 'var(--color-solarized-blue)',
  participationMode: 'solo',
  resources: [{ title: 'Ressource intégrée Genially', url: 'https://view.genial.ly/placeholder' }],
  selectedIcon: 'TreePine',
  mapX: 340,
  mapY: 180,
  stepRanges: [{ startStep: 2, endStep: 5 }, { startStep: 8 }],
  adjacentNodes: ['Feu de camp Git', 'Pont des API'],
};

export function ActivityCard({
  activity = MOCK_ACTIVITY_CARD,
  canEdit = false,
  showCompletionAction = true,
  isCompleted = false,
  isResolving = false,
  resolveError,
  onResolve,
  className,
}: ActivityCardProps) {
  const [draft, setDraft] = useState(activity);

  useEffect(() => {
    setDraft(activity);
  }, [activity]);

  const updateNumber = (field: 'mapX' | 'mapY', value: string) => {
    setDraft((current) => ({ ...current, [field]: Number(value) || 0 }));
  };
  const updateCardColor = (cardColor: string) => {
    setDraft((current) => ({ ...current, cardColor: cardColor || undefined }));
  };
  const updateParticipationMode = (participationMode: ActivityParticipationMode) => {
    setDraft((current) => ({ ...current, participationMode }));
  };

  const updateCardField = (field: PlayingCardEditableField, value: string) => {
    setDraft((current) => {
      if (field === 'ribbonText') return { ...current, goldReward: Number(value) || 0 };
      if (field === 'illustrationUrl') return { ...current, illustrationUrl: value || undefined };
      if (field === 'title' || field === 'subtitle' || field === 'description') {
        return { ...current, [field]: value };
      }
      return current;
    });
  };

  const updateStepRange = (index: number, field: keyof ActivityStepRange, value: string) => {
    setDraft((current) => ({
      ...current,
      stepRanges: current.stepRanges.map((range, rangeIndex) =>
        rangeIndex === index
          ? { ...range, [field]: value === '' && field === 'endStep' ? undefined : Number(value) || 0 }
          : range
      ),
    }));
  };
  const addStepRange = () => {
    setDraft((current) => ({ ...current, stepRanges: [...current.stepRanges, { startStep: 0 }] }));
  };
  const removeStepRange = (index: number) => {
    setDraft((current) => ({
      ...current,
      stepRanges: current.stepRanges.filter((_, rangeIndex) => rangeIndex !== index),
    }));
  };
  const updateAdjacentNode = (index: number, value: string) => {
    setDraft((current) => ({
      ...current,
      adjacentNodes: current.adjacentNodes.map((node, nodeIndex) => (nodeIndex === index ? value : node)),
    }));
  };
  const addAdjacentNode = () => {
    setDraft((current) => ({ ...current, adjacentNodes: [...current.adjacentNodes, ''] }));
  };
  const removeAdjacentNode = (index: number) => {
    setDraft((current) => ({
      ...current,
      adjacentNodes: current.adjacentNodes.filter((_, nodeIndex) => nodeIndex !== index),
    }));
  };

  const activityFront = buildActivityFrontSide({
    activity: draft,
    canEdit,
    onResourcesChange: (resources) => setDraft((current) => ({ ...current, resources })),
    onFieldChange: updateCardField,
  });

  return (
    <div className={cn('flex min-h-0 justify-center', showCompletionAction && 'pb-28 pr-24', className)}>
      <div className="relative flex h-full min-h-0 w-fit max-w-full justify-center">
        <PlayingCard
          size="full"
          accentToken="quest"
          color={draft.cardColor}
          title={draft.title}
          subtitle={draft.subtitle}
          illustrationUrl={draft.illustrationUrl}
          illustrationAlt={draft.illustrationAlt}
          ribbonText={String(draft.goldReward)}
          ribbonIcon={<Coins size={18} aria-hidden />}
          ribbonClassName="bg-status-campfire text-solarized-base3"
          ribbonEditable={canEdit}
          front={activityFront}
          back={canEdit ? (
            <ActivityCardBack
              activity={draft}
              onIconSelect={(selectedIcon) => setDraft((current) => ({ ...current, selectedIcon }))}
              onNumberChange={updateNumber}
              onCardColorChange={updateCardColor}
              onParticipationModeChange={updateParticipationMode}
              onStepRangeChange={updateStepRange}
              onStepRangeAdd={addStepRange}
              onStepRangeRemove={removeStepRange}
              onAdjacentNodeChange={updateAdjacentNode}
              onAdjacentNodeAdd={addAdjacentNode}
              onAdjacentNodeRemove={removeAdjacentNode}
            />
          ) : undefined}
          flipLabel="Basculer vue étudiant/admin"
          className="h-full max-h-full w-auto max-w-full"
          sideClassName="h-full"
        />
        {showCompletionAction ? (
          <div
            className={cn(
              'pointer-events-none absolute z-30 flex',
              'bottom-0 right-0 translate-x-1/2 translate-y-1/2 justify-end'
            )}
          >
            <div className="pointer-events-auto">
              <QuestCompletionAction
                isCompleted={isCompleted}
                isResolving={isResolving}
                error={resolveError}
                onComplete={onResolve}
                mode={draft.participationMode}
                completeLabel={draft.participationMode === 'guild' ? 'Vote' : 'Complete'}
                completedLabel="Quest Resolved"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildActivityFrontSide({
  activity,
  canEdit,
  onResourcesChange,
  onFieldChange,
}: {
  activity: ActivityCardData;
  canEdit: boolean;
  onResourcesChange: (resources: ActivityResourceLink[]) => void;
  onFieldChange: (field: PlayingCardEditableField, value: string) => void;
}): PlayingCardSide {
  return {
    title: activity.title,
    subtitle: activity.subtitle,
    description: activity.description,
    color: activity.cardColor,
    illustrationUrl: activity.illustrationUrl,
    illustrationAlt: activity.illustrationAlt,
    illustration: activity.illustrationUrl ? undefined : (
      <ActivityIcon iconId={activity.selectedIcon} size={72} color={activity.cardColor} />
    ),
    ribbonText: String(activity.goldReward),
    ribbonIcon: <Coins size={18} aria-hidden />,
    ribbonPosition: 'top-right',
    editable: canEdit,
    ribbonEditable: canEdit,
    onFieldChange,
    footer: (
      <ActivityCardFooter
        activity={activity}
        canEdit={canEdit}
        onResourcesChange={onResourcesChange}
      />
    ),
    className: 'bg-gaming-card text-text-primary',
  };
}

function ActivityCardFooter({
  activity,
  canEdit,
  onResourcesChange,
}: {
  activity: ActivityCardData;
  canEdit: boolean;
  onResourcesChange: (resources: ActivityResourceLink[]) => void;
}) {
  const updateResourceUrl = (index: number, url: string) => {
    onResourcesChange(
      activity.resources.map((resource, resourceIndex) =>
        resourceIndex === index ? { ...resource, url } : resource
      )
    );
  };

  return (
    <div className="space-y-3">
      <ActivityResourceList
        resources={activity.resources}
        canEdit={canEdit}
        onChange={onResourcesChange}
        onUrlChange={updateResourceUrl}
      />
    </div>
  );
}

function ActivityResourceList({
  resources,
  canEdit,
  onChange,
  onUrlChange,
}: {
  resources: ActivityResourceLink[];
  canEdit: boolean;
  onChange: (resources: ActivityResourceLink[]) => void;
  onUrlChange: (index: number, url: string) => void;
}) {
  return (
    <EditableList
      items={resources}
      getKey={(resource, index) => `${resource.url || 'resource'}-${index}`}
      renderItem={(resource, index) => (
        <ResourceUrlRow
          resource={resource}
          canEdit={canEdit}
          onUrlChange={(url) => onUrlChange(index, url)}
        />
      )}
      onAdd={canEdit ? () => onChange([...resources, { url: '' }]) : undefined}
      onRemove={canEdit ? (_resource, index) => onChange(resources.filter((_, itemIndex) => itemIndex !== index)) : undefined}
      addLabel="Add Resource"
      removeLabel="Remove Resource"
      emptyState="No Resources Yet."
      className="text-sm"
    />
  );
}

function ResourceUrlRow({
  resource,
  canEdit,
  onUrlChange,
}: {
  resource: ActivityResourceLink;
  canEdit: boolean;
  onUrlChange: (url: string) => void;
}) {
  const faviconUrl = getFaviconUrl(resource.url);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gaming-border bg-gaming-card">
        {faviconUrl ? (
          <img src={faviconUrl} alt="" className="h-4 w-4 rounded-sm" loading="lazy" />
        ) : (
          <ExternalLink size={14} aria-hidden className="text-text-muted" />
        )}
      </span>

      {canEdit ? (
        <EditableText
          value={resource.url}
          onChange={onUrlChange}
          placeholder="https://example.com/resource"
          className="min-w-0 text-sm text-text-secondary"
          truncate={false}
        />
      ) : resource.url ? (
        <a
          href={resource.url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-sm font-semibold text-status-quest hover:underline"
        >
          {resource.url}
        </a>
      ) : (
        <span className="text-sm text-text-muted">Empty resource</span>
      )}
    </div>
  );
}

function getFaviconUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

interface ActivityCardBackProps {
  activity: ActivityCardData;
  onIconSelect: (iconName: string) => void;
  onNumberChange: (field: 'mapX' | 'mapY', value: string) => void;
  onCardColorChange: (cardColor: string) => void;
  onParticipationModeChange: (participationMode: ActivityParticipationMode) => void;
  onStepRangeChange: (index: number, field: keyof ActivityStepRange, value: string) => void;
  onStepRangeAdd: () => void;
  onStepRangeRemove: (index: number) => void;
  onAdjacentNodeChange: (index: number, value: string) => void;
  onAdjacentNodeAdd: () => void;
  onAdjacentNodeRemove: (index: number) => void;
}

function ActivityCardBack({
  activity,
  onIconSelect,
  onNumberChange,
  onCardColorChange,
  onParticipationModeChange,
  onStepRangeChange,
  onStepRangeAdd,
  onStepRangeRemove,
  onAdjacentNodeChange,
  onAdjacentNodeAdd,
  onAdjacentNodeRemove,
}: ActivityCardBackProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] bg-gaming-card text-text-primary">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pr-4">
        <section className="space-y-3">
          <Suspense
            fallback={
              <div className="rounded-xl border border-gaming-border bg-gaming-base px-3 py-4 text-sm text-text-muted">
                Loading icon selector...
              </div>
            }
          >
            <LucideIconSelector value={activity.selectedIcon} onChange={onIconSelect} />
          </Suspense>
        </section>

        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="X" value={activity.mapX} onChange={(value) => onNumberChange('mapX', value)} />
            <NumberField label="Y" value={activity.mapY} onChange={(value) => onNumberChange('mapY', value)} />
          </div>
        </section>

        <section className="space-y-3">
          <ActivityColorSelector value={activity.cardColor} onChange={onCardColorChange} />
          <label className="space-y-1.5 text-sm">
            <span className="font-bold text-text-secondary">Activity Mode</span>
            <select
              value={activity.participationMode}
              onChange={(event) =>
                onParticipationModeChange(event.target.value as ActivityParticipationMode)
              }
              className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
            >
              <option value="solo">Alone</option>
              <option value="guild">With Guild</option>
            </select>
          </label>
        </section>

        <section className="space-y-3 pb-2">
          <h4 className="font-display text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
            Visibility
          </h4>
          <div className="space-y-3 rounded-xl border border-gaming-border bg-gaming-base p-3">
            <EditableList
              items={activity.stepRanges}
              getKey={(range, index) => `${range.startStep}-${range.endStep ?? 'open'}-${index}`}
              renderItem={(range, index) => (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="After Step"
                    value={range.startStep}
                    min={0}
                    onChange={(value) => onStepRangeChange(index, 'startStep', value)}
                  />
                  <NumberField
                    label="Before Step"
                    value={range.endStep ?? ''}
                    min={0}
                    onChange={(value) => onStepRangeChange(index, 'endStep', value)}
                  />
                </div>
              )}
              onAdd={onStepRangeAdd}
              onRemove={(_range, index) => onStepRangeRemove(index)}
              addLabel="Add Window"
              removeLabel="Remove Window"
              emptyState="No Step Windows Yet."
              itemClassName="bg-gaming-card/40"
            />
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="font-bold text-text-secondary">Adjacent Nodes</span>
            <EditableList
              items={activity.adjacentNodes}
              getKey={(node, index) => `${node || 'adjacent-node'}-${index}`}
              renderItem={(node, index) => (
                <EditableText
                  value={node}
                  onChange={(value) => onAdjacentNodeChange(index, value)}
                  placeholder="Adjacent Node Title"
                  className="min-w-0 text-sm text-text-secondary"
                  truncate={false}
                />
              )}
              onAdd={onAdjacentNodeAdd}
              onRemove={(_node, index) => onAdjacentNodeRemove(index)}
              addLabel="Add Adjacent Node"
              removeLabel="Remove Adjacent Node"
              emptyState="No Adjacent Nodes Yet."
              itemClassName="bg-gaming-card/40"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityColorSelector({
  value,
  onChange,
}: {
  value?: string;
  onChange: (cardColor: string) => void;
}) {
  const selectedValue = value || CARD_COLOR_OPTIONS[5].value;

  return (
    <fieldset className="space-y-1.5">
      <legend className="font-bold text-text-secondary">Card Color</legend>
      <div className="grid grid-cols-9 gap-1.5">
        {CARD_COLOR_OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;

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
              aria-label={`Use ${option.label} card color`}
              aria-pressed={isSelected}
              title={option.label}
            >
              <span className={cn('block h-full w-full rounded-md shadow-sm', option.className)} aria-hidden />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ActivityIcon({ iconId, size = 24, color }: { iconId: string; size?: number; color?: string }) {
  const Icon = PUBLIC_ICON_MAP[iconId] || Sparkles;
  return <Icon size={size} aria-hidden style={color ? { color } : undefined} />;
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
    <label className="space-y-1.5 text-sm">
      <span className="font-bold text-text-secondary">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 font-mono text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
      />
    </label>
  );
}

export default ActivityCard;
