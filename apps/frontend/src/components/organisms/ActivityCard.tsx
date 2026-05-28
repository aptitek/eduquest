import { useEffect, useState, type FormEvent, type MouseEvent } from 'react';
import {
  Anvil,
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
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  ActivityParticipationMode,
  ActivityStepRange,
  BossActivityAnswerField,
  BossActivitySubmissionField,
} from '@eduquest/shared';
import type { ActivityCompletionDraft } from '../../features/game/api';
import {
  PlayingCard,
  type PlayingCardEditableField,
  type PlayingCardSide,
} from '../molecules/PlayingCard';
import { EditableList } from '../molecules/EditableList';
import { QuestCompletionAction } from '../molecules/QuestCompletionAction';
import { EditableIcon } from '../atoms/EditableIcon';
import { EditableText } from '../atoms/EditableText';
import { useTranslation } from '../../hooks/useTranslation';
import { SOLARIZED_SWATCH_OPTIONS, resolveColorTextClassName } from '../../styles/colorTokens';
import { cn } from '../../utils/cn';

const PUBLIC_ICON_MAP: Record<string, LucideIcon> = {
  Anvil,
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
  UserCheck,
  'user-check': UserCheck,
  anvil: Anvil,
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

const CARD_COLOR_OPTIONS = SOLARIZED_SWATCH_OPTIONS;

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
  answerFields?: BossActivityAnswerField[];
}

export interface ActivityCardProps {
  activity?: ActivityCardData;
  canEdit?: boolean;
  showCompletionAction?: boolean;
  isCompleted?: boolean;
  isResolving?: boolean;
  resolveError?: string | null;
  onResolve?: (draft?: ActivityCompletionDraft) => void | Promise<void>;
  onTitleChange?: (title: string) => void | Promise<void>;
  onSubtitleChange?: (subtitle: string) => void | Promise<void>;
  onDescriptionChange?: (description: string) => void | Promise<void>;
  onGoldRewardChange?: (goldReward: number) => void | Promise<void>;
  onResourcesChange?: (resources: ActivityResourceLink[]) => void | Promise<void>;
  onPositionChange?: (position: { mapX: number; mapY: number }) => void | Promise<void>;
  onParticipationModeChange?: (participationMode: ActivityParticipationMode) => void | Promise<void>;
  onIconChange?: (iconId: string) => void | Promise<void>;
  onCardColorChange?: (cardColor: string) => void | Promise<void>;
  onIllustrationUrlChange?: (illustrationUrl: string) => void | Promise<void>;
  onStepRangesChange?: (stepRanges: ActivityStepRange[]) => void | Promise<void>;
  emptyCardLabel?: string;
  onEmptyCardClick?: () => void;
  className?: string;
}

