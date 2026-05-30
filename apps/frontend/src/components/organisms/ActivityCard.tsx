import { useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import {
  Activity as ActivityGlyph,
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
import { PlayingCard, type PlayingCardFaceSlots } from '../molecules/PlayingCard';
import { EditableList } from '../molecules/EditableList';
import { QuestCompletionAction } from '../molecules/QuestCompletionAction';
import { EditableIcon } from '../atoms/EditableIcon';
import { EditableText } from '../atoms/EditableText';
import { useTranslation } from '../../hooks/useTranslation';
import { resolveColorTextClassName } from '../../styles/colorTokens';
import { cn } from '../../utils/cn';

const PUBLIC_ICON_MAP: Record<string, LucideIcon> = {
  Activity: ActivityGlyph,
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
  activity: ActivityGlyph,
};

type ActivityCardEditableField = 'title' | 'subtitle' | 'description' | 'art' | 'type';

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
  completionProgressTarget?: number;
  completionProgressValue?: number;
  isCompletionPending?: boolean;
  completionPendingLabel?: string;
  onResolve?: (draft?: ActivityCompletionDraft) => void | Promise<void>;
  onTitleChange?: (title: string) => void | Promise<void>;
  onSubtitleChange?: (subtitle: string) => void | Promise<void>;
  onDescriptionChange?: (description: string) => void | Promise<void>;
  onGoldRewardChange?: (goldReward: number) => void | Promise<void>;
  onResourcesChange?: (resources: ActivityResourceLink[]) => void | Promise<void>;
  onParticipationModeChange?: (participationMode: ActivityParticipationMode) => void | Promise<void>;
  onIconChange?: (iconId: string) => void | Promise<void>;
  onCardColorChange?: (cardColor: string) => void | Promise<void>;
  onIllustrationUrlChange?: (illustrationUrl: string) => void | Promise<void>;
  onIllustrationUpload?: (file: File) => Promise<string | void>;
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
  completionProgressTarget,
  completionProgressValue,
  isCompletionPending,
  completionPendingLabel,
  onResolve,
  onTitleChange,
  onSubtitleChange,
  onDescriptionChange,
  onGoldRewardChange,
  onResourcesChange,
  onParticipationModeChange,
  onIconChange,
  onCardColorChange,
  onIllustrationUrlChange,
  onIllustrationUpload,
  onStepRangesChange,
  emptyCardLabel,
  onEmptyCardClick,
  className,
}: ActivityCardProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ActivityCardData | undefined>(activity);
  const wasEmptyActivityRef = useRef(!activity);
  const [isRevealingSelectedActivity, setIsRevealingSelectedActivity] = useState(false);
  const hasBossAnswerFields = Boolean(
    showCompletionAction && !isCompleted && draft?.answerFields?.length
  );

  useEffect(() => {
    if (activity && wasEmptyActivityRef.current) {
      setIsRevealingSelectedActivity(true);
      wasEmptyActivityRef.current = false;
      setDraft(activity);
      return;
    }

    wasEmptyActivityRef.current = !activity;
    if (!activity) setIsRevealingSelectedActivity(false);
    setDraft(activity);
  }, [activity]);

  if (!draft) {
    return (
      <div
        className={cn(
          'flex h-full min-h-0 justify-center',
          showCompletionAction && 'pb-28 pr-24',
          className
        )}
      >
        <div className="relative flex h-full min-h-0 w-fit max-w-full justify-center">
          <PlayingCard
            size="page"
            presentation={{ fit: 'contain' }}
            kind="activity"
            accentToken="quest"
            model={{
              front: {
                title: { value: emptyCardLabel || t('activityCard.emptyState') },
                icon: { value: 'Activity' },
                back: {},
              },
            }}
            interactive={Boolean(onEmptyCardClick)}
            onClick={onEmptyCardClick}
          />
        </div>
      </div>
    );
  }

  const updateDraft = (updater: (current: ActivityCardData) => ActivityCardData) => {
    setDraft((current) => (current ? updater(current) : current));
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

  const updateCardField = (field: ActivityCardEditableField, value: string) => {
    updateDraft((current) => {
      if (field === 'type') return { ...current, goldReward: Number(value) || 0 };
      if (field === 'art') return { ...current, illustrationUrl: value || undefined };
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
    if (field === 'type') {
      void onGoldRewardChange?.(Number(value) || 0);
    }
    if (field === 'art') {
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
    const normalizedStepRanges = normalizeActivityStepRanges(stepRanges);
    updateDraft((current) => ({ ...current, stepRanges: normalizedStepRanges }));
    void onStepRangesChange?.(normalizedStepRanges);
  };

  const updateStepRange = (index: number, field: keyof ActivityStepRange, value: string) => {
    const stepRanges = draft.stepRanges.map((range, rangeIndex) =>
      rangeIndex === index
        ? normalizeActivityStepRange(range, field, value)
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
  const completionAction =
    showCompletionAction && !hasBossAnswerFields ? (
      <QuestCompletionAction
        isCompleted={isCompleted}
        isResolving={isResolving}
        error={resolveError}
        onComplete={onResolve}
        mode={draft.participationMode}
        progressTarget={completionProgressTarget}
        progressValue={completionProgressValue}
        isPending={isCompletionPending}
        pendingLabel={completionPendingLabel}
        completeLabel={
          draft.participationMode === 'guild'
            ? t('activityCard.vote')
            : t('activityCard.complete')
        }
        completedLabel={t('activityCard.questResolved')}
      />
    ) : undefined;
  const activityFront = buildActivityFace({
    activity: draft,
    canEdit,
    onResourcesChange: applyResources,
    onIconSelect: updateIcon,
    onColorChange: updateCardColor,
    onFieldChange: updateCardField,
    onIllustrationUpload,
    actions: completionAction,
  });

  return (
    <div
      className={cn(
        'flex h-full min-h-0 justify-center',
        hasBossAnswerFields
          ? 'flex-col items-center gap-4 overflow-y-auto pb-4'
          : showCompletionAction && 'pb-28 pr-24',
        className
      )}
    >
      <div className="relative flex h-full min-h-0 w-fit max-w-full justify-center">
        <PlayingCard
          size="page"
          accentToken="quest"
          model={{
            front: isRevealingSelectedActivity ? 'none' : activityFront,
            back: isRevealingSelectedActivity
              ? activityFront
              : canEdit
                ? {
                    title: { value: '', variant: 'title' },
                    art: {
                      node: (
                        <ActivityCardBack
                          activity={draft}
                          onParticipationModeChange={updateParticipationMode}
                          onStepRangeChange={updateStepRange}
                          onStepRangeAdd={addStepRange}
                          onStepRangeRemove={removeStepRange}
                          t={t}
                        />
                      ),
                      alt: draft.title,
                    },
                  }
                : undefined,
          }}
          autoFlipToBack={isRevealingSelectedActivity}
          onAutoFlipComplete={() => setIsRevealingSelectedActivity(false)}
          flipLabel={t('activityCard.flipAdminView')}
          presentation={{ fit: 'contain' }}
        />
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

function buildActivityFace({
  activity,
  canEdit,
  onResourcesChange,
  onIconSelect,
  onColorChange,
  onFieldChange,
  onIllustrationUpload,
  actions,
}: {
  activity: ActivityCardData;
  canEdit: boolean;
  onResourcesChange: (resources: ActivityResourceLink[]) => void;
  onIconSelect: (iconName: string) => void;
  onColorChange: (cardColor: string) => void;
  onFieldChange: (field: ActivityCardEditableField, value: string) => void;
  onIllustrationUpload?: (file: File) => Promise<string | void>;
  actions?: ReactNode;
}): PlayingCardFaceSlots {
  const showUploadTarget = canEdit && Boolean(onIllustrationUpload);

  return {
    title: {
      value: activity.title,
      variant: 'title',
      editable: canEdit,
      onChange: (value) => onFieldChange('title', value),
      placeholder: 'Activity title',
    },
    subtitle: {
      value: activity.subtitle,
      variant: 'subtitle',
      editable: canEdit,
      onChange: (value) => onFieldChange('subtitle', value),
      placeholder: 'Activity subtitle',
    },
    color: {
      value: activity.cardColor,
      editable: canEdit,
      onChange: onColorChange,
    },
    art: {
      value: activity.illustrationUrl,
      alt: activity.illustrationAlt,
      node: activity.illustrationUrl || showUploadTarget ? undefined : null,
      editable: canEdit,
      upload: onIllustrationUpload,
      onChange: (value) => onFieldChange('art', value),
    },
    icon: {
      value: activity.selectedIcon,
      editable: canEdit,
      onChange: onIconSelect,
      icon: (
        <ActivityIcon
          iconId={activity.selectedIcon}
          size={52}
          color={activity.cardColor}
          canEdit={canEdit}
          onChange={onIconSelect}
        />
      ),
      colored: true,
    },
    type: {
      variant: 'cost',
      text: {
        value: String(activity.goldReward),
        variant: 'ribbon',
        editable: canEdit,
        onChange: (value) => onFieldChange('type', value),
      },
      icon: { icon: <Coins size={18} aria-hidden /> },
      position: 'top-right',
      className: 'bg-status-campfire text-solarized-base3',
      contentInteractive: canEdit,
    },
    info: {
      sections: [
        {
          id: 'description',
          description: {
            value: activity.description,
            variant: 'description',
            editable: canEdit,
            onChange: (value) => onFieldChange('description', value),
          },
        },
      ],
      content: (
        <ActivityCardFooter
          activity={activity}
          canEdit={canEdit}
          onResourcesChange={onResourcesChange}
        />
      ),
    },
    actions,
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
  const isInternalResource = ['#profile', '#character', '#annuaire', '#guild'].includes(resource.url);
  const resourceLabel = resource.title || resource.url;

  const handleResourceClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isInternalResource) return;

    event.preventDefault();
    if (resource.url === '#profile') {
      window.dispatchEvent(new CustomEvent('eduquest:open-profile-dropdown'));
      return;
    }

    window.location.hash = resource.url === '#character' ? 'character' : 'annuaire';
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
  onParticipationModeChange: (participationMode: ActivityParticipationMode) => void;
  onStepRangeChange: (index: number, field: keyof ActivityStepRange, value: string) => void;
  onStepRangeAdd: () => void;
  onStepRangeRemove: (index: number) => void;
  t: (path: string) => string;
}

function ActivityCardBack({
  activity,
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
              getKey={(_range, index) => `step-range-${index}`}
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
                    min={range.startStep + 1}
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
        </section>
      </div>
    </div>
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

function normalizeActivityStepRange(
  range: ActivityStepRange,
  field: keyof ActivityStepRange,
  value: string
): ActivityStepRange {
  if (field === 'startStep') {
    const startStep = toNonNegativeInteger(value);
    return {
      ...range,
      startStep,
      endStep:
        range.endStep == null
          ? undefined
          : Math.max(toNonNegativeIntegerValue(range.endStep), startStep + 1),
    };
  }

  if (value === '') {
    return { ...range, endStep: undefined };
  }

  return {
    ...range,
    endStep: Math.max(toNonNegativeInteger(value), toNonNegativeIntegerValue(range.startStep) + 1),
  };
}

function normalizeActivityStepRanges(stepRanges: ActivityStepRange[]) {
  return stepRanges.map((range) => {
    const startStep = toNonNegativeIntegerValue(range.startStep);
    return {
      startStep,
      endStep:
        range.endStep == null
          ? undefined
          : Math.max(toNonNegativeIntegerValue(range.endStep), startStep + 1),
    };
  });
}

function toNonNegativeInteger(value: string) {
  const parsedValue = Number(value);
  return toNonNegativeIntegerValue(parsedValue);
}

function toNonNegativeIntegerValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

export default ActivityCard;