export function ActivityCard({
  activity,
  canEdit = false,
  showCompletionAction = true,
  isCompleted = false,
  isResolving = false,
  resolveError,
  onResolve,
  onTitleChange,
  onSubtitleChange,
  onDescriptionChange,
  onGoldRewardChange,
  onResourcesChange,
  onPositionChange,
  onParticipationModeChange,
  onIconChange,
  onCardColorChange,
  onIllustrationUrlChange,
  onStepRangesChange,
  emptyCardLabel,
  onEmptyCardClick,
  className,
}: ActivityCardProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ActivityCardData | undefined>(activity);
  const hasBossAnswerFields = Boolean(
    showCompletionAction && !isCompleted && draft?.answerFields?.length
  );

  useEffect(() => {
    setDraft(activity);
  }, [activity]);

  if (!draft) {
    return (
      <div
        className={cn(
          'flex min-h-0 justify-center',
          className
        )}
      >
        <div className="relative flex h-full min-h-0 w-fit max-w-full justify-center">
          <PlayingCard
            size="full"
            kind="activity"
            accentToken="quest"
            title={emptyCardLabel || t('activityCard.emptyState')}
            faceDown
            editable={Boolean(onEmptyCardClick)}
            interactive={Boolean(onEmptyCardClick)}
            onClick={onEmptyCardClick}
            className="h-full max-h-full w-auto max-w-full"
            sideClassName="h-full"
          />
        </div>
      </div>
    );
  }

  const updateDraft = (updater: (current: ActivityCardData) => ActivityCardData) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const updateNumber = (field: 'mapX' | 'mapY', value: string) => {
    const nextValue = Number(value) || 0;
    const nextPosition = {
      mapX: field === 'mapX' ? nextValue : draft.mapX,
      mapY: field === 'mapY' ? nextValue : draft.mapY,
    };
    updateDraft((current) => ({ ...current, [field]: nextValue }));
    void onPositionChange?.(nextPosition);
  };
  const updateCardColor = (cardColor: string) => {
    updateDraft((current) => ({ ...current, cardColor: cardColor || undefined }));
    void onCardColorChange?.(cardColor);
  };
  const updateParticipationMode = (participationMode: ActivityParticipationMode) => {
    updateDraft((current) => ({ ...current, participationMode }));
    void onParticipationModeChange?.(participationMode);
  };
  const updateIcon = (selectedIcon: string) => {
    updateDraft((current) => ({ ...current, selectedIcon }));
    void onIconChange?.(selectedIcon);
  };

  const updateCardField = (field: PlayingCardEditableField, value: string) => {
    updateDraft((current) => {
      if (field === 'ribbonText') return { ...current, goldReward: Number(value) || 0 };
      if (field === 'illustrationUrl') return { ...current, illustrationUrl: value || undefined };
      if (field === 'title' || field === 'subtitle' || field === 'description') {
        return { ...current, [field]: value };
      }
      return current;
    });
    if (field === 'title') {
      void onTitleChange?.(value);
    }
    if (field === 'subtitle') {
      void onSubtitleChange?.(value);
    }
    if (field === 'description') {
      void onDescriptionChange?.(value);
    }
    if (field === 'ribbonText') {
      void onGoldRewardChange?.(Number(value) || 0);
    }
    if (field === 'illustrationUrl') {
      void onIllustrationUrlChange?.(value);
    }
  };

  const applyResources = (resources: ActivityResourceLink[]) => {
    updateDraft((current) => ({ ...current, resources }));
    const hasOnlyCommittedRows = resources.every((resource) => resource.url.trim());
    const removedRows = resources.length < draft.resources.length;
    if (hasOnlyCommittedRows || removedRows) {
      void onResourcesChange?.(resources);
    }
  };

  const applyStepRanges = (stepRanges: ActivityStepRange[]) => {
    updateDraft((current) => ({ ...current, stepRanges }));
    void onStepRangesChange?.(stepRanges);
  };

  const updateStepRange = (index: number, field: keyof ActivityStepRange, value: string) => {
    const stepRanges = draft.stepRanges.map((range, rangeIndex) =>
      rangeIndex === index
        ? {
            ...range,
            [field]: value === '' && field === 'endStep' ? undefined : Number(value) || 0,
          }
        : range
    );
    applyStepRanges(stepRanges);
  };
  const addStepRange = () => {
    applyStepRanges([...draft.stepRanges, { startStep: 0 }]);
  };
  const removeStepRange = (index: number) => {
    applyStepRanges(draft.stepRanges.filter((_, rangeIndex) => rangeIndex !== index));
  };
  const activityFront = buildActivityFrontSide({
    activity: draft,
    canEdit,
    onResourcesChange: applyResources,
    onIconSelect: updateIcon,
    onFieldChange: updateCardField,
  });

  return (
    <div
      className={cn(
        'flex min-h-0 justify-center',
        hasBossAnswerFields
          ? 'flex-col items-center gap-4 overflow-y-auto pb-4'
          : showCompletionAction && 'pb-28 pr-24',
        className
      )}
    >
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
          back={
            canEdit ? (
              <ActivityCardBack
                activity={draft}
                onNumberChange={updateNumber}
                onIllustrationUrlChange={(value) => updateCardField('illustrationUrl', value)}
                onCardColorChange={updateCardColor}
                onParticipationModeChange={updateParticipationMode}
                onStepRangeChange={updateStepRange}
                onStepRangeAdd={addStepRange}
                onStepRangeRemove={removeStepRange}
                t={t}
              />
            ) : undefined
          }
          flipLabel={t('activityCard.flipAdminView')}
          className="h-full max-h-full w-auto max-w-full"
          sideClassName="h-full"
        />
        {showCompletionAction && !hasBossAnswerFields ? (
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
                completeLabel={
                  draft.participationMode === 'guild'
                    ? t('activityCard.vote')
                    : t('activityCard.complete')
                }
                completedLabel={t('activityCard.questResolved')}
              />
            </div>
          </div>
        ) : null}
      </div>
      {hasBossAnswerFields ? (
        <BossSubmissionForm
          fields={draft.answerFields || []}
          isResolving={isResolving}
          error={resolveError}
          onSubmit={onResolve}
          t={t}
        />
      ) : null}
    </div>
  );
}

function BossSubmissionForm({
  fields,
  isResolving,
  error,
  onSubmit,
  t,
}: {
  fields: BossActivityAnswerField[];
  isResolving?: boolean;
  error?: string | null;
  onSubmit?: (draft?: ActivityCompletionDraft) => void | Promise<void>;
  t: (path: string) => string;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File[]>>({});

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answerPayload: Array<Pick<BossActivitySubmissionField, 'fieldId' | 'value'>> = fields
      .filter((field) => field.kind !== 'file')
      .map((field) => ({ fieldId: field.id, value: answers[field.id]?.trim() || '' }));

    void onSubmit?.({ answers: answerPayload, files });
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-xl space-y-3 rounded-2xl border border-status-boss/30 bg-gaming-card/95 p-4 shadow-card"
    >
      <div>
        <h3 className="font-display text-sm font-black uppercase tracking-[0.18em] text-status-boss">
          {t('activityCard.bossSubmission')}
        </h3>
        <p className="text-xs text-text-muted">{t('activityCard.bossSubmissionHelp')}</p>
      </div>

      {fields.map((field) => (
        <BossSubmissionField
          key={field.id}
          field={field}
          value={answers[field.id] || ''}
          files={files[field.id] || []}
          onValueChange={(value) => setAnswers((current) => ({ ...current, [field.id]: value }))}
          onFilesChange={(nextFiles) =>
            setFiles((current) => ({ ...current, [field.id]: nextFiles }))
          }
          t={t}
        />
      ))}

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-status-danger/40 bg-status-danger/10 px-3 py-2 text-xs font-semibold text-status-danger"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className="btn w-full border-none bg-status-boss text-gaming-base"
        disabled={isResolving || !onSubmit}
      >
        {isResolving ? t('activityCard.submitting') : t('activityCard.submitBossAnswer')}
      </button>
    </form>
  );
}

function BossSubmissionField({
  field,
  value,
  files,
  onValueChange,
  onFilesChange,
  t,
}: {
  field: BossActivityAnswerField;
  value: string;
  files: File[];
  onValueChange: (value: string) => void;
  onFilesChange: (files: File[]) => void;
  t: (path: string) => string;
}) {
  const maxFiles = field.maxFiles || 1;
  const maxBytes = field.maxBytes || 10 * 1024 * 1024;

  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-bold text-text-secondary">
        {field.label}
        {field.required ? <span className="text-status-danger"> *</span> : null}
      </span>
      {field.kind === 'file' ? (
        <>
          <input
            type="file"
            required={field.required}
            multiple={maxFiles > 1}
            accept={field.accept}
            onChange={(event) =>
              onFilesChange(Array.from(event.target.files || []).slice(0, maxFiles))
            }
            className="file-input file-input-bordered w-full border-gaming-border bg-gaming-base text-sm"
          />
          <p className="text-xs text-text-muted">
            {files.length > 0
              ? t('activityCard.filesSelected')
                  .replace('{count}', String(files.length))
                  .replace('{max}', String(maxFiles))
              : t('activityCard.fileLimit')
                  .replace('{max}', String(maxFiles))
                  .replace('{size}', formatBytes(maxBytes))}
          </p>
        </>
      ) : (
        <input
          type={field.kind === 'url' ? 'url' : 'text'}
          required={field.required}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onValueChange(event.target.value)}
          className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
        />
      )}
      {field.helpText ? <p className="text-xs text-text-muted">{field.helpText}</p> : null}
    </label>
  );
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function buildActivityFrontSide({
  activity,
  canEdit,
  onResourcesChange,
  onIconSelect,
  onFieldChange,
}: {
  activity: ActivityCardData;
  canEdit: boolean;
  onResourcesChange: (resources: ActivityResourceLink[]) => void;
  onIconSelect: (iconName: string) => void;
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
      <ActivityIcon
        iconId={activity.selectedIcon}
        size={72}
        color={activity.cardColor}
        canEdit={canEdit}
        onChange={onIconSelect}
      />
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
  const { t } = useTranslation();

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
      onRemove={
        canEdit
          ? (_resource, index) => onChange(resources.filter((_, itemIndex) => itemIndex !== index))
          : undefined
      }
      addLabel={t('activityCard.addResource')}
      removeLabel={t('activityCard.removeResource')}
      emptyState={t('activityCard.noResources')}
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
  const { t } = useTranslation();
  const faviconUrl = getFaviconUrl(resource.url);
  const isInternalResource = resource.url === '#profile' || resource.url === '#character';
  const resourceLabel = resource.title || resource.url;

  const handleResourceClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isInternalResource) return;

    event.preventDefault();
    if (resource.url === '#profile') {
      window.dispatchEvent(new CustomEvent('eduquest:open-profile-dropdown'));
      return;
    }

    window.location.hash = 'character';
  };

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
          placeholder={t('activityCard.resourceUrlPlaceholder')}
          className="min-w-0 text-sm text-text-secondary"
          truncate={false}
        />
      ) : resource.url ? (
        <a
          href={resource.url}
          target={isInternalResource ? undefined : '_blank'}
          rel={isInternalResource ? undefined : 'noreferrer'}
          onClick={handleResourceClick}
          className="min-w-0 truncate text-sm font-semibold text-status-quest hover:underline"
        >
          {resourceLabel}
        </a>
      ) : (
        <span className="text-sm text-text-muted">{t('activityCard.emptyResource')}</span>
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
  onNumberChange: (field: 'mapX' | 'mapY', value: string) => void;
  onIllustrationUrlChange: (illustrationUrl: string) => void;
  onCardColorChange: (cardColor: string) => void;
  onParticipationModeChange: (participationMode: ActivityParticipationMode) => void;
  onStepRangeChange: (index: number, field: keyof ActivityStepRange, value: string) => void;
  onStepRangeAdd: () => void;
  onStepRangeRemove: (index: number) => void;
  t: (path: string) => string;
}

function ActivityCardBack({
  activity,
  onNumberChange,
  onIllustrationUrlChange,
  onCardColorChange,
  onParticipationModeChange,
  onStepRangeChange,
  onStepRangeAdd,
  onStepRangeRemove,
  t,
}: ActivityCardBackProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] bg-gaming-card text-text-primary">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pr-4">
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="X"
              value={activity.mapX}
              onChange={(value) => onNumberChange('mapX', value)}
            />
            <NumberField
              label="Y"
              value={activity.mapY}
              onChange={(value) => onNumberChange('mapY', value)}
            />
          </div>
        </section>

        <section className="space-y-3">
          <label className="space-y-1.5 text-sm">
            <span className="font-bold text-text-secondary">{t('activityCard.illustrationUrl')}</span>
            <EditableText
              value={activity.illustrationUrl || ''}
              onChange={onIllustrationUrlChange}
              placeholder={t('activityCard.illustrationUrlPlaceholder')}
              className="min-w-0 text-sm text-text-secondary"
              truncate={false}
            />
          </label>
          <ActivityColorSelector value={activity.cardColor} onChange={onCardColorChange} />
          <label className="space-y-1.5 text-sm">
            <span className="font-bold text-text-secondary">{t('activityCard.activityMode')}</span>
            <select
              value={activity.participationMode}
              onChange={(event) =>
                onParticipationModeChange(event.target.value as ActivityParticipationMode)
              }
              className="w-full rounded-xl border border-gaming-border bg-gaming-base px-3 py-2 text-sm outline-none transition focus:border-status-quest focus:ring-2 focus:ring-status-quest/30"
            >
              <option value="solo">{t('activityCard.modeSolo')}</option>
              <option value="guild">{t('activityCard.modeGuild')}</option>
            </select>
          </label>
        </section>

        <section className="space-y-3 pb-2">
          <h4 className="font-display text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
            {t('activityCard.visibility')}
          </h4>
          <div className="space-y-3 rounded-xl border border-gaming-border bg-gaming-base p-3">
            <EditableList
              items={activity.stepRanges}
              getKey={(range, index) => `${range.startStep}-${range.endStep ?? 'open'}-${index}`}
              renderItem={(range, index) => (
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label={t('activityCard.afterStep')}
                    value={range.startStep}
                    min={0}
                    onChange={(value) => onStepRangeChange(index, 'startStep', value)}
                  />
                  <NumberField
                    label={t('activityCard.beforeStep')}
                    value={range.endStep ?? ''}
                    min={0}
                    onChange={(value) => onStepRangeChange(index, 'endStep', value)}
                  />
                </div>
              )}
              onAdd={onStepRangeAdd}
              onRemove={(_range, index) => onStepRangeRemove(index)}
              addLabel={t('activityCard.addWindow')}
              removeLabel={t('activityCard.removeWindow')}
              emptyState={t('activityCard.noStepWindows')}
              itemClassName="bg-gaming-card/40"
            />
          </div>
          <div className="space-y-1.5 text-sm">
            <span className="font-bold text-text-secondary">{t('activityCard.adjacentNodes')}</span>
            <EditableList
              items={activity.adjacentNodes}
              getKey={(node, index) => `${node || 'adjacent-node'}-${index}`}
              renderItem={(node) => (
                <span className="min-w-0 truncate text-sm text-text-secondary">
                  {node || t('activityCard.adjacentNodePlaceholder')}
                </span>
              )}
              addLabel={t('activityCard.addAdjacentNode')}
              removeLabel={t('activityCard.removeAdjacentNode')}
              emptyState={t('activityCard.noAdjacentNodes')}
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
  const { t } = useTranslation();
  const selectedValue = value || CARD_COLOR_OPTIONS[5].value;

  return (
    <fieldset className="space-y-1.5">
      <legend className="font-bold text-text-secondary">{t('activityCard.cardColor')}</legend>
      <div className="grid grid-cols-9 gap-1.5">
        {CARD_COLOR_OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;
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
              aria-label={t('activityCard.useCardColor').replace('{color}', label)}
              aria-pressed={isSelected}
              title={label}
            >
              <span
                className={cn('block h-full w-full rounded-md shadow-sm', option.className)}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ActivityIcon({
  iconId,
  size = 24,
  color,
  canEdit,
  onChange,
}: {
  iconId: string;
  size?: number;
  color?: string;
  canEdit?: boolean;
  onChange?: (iconId: string) => void;
}) {
  const Icon = PUBLIC_ICON_MAP[iconId] || Sparkles;
  const iconClassName = color ? resolveColorTextClassName(color) : undefined;

  if (canEdit && onChange) {
    return (
      <EditableIcon
        value={iconId}
        onChange={onChange}
        size={size}
        label="Change activity icon"
        searchPlaceholder="Search activity icons..."
        buttonClassName="h-full w-full rounded-none text-[color:var(--playing-card-accent)]"
        iconClassName={iconClassName}
      />
    );
  }

  return <Icon size={size} aria-hidden className={iconClassName} />;
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
