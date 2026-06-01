import { Hono, type Context } from 'hono';
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import {
  STUDENT_ATTRIBUTES,
  type Activity,
  type ActivityParticipationMode,
  type BossActivityAnswerField,
  type BossActivitySubmission,
  type BossActivitySubmissionFile,
  type ActivityStepRange,
  type CohortProgressData,
  type GameActivityCompletion,
  type GameActivityCompletionType,
  type GameActivityEdge,
  type GameCharacterMove,
  type GameCharacterClass,
  type GameStats,
  type GameActivityEdgeStyleWindow,
  type GameMapData,
  type GameMapNodeOccupancy,
  type GameMapRun,
  type GameRewardCardPayload,
  type GameMilestonePayload,
  type Guild,
  type GuildInvitation,
  type GuildRecruitmentStatus,
  type RewardActivityType,
  type VoteSpendBreakdown,
} from '@eduquest/shared';
import { getDb } from '../db';
import {
  gameActivityCompletions,
  gameActivityEdges,
  gameCharacters,
  gameCharacterClasses,
  gameCharacterMoves,
  gameBonusCards,
  cohortMemberships,
  cohortProgress,
  cohorts,
  gameActivities,
  gameMapRuns,
  guildInvitations,
  guildVoteBalances,
  guilds,
  milestoneBonusVotes,
  notifications,
  pointTransactions,
  progressMilestones,
  students,
  users,
} from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { createEventContext, publishEvent } from '../events';
import { RewardService, VotingCostService } from '../services/rewards';
import { RewardBalanceConfigService } from '../services/reward-balance-config';
import { apiError, missingDatabaseBinding, parseJsonBody, requireAdminUser, requireDatabase } from './http';

type Bindings = {
  APP_ENV?: string;
  DB?: D1Database;
  ASSETS?: R2Bucket;
};
type Variables = {
  user?: UserPayload;
};
type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;

type ActivityRecord = typeof gameActivities.$inferSelect;
type ActivityEdgeRecord = typeof gameActivityEdges.$inferSelect;
type ActivityCompletionRecord = typeof gameActivityCompletions.$inferSelect;
type CharacterMoveRecord = typeof gameCharacterMoves.$inferSelect;
type MapRunRecord = typeof gameMapRuns.$inferSelect;
type CohortMembershipRecord = typeof cohortMemberships.$inferSelect;
type StudentRecord = typeof students.$inferSelect;
type CohortRecord = typeof cohorts.$inferSelect;
type GuildRecord = typeof guilds.$inferSelect;
type GuildInvitationRecord = typeof guildInvitations.$inferSelect;
type ProgressMilestoneRecord = typeof progressMilestones.$inferSelect;
type GameBonusCardRecord = typeof gameBonusCards.$inferSelect;
type MilestoneBonusVoteRecord = typeof milestoneBonusVotes.$inferSelect;
type GuildVoteBalanceRecord = typeof guildVoteBalances.$inferSelect;
type Database = ReturnType<typeof getDb>;

const GUILD_CREATION_ONBOARDING_REWARD_ACTION = 'guild_created';
type GuildMutationDb = Pick<Database, 'select' | 'update' | 'delete'>;

const ONLINE_PRESENCE_WINDOW_MS = 60 * 60 * 1000;

type CompletionSubmissionPayload = {
  workUrl?: string;
  metadata?: Record<string, unknown>;
};

type CreateGuildPayload = {
  name?: unknown;
  description?: unknown;
  iconUrl?: unknown;
  iconKey?: unknown;
  color?: unknown;
  recruitmentStatus?: unknown;
  recruitmentMessage?: unknown;
  maxMembers?: unknown;
};

type UpdateGuildPayload = Partial<CreateGuildPayload>;

type GuildInvitationPayload = {
  inviteeUserId?: unknown;
  message?: unknown;
};

interface MapOccupancyMember {
  studentId: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  githubAvatarUrl?: string | null;
  characterIllustrationUrl?: string | null;
  characterTitle?: string | null;
  characterClass?: string | null;
  guildId?: string | null;
  guildName?: string | null;
  guildIconUrl?: string | null;
  guildIconKey?: string | null;
  guildColor?: string | null;
}

interface ClassRosterStudentRecord extends MapOccupancyMember {
  userId: string;
  institutionalEmail?: string | null;
  strength?: number | null;
  dexterity?: number | null;
  constitution?: number | null;
  intelligence?: number | null;
  wisdom?: number | null;
  charisma?: number | null;
}

function toIsoString(value?: Date | null) {
  return value?.toISOString?.();
}

function toGuildPayload(guild: GuildRecord): Guild {
  return {
    id: guild.id,
    cohortId: guild.cohortId,
    name: guild.name,
    description: guild.description || undefined,
    iconUrl: guild.iconUrl || undefined,
    iconKey: guild.iconKey || undefined,
    color: guild.color || undefined,
    gold: guild.gold,
    recruitmentStatus: guild.recruitmentStatus,
    recruitmentMessage: guild.recruitmentMessage || undefined,
    maxMembers: guild.maxMembers,
    createdAt: guild.createdAt?.toISOString?.(),
    updatedAt: guild.updatedAt?.toISOString?.(),
  };
}

function toGuildInvitationPayload(
  invitation: GuildInvitationRecord,
  details: {
    guild?: GuildRecord;
    inviter?: Pick<MapOccupancyMember, 'displayName' | 'firstName' | 'lastName' | 'email'>;
    invitee?: Pick<MapOccupancyMember, 'displayName' | 'firstName' | 'lastName' | 'email'>;
  } = {}
): GuildInvitation {
  return {
    id: invitation.id,
    cohortId: invitation.cohortId,
    guildId: invitation.guildId,
    guild: details.guild ? toGuildPayload(details.guild) : undefined,
    inviterUserId: invitation.inviterUserId,
    inviterDisplayName: details.inviter ? formatOccupancyMemberName(details.inviter) : undefined,
    inviteeUserId: invitation.inviteeUserId,
    inviteeDisplayName: details.invitee ? formatOccupancyMemberName(details.invitee) : undefined,
    status: invitation.status,
    message: invitation.message || undefined,
    respondedAt: toIsoString(invitation.respondedAt),
    expiresAt: toIsoString(invitation.expiresAt),
    createdAt: toIsoString(invitation.createdAt),
    updatedAt: toIsoString(invitation.updatedAt),
  };
}

function toMapRun(record: MapRunRecord): GameMapRun {
  return {
    id: record.id,
    cohortId: record.cohortId,
    currentSectorDepth: record.currentSectorDepth,
    fogRevealDepth: record.fogRevealDepth,
    status: record.status,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toActivityEdge(record: ActivityEdgeRecord): GameActivityEdge {
  return {
    id: record.id,
    cohortId: record.cohortId || undefined,
    mapRunId: record.mapRunId || undefined,
    fromActivityId: record.fromActivityId,
    toActivityId: record.toActivityId,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
  };
}

function toActivityCompletion(record: ActivityCompletionRecord): GameActivityCompletion {
  return {
    id: record.id,
    studentId: record.studentId,
    cohortId: record.cohortId,
    activityId: record.activityId,
    completionType: record.completionType,
    grade: record.grade || undefined,
    workUrl: record.workUrl || undefined,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

type GuildActivityVoteState = {
  requiredVotes: number;
  receivedVotes: number;
  isComplete: boolean;
  hasVoted?: boolean;
};

function withGuildVoteState(
  completion: GameActivityCompletion,
  voteState: GuildActivityVoteState
): GameActivityCompletion {
  return {
    ...completion,
    metadata: {
      ...(completion.metadata || {}),
      guildVote: {
        requiredVotes: voteState.requiredVotes,
        receivedVotes: voteState.receivedVotes,
        status: voteState.isComplete ? 'complete' : 'pending',
        hasVoted: Boolean(voteState.hasVoted),
      },
    },
  };
}

function withActivityGuildVoteState(
  activity: ActivityRecord,
  voteState: GuildActivityVoteState,
  hasVoted: boolean
): ActivityRecord {
  return {
    ...activity,
    metadata: {
      ...((activity.metadata || {}) as Record<string, unknown>),
      guildVote: {
        requiredVotes: voteState.requiredVotes,
        receivedVotes: voteState.receivedVotes,
        status: voteState.isComplete ? 'complete' : 'pending',
        hasVoted,
      },
    },
  };
}

function getRequiredGuildActivityVotes(memberCount: number) {
  return Math.max(1, Math.ceil(memberCount / 2));
}

function isRecentlyOnline(
  member: { updatedAt?: Date | null; lastLogin?: Date | null },
  now = new Date()
) {
  const lastSeenAt = Math.max(
    member.updatedAt?.getTime?.() || 0,
    member.lastLogin?.getTime?.() || 0
  );
  return lastSeenAt > 0 && now.getTime() - lastSeenAt <= ONLINE_PRESENCE_WINDOW_MS;
}

async function touchUserPresence(db: Database, user?: UserPayload) {
  if (!user?.id) return;

  await db
    .update(users)
    .set({ updatedAt: new Date() })
    .where(eq(users.id, user.id));
}

function toCharacterMove(record: CharacterMoveRecord): GameCharacterMove {
  return {
    id: record.id,
    studentId: record.studentId,
    cohortId: record.cohortId,
    mapRunId: record.mapRunId,
    fromActivityId: record.fromActivityId || undefined,
    toActivityId: record.toActivityId,
    moveType: record.moveType,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
  };
}

function getCompletionType(activity: Pick<ActivityRecord, 'type' | 'isGraded'>): GameActivityCompletionType {
  if (activity.type === 'boss' || activity.type === 'mini_boss') return 'battle';
  if (activity.isGraded) return 'submission';
  return 'read';
}

const DEFAULT_BOSS_ANSWER_FIELDS: BossActivityAnswerField[] = [
  {
    id: 'workUrl',
    label: 'Project URL',
    kind: 'url',
    placeholder: 'https://github.com/your-team/project',
  },
  {
    id: 'attachments',
    label: 'Project files',
    kind: 'file',
    required: false,
    accept: '.pdf,.zip,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,.json',
    maxFiles: 3,
    maxBytes: 10 * 1024 * 1024,
  },
];

const BLOCKED_SUBMISSION_CONTENT_TYPES = new Set([
  'image/svg+xml',
  'text/html',
  'application/javascript',
  'text/javascript',
]);

function getBossAnswerFields(activity: Pick<ActivityRecord, 'type' | 'metadata'>): BossActivityAnswerField[] {
  if (activity.type !== 'boss' && activity.type !== 'mini_boss') return [];

  const metadata = (activity.metadata || {}) as Record<string, unknown>;
  const nestedBoss = metadata.boss && typeof metadata.boss === 'object'
    ? (metadata.boss as Record<string, unknown>)
    : undefined;
  const configuredFields = Array.isArray(metadata.answerFields)
    ? (metadata.answerFields as unknown[])
    : Array.isArray(nestedBoss?.answerFields)
      ? nestedBoss.answerFields
      : undefined;
  const normalized = normalizeBossAnswerFields(configuredFields);

  return normalized.length > 0 ? normalized : DEFAULT_BOSS_ANSWER_FIELDS;
}

function normalizeBossAnswerFields(value: unknown): BossActivityAnswerField[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): BossActivityAnswerField[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
    const kind = candidate.kind;
    if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || !label) return [];
    if (kind !== 'text' && kind !== 'url' && kind !== 'file') return [];

    return [
      {
        id,
        label,
        kind,
        required: candidate.required === true,
        placeholder: typeof candidate.placeholder === 'string' ? candidate.placeholder : undefined,
        helpText: typeof candidate.helpText === 'string' ? candidate.helpText : undefined,
        accept: typeof candidate.accept === 'string' ? candidate.accept : undefined,
        maxFiles:
          typeof candidate.maxFiles === 'number' && Number.isInteger(candidate.maxFiles) && candidate.maxFiles > 0
            ? Math.min(candidate.maxFiles, 10)
            : undefined,
        maxBytes:
          typeof candidate.maxBytes === 'number' && Number.isInteger(candidate.maxBytes) && candidate.maxBytes > 0
            ? Math.min(candidate.maxBytes, 25 * 1024 * 1024)
            : undefined,
      },
    ];
  });
}

async function parseCompletionSubmission(
  c: AppContext,
  activity: Pick<ActivityRecord, 'id' | 'type' | 'metadata'>,
  studentRecord: Pick<StudentRecord, 'id'>,
  membership: Pick<CohortMembershipRecord, 'cohortId'>
): Promise<CompletionSubmissionPayload | Response> {
  const answerFields = getBossAnswerFields(activity);
  if (answerFields.length === 0) return {};

  const contentType = c.req.header('content-type') || '';
  const textAnswers = new Map<string, string>();
  const filesByField = new Map<string, File[]>();

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.raw.formData();
    const answersValue = formData.get('answers');
    if (typeof answersValue === 'string') {
      try {
        parseAnswerJson(answersValue, textAnswers);
      } catch {
        return apiError(c, 'Invalid answer payload.', 400);
      }
    }

    formData.forEach((value, key) => {
      if (key.startsWith('field:') && typeof value === 'string') {
        textAnswers.set(key.slice('field:'.length), value);
      }
      if (key.startsWith('file:') && value instanceof File) {
        const fieldId = key.slice('file:'.length);
        filesByField.set(fieldId, [...(filesByField.get(fieldId) || []), value]);
      }
    });
  } else if (contentType.includes('application/json')) {
    const body = await c.req.json().catch(() => ({}));
    if (body && typeof body === 'object') {
      const candidate = body as Record<string, unknown>;
      try {
        parseAnswerJson(candidate.answers, textAnswers);
      } catch {
        return apiError(c, 'Invalid answer payload.', 400);
      }
    }
  }

  const uploadedAt = new Date().toISOString();
  const fields: BossActivitySubmission['fields'] = [];
  let workUrl: string | undefined;

  for (const field of answerFields) {
    let value: string | undefined;
    try {
      value = field.kind === 'file' ? undefined : normalizeAnswerValue(field, textAnswers.get(field.id));
    } catch (error) {
      return apiError(c, error instanceof Error ? error.message : 'Invalid answer value.', 400, {
        errorCode: 'validation_failed',
      });
    }
    const files = filesByField.get(field.id) || [];

    if (field.kind === 'file') {
      const maxFiles = field.maxFiles || 1;
      if (files.length > maxFiles) {
        return apiError(c, `${field.label} accepts at most ${maxFiles} file(s).`, 400, {
          errorCode: 'validation_failed',
        });
      }
    }

    if (field.required && !value && files.length === 0) {
      return apiError(c, `${field.label} is required.`, 400, { errorCode: 'validation_failed' });
    }

    let uploadedFiles: BossActivitySubmissionFile[] | undefined;
    if (files.length > 0) {
      const uploadResult = await uploadSubmissionFiles(c, {
        files,
        field,
        cohortId: membership.cohortId,
        activityId: activity.id,
        studentId: studentRecord.id,
        uploadedAt,
      });
      if (uploadResult instanceof Response) return uploadResult;
      uploadedFiles = uploadResult;
    }

    if (field.kind === 'url' && value && !workUrl) {
      workUrl = value;
    }

    fields.push({
      fieldId: field.id,
      label: field.label,
      kind: field.kind,
      value,
      files: uploadedFiles,
    });
  }

  if (!fields.some((field) => field.value || (field.files && field.files.length > 0))) {
    return apiError(c, 'At least one boss answer is required.', 400);
  }

  return {
    workUrl,
    metadata: {
      bossSubmission: {
        submittedAt: uploadedAt,
        fields,
      },
    },
  };
}

function parseAnswerJson(value: unknown, textAnswers: Map<string, string>) {
  const parsed = typeof value === 'string' ? JSON.parse(value || '[]') : value;
  if (!Array.isArray(parsed)) return;

  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    const fieldId = typeof candidate.fieldId === 'string' ? candidate.fieldId : undefined;
    const answerValue = typeof candidate.value === 'string' ? candidate.value : undefined;
    if (fieldId && answerValue !== undefined) {
      textAnswers.set(fieldId, answerValue);
    }
  }
}

function normalizeAnswerValue(field: BossActivityAnswerField, rawValue: string | undefined) {
  const value = rawValue?.trim();
  if (!value) return undefined;
  if (value.length > 4000) {
    throw new Error(`${field.label} is too long.`);
  }
  if (field.kind === 'url') {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error(`${field.label} must be an http(s) URL.`);
    }
    return url.toString();
  }
  return value;
}

async function uploadSubmissionFiles(
  c: AppContext,
  options: {
    files: File[];
    field: BossActivityAnswerField;
    cohortId: string;
    activityId: string;
    studentId: string;
    uploadedAt: string;
  }
): Promise<BossActivitySubmissionFile[] | Response> {
  const bucket = c.env.ASSETS;
  if (!bucket) {
    return apiError(c, 'Project file storage is not configured.', 503);
  }

  const uploadedFiles: BossActivitySubmissionFile[] = [];
  const maxBytes = options.field.maxBytes || 10 * 1024 * 1024;

  for (const file of options.files) {
    const contentType = normalizeSubmissionContentType(file.type);
    if (file.size <= 0) {
      return apiError(c, `${file.name || options.field.label} is empty.`, 400, {
        errorCode: 'validation_failed',
      });
    }
    if (file.size > maxBytes) {
      return apiError(c, `${file.name || options.field.label} is too large.`, 400, {
        errorCode: 'payload_too_large',
      });
    }
    if (BLOCKED_SUBMISSION_CONTENT_TYPES.has(contentType)) {
      return apiError(c, `${contentType} files are not allowed.`, 400, {
        errorCode: 'unsupported_media_type',
      });
    }

    const fileId = crypto.randomUUID();
    const safeName = sanitizeFileName(file.name || 'submission.bin');
    const key = `boss-submissions/${options.cohortId}/${options.activityId}/${options.studentId}/${options.field.id}/${fileId}-${safeName}`;

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        kind: 'boss-submission',
        fieldId: options.field.id,
        activityId: options.activityId,
        studentId: options.studentId,
      },
    });

    uploadedFiles.push({
      id: fileId,
      key,
      fileName: safeName,
      contentType,
      size: file.size,
      uploadedAt: options.uploadedAt,
    });
  }

  return uploadedFiles;
}

function normalizeSubmissionContentType(type: string) {
  return type === 'image/jpg' ? 'image/jpeg' : type || 'application/octet-stream';
}

function sanitizeFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'submission.bin';
}

function toActivity(
  record: ActivityRecord,
  state: Pick<Activity, 'isCompleted' | 'isRevealed' | 'isLocked' | 'isCurrent'>,
  includeStepRanges = false
): Activity {
  return {
    id: record.id,
    cohortId: record.cohortId || undefined,
    templateActivityId: record.templateActivityId || undefined,
    mapRunId: record.mapRunId || undefined,
    type: record.type,
    title: record.title,
    startDate: toIsoString(record.startDate),
    endDate: toIsoString(record.endDate),
    url: record.url || undefined,
    isGraded: record.isGraded,
    mapX: record.mapX,
    mapY: record.mapY,
    sectorDepth: record.sectorDepth,
    requiredLevel: record.requiredLevel,
    ...(includeStepRanges ? { stepRanges: parseStepRanges(record.stepRanges, record.requiredLevel) } : {}),
    cardColor: record.cardColor || undefined,
    participationMode: record.participationMode,
    basePoints: record.basePoints,
    metadata: (record.metadata || {}) as Activity['metadata'],
    createdAt: toIsoString(record.createdAt),
    ...state,
  };
}

function parseStepRanges(value: unknown, requiredLevel = 1): ActivityStepRange[] {
  if (!Array.isArray(value)) {
    return [{ startStep: Math.max(requiredLevel - 1, 0) }];
  }

  const ranges = value.flatMap((item): ActivityStepRange[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Record<string, unknown>;
    const startStep = candidate.startStep;
    const endStep = candidate.endStep;
    if (typeof startStep !== 'number' || !Number.isInteger(startStep) || startStep < 0) return [];
    if (
      endStep != null &&
      (typeof endStep !== 'number' || !Number.isInteger(endStep) || endStep <= startStep)
    ) {
      return [];
    }
    return endStep == null ? [{ startStep }] : [{ startStep, endStep }];
  });

  return ranges.length > 0 ? ranges : [{ startStep: Math.max(requiredLevel - 1, 0) }];
}

function isStepInsideRange(step: number, range: ActivityStepRange) {
  return step >= range.startStep && (range.endStep == null || step < range.endStep);
}

function validateEdgeStyleWindows(value: unknown): GameActivityEdgeStyleWindow[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const windows = value.map((item): GameActivityEdgeStyleWindow => {
    const candidate = item as Record<string, unknown>;
    const startStep = candidate?.startStep;
    const endStep = candidate?.endStep;
    const color = candidate?.color;
    const animation = candidate?.animation === 'glow' ? 'pulse' : candidate?.animation;

    if (typeof startStep !== 'number' || !Number.isInteger(startStep) || startStep < 0) {
      throw new Error('startStep must be a non-negative integer.');
    }
    if (
      endStep != null &&
      (typeof endStep !== 'number' || !Number.isInteger(endStep) || endStep <= startStep)
    ) {
      throw new Error('endStep must be greater than startStep.');
    }
    if (color !== undefined && (typeof color !== 'string' || !color.trim())) {
      throw new Error('color must be a non-empty string.');
    }
    if (
      animation !== undefined &&
      animation !== 'disabled' &&
      animation !== 'none' &&
      animation !== 'flow' &&
      animation !== 'pulse'
    ) {
      throw new Error('animation must be disabled, none, flow, or pulse.');
    }

    const window: GameActivityEdgeStyleWindow = {
      startStep,
    };
    if (endStep != null) window.endStep = endStep;
    if (typeof color === 'string' && color.trim()) window.color = color.trim();
    if (
      animation === 'none' ||
      animation === 'flow' ||
      animation === 'pulse' ||
      animation === 'disabled'
    ) {
      window.animation = animation;
    }

    return window;
  });

  const sorted = [...windows].sort((a, b) => a.startStep - b.startStep);
  for (let index = 1; index < sorted.length; index++) {
    if (edgeStyleWindowsOverlap(sorted[index - 1], sorted[index])) {
      throw new Error('styleWindows intervals cannot overlap.');
    }
  }

  return windows;
}

function validateEdgeUnlockPrerequisites(
  value: unknown,
  activityIds: ReadonlySet<string>
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('unlockPrerequisiteActivityIds must be an array.');
  }

  const prerequisiteIds = Array.from(
    new Set(
      value.map((item) => {
        if (typeof item !== 'string' || !item.trim()) {
          throw new Error('unlock prerequisite activity ids must be non-empty strings.');
        }
        return item.trim();
      })
    )
  );

  if (prerequisiteIds.some((id) => !activityIds.has(id))) {
    throw new Error('unlock prerequisite activities must exist on this map.');
  }

  return prerequisiteIds;
}

function validateActivityStepRanges(value: unknown): ActivityStepRange[] {
  if (!Array.isArray(value)) {
    throw new Error('stepRanges must be an array.');
  }

  return value.map((item): ActivityStepRange => {
    const candidate = item as Record<string, unknown>;
    const startStep = candidate?.startStep;
    const endStep = candidate?.endStep;

    if (typeof startStep !== 'number' || !Number.isInteger(startStep) || startStep < 0) {
      throw new Error('startStep must be a non-negative integer.');
    }
    if (
      endStep != null &&
      (typeof endStep !== 'number' || !Number.isInteger(endStep) || endStep <= startStep)
    ) {
      throw new Error('endStep must be greater than startStep.');
    }

    return endStep == null ? { startStep } : { startStep, endStep };
  });
}

function normalizeMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function validateOptionalText(value: unknown, fieldName: string, maxLength: number) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be text.`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function validateOptionalInteger(value: unknown, fieldName: string, min: number, max: number) {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${fieldName} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

function validateOptionalRecruitmentStatus(value: unknown): GuildRecruitmentStatus | undefined {
  if (value === undefined) return undefined;
  if (value !== 'open' && value !== 'invite_only' && value !== 'closed') {
    throw new Error('recruitmentStatus must be open, invite_only, or closed.');
  }

  return value;
}

function validateOptionalParticipationMode(value: unknown): ActivityParticipationMode | undefined {
  if (value === undefined) return undefined;
  if (value !== 'solo' && value !== 'guild') {
    throw new Error('participationMode must be solo or guild.');
  }

  return value;
}

function validateOptionalResources(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('resources must be an array.');
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('resources must contain resource objects.');
    }

    const resource = item as Record<string, unknown>;
    const title = validateOptionalText(resource.title, 'resource title', 160);
    const url = validateOptionalText(resource.url, 'resource url', 2000);
    if (!url) return [];

    return title ? [{ title, url }] : [{ url }];
  });
}

function edgeStyleWindowsOverlap(
  first: Pick<GameActivityEdgeStyleWindow, 'startStep' | 'endStep'>,
  second: Pick<GameActivityEdgeStyleWindow, 'startStep' | 'endStep'>
) {
  const firstMin = first.startStep;
  const firstMax = first.endStep == null ? Number.POSITIVE_INFINITY : first.endStep - 1;
  const secondMin = second.startStep;
  const secondMax = second.endStep == null ? Number.POSITIVE_INFINITY : second.endStep - 1;

  return firstMin <= secondMax && secondMin <= firstMax;
}

function formatOccupancyMemberName(
  member: Pick<MapOccupancyMember, 'displayName' | 'firstName' | 'lastName' | 'email'>
) {
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return member.displayName || fullName || member.email || 'Unknown player';
}

function toClassRosterStudent(student: ClassRosterStudentRecord) {
  const characterClass = toCharacterClass(student.characterClass);

  return {
    id: student.studentId,
    userId: student.userId,
    displayName: formatOccupancyMemberName(student),
    email: student.email || undefined,
    bio: student.bio || undefined,
    institutionalEmail: student.institutionalEmail || undefined,
    avatarUrl: student.avatarUrl || student.githubAvatarUrl || undefined,
    characterIllustrationUrl: student.characterIllustrationUrl || undefined,
    characterTitle: student.characterTitle || undefined,
    characterClass,
    guildId: student.guildId || undefined,
    guildName: student.guildName || undefined,
    guildIconUrl: student.guildIconUrl || undefined,
    guildIconKey: student.guildIconKey || undefined,
    guildColor: student.guildColor || undefined,
    stats: characterClass
      ? {
          strength: student.strength || 0,
          dexterity: student.dexterity || 0,
          constitution: student.constitution || 0,
          intelligence: student.intelligence || 0,
          wisdom: student.wisdom || 0,
          charisma: student.charisma || 0,
        }
      : undefined,
  };
}

function buildWeightedGuildStats(
  members: ReturnType<typeof toClassRosterStudent>[],
  config: Awaited<ReturnType<typeof RewardBalanceConfigService.getActiveConfig>>['rewardSystem']
): GameStats | undefined {
  const statCap = config.attributes.levelOneMaxValue;
  const divisor = Math.max(1, members.length);
  const stats = {} as GameStats;
  let hasStats = false;

  for (const attribute of STUDENT_ATTRIBUTES) {
    const rawSum = members.reduce((sum, member) => sum + (member.stats?.[attribute] || 0), 0);
    stats[attribute] = Math.ceil(Math.min(statCap, rawSum / divisor));
    hasStats = hasStats || rawSum > 0;
  }

  return hasStats ? stats : undefined;
}

function toCharacterClass(value?: string | null): GameCharacterClass | undefined {
  return value === 'scholar' || value === 'champion' || value === 'guide' || value === 'specialist'
    ? value
    : undefined;
}

function buildNodeOccupancies(
  activityRecords: Array<Pick<ActivityRecord, 'id' | 'participationMode'>>,
  members: MapOccupancyMember[],
  moves: CharacterMoveRecord[]
): GameMapNodeOccupancy[] {
  const latestMoveByStudentId = new Map<string, CharacterMoveRecord>();

  for (const move of moves) {
    const current = latestMoveByStudentId.get(move.studentId);
    const moveTime = move.createdAt?.getTime?.() ?? 0;
    const currentTime = current?.createdAt?.getTime?.() ?? 0;
    if (!current || moveTime >= currentTime) {
      latestMoveByStudentId.set(move.studentId, move);
    }
  }

  const activityById = new Map(activityRecords.map((activity) => [activity.id, activity]));
  const occupancyByActivity = new Map<string, Map<string, GameMapNodeOccupancy['segments'][number]>>();

  for (const member of members) {
    const move = latestMoveByStudentId.get(member.studentId);
    if (!move || !activityById.has(move.toActivityId)) continue;

    const activity = activityById.get(move.toActivityId)!;
    const segments = occupancyByActivity.get(activity.id) || new Map<string, GameMapNodeOccupancy['segments'][number]>();
    const isGuildActivity = activity.participationMode === 'guild' && member.guildId;
    const segmentKey = isGuildActivity ? `guild:${member.guildId}` : 'solo';
    const currentSegment = segments.get(segmentKey);
    const segmentMember = {
      studentId: member.studentId,
      displayName: formatOccupancyMemberName(member),
      avatarUrl: member.avatarUrl || member.githubAvatarUrl || undefined,
      characterIllustrationUrl: member.characterIllustrationUrl || undefined,
      characterClass: toCharacterClass(member.characterClass),
      guildId: member.guildId || undefined,
      guildName: member.guildName || undefined,
      guildIconUrl: member.guildIconUrl || undefined,
      guildIconKey: member.guildIconKey || undefined,
      guildColor: member.guildColor || undefined,
      fromActivityId: move.fromActivityId || undefined,
      toActivityId: move.toActivityId,
    };

    if (currentSegment) {
      currentSegment.studentCount += 1;
      currentSegment.members = [...(currentSegment.members || []), segmentMember];
    } else if (isGuildActivity) {
      segments.set(segmentKey, {
        kind: 'guild',
        guildId: member.guildId || undefined,
        guildName: member.guildName || undefined,
        guildIconUrl: member.guildIconUrl || undefined,
        guildIconKey: member.guildIconKey || undefined,
        color: member.guildColor || undefined,
        studentCount: 1,
        members: [segmentMember],
      });
    } else {
      segments.set(segmentKey, {
        kind: 'solo',
        studentCount: 1,
        members: [segmentMember],
      });
    }

    occupancyByActivity.set(activity.id, segments);
  }

  return Array.from(occupancyByActivity.entries()).map(([activityId, segments]) => ({
    activityId,
    totalStudents: members.length,
    segments: Array.from(segments.values()),
  }));
}

function buildMapData(
  run: GameMapRun,
  activityRecords: ActivityRecord[],
  edges: GameActivityEdge[],
  completions: GameActivityCompletion[],
  currentMove?: GameCharacterMove,
  cohortProgression?: Pick<CohortRecord, 'currentStep'>,
  includeStepRanges = false,
  nodeOccupancies: GameMapNodeOccupancy[] = [],
  defaultCurrentActivityId?: string,
  currentGuildMemberCount?: number,
  lockGuildActivitiesWithoutGuild = false
): GameMapData {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const currentActivityId = currentMove?.toActivityId || defaultCurrentActivityId;
  const currentStep = cohortProgression?.currentStep ?? run.currentSectorDepth;
  const activityIds = new Set(activityRecords.map((activity) => activity.id));
  const incomingByActivity = new Map<string, GameActivityEdge[]>();

  for (const edge of edges) {
    if (!activityIds.has(edge.fromActivityId) || !activityIds.has(edge.toActivityId)) continue;
    incomingByActivity.set(edge.toActivityId, [...(incomingByActivity.get(edge.toActivityId) || []), edge]);
  }

  const activities = activityRecords.map((activity) => {
    const incomingEdges = incomingByActivity.get(activity.id) || [];
    const isCompleted = completedActivityIds.has(activity.id);
    const hasUnlockedIncomingEdge = incomingEdges.some((edge) =>
      isEdgeUnlocked(edge, completedActivityIds, currentStep, activityIds)
    );
    const isRoot = incomingEdges.length === 0;
    const stepRanges = parseStepRanges(activity.stepRanges, activity.requiredLevel);
    const hasBeenRevealed = stepRanges.some((range) => currentStep >= range.startStep);
    const isActiveForStep = stepRanges.some((range) => isStepInsideRange(currentStep, range));
    const isUnavailableGuildActivity =
      lockGuildActivitiesWithoutGuild && activity.participationMode === 'guild';
    const isRevealed =
      !isUnavailableGuildActivity &&
      hasBeenRevealed &&
      isActiveForStep &&
      (isCompleted || isRoot || hasUnlockedIncomingEdge);
    const isLocked =
      isUnavailableGuildActivity ||
      !isRevealed ||
      (!isCompleted && !isRoot && !hasUnlockedIncomingEdge);
    const isCurrent = activity.id === currentActivityId;

    return toActivity(
      activity,
      { isCompleted, isRevealed, isLocked, isCurrent },
      includeStepRanges
    );
  });

  return {
    run,
    activities,
    edges,
    completions,
    nodeOccupancies,
    currentGuildMemberCount,
    currentStep,
    currentActivityId,
    currentMove,
  };
}

function getActivityLockState(
  activity: Pick<ActivityRecord, 'id' | 'requiredLevel' | 'stepRanges' | 'participationMode'>,
  activityRecords: Array<Pick<ActivityRecord, 'id' | 'requiredLevel' | 'stepRanges'>>,
  edges: Array<Pick<GameActivityEdge, 'fromActivityId' | 'toActivityId' | 'metadata'>>,
  completions: Array<Pick<GameActivityCompletion, 'activityId'>>,
  currentStep: number,
  hasGuildMembership = true
) {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const activityIds = new Set(activityRecords.map((record) => record.id));
  const incomingEdges = edges.filter(
    (edge) =>
      edge.toActivityId === activity.id &&
      activityIds.has(edge.fromActivityId) &&
      activityIds.has(edge.toActivityId)
  );
  const hasUnlockedIncomingEdge = incomingEdges.some((edge) =>
    isEdgeUnlocked(edge, completedActivityIds, currentStep, activityIds)
  );
  const isRoot = incomingEdges.length === 0;
  const isCompleted = completedActivityIds.has(activity.id);
  const stepRanges = parseStepRanges(activity.stepRanges, activity.requiredLevel);
  const hasBeenRevealed = stepRanges.some((range) => currentStep >= range.startStep);
  const isActiveForStep = stepRanges.some((range) => isStepInsideRange(currentStep, range));
  const isUnavailableGuildActivity = activity.participationMode === 'guild' && !hasGuildMembership;
  const isRevealed =
    !isUnavailableGuildActivity &&
    hasBeenRevealed &&
    isActiveForStep &&
    (isCompleted || isRoot || hasUnlockedIncomingEdge);

  return {
    isCompleted,
    isRevealed,
    isLocked:
      isUnavailableGuildActivity ||
      !isRevealed ||
      (!isCompleted && !isRoot && !hasUnlockedIncomingEdge),
  };
}

function getEdgeUnlockPrerequisiteIds(
  edge: Pick<GameActivityEdge, 'fromActivityId' | 'metadata'>,
  activityIds?: ReadonlySet<string>
) {
  const explicitPrerequisites = Array.isArray(edge.metadata?.unlockPrerequisiteActivityIds)
    ? edge.metadata.unlockPrerequisiteActivityIds.filter((id): id is string => typeof id === 'string')
    : [];
  const validExplicitPrerequisites = activityIds
    ? explicitPrerequisites.filter((id) => activityIds.has(id))
    : explicitPrerequisites;

  return validExplicitPrerequisites.length > 0 ? validExplicitPrerequisites : [edge.fromActivityId];
}

function isEdgeUnlocked(
  edge: Pick<GameActivityEdge, 'fromActivityId' | 'metadata'>,
  completedActivityIds: ReadonlySet<string>,
  currentStep: number,
  activityIds?: ReadonlySet<string>
) {
  return (
    isEdgeActiveForStep(edge, currentStep) &&
    getEdgeUnlockPrerequisiteIds(edge, activityIds).every((id) => completedActivityIds.has(id))
  );
}

function isEdgeActiveForStep(edge: Pick<GameActivityEdge, 'metadata'>, currentStep: number) {
  const styleWindows = edge.metadata?.styleWindows;
  if (!Array.isArray(styleWindows) || styleWindows.length === 0) return true;

  return styleWindows.some((window) => {
    if (!window || typeof window !== 'object') return false;
    const candidate = window as Partial<GameActivityEdgeStyleWindow>;
    return (
      candidate.animation !== 'disabled' &&
      typeof candidate.startStep === 'number' &&
      currentStep >= candidate.startStep &&
      (candidate.endStep == null || currentStep < candidate.endStep)
    );
  });
}

async function loadActivityAuthorizationState(
  db: Database,
  cohortId: string,
  mapRunId: string,
  studentId: string,
  currentStep: number,
  activity: ActivityRecord,
  guildId?: string | null
) {
  const [activityRecords, edgeRecords, completionRecords] = await Promise.all([
    db
      .select()
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, cohortId),
          eq(gameActivities.mapRunId, mapRunId)
        )
      ),
    db
      .select()
      .from(gameActivityEdges)
      .where(
        or(
          sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
          eq(gameActivityEdges.cohortId, cohortId),
          eq(gameActivityEdges.mapRunId, mapRunId)
        )
      ),
    db
      .select()
      .from(gameActivityCompletions)
      .where(
        and(
          eq(gameActivityCompletions.studentId, studentId),
          eq(gameActivityCompletions.cohortId, cohortId)
        )
      ),
  ]);

  const completionItems = completionRecords.map(toActivityCompletion);
  if (guildId) {
    const voteStates = await loadGuildActivityVoteStates(
      db,
      cohortId,
      guildId,
      activityRecords
        .filter((activityRecord) => activityRecord.participationMode === 'guild')
        .map((activityRecord) => activityRecord.id),
      { includeStudentId: studentId }
    );
    const completedActivityIds = new Set(completionItems.map((completion) => completion.activityId));
    for (const [activityId, voteState] of voteStates) {
      if (!voteState.isComplete || completedActivityIds.has(activityId)) continue;
      completionItems.push(
        withGuildVoteState(
          {
            id: `guild:${guildId}:${activityId}`,
            studentId,
            cohortId,
            activityId,
            completionType: 'system',
          },
          voteState
        )
      );
    }
  }

  return getActivityLockState(
    activity,
    activityRecords,
    edgeRecords.map(toActivityEdge),
    completionItems,
    currentStep,
    Boolean(guildId)
  );
}

async function isStudentOnGuildRallyNode(
  db: Database,
  context: {
    studentRecord: Pick<StudentRecord, 'id'>;
    membership: Pick<CohortMembershipRecord, 'cohortId'>;
  }
) {
  const activeRun = await getOrCreateActiveRun(db, context.membership.cohortId);
  const [latestMove] = await db
    .select()
    .from(gameCharacterMoves)
    .where(
      and(
        eq(gameCharacterMoves.studentId, context.studentRecord.id),
        eq(gameCharacterMoves.cohortId, context.membership.cohortId),
        eq(gameCharacterMoves.mapRunId, activeRun.id)
      )
    )
    .orderBy(desc(gameCharacterMoves.createdAt))
    .limit(1);

  if (!latestMove?.toActivityId) return false;

  const [currentActivity] = await db
    .select({ metadata: gameActivities.metadata })
    .from(gameActivities)
    .where(
      and(
        eq(gameActivities.id, latestMove.toActivityId),
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, context.membership.cohortId),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      )
    )
    .limit(1);

  return currentActivity ? getOnboardingTask(currentActivity) === 'guild_rally' : false;
}

function toCohortPayload(record: CohortRecord) {
  return {
    id: record.id,
    schoolId: record.schoolId,
    campusId: record.campusId || undefined,
    startYear: record.startYear,
    grade: record.grade,
    level: record.level,
    currentStep: record.currentStep,
    name: record.name,
    majorSpeciality: record.majorSpeciality || undefined,
    minorSpeciality: record.minorSpeciality || undefined,
    description: record.description || undefined,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toGamePayload(record: CohortRecord) {
  return {
    id: record.id,
    cohortId: record.id,
    cohort: toCohortPayload(record),
    name: record.name,
    currentStep: record.currentStep,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function toMilestone(record: ProgressMilestoneRecord) {
  return {
    id: record.id,
    labelI18nKey: record.labelI18nKey,
    descriptionI18nKey: record.descriptionI18nKey || undefined,
    cost: record.cost,
    sortOrder: record.sortOrder,
    voteOpenedAt: toIsoString(record.voteOpenedAt),
    voteClosedAt: toIsoString(record.voteClosedAt),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function getActiveMilestoneTargetPoints(
  milestones: ProgressMilestoneRecord[],
  currentPoints: number
) {
  return milestones.find((milestone) => currentPoints < milestone.cost)?.cost ?? milestones.at(-1)?.cost ?? 0;
}

function toRewardCard(record: GameBonusCardRecord, gameId: string) {
  return {
    id: record.id,
    gameId,
    title: record.title,
    subtitle: record.subtitle || undefined,
    description: record.description || undefined,
    cost: record.cost,
    accentToken: record.accentToken,
    iconKey: record.iconKey,
    illustrationUrl: record.illustrationUrl || undefined,
    color: record.color || undefined,
    sortOrder: record.sortOrder,
    createdAt: toIsoString(record.createdAt),
  };
}

function toVote(record: MilestoneBonusVoteRecord) {
  return {
    id: record.id,
    milestoneId: record.milestoneId,
    bonusCardId: record.bonusCardId,
    guildId: record.guildId,
    voteCount: record.voteCount,
    metadata: (record.metadata || {}) as Record<string, unknown>,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
  };
}

function getMilestoneVoteStatus(milestone: Pick<ProgressMilestoneRecord, 'voteOpenedAt' | 'voteClosedAt'>) {
  const hasVoteOpened = Boolean(milestone.voteOpenedAt);
  const isVoteOpen = hasVoteOpened && !milestone.voteClosedAt;
  const isVoteClosed = Boolean(milestone.voteClosedAt);

  return {
    hasVoteOpened,
    isVoteOpen,
    isVoteClosed,
    voteOpenedAt: toIsoString(milestone.voteOpenedAt),
    voteClosedAt: toIsoString(milestone.voteClosedAt),
  };
}

function getGuildVoteBalanceAmount(record: Pick<GuildVoteBalanceRecord, 'voteBalance'> | undefined) {
  return Math.max(0, record?.voteBalance || 0);
}

async function nextNotificationSortOrder(db: Database): Promise<number> {
  const [latestNotification] = await db
    .select({ sortOrder: notifications.sortOrder })
    .from(notifications)
    .orderBy(desc(notifications.sortOrder))
    .limit(1);

  return (latestNotification?.sortOrder ?? 0) + 10;
}

async function getGuildVoteBalance(db: Database, guildId: string, cohortId: string) {
  const [balance] = await db
    .select()
    .from(guildVoteBalances)
    .where(and(eq(guildVoteBalances.guildId, guildId), eq(guildVoteBalances.cohortId, cohortId)))
    .limit(1);

  return balance;
}

async function addGuildVoteBalance(db: Database, guildId: string, cohortId: string, votes: number) {
  const current = await getGuildVoteBalance(db, guildId, cohortId);
  if (current) {
    const [updated] = await db
      .update(guildVoteBalances)
      .set({
        voteBalance: sql`${guildVoteBalances.voteBalance} + ${votes}`,
        updatedAt: new Date(),
      })
      .where(eq(guildVoteBalances.id, current.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(guildVoteBalances)
    .values({ guildId, cohortId, voteBalance: votes })
    .returning();
  return created;
}

async function clearGuildVoteBalance(db: Database, guildId: string, cohortId: string) {
  const current = await getGuildVoteBalance(db, guildId, cohortId);
  if (!current) return undefined;

  const [updated] = await db
    .update(guildVoteBalances)
    .set({ voteBalance: 0, updatedAt: new Date() })
    .where(eq(guildVoteBalances.id, current.id))
    .returning();
  return updated;
}

async function getPurchasedGuildVoteCount(
  db: Database,
  guildId: string,
  progressId: string,
  cohortId: string,
  baseVotesPerGuild: number
) {
  const [applied] = await db
    .select({
      value: sql<number>`coalesce(sum(max(${milestoneBonusVotes.voteCount} - ${baseVotesPerGuild}, 0)), 0)`,
    })
    .from(milestoneBonusVotes)
    .innerJoin(progressMilestones, eq(progressMilestones.id, milestoneBonusVotes.milestoneId))
    .where(and(eq(milestoneBonusVotes.guildId, guildId), eq(progressMilestones.progressId, progressId)));
  const balance = await getGuildVoteBalance(db, guildId, cohortId);

  return Number(applied?.value || 0) + getGuildVoteBalanceAmount(balance);
}

type BoostApprovalMetadata = {
  votes: number;
  approverStudentIds: string[];
};

function getBoostApprovalMetadata(record: Pick<MilestoneBonusVoteRecord, 'metadata'>): BoostApprovalMetadata | undefined {
  const metadata = record.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;

  const approval = (metadata as Record<string, unknown>).boostApproval;
  if (!approval || typeof approval !== 'object' || Array.isArray(approval)) return undefined;

  const candidate = approval as Record<string, unknown>;
  const votes = Number(candidate.votes);
  const approverStudentIds = Array.isArray(candidate.approverStudentIds)
    ? candidate.approverStudentIds.filter((id): id is string => typeof id === 'string' && Boolean(id))
    : [];

  if (!Number.isInteger(votes) || votes <= 0 || approverStudentIds.length === 0) return undefined;
  return { votes, approverStudentIds: [...new Set(approverStudentIds)] };
}

function setBoostApprovalMetadata(
  metadata: unknown,
  approval: BoostApprovalMetadata | undefined,
  voteState?: { requiredVotes: number; hasVoted: boolean }
) {
  const base = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};

  if (!approval) {
    delete base.boostApproval;
    return base;
  }

  base.boostApproval = {
    votes: approval.votes,
    approverStudentIds: approval.approverStudentIds,
    requiredVotes: voteState?.requiredVotes,
    receivedVotes: approval.approverStudentIds.length,
    hasVoted: voteState?.hasVoted,
    status: 'pending',
  };
  return base;
}

function withBoostApprovalState(
  record: MilestoneBonusVoteRecord,
  voteState: { requiredVotes: number; hasVoted: boolean }
) {
  const approval = getBoostApprovalMetadata(record);
  if (!approval) return record;

  return {
    ...record,
    metadata: setBoostApprovalMetadata(record.metadata, approval, voteState),
  };
}

function normalizeRewardCardPayload(value: unknown): GameRewardCardPayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const cost = typeof candidate.cost === 'number' ? candidate.cost : Number(candidate.cost);

  if (!Number.isInteger(cost) || cost < 0) return undefined;

  return {
    title,
    subtitle: typeof candidate.subtitle === 'string' ? candidate.subtitle.trim() || undefined : undefined,
    description:
      typeof candidate.description === 'string' ? candidate.description.trim() || undefined : undefined,
    cost,
    accentToken:
      typeof candidate.accentToken === 'string' ? candidate.accentToken.trim() || 'quest' : 'quest',
    iconKey:
      typeof candidate.iconKey === 'string' ? candidate.iconKey.trim() || 'Gift' : 'Gift',
    illustrationUrl:
      typeof candidate.illustrationUrl === 'string' ? candidate.illustrationUrl.trim() || undefined : undefined,
    color:
      typeof candidate.color === 'string' ? candidate.color.trim() || undefined : undefined,
    sortOrder:
      typeof candidate.sortOrder === 'number' && Number.isInteger(candidate.sortOrder)
        ? candidate.sortOrder
        : undefined,
  };
}

function normalizeMilestonePayload(value: unknown): GameMilestonePayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
  const description = typeof candidate.description === 'string' ? candidate.description.trim() : undefined;
  const cost = typeof candidate.cost === 'number' ? candidate.cost : Number(candidate.cost);
  const sortOrder = typeof candidate.sortOrder === 'number' ? candidate.sortOrder : undefined;

  if (!label || !Number.isInteger(cost) || cost < 0) return undefined;

  return {
    label,
    description: description || undefined,
    cost,
    sortOrder: Number.isInteger(sortOrder) ? sortOrder : undefined,
  };
}

function getRequestedGameId(c: { req: { query: (name: string) => string | undefined } }) {
  return c.req.query('gameId') || c.req.query('cohortId') || undefined;
}

async function resolveStudentCohortContext(
  db: Database,
  user: UserPayload | undefined,
  requestedCohortId?: string
): Promise<
  | {
      studentRecord: StudentRecord;
      membership: CohortMembershipRecord;
      cohortRecord: CohortRecord;
    }
  | undefined
> {
  const [studentRecord] = user?.id
    ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
    : [];

  if (!studentRecord) return undefined;

  const memberships = await db
    .select()
    .from(cohortMemberships)
    .where(eq(cohortMemberships.userId, studentRecord.userId))
    .orderBy(desc(cohortMemberships.createdAt));
  const membership = requestedCohortId
    ? memberships.find((item) => item.cohortId === requestedCohortId)
    : memberships[0];

  if (!membership?.cohortId) return undefined;

  const [cohortRecord] = await db
    .select()
    .from(cohorts)
    .where(eq(cohorts.id, membership.cohortId))
    .limit(1);

  return cohortRecord ? { studentRecord, membership, cohortRecord } : undefined;
}

async function countGuildMembers(db: GuildMutationDb, cohortId: string, guildId: string) {
  const [memberCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cohortMemberships)
    .where(and(eq(cohortMemberships.cohortId, cohortId), eq(cohortMemberships.guildId, guildId)));

  return Number(memberCountRow?.count || 0);
}

async function loadActiveGuildStudentIds(
  db: Database,
  cohortId: string,
  guildId: string,
  options: { includeStudentId?: string; now?: Date } = {}
) {
  const memberRows = await db
    .select({
      studentId: students.id,
      updatedAt: users.updatedAt,
      lastLogin: users.lastLogin,
    })
    .from(cohortMemberships)
    .innerJoin(students, eq(students.userId, cohortMemberships.userId))
    .innerJoin(users, eq(users.id, cohortMemberships.userId))
    .where(and(eq(cohortMemberships.cohortId, cohortId), eq(cohortMemberships.guildId, guildId)));

  return memberRows
    .filter((row) => row.studentId === options.includeStudentId || isRecentlyOnline(row, options.now))
    .map((row) => row.studentId);
}

async function loadGuildActivityVoteStates(
  db: Database,
  cohortId: string,
  guildId: string,
  activityIds: string[],
  options: { includeStudentId?: string; now?: Date } = {}
) {
  const uniqueActivityIds = [...new Set(activityIds)];
  const states = new Map<string, GuildActivityVoteState>();
  if (uniqueActivityIds.length === 0) return states;

  const memberIds = await loadActiveGuildStudentIds(db, cohortId, guildId, options);
  const requiredVotes = getRequiredGuildActivityVotes(memberIds.length);

  for (const activityId of uniqueActivityIds) {
    states.set(activityId, {
      requiredVotes,
      receivedVotes: 0,
      isComplete: false,
    });
  }

  if (requiredVotes === 0) return states;

  const voteRows = await db
    .select({
      activityId: gameActivityCompletions.activityId,
      studentId: gameActivityCompletions.studentId,
    })
    .from(gameActivityCompletions)
    .where(
      and(
        eq(gameActivityCompletions.cohortId, cohortId),
        inArray(gameActivityCompletions.activityId, uniqueActivityIds),
        inArray(gameActivityCompletions.studentId, memberIds)
      )
    );
  const votersByActivity = new Map<string, Set<string>>();
  for (const row of voteRows) {
    const voters = votersByActivity.get(row.activityId) || new Set<string>();
    voters.add(row.studentId);
    votersByActivity.set(row.activityId, voters);
  }

  for (const activityId of uniqueActivityIds) {
    const receivedVotes = votersByActivity.get(activityId)?.size || 0;
    states.set(activityId, {
      requiredVotes,
      receivedVotes,
      isComplete: receivedVotes >= requiredVotes,
    });
  }

  return states;
}

async function cancelPendingInvitationsForFullGuild(
  db: GuildMutationDb,
  guild: Pick<GuildRecord, 'id' | 'cohortId' | 'maxMembers'>
) {
  const memberCount = await countGuildMembers(db, guild.cohortId, guild.id);
  if (memberCount < guild.maxMembers) return memberCount;

  await db
    .update(guildInvitations)
    .set({ status: 'cancelled', respondedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(guildInvitations.guildId, guild.id), eq(guildInvitations.status, 'pending')));

  return memberCount;
}

async function deleteGuildIfEmpty(db: GuildMutationDb, cohortId: string, guildId: string | undefined) {
  if (!guildId) return;

  const memberCount = await countGuildMembers(db, cohortId, guildId);
  if (memberCount > 0) return;

  await db.delete(guilds).where(and(eq(guilds.id, guildId), eq(guilds.cohortId, cohortId)));
}

async function switchStudentGuild(
  db: GuildMutationDb,
  params: {
    membership: CohortMembershipRecord;
    targetGuild: Pick<GuildRecord, 'id' | 'cohortId' | 'maxMembers'>;
  }
) {
  const previousGuildId = params.membership.guildId || undefined;

  await db
    .update(cohortMemberships)
    .set({ guildId: params.targetGuild.id })
    .where(
      and(
        eq(cohortMemberships.userId, params.membership.userId),
        eq(cohortMemberships.cohortId, params.membership.cohortId)
      )
    );

  await db
    .update(guildInvitations)
    .set({ status: 'cancelled', respondedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(guildInvitations.cohortId, params.membership.cohortId),
        eq(guildInvitations.inviteeUserId, params.membership.userId),
        eq(guildInvitations.status, 'pending')
      )
    );

  if (previousGuildId && previousGuildId !== params.targetGuild.id) {
    await db
      .update(guildInvitations)
      .set({ status: 'cancelled', respondedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(guildInvitations.cohortId, params.membership.cohortId),
          eq(guildInvitations.guildId, previousGuildId),
          eq(guildInvitations.inviterUserId, params.membership.userId),
          eq(guildInvitations.status, 'pending')
        )
      );
  }

  await cancelPendingInvitationsForFullGuild(db, params.targetGuild);
  if (previousGuildId && previousGuildId !== params.targetGuild.id) {
    await deleteGuildIfEmpty(db, params.membership.cohortId, previousGuildId);
  }
}

async function resolveAdminCohort(
  db: Database,
  requestedCohortId?: string
): Promise<CohortRecord | undefined> {
  if (requestedCohortId) {
    const [cohortRecord] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, requestedCohortId))
      .limit(1);
    return cohortRecord;
  }

  const [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(eq(gameMapRuns.status, 'active'))
    .orderBy(desc(gameMapRuns.createdAt))
    .limit(1);

  if (activeRun) {
    const [cohortRecord] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, activeRun.cohortId))
      .limit(1);
    if (cohortRecord) return cohortRecord;
  }

  const [firstCohort] = await db.select().from(cohorts).orderBy(desc(cohorts.startYear)).limit(1);
  return firstCohort;
}

async function getOrCreateActiveRun(db: Database, cohortId: string) {
  let [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(and(eq(gameMapRuns.cohortId, cohortId), eq(gameMapRuns.status, 'active')))
    .orderBy(desc(gameMapRuns.createdAt))
    .limit(1);

  if (!activeRun) {
    [activeRun] = await db.insert(gameMapRuns).values({ cohortId }).returning();
  }

  return activeRun;
}

async function getActiveRun(db: Database, cohortId: string) {
  const [activeRun] = await db
    .select()
    .from(gameMapRuns)
    .where(and(eq(gameMapRuns.cohortId, cohortId), eq(gameMapRuns.status, 'active')))
    .orderBy(desc(gameMapRuns.createdAt))
    .limit(1);

  return activeRun;
}

async function getOrCreateCohortProgress(db: Database, cohortId: string) {
  let [progress] = await db
    .select()
    .from(cohortProgress)
    .where(eq(cohortProgress.cohortId, cohortId))
    .limit(1);

  if (!progress) {
    [progress] = await db
      .insert(cohortProgress)
      .values({
        cohortId,
        labelI18nKey: 'dashboard.dock.milestone',
      })
      .returning();
  }

  return progress;
}

async function getCohortProgress(db: Database, cohortId: string) {
  const [progress] = await db
    .select()
    .from(cohortProgress)
    .where(eq(cohortProgress.cohortId, cohortId))
    .limit(1);

  return progress;
}

function getOnboardingTask(activity: Pick<ActivityRecord, 'metadata'>) {
  const metadata = activity.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined;
  const task = (metadata as Record<string, unknown>).onboardingTask;
  return typeof task === 'string' ? task : undefined;
}

function isSystemOnboardingActivity(activity: Pick<ActivityRecord, 'metadata'>) {
  const task = getOnboardingTask(activity);
  return task === 'institutional_profile' || task === 'character_card' || task === 'guild_rally';
}

function withDefaultOnboardingResource(
  metadata: Record<string, unknown>,
  resource: { title: string; url: string }
): Record<string, unknown> {
  const currentResources = normalizeOnboardingResources(metadata.resources);
  const hasResource = currentResources.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    return (item as Record<string, unknown>).url === resource.url;
  });

  return {
    ...metadata,
    resources: hasResource ? currentResources : [resource, ...currentResources],
  };
}

function normalizeOnboardingResources(resources: unknown) {
  if (!Array.isArray(resources)) return [];

  let changed = false;
  const normalizedResources = resources.map((item) => {
    const normalizedItem = normalizeOnboardingResource(item);
    if (normalizedItem !== item) changed = true;
    return normalizedItem;
  });

  return changed ? normalizedResources : resources;
}

function normalizeOnboardingResource(resource: unknown) {
  if (!resource || typeof resource !== 'object' || Array.isArray(resource)) return resource;
  const resourceRecord = resource as Record<string, unknown>;
  if (resourceRecord.url !== '#guild') return resource;
  return { ...resourceRecord, url: '#annuaire' };
}

function getDefaultOnboardingResource(task: string | undefined) {
  if (task === 'institutional_profile') {
    return { title: 'Compléter le profil institutionnel', url: '#profile' };
  }
  if (task === 'character_card') {
    return { title: 'Créer la carte personnage', url: '#character' };
  }
  if (task === 'guild_rally') {
    return { title: 'Créer ou rejoindre une guilde', url: '#annuaire' };
  }

  return undefined;
}

function getDefaultOnboardingIconKey(task: string | undefined) {
  if (task === 'institutional_profile') return 'user-check';
  if (task === 'character_card') return 'contact';
  if (task === 'guild_rally') return 'users';
  return undefined;
}

async function ensureOnboardingActivities(db: Database, cohortId: string, mapRunId: string) {
  const existingActivities = await db
    .select()
    .from(gameActivities)
    .where(or(eq(gameActivities.cohortId, cohortId), eq(gameActivities.mapRunId, mapRunId)));

  const existingProfileActivity = existingActivities.find(
    (activity) => getOnboardingTask(activity) === 'institutional_profile'
  );
  const existingCharacterActivity = existingActivities.find(
    (activity) => getOnboardingTask(activity) === 'character_card'
  );
  const existingGuildRallyActivity = existingActivities.find(
    (activity) => getOnboardingTask(activity) === 'guild_rally'
  );
  const values: Array<typeof gameActivities.$inferInsert> = [];

  if (!existingProfileActivity) {
    values.push({
      cohortId,
      mapRunId,
      type: 'onboarding',
      title: 'Profil institutionnel',
      isGraded: false,
      mapX: 180,
      mapY: 320,
      sectorDepth: 0,
      requiredLevel: 1,
      stepRanges: [{ startStep: 0 }],
      participationMode: 'solo',
      basePoints: 0,
      metadata: {
        onboardingTask: 'institutional_profile',
        subtitle: 'Onboarding · Identité école',
        description:
          'Complétez votre profil institutionnel avant de créer votre carte joueur.',
        iconKey: 'user-check',
        resources: [{ title: 'Compléter le profil institutionnel', url: '#profile' }],
      },
    });
  }

  if (!existingCharacterActivity) {
    values.push({
      cohortId,
      mapRunId,
      type: 'character_creation',
      title: 'Carte joueur',
      isGraded: false,
      mapX: 460,
      mapY: 320,
      sectorDepth: 0,
      requiredLevel: 1,
      stepRanges: [{ startStep: 0 }],
      participationMode: 'solo',
      basePoints: 0,
      metadata: {
        onboardingTask: 'character_card',
        subtitle: 'Onboarding · Classe et personnage',
        description:
          'Choisissez une classe pour créer votre carte personnage et entrer dans la partie.',
        iconKey: 'contact',
        resources: [{ title: 'Créer la carte personnage', url: '#character' }],
      },
    });
  }

  if (!existingGuildRallyActivity) {
    values.push({
      cohortId,
      mapRunId,
      type: 'tavern',
      title: 'Ralliement de guilde',
      isGraded: false,
      mapX: 740,
      mapY: 320,
      sectorDepth: 0,
      requiredLevel: 1,
      stepRanges: [{ startStep: 0 }],
      participationMode: 'solo',
      basePoints: 0,
      metadata: {
        onboardingTask: 'guild_rally',
        guildTask: 'recruitment',
        subtitle: 'Onboarding · Recrutement',
        description:
          'Créez une guilde, rejoignez un groupe existant ou répondez à vos invitations.',
        iconKey: 'users',
        resources: [{ title: 'Créer ou rejoindre une guilde', url: '#annuaire' }],
      },
    });
  }

  const createdActivities = values.length > 0
    ? await db.insert(gameActivities).values(values).returning()
    : [];
  const allActivities = [...existingActivities, ...createdActivities];
  const profileActivity =
    existingProfileActivity ||
    createdActivities.find((activity) => getOnboardingTask(activity) === 'institutional_profile');
  const characterActivity =
    existingCharacterActivity ||
    createdActivities.find((activity) => getOnboardingTask(activity) === 'character_card');
  const guildRallyActivity =
    existingGuildRallyActivity ||
    createdActivities.find((activity) => getOnboardingTask(activity) === 'guild_rally');
  if (profileActivity && characterActivity) {
    const [existingEdge] = await db
      .select()
      .from(gameActivityEdges)
      .where(
        and(
          eq(gameActivityEdges.fromActivityId, profileActivity.id),
          eq(gameActivityEdges.toActivityId, characterActivity.id)
        )
      )
      .limit(1);

    if (!existingEdge) {
      await db.insert(gameActivityEdges).values({
        cohortId,
        mapRunId,
        fromActivityId: profileActivity.id,
        toActivityId: characterActivity.id,
        metadata: { systemEdge: 'onboarding' },
      });
    }
  }
  if (characterActivity && guildRallyActivity) {
    const [existingEdge] = await db
      .select()
      .from(gameActivityEdges)
      .where(
        and(
          eq(gameActivityEdges.fromActivityId, characterActivity.id),
          eq(gameActivityEdges.toActivityId, guildRallyActivity.id)
        )
      )
      .limit(1);

    if (!existingEdge) {
      await db.insert(gameActivityEdges).values({
        cohortId,
        mapRunId,
        fromActivityId: characterActivity.id,
        toActivityId: guildRallyActivity.id,
        metadata: { systemEdge: 'guild_rally' },
      });
    }
  }

  for (const activity of allActivities) {
    const task = getOnboardingTask(activity);
    const defaultResource = getDefaultOnboardingResource(task);
    const defaultIconKey = getDefaultOnboardingIconKey(task);
    if (!defaultResource && !defaultIconKey) continue;

    const metadata = normalizeMetadata(activity.metadata);
    let nextMetadata = defaultResource
      ? withDefaultOnboardingResource(metadata, defaultResource)
      : metadata;

    const currentIconKey = typeof nextMetadata.iconKey === 'string' ? nextMetadata.iconKey : undefined;
    const shouldUseDefaultIcon =
      defaultIconKey &&
      (!currentIconKey ||
        (task === 'institutional_profile' && currentIconKey === 'onboarding') ||
        (task === 'character_card' && ['anvil', 'character_creation'].includes(currentIconKey)));
    if (shouldUseDefaultIcon) {
      nextMetadata = { ...nextMetadata, iconKey: defaultIconKey };
    }
    if (nextMetadata.resources === metadata.resources && nextMetadata.iconKey === metadata.iconKey) continue;

    await db
      .update(gameActivities)
      .set({ metadata: nextMetadata })
      .where(eq(gameActivities.id, activity.id));
    activity.metadata = nextMetadata;
  }

  return allActivities;
}

function buildEmptyMapData(): GameMapData {
  return {
    activities: [],
    edges: [],
    completions: [],
    nodeOccupancies: [],
    currentStep: 0,
  };
}

function buildEmptyProgressData(): CohortProgressData {
  return {
    gauge: {
      currentPoints: 0,
      targetPoints: 0,
      labelI18nKey: 'dashboard.dock.milestone',
      milestones: [],
    },
    notifications: [],
  };
}

export const mapRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

mapRouter.post('/map/activities', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ mapX?: unknown; mapY?: unknown; currentStep?: unknown }>(c, {});
  const mapX = typeof body?.mapX === 'number' && Number.isInteger(body.mapX) ? body.mapX : 500;
  const mapY = typeof body?.mapY === 'number' && Number.isInteger(body.mapY) ? body.mapY : 300;
  const currentStep =
    typeof body?.currentStep === 'number' && Number.isInteger(body.currentStep) && body.currentStep >= 0
      ? body.currentStep
      : 0;

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [createdActivity] = await db
      .insert(gameActivities)
      .values({
        cohortId: cohortRecord.id,
        mapRunId: activeRun.id,
        type: 'practical',
        title: 'New activity',
        isGraded: false,
        mapX,
        mapY,
        sectorDepth: currentStep,
        requiredLevel: currentStep + 1,
        stepRanges: [{ startStep: currentStep }],
        participationMode: 'solo',
        basePoints: 100,
        metadata: {},
      })
      .returning();

    return c.json({
      success: true,
      activity: toActivity(
        createdActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity create failed:', error.message);
    return apiError(c, 'Activity could not be created.', 500);
  }
});

mapRouter.delete('/map/activities/:activityId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const activityScope = and(
      eq(gameActivities.id, activityId),
      or(
        sql`${gameActivities.cohortId} IS NULL`,
        eq(gameActivities.cohortId, cohortRecord.id),
        eq(gameActivities.mapRunId, activeRun.id)
      )
    );
    const [activity] = await db.select().from(gameActivities).where(activityScope).limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found.', 404);
    }

    if (isSystemOnboardingActivity(activity)) {
      return apiError(c, 'Onboarding activities are required and cannot be deleted.', 409, {
        errorCode: 'conflict',
      });
    }

    await db
      .delete(gameActivityEdges)
      .where(or(eq(gameActivityEdges.fromActivityId, activityId), eq(gameActivityEdges.toActivityId, activityId)));
    await db.delete(gameActivityCompletions).where(eq(gameActivityCompletions.activityId, activityId));
    await db.delete(gameCharacterMoves).where(eq(gameCharacterMoves.toActivityId, activityId));
    await db
      .update(gameCharacterMoves)
      .set({ fromActivityId: null })
      .where(eq(gameCharacterMoves.fromActivityId, activityId));
    await db
      .update(gameActivities)
      .set({ templateActivityId: null })
      .where(eq(gameActivities.templateActivityId, activityId));

    const [deletedActivity] = await db
      .delete(gameActivities)
      .where(eq(gameActivities.id, activityId))
      .returning({ id: gameActivities.id });

    if (!deletedActivity) {
      return apiError(c, 'Activity not found.', 404);
    }

    return c.json({
      success: true,
      activity: deletedActivity,
    });
  } catch (error: any) {
    console.error('Activity delete failed:', error.message);
    if (String(error.message || '').includes('foreign key')) {
      return apiError(c, 'Activity still has linked map history and could not be deleted safely.', 409);
    }
    return apiError(c, 'Activity could not be deleted.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/position', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ mapX?: unknown; mapY?: unknown }>(c, {});
  const mapX = body?.mapX;
  const mapY = body?.mapY;

  if (
    typeof mapX !== 'number' ||
    typeof mapY !== 'number' ||
    !Number.isInteger(mapX) ||
    !Number.isInteger(mapY)
  ) {
    return apiError(c, 'mapX and mapY must be integers.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [updatedActivity] = await db
      .update(gameActivities)
      .set({
        mapX,
        mapY,
      })
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, cohortRecord.id),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .returning();

    if (!updatedActivity) {
      return apiError(c, 'Activity not found.', 404);
    }

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity position update failed:', error.message);
    return apiError(c, 'Activity position could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/title', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ title?: unknown }>(c, {});
  const title = typeof body?.title === 'string' ? body.title.trim() : '';

  if (!title) {
    return apiError(c, 'Activity title is required.', 400);
  }

  if (title.length > 160) {
    return apiError(c, 'Activity title must be 160 characters or fewer.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [updatedActivity] = await db
      .update(gameActivities)
      .set({ title })
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, cohortRecord.id),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .returning();

    if (!updatedActivity) {
      return apiError(c, 'Activity not found.', 404);
    }

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity title update failed:', error.message);
    return apiError(c, 'Activity title could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/card-fields', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{
    subtitle?: unknown;
    description?: unknown;
    resources?: unknown;
    basePoints?: unknown;
    participationMode?: unknown;
    mapX?: unknown;
    mapY?: unknown;
  }>(c, {});

  let subtitle: string | undefined;
  let description: string | undefined;
  let resources: Array<{ title?: string; url: string }> | undefined;
  let basePoints: number | undefined;
  let participationMode: ActivityParticipationMode | undefined;
  let mapX: number | undefined;
  let mapY: number | undefined;

  try {
    subtitle = validateOptionalText(body?.subtitle, 'subtitle', 160);
    description = validateOptionalText(body?.description, 'description', 4000);
    resources = validateOptionalResources(body?.resources);
    basePoints = validateOptionalInteger(body?.basePoints, 'basePoints', 0, 100000);
    participationMode = validateOptionalParticipationMode(body?.participationMode);
    mapX = validateOptionalInteger(body?.mapX, 'mapX', -100000, 100000);
    mapY = validateOptionalInteger(body?.mapY, 'mapY', -100000, 100000);
  } catch (error: any) {
    return apiError(c, error.message || 'Invalid activity card field.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const activityScope = and(
      eq(gameActivities.id, activityId),
      or(
        sql`${gameActivities.cohortId} IS NULL`,
        eq(gameActivities.cohortId, cohortRecord.id),
        eq(gameActivities.mapRunId, activeRun.id)
      )
    );
    const [activity] = await db.select().from(gameActivities).where(activityScope).limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found.', 404);
    }

    const metadata = normalizeMetadata(activity.metadata);
    const nextMetadata = { ...metadata };
    if (subtitle !== undefined) nextMetadata.subtitle = subtitle;
    if (description !== undefined) nextMetadata.description = description;
    if (resources !== undefined) nextMetadata.resources = resources;

    const update: Partial<typeof gameActivities.$inferInsert> = {};
    if (subtitle !== undefined || description !== undefined || resources !== undefined) {
      update.metadata = nextMetadata;
    }
    if (basePoints !== undefined) update.basePoints = basePoints;
    if (participationMode !== undefined) update.participationMode = participationMode;
    if (mapX !== undefined) update.mapX = mapX;
    if (mapY !== undefined) update.mapY = mapY;

    if (Object.keys(update).length === 0) {
      return apiError(c, 'No activity card field was provided.', 400);
    }

    const [updatedActivity] = await db
      .update(gameActivities)
      .set(update)
      .where(activityScope)
      .returning();

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity card fields update failed:', error.message);
    return apiError(c, 'Activity card fields could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/step-ranges', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ stepRanges?: unknown }>(c, {});

  let stepRanges: ActivityStepRange[];
  try {
    stepRanges = validateActivityStepRanges(body?.stepRanges);
  } catch (error: any) {
    return apiError(c, error.message || 'Invalid stepRanges.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const activityScope = or(
      sql`${gameActivities.cohortId} IS NULL`,
      eq(gameActivities.cohortId, cohortRecord.id),
      eq(gameActivities.mapRunId, activeRun.id)
    );
    const [updatedActivity] = await db
      .update(gameActivities)
      .set({ stepRanges })
      .where(and(eq(gameActivities.id, activityId), activityScope))
      .returning();

    if (!updatedActivity) {
      return apiError(c, 'Activity not found.', 404);
    }

    const [activityRecords, edgeRecords] = await Promise.all([
      db.select().from(gameActivities).where(activityScope),
      db
        .select()
        .from(gameActivityEdges)
        .where(
          or(
            sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
            eq(gameActivityEdges.cohortId, cohortRecord.id),
            eq(gameActivityEdges.mapRunId, activeRun.id)
          )
        ),
    ]);
    const map = buildMapData(
      toMapRun(activeRun),
      activityRecords,
      edgeRecords.map(toActivityEdge),
      [],
      undefined,
      cohortRecord,
      true
    );
    const activity = map.activities.find((candidate) => candidate.id === activityId);

    return c.json({
      success: true,
      activity:
        activity ||
        toActivity(
          updatedActivity,
          { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
          true
        ),
    });
  } catch (error: any) {
    console.error('Activity step range update failed:', error.message);
    return apiError(c, 'Activity step ranges could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/icon', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ iconKey?: unknown }>(c, {});
  const iconKey = typeof body?.iconKey === 'string' ? body.iconKey.trim() : '';

  if (!iconKey) {
    return apiError(c, 'iconKey is required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, cohortRecord.id),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found.', 404);
    }

    const metadata =
      activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata)
        ? (activity.metadata as Record<string, unknown>)
        : {};
    const [updatedActivity] = await db
      .update(gameActivities)
      .set({
        metadata: {
          ...metadata,
          iconKey,
        },
      })
      .where(eq(gameActivities.id, activityId))
      .returning();

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity icon update failed:', error.message);
    return apiError(c, 'Activity icon could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/card-color', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ cardColor?: unknown }>(c, {});
  const cardColor = typeof body?.cardColor === 'string' ? body.cardColor.trim() : '';

  if (!cardColor) {
    return apiError(c, 'cardColor is required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [updatedActivity] = await db
      .update(gameActivities)
      .set({ cardColor })
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, cohortRecord.id),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .returning();

    if (!updatedActivity) {
      return apiError(c, 'Activity not found.', 404);
    }

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity color update failed:', error.message);
    return apiError(c, 'Activity color could not be updated.', 500);
  }
});

mapRouter.patch('/map/activities/:activityId/illustration', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const activityId = c.req.param('activityId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ illustrationUrl?: unknown }>(c, {});
  const illustrationUrl = typeof body?.illustrationUrl === 'string' ? body.illustrationUrl.trim() : '';

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, cohortRecord.id),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found.', 404);
    }

    const metadata =
      activity.metadata && typeof activity.metadata === 'object' && !Array.isArray(activity.metadata)
        ? (activity.metadata as Record<string, unknown>)
        : {};
    const nextMetadata = { ...metadata };
    if (illustrationUrl) {
      nextMetadata.illustrationUrl = illustrationUrl;
    } else {
      delete nextMetadata.illustrationUrl;
    }

    const [updatedActivity] = await db
      .update(gameActivities)
      .set({ metadata: nextMetadata })
      .where(eq(gameActivities.id, activityId))
      .returning();

    return c.json({
      success: true,
      activity: toActivity(
        updatedActivity,
        { isCompleted: false, isRevealed: true, isLocked: false, isCurrent: false },
        true
      ),
    });
  } catch (error: any) {
    console.error('Activity illustration update failed:', error.message);
    return apiError(c, 'Activity illustration could not be updated.', 500);
  }
});

mapRouter.delete('/map/edges/:edgeId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const edgeId = c.req.param('edgeId');
  const requestedCohortId = getRequestedGameId(c);

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [deletedEdge] = await db
      .delete(gameActivityEdges)
      .where(
        and(
          eq(gameActivityEdges.id, edgeId),
          or(
            sql`${gameActivityEdges.cohortId} IS NULL`,
            eq(gameActivityEdges.cohortId, cohortRecord.id),
            eq(gameActivityEdges.mapRunId, activeRun.id)
          )
        )
      )
      .returning();

    if (!deletedEdge) {
      return apiError(c, 'Activity edge not found.', 404);
    }

    return c.json({
      success: true,
      edge: toActivityEdge(deletedEdge),
    });
  } catch (error: any) {
    console.error('Activity edge delete failed:', error.message);
    return apiError(c, 'Activity edge could not be deleted.', 500);
  }
});

mapRouter.post('/map/edges', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ fromActivityId?: unknown; toActivityId?: unknown }>(c, {});
  const fromActivityId = typeof body?.fromActivityId === 'string' ? body.fromActivityId.trim() : '';
  const toActivityId = typeof body?.toActivityId === 'string' ? body.toActivityId.trim() : '';

  if (!fromActivityId || !toActivityId) {
    return apiError(c, 'fromActivityId and toActivityId are required.', 400);
  }

  if (fromActivityId === toActivityId) {
    return apiError(c, 'An activity cannot link to itself.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const activityScope = or(
      sql`${gameActivities.cohortId} IS NULL`,
      eq(gameActivities.cohortId, cohortRecord.id),
      eq(gameActivities.mapRunId, activeRun.id)
    );
    const linkedActivities = await db
      .select({ id: gameActivities.id })
      .from(gameActivities)
      .where(and(inArray(gameActivities.id, [fromActivityId, toActivityId]), activityScope));

    if (linkedActivities.length !== 2) {
      return apiError(c, 'Both activities must exist on this map before they can be linked.', 404);
    }

    const edgeScope = and(
      eq(gameActivityEdges.fromActivityId, fromActivityId),
      eq(gameActivityEdges.toActivityId, toActivityId),
      or(
        sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
        eq(gameActivityEdges.cohortId, cohortRecord.id),
        eq(gameActivityEdges.mapRunId, activeRun.id)
      )
    );
    const [existingEdge] = await db.select().from(gameActivityEdges).where(edgeScope).limit(1);

    if (existingEdge) {
      return c.json({ success: true, edge: toActivityEdge(existingEdge) });
    }

    const [createdEdge] = await db
      .insert(gameActivityEdges)
      .values({
        cohortId: cohortRecord.id,
        mapRunId: activeRun.id,
        fromActivityId,
        toActivityId,
        metadata: {},
      })
      .returning();

    return c.json({
      success: true,
      edge: toActivityEdge(createdEdge),
    });
  } catch (error: any) {
    console.error('Activity edge create failed:', error.message);
    return apiError(c, 'Activity edge could not be created.', 500);
  }
});

mapRouter.patch('/map/edges/:edgeId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const edgeId = c.req.param('edgeId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{
    styleWindows?: unknown;
    unlockPrerequisiteActivityIds?: unknown;
  }>(c, {});

  let styleWindows: GameActivityEdgeStyleWindow[] | undefined;
  try {
    styleWindows = validateEdgeStyleWindows(body?.styleWindows);
  } catch (error: any) {
    return apiError(c, error.message || 'Invalid edge style windows.', 400);
  }

  if (!styleWindows && body?.unlockPrerequisiteActivityIds === undefined) {
    return apiError(c, 'styleWindows or unlockPrerequisiteActivityIds is required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, requestedCohortId);

    if (!cohortRecord) {
      return apiError(c, 'Map cohort not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    const [edge] = await db
      .select()
      .from(gameActivityEdges)
      .where(
        and(
          eq(gameActivityEdges.id, edgeId),
          or(
            sql`${gameActivityEdges.cohortId} IS NULL`,
            eq(gameActivityEdges.cohortId, cohortRecord.id),
            eq(gameActivityEdges.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!edge) {
      return apiError(c, 'Activity edge not found.', 404);
    }

    const activityRecords = await db
      .select({ id: gameActivities.id })
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, cohortRecord.id),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      );
    const activityIds = new Set(activityRecords.map((activity) => activity.id));
    let unlockPrerequisiteActivityIds: string[] | undefined;
    try {
      unlockPrerequisiteActivityIds = validateEdgeUnlockPrerequisites(
        body?.unlockPrerequisiteActivityIds,
        activityIds
      );
    } catch (error: any) {
      return apiError(c, error.message || 'Invalid edge unlock prerequisites.', 400);
    }

    const metadata =
      edge.metadata && typeof edge.metadata === 'object' && !Array.isArray(edge.metadata)
        ? (edge.metadata as Record<string, unknown>)
        : {};
    const nextMetadata = {
      ...metadata,
      ...(styleWindows ? { styleWindows } : {}),
      ...(unlockPrerequisiteActivityIds !== undefined ? { unlockPrerequisiteActivityIds } : {}),
    };
    const [updatedEdge] = await db
      .update(gameActivityEdges)
      .set({
        metadata: nextMetadata,
      })
      .where(eq(gameActivityEdges.id, edgeId))
      .returning();

    return c.json({
      success: true,
      edge: toActivityEdge(updatedEdge),
    });
  } catch (error: any) {
    console.error('Activity edge update failed:', error.message);
    return apiError(c, 'Activity edge could not be updated.', 500);
  }
});

mapRouter.get('/games', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const requestedGameId = getRequestedGameId(c);

    if (user?.isAdmin) {
      const cohortRecords = await db.select().from(cohorts).orderBy(desc(cohorts.startYear));
      const selectedCohort = await resolveAdminCohort(db, requestedGameId);

      return c.json({
        success: true,
        source: 'database',
        games: cohortRecords.map(toGamePayload),
        selectedGameId: selectedCohort?.id || cohortRecords[0]?.id,
      });
    }

    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return apiError(c, 'Student profile not found.', 404);
    }

    const memberships = await db
      .select()
      .from(cohortMemberships)
      .where(eq(cohortMemberships.userId, studentRecord.userId))
      .orderBy(desc(cohortMemberships.createdAt));
    const cohortIds = [...new Set(memberships.map((membership) => membership.cohortId))];

    if (cohortIds.length === 0) {
      return c.json({ success: true, source: 'database', games: [], selectedGameId: undefined });
    }

    const cohortRecords = await db.select().from(cohorts).where(inArray(cohorts.id, cohortIds));
    const selectedMembership =
      (requestedGameId && memberships.find((membership) => membership.cohortId === requestedGameId)) ||
      memberships[0];

    return c.json({
      success: true,
      source: 'database',
      games: cohortRecords.map(toGamePayload),
      selectedGameId: selectedMembership?.cohortId,
    });
  } catch (error: any) {
    console.error('Game selector SQL error:', error.message);
    return apiError(c, 'Games could not be loaded.', 500);
  }
});

mapRouter.post('/guilds', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<CreateGuildPayload>(c, {});

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  const iconUrl = typeof body?.iconUrl === 'string' ? body.iconUrl.trim() : undefined;
  const iconKey = typeof body?.iconKey === 'string' ? body.iconKey.trim() : undefined;
  const color = typeof body?.color === 'string' ? body.color.trim() : undefined;
  let recruitmentStatus: GuildRecruitmentStatus | undefined;
  let recruitmentMessage: string | undefined;
  let maxMembers: number | undefined;

  const hasMaxMembers = body && Object.prototype.hasOwnProperty.call(body, 'maxMembers') && body.maxMembers !== undefined;
  if (!user?.isAdmin && hasMaxMembers) {
    return apiError(c, 'Guild size modification is not allowed.', 403);
  }

  try {
    recruitmentStatus = validateOptionalRecruitmentStatus(body?.recruitmentStatus);
    recruitmentMessage = validateOptionalText(body?.recruitmentMessage, 'recruitmentMessage', 400);
    maxMembers = validateOptionalInteger(body?.maxMembers, 'maxMembers', 1, 12);
  } catch (error: any) {
    return apiError(c, error.message, 400, {
      errorCode: 'validation_failed',
    });
  }

  if (!name || name.length > 80) {
    return apiError(c, 'Guild name is required and must be 80 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (description && description.length > 400) {
    return apiError(c, 'Guild description must be 400 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (iconUrl && iconUrl.length > 2000) {
    return apiError(c, 'iconUrl must be 2000 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (iconKey && !/^[A-Za-z0-9_-]{1,80}$/.test(iconKey)) {
    return apiError(c, 'iconKey must be a valid icon identifier.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (color && color.length > 80) {
    return apiError(c, 'Guild color must be 80 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    if (!(await isStudentOnGuildRallyNode(db, context))) {
      return apiError(c, 'Guild actions are only available from the guild rally activity.', 403);
    }
    const [createdGuild] = await db
      .insert(guilds)
      .values({
        cohortId: context.cohortRecord.id,
        name,
        description: description || null,
        iconUrl: iconUrl || null,
        iconKey: iconKey || null,
        color: color || null,
        recruitmentStatus: recruitmentStatus || 'open',
        recruitmentMessage: recruitmentMessage || null,
        maxMembers: maxMembers || 3,
      })
      .returning();

    const [updatedMembership] = await db
      .update(cohortMemberships)
      .set({ guildId: createdGuild.id })
      .where(
        and(
          eq(cohortMemberships.userId, context.membership.userId),
          eq(cohortMemberships.cohortId, context.membership.cohortId)
        )
      )
      .returning();

    if (!updatedMembership) {
      throw new Error('Student already belongs to a guild for this cohort.');
    }
    if (context.membership.guildId && context.membership.guildId !== createdGuild.id) {
      await deleteGuildIfEmpty(db, context.membership.cohortId, context.membership.guildId);
    }

    const activeRun = await getOrCreateActiveRun(db, context.cohortRecord.id);
    const onboardingActivities = await ensureOnboardingActivities(db, context.cohortRecord.id, activeRun.id);
    const guildCreationActivity = onboardingActivities.find(
      (activity) => getOnboardingTask(activity) === 'guild_rally'
    );

    if (guildCreationActivity) {
      await publishEvent(
        {
          type: 'activity.validated',
          source: 'http.guilds',
          payload: {
            activityId: guildCreationActivity.id,
            studentId: context.studentRecord.id,
            cohortId: context.cohortRecord.id,
            guildId: createdGuild.id,
            validatedBy: 'system',
          },
          metadata: {
            onboardingRewardAction: GUILD_CREATION_ONBOARDING_REWARD_ACTION,
          },
        },
        createEventContext({ db, env: c.env, userId: user?.id })
      );
    }

    const [creatorRecord] = await db
      .select({
        studentId: students.id,
        userId: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        githubAvatarUrl: users.githubAvatarUrl,
        guildId: cohortMemberships.guildId,
        guildName: guilds.name,
        guildIconUrl: guilds.iconUrl,
        guildIconKey: guilds.iconKey,
        guildColor: guilds.color,
        institutionalEmail: cohortMemberships.institutionalEmail,
        characterClass: gameCharacters.characterClass,
        characterIllustrationUrl: gameCharacters.illustrationUrl,
        characterTitle: gameCharacters.title,
        strength: sql<number>`coalesce(${gameCharacters.strength}, 0) + coalesce(${gameCharacterClasses.baseStrength}, 0)`,
        dexterity: sql<number>`coalesce(${gameCharacters.dexterity}, 0) + coalesce(${gameCharacterClasses.baseDexterity}, 0)`,
        constitution: sql<number>`coalesce(${gameCharacters.constitution}, 0) + coalesce(${gameCharacterClasses.baseConstitution}, 0)`,
        intelligence: sql<number>`coalesce(${gameCharacters.intelligence}, 0) + coalesce(${gameCharacterClasses.baseIntelligence}, 0)`,
        wisdom: sql<number>`coalesce(${gameCharacters.wisdom}, 0) + coalesce(${gameCharacterClasses.baseWisdom}, 0)`,
        charisma: sql<number>`coalesce(${gameCharacters.charisma}, 0) + coalesce(${gameCharacterClasses.baseCharisma}, 0)`,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(users, eq(users.id, cohortMemberships.userId))
      .leftJoin(guilds, eq(guilds.id, cohortMemberships.guildId))
      .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .leftJoin(gameCharacterClasses, eq(gameCharacterClasses.slug, gameCharacters.characterClass))
      .where(
        and(
          eq(cohortMemberships.userId, context.membership.userId),
          eq(cohortMemberships.cohortId, context.membership.cohortId)
        )
      )
      .limit(1);

    return c.json(
      {
        success: true,
        source: 'database',
        guild: {
          ...toGuildPayload(createdGuild),
          members: creatorRecord ? [toClassRosterStudent(creatorRecord)] : [],
        },
      },
      201
    );
  } catch (error: any) {
    console.error('Guild creation SQL error:', error.message);
    if (error?.message === 'Student already belongs to a guild for this cohort.') {
      return apiError(c, error.message, 409);
    }
    return apiError(c, 'Guild could not be created.', 500);
  }
});

mapRouter.get('/guilds', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : (await resolveStudentCohortContext(db, user, requestedCohortId))?.cohortRecord;

    if (!cohortRecord) {
      return c.json({
        success: true,
        source: 'database',
        guilds: [],
        unguildedStudents: [],
      });
    }

    const guildRecords = await db
      .select()
      .from(guilds)
      .where(eq(guilds.cohortId, cohortRecord.id));
    const guildSpendRows =
      guildRecords.length > 0
        ? await db
            .select({
              guildId: pointTransactions.guildId,
              boostPointsSpent: sql<number>`coalesce(sum(-${pointTransactions.amount}), 0)`,
            })
            .from(pointTransactions)
            .where(
              and(
                inArray(pointTransactions.guildId, guildRecords.map((guild) => guild.id)),
                eq(pointTransactions.transactionType, 'SPENT_VOTE')
              )
            )
            .groupBy(pointTransactions.guildId)
        : [];
    const boostPointsSpentByGuildId = new Map(
      guildSpendRows.map((row) => [row.guildId, Number(row.boostPointsSpent || 0)])
    );
    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db, cohortRecord.id);
    const rosterStudentRecords = await db
      .select({
        studentId: students.id,
        userId: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        githubAvatarUrl: users.githubAvatarUrl,
        guildId: cohortMemberships.guildId,
        institutionalEmail: cohortMemberships.institutionalEmail,
        characterClass: gameCharacters.characterClass,
        characterIllustrationUrl: gameCharacters.illustrationUrl,
        characterTitle: gameCharacters.title,
        strength: sql<number>`coalesce(${gameCharacters.strength}, 0) + coalesce(${gameCharacterClasses.baseStrength}, 0)`,
        dexterity: sql<number>`coalesce(${gameCharacters.dexterity}, 0) + coalesce(${gameCharacterClasses.baseDexterity}, 0)`,
        constitution: sql<number>`coalesce(${gameCharacters.constitution}, 0) + coalesce(${gameCharacterClasses.baseConstitution}, 0)`,
        intelligence: sql<number>`coalesce(${gameCharacters.intelligence}, 0) + coalesce(${gameCharacterClasses.baseIntelligence}, 0)`,
        wisdom: sql<number>`coalesce(${gameCharacters.wisdom}, 0) + coalesce(${gameCharacterClasses.baseWisdom}, 0)`,
        charisma: sql<number>`coalesce(${gameCharacters.charisma}, 0) + coalesce(${gameCharacterClasses.baseCharisma}, 0)`,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(users, eq(users.id, cohortMemberships.userId))
      .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .leftJoin(gameCharacterClasses, eq(gameCharacterClasses.slug, gameCharacters.characterClass))
      .leftJoin(guilds, eq(guilds.id, cohortMemberships.guildId))
      .where(eq(cohortMemberships.cohortId, cohortRecord.id));
    const rosterStudents = rosterStudentRecords.map((record) => ({
      student: toClassRosterStudent(record),
      guildId: record.guildId,
    }));
    const currentMembership = user?.id
      ? rosterStudentRecords.find((record) => record.userId === user.id)
      : undefined;
    const currentGuildId = currentMembership?.guildId || undefined;
    const membersByGuildId = rosterStudents.reduce<Map<string, ReturnType<typeof toClassRosterStudent>[]>>(
      (groups, item) => {
        if (!item.guildId) return groups;
        const current = groups.get(item.guildId) || [];
        current.push(item.student);
        groups.set(item.guildId, current);
        return groups;
      },
      new Map()
    );
    const statsByGuildId = new Map(
      Array.from(membersByGuildId.entries()).map(([guildId, members]) => [
        guildId,
        buildWeightedGuildStats(members, balanceConfig.rewardSystem),
      ])
    );
    const invitations = user?.id
      ? await db
          .select()
          .from(guildInvitations)
          .where(
            and(
              eq(guildInvitations.cohortId, cohortRecord.id),
              eq(guildInvitations.status, 'pending'),
              or(
                eq(guildInvitations.inviteeUserId, user.id),
                eq(guildInvitations.inviterUserId, user.id),
                currentGuildId ? eq(guildInvitations.guildId, currentGuildId) : sql`false`
              )
            )
          )
          .orderBy(desc(guildInvitations.createdAt))
      : [];
    const guildById = new Map(guildRecords.map((guild) => [guild.id, guild]));
    const rosterByUserId = new Map(rosterStudentRecords.map((student) => [student.userId, student]));

    const rosterGuilds = guildRecords
      .map((guild) => ({
        ...toGuildPayload(guild),
        boostPointsSpent: boostPointsSpentByGuildId.get(guild.id) || 0,
        stats: statsByGuildId.get(guild.id),
        members: (membersByGuildId.get(guild.id) || []).sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        ),
      }))
      .sort((a, b) => (b.boostPointsSpent || 0) - (a.boostPointsSpent || 0) || a.name.localeCompare(b.name));

    return c.json({
      success: true,
      source: 'database',
      guilds: rosterGuilds,
      unguildedStudents: rosterStudents
        .filter((item) => !item.guildId)
        .map((item) => item.student)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
      invitableStudents: currentGuildId
        ? rosterStudents
            .filter((item) => item.student.userId !== user?.id && !item.guildId)
            .map((item) => item.student)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        : [],
      guildedStudents: currentGuildId
        ? rosterStudents
            .filter((item) => item.student.userId !== user?.id && item.guildId)
            .map((item) => item.student)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
        : [],
      currentGuildId,
      invitations: invitations.map((invitation) =>
        toGuildInvitationPayload(invitation, {
          guild: guildById.get(invitation.guildId),
          inviter: rosterByUserId.get(invitation.inviterUserId),
          invitee: rosterByUserId.get(invitation.inviteeUserId),
        })
      ),
    });
  } catch (error: any) {
    console.error('Guild SQL error:', error.message);
    return apiError(c, 'Guilds could not be loaded.', 500);
  }
});

mapRouter.patch('/guilds/:guildId', async (c) => {
  const databaseUrl = c.env?.DB;
  const guildId = c.req.param('guildId');
  const user = c.get('user');

  let body: UpdateGuildPayload;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
  const hasDescription = Object.prototype.hasOwnProperty.call(body, 'description');
  const hasIconUrl = Object.prototype.hasOwnProperty.call(body, 'iconUrl');
  const hasIconKey = Object.prototype.hasOwnProperty.call(body, 'iconKey');
  const hasColor = Object.prototype.hasOwnProperty.call(body, 'color');
  const hasRecruitmentStatus = Object.prototype.hasOwnProperty.call(body, 'recruitmentStatus');
  const hasRecruitmentMessage = Object.prototype.hasOwnProperty.call(body, 'recruitmentMessage');
  const hasMaxMembers = Object.prototype.hasOwnProperty.call(body, 'maxMembers');
  const name = hasName && typeof body.name === 'string' ? body.name.trim() : undefined;
  const description =
    hasDescription && typeof body.description === 'string' ? body.description.trim() : undefined;
  const iconUrl = hasIconUrl && typeof body.iconUrl === 'string' ? body.iconUrl.trim() : undefined;
  const iconKey = hasIconKey && typeof body.iconKey === 'string' ? body.iconKey.trim() : undefined;
  const color = hasColor && typeof body.color === 'string' ? body.color.trim() : undefined;
  let recruitmentStatus: GuildRecruitmentStatus | undefined;
  let recruitmentMessage: string | undefined;
  let maxMembers: number | undefined;

  if (!user?.isAdmin && hasMaxMembers && body.maxMembers !== undefined) {
    return apiError(c, 'Guild size modification is not allowed.', 403);
  }

  try {
    recruitmentStatus = hasRecruitmentStatus
      ? validateOptionalRecruitmentStatus(body.recruitmentStatus)
      : undefined;
    recruitmentMessage = hasRecruitmentMessage
      ? validateOptionalText(body.recruitmentMessage, 'recruitmentMessage', 400)
      : undefined;
    maxMembers = hasMaxMembers ? validateOptionalInteger(body.maxMembers, 'maxMembers', 1, 12) : undefined;
  } catch (error: any) {
    return apiError(c, error.message, 400, {
      errorCode: 'validation_failed',
    });
  }

  if (
    !hasName &&
    !hasDescription &&
    !hasIconUrl &&
    !hasIconKey &&
    !hasColor &&
    !hasRecruitmentStatus &&
    !hasRecruitmentMessage &&
    !hasMaxMembers
  ) {
    return apiError(c, 'At least one guild field is required.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (hasName && (!name || name.length > 80)) {
    return apiError(c, 'Guild name is required and must be 80 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (hasDescription && description && description.length > 400) {
    return apiError(c, 'Guild description must be 400 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (hasIconUrl && iconUrl && iconUrl.length > 2000) {
    return apiError(c, 'iconUrl must be 2000 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (hasIconKey && (!iconKey || !/^[A-Za-z0-9_-]{1,80}$/.test(iconKey))) {
    return apiError(c, 'iconKey must be a valid icon identifier.', 400);
  }
  if (hasColor && color && color.length > 80) {
    return apiError(c, 'Guild color must be 80 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);

    if (!guildRecord) {
      return apiError(c, 'Guild not found.', 404);
    }

    if (!user?.isAdmin) {
      const context = await resolveStudentCohortContext(db, user, guildRecord.cohortId);
      if (!context || context.membership.guildId !== guildId) {
        return apiError(c, 'Guild update is not allowed.', 403);
      }
    }

    const [updatedGuild] = await db
      .update(guilds)
      .set({
        ...(hasName ? { name } : {}),
        ...(hasDescription ? { description: description || null } : {}),
        ...(hasIconUrl ? { iconUrl: iconUrl || null } : {}),
        ...(hasIconKey ? { iconKey } : {}),
        ...(hasColor ? { color: color || null } : {}),
        ...(hasRecruitmentStatus && recruitmentStatus ? { recruitmentStatus } : {}),
        ...(hasRecruitmentMessage ? { recruitmentMessage: recruitmentMessage || null } : {}),
        ...(hasMaxMembers && maxMembers !== undefined ? { maxMembers } : {}),
        updatedAt: new Date(),
      })
      .where(eq(guilds.id, guildId))
      .returning();

    return c.json({
      success: true,
      source: 'database',
      guild: toGuildPayload(updatedGuild),
    });
  } catch (error: any) {
    console.error('Guild update SQL error:', error.message);
    return apiError(c, 'Guild could not be updated.', 500);
  }
});

mapRouter.post('/guilds/:guildId/rewards', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = c.env?.DB;
  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  const body = await parseJsonBody<{
    basePoints?: unknown;
    targetAttribute?: unknown;
    hoursEarly?: unknown;
    activeDays?: unknown;
  }>(c, {});
  const basePoints = typeof body?.basePoints === 'number' ? body.basePoints : Number(body?.basePoints);
  const targetAttribute = typeof body?.targetAttribute === 'string' ? body.targetAttribute : '';
  const hoursEarly = typeof body?.hoursEarly === 'number' ? body.hoursEarly : Number(body?.hoursEarly ?? 0);
  const activeDays = typeof body?.activeDays === 'number' ? body.activeDays : Number(body?.activeDays ?? 0);

  if (!Number.isFinite(basePoints) || basePoints <= 0) {
    return apiError(c, 'basePoints must be a positive number.', 400, { errorCode: 'validation_failed' });
  }
  if (!STUDENT_ATTRIBUTES.includes(targetAttribute as RewardActivityType)) {
    return apiError(c, 'targetAttribute must be a valid reward attribute.', 400, { errorCode: 'validation_failed' });
  }

  try {
    const db = getDb(databaseUrl);
    const guildId = c.req.param('guildId');
    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
    if (!guildRecord) {
      return apiError(c, 'Guild not found.', 404);
    }

    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db, guildRecord.cohortId);
    const result = await new RewardService(db).calculateReward({
      guildId,
      activity: {
        basePoints,
        targetAttribute: targetAttribute as RewardActivityType,
      },
      hoursEarly: Number.isFinite(hoursEarly) ? hoursEarly : 0,
      activeDays: Number.isFinite(activeDays) ? activeDays : undefined,
      config: balanceConfig.rewardSystem,
      transactionType: 'MANUAL_BONUS',
    });
    const [updatedGuild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);

    return c.json({
      success: true,
      source: 'database',
      guild: toGuildPayload(updatedGuild),
      reward: result,
    });
  } catch (error: any) {
    console.error('Guild manual reward SQL error:', error.message);
    return apiError(c, error.message || 'Guild reward could not be applied.', 400);
  }
});

mapRouter.post('/guilds/:guildId/join', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const guildId = c.req.param('guildId');

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
    if (!guildRecord) {
      return apiError(c, 'Guild not found.', 404);
    }
    if (guildRecord.recruitmentStatus !== 'open') {
      return apiError(c, 'Guild is not open for direct join.', 403);
    }

    const context = await resolveStudentCohortContext(db, user, guildRecord.cohortId);
    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    if (!(await isStudentOnGuildRallyNode(db, context))) {
      return apiError(c, 'Guild actions are only available from the guild rally activity.', 403);
    }
    if (context.membership.guildId === guildId) {
      return c.json({ success: true, source: 'database', guild: toGuildPayload(guildRecord) });
    }

    const memberCount = await countGuildMembers(db, guildRecord.cohortId, guildId);
    if (memberCount >= guildRecord.maxMembers) {
      await cancelPendingInvitationsForFullGuild(db, guildRecord);
      return apiError(c, 'Guild is full.', 409);
    }

    await switchStudentGuild(db, {
      membership: context.membership,
      targetGuild: guildRecord,
    });

    const [updatedGuild] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);

    return c.json({ success: true, source: 'database', guild: toGuildPayload(updatedGuild) });
  } catch (error: any) {
    console.error('Guild join SQL error:', error.message);
    return apiError(c, 'Guild could not be joined.', 500);
  }
});

mapRouter.post('/guilds/:guildId/invitations', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const guildId = c.req.param('guildId');
  const body = await parseJsonBody<GuildInvitationPayload>(c, {});
  const inviteeUserId = typeof body?.inviteeUserId === 'string' ? body.inviteeUserId.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : undefined;

  if (!inviteeUserId) {
    return apiError(c, 'inviteeUserId is required.', 400, { errorCode: 'validation_failed' });
  }
  if (inviteeUserId === user?.id) {
    return apiError(c, 'You cannot invite yourself.', 400, { errorCode: 'validation_failed' });
  }
  if (message && message.length > 400) {
    return apiError(c, 'Invitation message must be 400 characters or fewer.', 400, {
      errorCode: 'validation_failed',
    });
  }
  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
    if (!guildRecord) {
      return apiError(c, 'Guild not found.', 404);
    }

    const context = await resolveStudentCohortContext(db, user, guildRecord.cohortId);
    if (!context || context.membership.guildId !== guildId) {
      return apiError(c, 'Only guild members can invite students.', 403);
    }
    if (!(await isStudentOnGuildRallyNode(db, context))) {
      return apiError(c, 'Guild actions are only available from the guild rally activity.', 403);
    }

    const [inviteeMembership] = await db
      .select()
      .from(cohortMemberships)
      .where(and(eq(cohortMemberships.userId, inviteeUserId), eq(cohortMemberships.cohortId, guildRecord.cohortId)))
      .limit(1);
    if (!inviteeMembership) {
      return apiError(c, 'Invitee is not in this cohort.', 404);
    }
    if (inviteeMembership.guildId) {
      return apiError(c, 'Invitee already belongs to a guild.', 409);
    }

    const [existingInvitation] = await db
      .select()
      .from(guildInvitations)
      .where(
        and(
          eq(guildInvitations.guildId, guildId),
          eq(guildInvitations.inviteeUserId, inviteeUserId),
          eq(guildInvitations.status, 'pending')
        )
      )
      .limit(1);
    if (existingInvitation) {
      return apiError(c, 'A pending invitation already exists for this student.', 409, {
        errorCode: 'conflict',
      });
    }

    const [memberCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cohortMemberships)
      .where(and(eq(cohortMemberships.cohortId, guildRecord.cohortId), eq(cohortMemberships.guildId, guildId)));
    if (Number(memberCountRow?.count || 0) >= guildRecord.maxMembers) {
      return apiError(c, 'Guild is full.', 409);
    }

    const [createdInvitation] = await db
      .insert(guildInvitations)
      .values({
        cohortId: guildRecord.cohortId,
        guildId,
        inviterUserId: context.membership.userId,
        inviteeUserId,
        message: message || null,
      })
      .returning();

    return c.json(
      {
        success: true,
        source: 'database',
        invitation: toGuildInvitationPayload(createdInvitation, { guild: guildRecord }),
      },
      201
    );
  } catch (error: any) {
    console.error('Guild invitation SQL error:', error.message);
    return apiError(c, 'Guild invitation could not be created.', 500);
  }
});

mapRouter.post('/guild-invitations/:invitationId/accept', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const invitationId = c.req.param('invitationId');

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const [invitation] = await db
      .select()
      .from(guildInvitations)
      .where(eq(guildInvitations.id, invitationId))
      .limit(1);
    if (!invitation) {
      return apiError(c, 'Invitation not found.', 404);
    }

    if (invitation.inviteeUserId !== user?.id) {
      return apiError(c, 'Invitation is not addressed to this user.', 403);
    }
    if (invitation.status !== 'pending') {
      return apiError(c, 'Invitation is not pending.', 409);
    }
    if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
      return apiError(c, 'Invitation has expired.', 409);
    }

    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, invitation.guildId)).limit(1);
    if (!guildRecord) {
      return apiError(c, 'Guild not found.', 404);
    }
    const context = await resolveStudentCohortContext(db, user, invitation.cohortId);
    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    if (!(await isStudentOnGuildRallyNode(db, context))) {
      return apiError(c, 'Guild actions are only available from the guild rally activity.', 403);
    }

    const memberCount = await countGuildMembers(db, invitation.cohortId, invitation.guildId);
    if (context.membership.guildId !== invitation.guildId && memberCount >= guildRecord.maxMembers) {
      await cancelPendingInvitationsForFullGuild(db, guildRecord);
      return apiError(c, 'Guild is full.', 409);
    }

    const [updatedInvitation] = await db
      .update(guildInvitations)
      .set({ status: 'accepted', respondedAt: new Date(), updatedAt: new Date() })
      .where(eq(guildInvitations.id, invitation.id))
      .returning();
    await switchStudentGuild(db, {
      membership: context.membership,
      targetGuild: guildRecord,
    });

    return c.json({
      success: true,
      source: 'database',
      invitation: toGuildInvitationPayload(updatedInvitation, { guild: guildRecord }),
      guild: toGuildPayload(guildRecord),
    });
  } catch (error: any) {
    console.error('Guild invitation accept SQL error:', error.message);
    return apiError(c, 'Guild invitation could not be accepted.', 500);
  }
});

mapRouter.post('/guild-invitations/:invitationId/decline', async (c) => {
  const databaseUrl = c.env?.DB;
  const user = c.get('user');
  const invitationId = c.req.param('invitationId');

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const [updatedInvitation] = await db
      .update(guildInvitations)
      .set({ status: 'declined', respondedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(guildInvitations.id, invitationId),
          eq(guildInvitations.inviteeUserId, user?.id || ''),
          eq(guildInvitations.status, 'pending')
        )
      )
      .returning();

    if (!updatedInvitation) {
      return apiError(c, 'Invitation not found.', 404);
    }

    const [guildRecord] = await db.select().from(guilds).where(eq(guilds.id, updatedInvitation.guildId)).limit(1);
    return c.json({
      success: true,
      source: 'database',
      invitation: toGuildInvitationPayload(updatedInvitation, { guild: guildRecord }),
    });
  } catch (error: any) {
    console.error('Guild invitation decline SQL error:', error.message);
    return apiError(c, 'Guild invitation could not be declined.', 500);
  }
});

mapRouter.post('/guilds/:guildId/votes', async (c) => {
  const databaseUrl = c.env?.DB;
  const guildId = c.req.param('guildId');
  const user = c.get('user');

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  let body: { votes?: number };
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const votes = body.votes ?? 1;
  if (!Number.isInteger(votes) || votes <= 0) {
    return apiError(c, 'votes must be a positive integer.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const [studentRecord] = user?.id
      ? await db.select().from(students).where(eq(students.userId, user.id)).limit(1)
      : [];

    if (!studentRecord) {
      return apiError(c, 'Student profile not found.', 404);
    }

    const [studentMembership] = await db
      .select({ cohortId: cohortMemberships.cohortId, guildId: cohortMemberships.guildId })
      .from(cohortMemberships)
      .where(and(eq(cohortMemberships.userId, user!.id), eq(cohortMemberships.guildId, guildId)))
      .limit(1);

    if (!studentMembership) {
      return apiError(c, 'Guild vote spend is not allowed.', 403);
    }

    const result = await new VotingCostService(db).spendGuildVotes({
      guildId,
      cohortId: studentMembership.cohortId,
      studentId: studentRecord.id,
      votes,
    });

    return c.json({ success: true, source: 'database', voteSpend: result });
  } catch (error: any) {
    console.error('Guild vote spend SQL error:', error.message);
    return apiError(c, error.message || 'Guild vote spend failed.', 400);
  }
});

mapRouter.post('/map/activities/:activityId/complete', async (c) => {
  const databaseUrl = c.env?.DB;
  const activityId = c.req.param('activityId');
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    await touchUserPresence(db, user);

    const { studentRecord, membership } = context;
    const activeRun = await getOrCreateActiveRun(db, membership.cohortId);

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, membership.cohortId),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found.', 404);
    }

    const [existingCompletion] = await db
      .select()
      .from(gameActivityCompletions)
      .where(
        and(
          eq(gameActivityCompletions.studentId, studentRecord.id),
          eq(gameActivityCompletions.cohortId, membership.cohortId),
          eq(gameActivityCompletions.activityId, activityId)
        )
      )
      .limit(1);

    if (existingCompletion) {
      if (activity.participationMode === 'guild') {
        if (!membership.guildId) {
          return apiError(c, 'Guild activity requires an active guild membership.', 403);
        }

        const voteState = (
          await loadGuildActivityVoteStates(db, membership.cohortId, membership.guildId, [activityId], {
            includeStudentId: studentRecord.id,
          })
        ).get(activityId);

        if (voteState) voteState.hasVoted = true;

        return c.json({
          success: true,
          source: 'database',
          completion: withGuildVoteState(
            toActivityCompletion(existingCompletion),
            voteState || { requiredVotes: 0, receivedVotes: 0, isComplete: false }
          ),
        });
      }

      return c.json({
        success: true,
        source: 'database',
        completion: toActivityCompletion(existingCompletion),
      });
    }

    const lockState = await loadActivityAuthorizationState(
      db,
      membership.cohortId,
      activeRun.id,
      studentRecord.id,
      context.cohortRecord.currentStep,
      activity,
      membership.guildId
    );
    if (lockState.isLocked) {
      return apiError(c, 'Activity is locked for this student.', 403);
    }

    if (activity.participationMode === 'guild' && !membership.guildId) {
      return apiError(c, 'Guild activity requires an active guild membership.', 403);
    }
    const activityGuildId = activity.participationMode === 'guild' ? membership.guildId : undefined;

    const submission = await parseCompletionSubmission(c, activity, studentRecord, membership);
    if (submission instanceof Response) return submission;

    const [completion] = await db
      .insert(gameActivityCompletions)
      .values({
        studentId: studentRecord.id,
        cohortId: membership.cohortId,
        activityId,
        completionType: getCompletionType(activity),
        grade: activity.isGraded ? 1 : null,
        workUrl: submission.workUrl || null,
        metadata: submission.metadata || {},
      })
      .returning();

    if (activity.participationMode === 'guild') {
      const voteState = (
        await loadGuildActivityVoteStates(db, membership.cohortId, activityGuildId!, [activityId], {
          includeStudentId: studentRecord.id,
        })
      ).get(activityId) || { requiredVotes: 0, receivedVotes: 0, isComplete: false };
      voteState.hasVoted = true;
      const completionPayload = withGuildVoteState(toActivityCompletion(completion), voteState);

      if (!voteState.isComplete) {
        return c.json({
          success: true,
          source: 'database',
          completion: completionPayload,
        });
      }
    }

    const eventContext = createEventContext({ db, env: c.env, userId: user?.id });
    await publishEvent(
      {
        type: 'activity.completed',
        source: 'http.map',
        payload: {
          activityId,
          studentId: studentRecord.id,
          cohortId: membership.cohortId,
          guildId: membership.guildId || undefined,
          completionType: getCompletionType(activity),
        },
      },
      eventContext
    );

    await publishEvent(
      {
        type: 'activity.validated',
        source: 'http.map',
        payload: {
          activityId,
          studentId: studentRecord.id,
          cohortId: membership.cohortId,
          guildId: membership.guildId || undefined,
          validatedBy: 'system',
        },
      },
      eventContext
    );

    return c.json({
      success: true,
      source: 'database',
      completion: toActivityCompletion(completion),
    });
  } catch (error: any) {
    console.error('Activity completion SQL error:', error.message);
    return apiError(c, 'Activity completion failed.', 500);
  }
});

mapRouter.post('/map/activities/:activityId/move', async (c) => {
  const databaseUrl = c.env?.DB;
  const activityId = c.req.param('activityId');
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    const { studentRecord, membership } = context;

    const activeRun = await getOrCreateActiveRun(db, membership.cohortId);

    const [activity] = await db
      .select()
      .from(gameActivities)
      .where(
        and(
          eq(gameActivities.id, activityId),
          or(
            sql`${gameActivities.cohortId} IS NULL`,
            eq(gameActivities.cohortId, membership.cohortId),
            eq(gameActivities.mapRunId, activeRun.id)
          )
        )
      )
      .limit(1);

    if (!activity) {
      return apiError(c, 'Activity not found in active map.', 404);
    }

    const lockState = await loadActivityAuthorizationState(
      db,
      membership.cohortId,
      activeRun.id,
      studentRecord.id,
      context.cohortRecord.currentStep,
      activity,
      membership.guildId
    );
    if (lockState.isLocked) {
      return apiError(c, 'Activity is locked for this student.', 403);
    }

    const [latestMove] = await db
      .select()
      .from(gameCharacterMoves)
      .where(
        and(
          eq(gameCharacterMoves.studentId, studentRecord.id),
          eq(gameCharacterMoves.cohortId, membership.cohortId),
          eq(gameCharacterMoves.mapRunId, activeRun.id)
        )
      )
      .orderBy(desc(gameCharacterMoves.createdAt))
      .limit(1);

    if (latestMove?.toActivityId === activityId) {
      const move = toCharacterMove(latestMove);
      return c.json({ success: true, source: 'database', move, currentActivityId: move.toActivityId });
    }

    if (latestMove?.toActivityId) {
      const completionRecords = await db
        .select()
        .from(gameActivityCompletions)
        .where(
          and(
            eq(gameActivityCompletions.studentId, studentRecord.id),
            eq(gameActivityCompletions.cohortId, membership.cohortId)
          )
        );
      const completedActivityIds = new Set(completionRecords.map((completion) => completion.activityId));

      if (completedActivityIds.has(activityId)) {
        const [moveRecord] = await db
          .insert(gameCharacterMoves)
          .values({
            studentId: studentRecord.id,
            cohortId: membership.cohortId,
            mapRunId: activeRun.id,
            fromActivityId: latestMove.toActivityId,
            toActivityId: activityId,
            moveType: 'move',
          })
          .returning();
        const move = toCharacterMove(moveRecord);

        return c.json({ success: true, source: 'database', move, currentActivityId: move.toActivityId });
      }

      const [directEdge] = await db
        .select()
        .from(gameActivityEdges)
        .where(
          and(
            eq(gameActivityEdges.fromActivityId, latestMove.toActivityId),
            eq(gameActivityEdges.toActivityId, activityId),
            or(
              sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
              eq(gameActivityEdges.cohortId, membership.cohortId),
              eq(gameActivityEdges.mapRunId, activeRun.id)
            )
          )
        )
        .limit(1);

      if (!directEdge) {
        return apiError(c, 'Characters can only move through outgoing unlocked edges.', 403);
      }

      if (!isEdgeUnlocked(toActivityEdge(directEdge), completedActivityIds, context.cohortRecord.currentStep)) {
        return apiError(c, 'Characters can only move through outgoing unlocked edges.', 403);
      }
    }

    const [moveRecord] = await db
      .insert(gameCharacterMoves)
      .values({
        studentId: studentRecord.id,
        cohortId: membership.cohortId,
        mapRunId: activeRun.id,
        fromActivityId: latestMove?.toActivityId || null,
        toActivityId: activityId,
        moveType: latestMove ? 'move' : 'enter',
      })
      .returning();
    const move = toCharacterMove(moveRecord);

    return c.json({ success: true, source: 'database', move, currentActivityId: move.toActivityId });
  } catch (error: any) {
    console.error('Character move SQL error:', error.message);
    return apiError(c, 'Character move failed.', 500);
  }
});

// GET /api/map : Renvoie la carte des activités (dynamique ou mock)
mapRouter.get('/map', async (c) => {
  const databaseUrl = c.env?.DB;

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const requestedCohortId = getRequestedGameId(c);
    await touchUserPresence(db, user);
    const studentContext = user?.isAdmin
      ? undefined
      : await resolveStudentCohortContext(db, user, requestedCohortId);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : studentContext?.cohortRecord;

    if (!cohortRecord) {
      return c.json({
        success: true,
        source: 'database',
        map: buildEmptyMapData(),
      });
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);
    await ensureOnboardingActivities(db, cohortRecord.id, activeRun.id);

    const activitiesFromDb = await db
      .select()
      .from(gameActivities)
      .where(
        or(
          sql`${gameActivities.cohortId} IS NULL`,
          eq(gameActivities.cohortId, cohortRecord.id),
          eq(gameActivities.mapRunId, activeRun.id)
        )
      );

    const edgesFromDb = await db
      .select()
      .from(gameActivityEdges)
      .where(
        or(
          sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
          eq(gameActivityEdges.cohortId, cohortRecord.id),
          eq(gameActivityEdges.mapRunId, activeRun.id)
        )
      );

    const completionsFromDb = studentContext
      ? await db
          .select()
          .from(gameActivityCompletions)
          .where(
            and(
              eq(gameActivityCompletions.studentId, studentContext.studentRecord.id),
              eq(gameActivityCompletions.cohortId, cohortRecord.id)
            )
          )
          .orderBy(desc(gameActivityCompletions.createdAt))
      : [];
    let visibleCompletions = completionsFromDb.map(toActivityCompletion);
    let activityRecordsForMap = activitiesFromDb;
    if (studentContext?.membership.guildId) {
      const activityById = new Map(activitiesFromDb.map((activity) => [activity.id, activity]));
      const guildActivityIds = activitiesFromDb
        .filter((activity) => activity.participationMode === 'guild')
        .map((activity) => activity.id);
      const currentStudentVoteActivityIds = new Set(
        completionsFromDb
          .filter((completion) => activityById.get(completion.activityId)?.participationMode === 'guild')
          .map((completion) => completion.activityId)
      );
      const voteStates = await loadGuildActivityVoteStates(
        db,
        cohortRecord.id,
        studentContext.membership.guildId,
        guildActivityIds,
        { includeStudentId: studentContext.studentRecord.id }
      );
      activityRecordsForMap = activitiesFromDb.map((activity) => {
        if (activity.participationMode !== 'guild') return activity;

        const voteState = voteStates.get(activity.id);
        return voteState
          ? withActivityGuildVoteState(
              activity,
              voteState,
              currentStudentVoteActivityIds.has(activity.id)
            )
          : activity;
      });

      visibleCompletions = visibleCompletions.flatMap((completion) => {
        const activity = activityById.get(completion.activityId);
        if (activity?.participationMode !== 'guild') return [completion];

        const voteState = voteStates.get(completion.activityId);
        if (!voteState?.isComplete) return [];
        return [withGuildVoteState(completion, voteState)];
      });
      const completedActivityIds = new Set(visibleCompletions.map((completion) => completion.activityId));
      for (const [activityId, voteState] of voteStates) {
        if (!voteState.isComplete || completedActivityIds.has(activityId)) continue;
        visibleCompletions.push(
          withGuildVoteState(
            {
              id: `guild:${studentContext.membership.guildId}:${activityId}`,
              studentId: studentContext.studentRecord.id,
              cohortId: cohortRecord.id,
              activityId,
              completionType: 'system',
            },
            voteState
          )
        );
      }
    }
    const [latestMove] = studentContext
      ? await db
          .select()
          .from(gameCharacterMoves)
          .where(
            and(
              eq(gameCharacterMoves.studentId, studentContext.studentRecord.id),
              eq(gameCharacterMoves.cohortId, cohortRecord.id),
              eq(gameCharacterMoves.mapRunId, activeRun.id)
            )
          )
          .orderBy(desc(gameCharacterMoves.createdAt))
          .limit(1)
      : [];
    const [occupancyMembers, occupancyMoves] = await Promise.all([
      db
        .select({
          studentId: students.id,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          githubAvatarUrl: users.githubAvatarUrl,
          characterClass: gameCharacters.characterClass,
          characterIllustrationUrl: gameCharacters.illustrationUrl,
          guildId: cohortMemberships.guildId,
          guildName: guilds.name,
          guildIconUrl: guilds.iconUrl,
          guildIconKey: guilds.iconKey,
          guildColor: guilds.color,
        })
        .from(cohortMemberships)
        .innerJoin(students, eq(students.userId, cohortMemberships.userId))
        .innerJoin(users, eq(users.id, cohortMemberships.userId))
        .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
        .leftJoin(guilds, eq(guilds.id, cohortMemberships.guildId))
        .where(eq(cohortMemberships.cohortId, cohortRecord.id)),
      db
        .select()
        .from(gameCharacterMoves)
        .where(
          and(
            eq(gameCharacterMoves.cohortId, cohortRecord.id),
            eq(gameCharacterMoves.mapRunId, activeRun.id)
          )
        ),
    ]);
    const nodeOccupancies = buildNodeOccupancies(activitiesFromDb, occupancyMembers, occupancyMoves);
    const currentGuildMemberCount = studentContext?.membership.guildId
      ? (
          await loadActiveGuildStudentIds(db, cohortRecord.id, studentContext.membership.guildId, {
            includeStudentId: studentContext.studentRecord.id,
          })
        ).length
      : undefined;
    const defaultCurrentActivityId =
      studentContext && !latestMove
        ? activitiesFromDb.find((activity) => getOnboardingTask(activity) === 'institutional_profile')?.id
        : undefined;

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'database',
        map: buildMapData(
          toMapRun(activeRun),
          [],
          [],
          visibleCompletions,
          latestMove ? toCharacterMove(latestMove) : undefined,
          cohortRecord,
          Boolean(user?.isAdmin),
          nodeOccupancies,
          defaultCurrentActivityId,
          currentGuildMemberCount,
          Boolean(!user?.isAdmin && !studentContext?.membership.guildId)
        ),
      });
    }

    const map = buildMapData(
      toMapRun(activeRun),
      activityRecordsForMap,
      edgesFromDb.map(toActivityEdge),
      visibleCompletions,
      latestMove ? toCharacterMove(latestMove) : undefined,
      cohortRecord,
      Boolean(user?.isAdmin),
      nodeOccupancies,
      defaultCurrentActivityId,
      currentGuildMemberCount,
      Boolean(!user?.isAdmin && !studentContext?.membership.guildId)
    );

    return c.json({
      success: true,
      source: 'database',
      map,
    });
  } catch (error: any) {
    console.error('Map SQL error:', error.message);
    return apiError(c, 'Map activities could not be loaded.', 500);
  }
});

mapRouter.get('/dashboard', async (c) => {
  const databaseUrl = c.env?.DB;

  if (!databaseUrl) {
    return missingDatabaseBinding(c);
  }

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const requestedCohortId = getRequestedGameId(c);
    const studentContext = user?.isAdmin
      ? undefined
      : await resolveStudentCohortContext(db, user, requestedCohortId);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : studentContext?.cohortRecord;

    if (!cohortRecord) {
      return c.json({
        success: true,
        source: 'database',
        progress: buildEmptyProgressData(),
      });
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return c.json({
        success: true,
        source: 'database',
        progress: buildEmptyProgressData(),
      });
    }

    const guildId = studentContext?.membership.guildId;
    const notificationScope = guildId
      ? and(
          eq(notifications.cohortId, cohortRecord.id),
          or(eq(notifications.guildId, guildId), sql`${notifications.guildId} IS NULL`)
        )
      : and(eq(notifications.cohortId, cohortRecord.id), sql`${notifications.guildId} IS NULL`);

    const [milestones, notificationRows] = await Promise.all([
      db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id))
        .orderBy(progressMilestones.sortOrder),
      db
        .select()
        .from(notifications)
        .where(notificationScope)
        .orderBy(notifications.sortOrder),
    ]);

    const progressData: CohortProgressData = {
      gauge: {
        currentPoints: progress.currentPoints,
        targetPoints: getActiveMilestoneTargetPoints(milestones, progress.currentPoints),
        labelI18nKey: progress.labelI18nKey,
        milestones: milestones.map(toMilestone),
      },
      notifications: notificationRows.map((notification) => ({
        id: notification.id,
        cohortId: notification.cohortId || undefined,
        guildId: notification.guildId || undefined,
        titleI18nKey: notification.titleI18nKey,
        descriptionI18nKey: notification.descriptionI18nKey || undefined,
        icon: notification.icon,
        tone: notification.tone as CohortProgressData['notifications'][number]['tone'],
        actionLabelI18nKey: notification.actionLabelI18nKey || undefined,
        actionTarget: notification.actionTarget as CohortProgressData['notifications'][number]['actionTarget'],
        context: (notification.context as CohortProgressData['notifications'][number]['context']) || undefined,
      })),
    };

    return c.json({ success: true, source: 'database', progress: progressData });
  } catch (error: any) {
    console.error('Progress SQL error:', error.message);
    return apiError(c, 'Progress data could not be loaded.', 500);
  }
});

mapRouter.get('/games/:gameId/milestones', async (c) => {
  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = c.get('user')?.isAdmin
      ? await resolveAdminCohort(db, c.req.param('gameId'))
      : (await resolveStudentCohortContext(db, c.get('user'), c.req.param('gameId')))?.cohortRecord;
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return c.json({
        success: true,
        source: 'database',
        milestones: [],
      });
    }
    const milestones = await db
      .select()
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id))
      .orderBy(progressMilestones.sortOrder);

    return c.json({
      success: true,
      source: 'database',
      milestones: milestones.map(toMilestone),
    });
  } catch (error: any) {
    console.error('Milestones SQL error:', error.message);
    return apiError(c, 'Milestones could not be loaded.', 500);
  }
});

mapRouter.post('/games/:gameId/milestones', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = normalizeMilestonePayload(await parseJsonBody<GameMilestonePayload>(c));
  if (!body) {
    return apiError(c, 'A label and non-negative integer cost are required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getOrCreateCohortProgress(db, cohortRecord.id);
    const [maxSortOrder] = await db
      .select({ value: sql<number>`coalesce(max(${progressMilestones.sortOrder}), -1)` })
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id));

    const [created] = await db
      .insert(progressMilestones)
      .values({
        progressId: progress.id,
        labelI18nKey: body.label,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        sortOrder: body.sortOrder ?? Number(maxSortOrder?.value ?? -1) + 1,
      })
      .returning();

    return c.json({ success: true, milestone: toMilestone(created) }, 201);
  } catch (error: any) {
    console.error('Milestone create SQL error:', error.message);
    return apiError(c, 'Milestone could not be created.', 500);
  }
});

mapRouter.patch('/games/:gameId/milestones/:milestoneId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = normalizeMilestonePayload(await parseJsonBody<GameMilestonePayload>(c));
  if (!body) {
    return apiError(c, 'A label and non-negative integer cost are required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return apiError(c, 'Milestone not found.', 404);
    }

    const [updated] = await db
      .update(progressMilestones)
      .set({
        labelI18nKey: body.label,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        sortOrder: body.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(progressMilestones.id, c.req.param('milestoneId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .returning();

    if (!updated) {
      return apiError(c, 'Milestone not found.', 404);
    }

    return c.json({ success: true, milestone: toMilestone(updated) });
  } catch (error: any) {
    console.error('Milestone update SQL error:', error.message);
    return apiError(c, 'Milestone could not be updated.', 500);
  }
});

mapRouter.patch('/games/:gameId/milestones/:milestoneId/vote-state', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = await parseJsonBody<{ action?: unknown; winningBonusCardId?: unknown }>(c, {});
  const action = typeof body?.action === 'string' ? body.action.trim() : '';
  const winningBonusCardId = typeof body?.winningBonusCardId === 'string' ? body.winningBonusCardId.trim() : '';
  if (action !== 'open' && action !== 'close') {
    return apiError(c, 'action must be "open" or "close".', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return apiError(c, 'Milestone not found.', 404);
    }

    const [milestone] = await db
      .select()
      .from(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('milestoneId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .limit(1);

    if (!milestone) {
      return apiError(c, 'Milestone not found.', 404);
    }

    if (action === 'open') {
      if (milestone.voteOpenedAt) {
        return apiError(c, 'Bonus vote has already been opened for this milestone.', 409);
      }
      if (progress.currentPoints < milestone.cost) {
        return apiError(c, 'Milestone progress is not reached yet.', 409);
      }

      const [updated] = await db
        .update(progressMilestones)
        .set({ voteOpenedAt: new Date(), updatedAt: new Date() })
        .where(eq(progressMilestones.id, milestone.id))
        .returning();

      return c.json({ success: true, milestone: toMilestone(updated) });
    }

    if (!milestone.voteOpenedAt || milestone.voteClosedAt) {
      return apiError(c, 'Bonus vote is not open.', 409);
    }

    const voteRows = await db
      .select({
        id: milestoneBonusVotes.id,
        bonusCardId: milestoneBonusVotes.bonusCardId,
        voteCount: milestoneBonusVotes.voteCount,
      })
      .from(milestoneBonusVotes)
      .where(eq(milestoneBonusVotes.milestoneId, milestone.id));
    const totals = new Map<string, number>();
    for (const row of voteRows) {
      totals.set(row.bonusCardId, (totals.get(row.bonusCardId) || 0) + row.voteCount);
    }
    const maxVotes = Math.max(0, ...Array.from(totals.values()));
    const leadingBonusCardIds = Array.from(totals.entries())
      .filter(([, voteCount]) => voteCount === maxVotes && maxVotes > 0)
      .map(([bonusCardId]) => bonusCardId);
    if (leadingBonusCardIds.length > 1) {
      if (!winningBonusCardId || !leadingBonusCardIds.includes(winningBonusCardId)) {
        return apiError(c, 'A tied winning bonus card must be selected before closing the vote.', 409);
      }

      const winningVote = voteRows.find((row) => row.bonusCardId === winningBonusCardId);
      if (!winningVote) {
        return apiError(c, 'Winning bonus card vote not found.', 404);
      }

      await db
        .update(milestoneBonusVotes)
        .set({
          voteCount: sql`${milestoneBonusVotes.voteCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(milestoneBonusVotes.id, winningVote.id));
    }

    const [updated] = await db
      .update(progressMilestones)
      .set({ voteClosedAt: new Date(), updatedAt: new Date() })
      .where(eq(progressMilestones.id, milestone.id))
      .returning();

    const finalVoteRows = await db
      .select({
        bonusCardId: milestoneBonusVotes.bonusCardId,
        voteCount: sql<number>`sum(${milestoneBonusVotes.voteCount})`,
      })
      .from(milestoneBonusVotes)
      .where(eq(milestoneBonusVotes.milestoneId, milestone.id))
      .groupBy(milestoneBonusVotes.bonusCardId);
    const finalMaxVotes = Math.max(0, ...finalVoteRows.map((row) => Number(row.voteCount || 0)));
    const winningRows = finalVoteRows.filter((row) => Number(row.voteCount || 0) === finalMaxVotes && finalMaxVotes > 0);
    if (winningRows.length === 1) {
      const [winningCard] = await db
        .select({ id: gameBonusCards.id, title: gameBonusCards.title })
        .from(gameBonusCards)
        .where(eq(gameBonusCards.id, winningRows[0].bonusCardId))
        .limit(1);
      const sortOrder = await nextNotificationSortOrder(db);
      await db.insert(notifications).values({
        cohortId: cohortRecord.id,
        titleI18nKey: 'dashboard.notifications.bonusUnlocked.title',
        descriptionI18nKey: 'dashboard.notifications.bonusUnlocked.description',
        icon: 'gift',
        tone: 'success',
        actionLabelI18nKey: 'dashboard.notifications.bonusUnlocked.action',
        actionTarget: 'bonus',
        context: {
          type: 'bonus_unlocked',
          milestoneId: milestone.id,
          bonusCardId: winningCard?.id || winningRows[0].bonusCardId,
          bonusCardTitle: winningCard?.title,
        },
        sortOrder,
      });
    }

    return c.json({ success: true, milestone: toMilestone(updated) });
  } catch (error: any) {
    console.error('Milestone vote state update SQL error:', error.message);
    return apiError(c, 'Milestone vote state could not be updated.', 500);
  }
});

mapRouter.delete('/games/:gameId/milestones/:milestoneId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return apiError(c, 'Milestone not found.', 404);
    }

    const [deleted] = await db
      .delete(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('milestoneId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .returning();

    if (!deleted) {
      return apiError(c, 'Milestone not found.', 404);
    }

    return c.json({ success: true, milestone: toMilestone(deleted) });
  } catch (error: any) {
    console.error('Milestone delete SQL error:', error.message);
    return apiError(c, 'Milestone could not be deleted.', 500);
  }
});

mapRouter.get('/games/:gameId/reward-cards', async (c) => {
  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const requestedGameId = c.req.param('gameId');
    const studentContext = user?.isAdmin ? undefined : await resolveStudentCohortContext(db, user, requestedGameId);
    const cohortRecord = user?.isAdmin ? await resolveAdminCohort(db, requestedGameId) : studentContext?.cohortRecord;
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const rewardCards = await db
      .select()
      .from(gameBonusCards)
      .where(eq(gameBonusCards.cohortId, cohortRecord.id))
      .orderBy(gameBonusCards.sortOrder);

    return c.json({
      success: true,
      source: 'database',
      rewardCards: rewardCards.map((card) => toRewardCard(card, cohortRecord.id)),
    });
  } catch (error: any) {
    console.error('Reward cards SQL error:', error.message);
    return apiError(c, 'Reward cards could not be loaded.', 500);
  }
});

mapRouter.post('/games/:gameId/reward-cards', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = normalizeRewardCardPayload(await parseJsonBody<GameRewardCardPayload>(c));
  if (!body) {
    return apiError(c, 'A title and non-negative integer cost are required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const [maxSortOrder] = await db
      .select({ value: sql<number>`coalesce(max(${gameBonusCards.sortOrder}), -1)` })
      .from(gameBonusCards)
      .where(eq(gameBonusCards.cohortId, cohortRecord.id));

    const [created] = await db
      .insert(gameBonusCards)
      .values({
        cohortId: cohortRecord.id,
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,
        cost: body.cost,
        accentToken: body.accentToken || 'quest',
        iconKey: body.iconKey || 'Gift',
        illustrationUrl: body.illustrationUrl || null,
        color: body.color || null,
        sortOrder: body.sortOrder ?? Number(maxSortOrder?.value ?? -1) + 1,
      })
      .returning();

    return c.json({ success: true, rewardCard: toRewardCard(created, cohortRecord.id) }, 201);
  } catch (error: any) {
    console.error('Reward card create SQL error:', error.message);
    return apiError(c, 'Reward card could not be created.', 500);
  }
});

mapRouter.put('/games/:gameId/reward-cards/:rewardCardId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = normalizeRewardCardPayload(await parseJsonBody<GameRewardCardPayload>(c));
  if (!body) {
    return apiError(c, 'A title and non-negative integer cost are required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const [updated] = await db
      .update(gameBonusCards)
      .set({
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,
        cost: body.cost,
        accentToken: body.accentToken || 'quest',
        iconKey: body.iconKey || 'Gift',
        illustrationUrl: body.illustrationUrl || null,
        color: body.color || null,
        sortOrder: body.sortOrder ?? 0,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gameBonusCards.id, c.req.param('rewardCardId')),
          eq(gameBonusCards.cohortId, cohortRecord.id)
        )
      )
      .returning();

    if (!updated) {
      return apiError(c, 'Reward card not found.', 404);
    }

    return c.json({ success: true, rewardCard: toRewardCard(updated, cohortRecord.id) });
  } catch (error: any) {
    console.error('Reward card update SQL error:', error.message);
    return apiError(c, 'Reward card could not be updated.', 500);
  }
});

mapRouter.delete('/games/:gameId/reward-cards/:rewardCardId', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const [deleted] = await db
      .delete(gameBonusCards)
      .where(
        and(
          eq(gameBonusCards.id, c.req.param('rewardCardId')),
          eq(gameBonusCards.cohortId, cohortRecord.id)
        )
      )
      .returning();

    if (!deleted) {
      return apiError(c, 'Reward card not found.', 404);
    }

    return c.json({ success: true, rewardCard: toRewardCard(deleted, cohortRecord.id) });
  } catch (error: any) {
    console.error('Reward card delete SQL error:', error.message);
    return apiError(c, 'Reward card could not be deleted.', 500);
  }
});

mapRouter.get('/games/:gameId/bonus-votes', async (c) => {
  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const user = c.get('user');
    const requestedGameId = c.req.param('gameId');
    await touchUserPresence(db, user);
    const context = user?.isAdmin
      ? undefined
      : await resolveStudentCohortContext(db, user, requestedGameId);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedGameId)
      : context?.cohortRecord;

    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const progress = await getCohortProgress(db, cohortRecord.id);
    if (!progress) {
      return c.json({
        success: true,
        source: 'database',
        voteState: {
          milestones: [],
          bonusCards: [],
          voteStates: [],
          selectedMilestoneId: undefined,
          guildId: context?.membership.guildId || undefined,
        },
      });
    }

    const [milestones, bonusCards, votes, balanceConfig] = await Promise.all([
      db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id))
        .orderBy(progressMilestones.sortOrder),
      db
        .select()
        .from(gameBonusCards)
        .where(eq(gameBonusCards.cohortId, cohortRecord.id))
        .orderBy(gameBonusCards.sortOrder),
      db
        .select()
        .from(milestoneBonusVotes)
        .innerJoin(progressMilestones, eq(progressMilestones.id, milestoneBonusVotes.milestoneId))
        .where(eq(progressMilestones.progressId, progress.id)),
      RewardBalanceConfigService.getActiveConfig(db, cohortRecord.id),
    ]);

    const bonusCardIds = new Set(bonusCards.map((card) => card.id));
    const votesByMilestoneId = new Map<string, MilestoneBonusVoteRecord[]>();
    for (const row of votes) {
      const vote = row.milestone_bonus_votes;
      if (!bonusCardIds.has(vote.bonusCardId)) continue;
      const current = votesByMilestoneId.get(vote.milestoneId) || [];
      current.push(vote);
      votesByMilestoneId.set(vote.milestoneId, current);
    }

    const guildId = context?.membership.guildId || undefined;
    const guildStudentIds = guildId
      ? await loadActiveGuildStudentIds(db, cohortRecord.id, guildId, {
          includeStudentId: context?.studentRecord.id,
        })
      : [];
    const requiredBoostApprovals = getRequiredGuildActivityVotes(guildStudentIds.length);

    const voteStates = milestones.map((milestone) => {
      const milestoneVotes = votesByMilestoneId.get(milestone.id) || [];
      const totals = new Map<string, number>();
      for (const vote of milestoneVotes) {
        totals.set(vote.bonusCardId, (totals.get(vote.bonusCardId) || 0) + vote.voteCount);
      }
      const maxVotes = Math.max(0, ...Array.from(totals.values()));
      const leadingBonusCardIds = Array.from(totals.entries())
        .filter(([, voteCount]) => voteCount === maxVotes && maxVotes > 0)
        .map(([bonusCardId]) => bonusCardId);

      const voteStatus = getMilestoneVoteStatus(milestone);

      const guildVote = guildId
        ? milestoneVotes.find((vote) => vote.guildId === guildId)
        : undefined;
      const guildVoteWithApproval = guildVote
        ? withBoostApprovalState(guildVote, {
            requiredVotes: requiredBoostApprovals,
            hasVoted: context?.studentRecord
              ? getBoostApprovalMetadata(guildVote)?.approverStudentIds.includes(context.studentRecord.id) || false
              : false,
          })
        : undefined;

      return {
        milestone: toMilestone(milestone),
        results: bonusCards.map((card) => ({
          bonusCardId: card.id,
          voteCount: totals.get(card.id) || 0,
          isLeader: leadingBonusCardIds.includes(card.id),
        })),
        guildVote: guildVoteWithApproval ? toVote(guildVoteWithApproval) : undefined,
        leadingBonusCardIds,
        hasTie: leadingBonusCardIds.length > 1,
        ...voteStatus,
      };
    });

    const [guildRecord] = guildId
      ? await db.select({ gold: guilds.gold }).from(guilds).where(eq(guilds.id, guildId)).limit(1)
      : [];
    const guildVoteBalance = guildId
      ? await getGuildVoteBalance(db, guildId, cohortRecord.id)
      : undefined;
    let boostCostPreview: VoteSpendBreakdown | undefined;
    if (guildId && context?.studentRecord) {
      try {
        const baseVotesPerGuild = Math.max(1, balanceConfig.rewardSystem.voting.baseVotesPerGuild);
        const alreadyPurchasedVotes = await getPurchasedGuildVoteCount(
          db,
          guildId,
          progress.id,
          cohortRecord.id,
          baseVotesPerGuild
        );
        boostCostPreview = await new VotingCostService(db).previewGuildVotes({
          guildId,
          cohortId: cohortRecord.id,
          studentId: context.studentRecord.id,
          votes: 1,
          alreadyPurchasedVotes,
        });
      } catch (error: any) {
        console.warn('Bonus vote boost preview could not be loaded:', error.message);
      }
    }

    const selectedMilestoneId =
      milestones.find((milestone) => !milestone.voteClosedAt)?.id ||
      milestones[0]?.id;

    return c.json({
      success: true,
      source: 'database',
      voteState: {
        milestones: milestones.map(toMilestone),
        bonusCards: bonusCards.map((card) => toRewardCard(card, cohortRecord.id)),
        voteStates,
        selectedMilestoneId,
        guildId,
        guildGold: guildRecord?.gold,
        guildVoteBalance: getGuildVoteBalanceAmount(guildVoteBalance),
        currentGuildMemberCount: guildStudentIds.length || undefined,
        boostCostPreview,
        baseVotesPerGuild: Math.max(1, balanceConfig.rewardSystem.voting.baseVotesPerGuild),
      },
    });
  } catch (error: any) {
    console.error('Bonus vote state SQL error:', error.message);
    return apiError(c, 'Bonus vote state could not be loaded.', 500);
  }
});

mapRouter.post('/games/:gameId/milestones/:milestoneId/bonus-votes', async (c) => {
  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = await parseJsonBody<{ bonusCardId?: unknown }>(c, {});
  const bonusCardId = typeof body?.bonusCardId === 'string' ? body.bonusCardId.trim() : '';
  if (!bonusCardId) {
    return apiError(c, 'bonusCardId is required.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, c.get('user'), c.req.param('gameId'));
    if (!context?.membership.guildId) {
      return apiError(c, 'Guild vote is not allowed without a guild.', 403);
    }
    await touchUserPresence(db, c.get('user'));

    const progress = await getCohortProgress(db, context.cohortRecord.id);
    if (!progress) {
      return apiError(c, 'Milestone not found.', 404);
    }
    const [milestone] = await db
      .select()
      .from(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('milestoneId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .limit(1);
    const [bonusCard] = await db
      .select()
      .from(gameBonusCards)
      .where(and(eq(gameBonusCards.id, bonusCardId), eq(gameBonusCards.cohortId, context.cohortRecord.id)))
      .limit(1);

    if (!milestone || !bonusCard) {
      return apiError(c, 'Milestone or bonus card not found.', 404);
    }

    const voteStatus = getMilestoneVoteStatus(milestone);
    if (!voteStatus.isVoteOpen) {
      return apiError(c, 'Bonus vote is not open.', 409);
    }

    const voteBalance = await getGuildVoteBalance(db, context.membership.guildId, context.cohortRecord.id);
    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db, context.cohortRecord.id);
    const baseVotesPerGuild = Math.max(1, balanceConfig.rewardSystem.voting.baseVotesPerGuild);
    const storedVotes = getGuildVoteBalanceAmount(voteBalance);

    const [existing] = await db
      .select()
      .from(milestoneBonusVotes)
      .where(
        and(
          eq(milestoneBonusVotes.milestoneId, milestone.id),
          eq(milestoneBonusVotes.guildId, context.membership.guildId)
        )
      )
      .limit(1);

    const appliedVotes = (existing ? 0 : baseVotesPerGuild) + storedVotes;
    if (!existing && appliedVotes <= 0) {
      return apiError(c, 'Boost before voting for a bonus card.', 409);
    }

    const nextVoteCount = (existing?.voteCount || 0) + appliedVotes;
    const [saved] = existing
      ? await db
          .update(milestoneBonusVotes)
          .set({
            bonusCardId: bonusCard.id,
            voteCount: nextVoteCount,
            metadata: setBoostApprovalMetadata(existing.metadata, undefined),
            updatedAt: new Date(),
          })
          .where(eq(milestoneBonusVotes.id, existing.id))
          .returning()
      : await db
          .insert(milestoneBonusVotes)
          .values({
            milestoneId: milestone.id,
            bonusCardId: bonusCard.id,
            guildId: context.membership.guildId,
            voteCount: nextVoteCount,
          })
          .returning();

    if (storedVotes > 0) {
      await clearGuildVoteBalance(db, context.membership.guildId, context.cohortRecord.id);
    }

    return c.json({ success: true, vote: toVote(saved), appliedVotes });
  } catch (error: any) {
    console.error('Bonus vote cast SQL error:', error.message);
    return apiError(c, 'Bonus vote could not be saved.', 500);
  }
});

mapRouter.post('/games/:gameId/milestones/:milestoneId/boost-votes', async (c) => {
  const databaseUrl = requireDatabase(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const body = await parseJsonBody<{ votes?: unknown }>(c, {});
  const votes = typeof body?.votes === 'number' ? body.votes : Number(body?.votes ?? 1);
  if (!Number.isInteger(votes) || votes <= 0) {
    return apiError(c, 'votes must be a positive integer.', 400);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, c.get('user'), c.req.param('gameId'));
    if (!context?.membership.guildId) {
      return apiError(c, 'Guild vote boost is not allowed without a guild.', 403);
    }
    await touchUserPresence(db, c.get('user'));

    const progress = await getCohortProgress(db, context.cohortRecord.id);
    if (!progress) {
      return apiError(c, 'Create at least one milestone before boosting.', 409);
    }
    const [milestone] = await db
      .select()
      .from(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('milestoneId')),
          eq(progressMilestones.progressId, progress.id)
        )
      )
      .limit(1);

    if (!milestone) {
      return apiError(c, 'Milestone not found.', 404);
    }

    const voteStatus = getMilestoneVoteStatus(milestone);
    if (voteStatus.isVoteOpen) {
      return apiError(c, 'Boost is disabled while the bonus vote is open.', 409);
    }

    const balanceConfig = await RewardBalanceConfigService.getActiveConfig(db, context.cohortRecord.id);
    const baseVotesPerGuild = Math.max(1, balanceConfig.rewardSystem.voting.baseVotesPerGuild);
    const alreadyPurchasedVotes = await getPurchasedGuildVoteCount(
      db,
      context.membership.guildId,
      progress.id,
      context.cohortRecord.id,
      baseVotesPerGuild
    );
    const voteSpend = await new VotingCostService(db).spendGuildVotes({
      guildId: context.membership.guildId,
      cohortId: context.cohortRecord.id,
      studentId: context.studentRecord.id,
      votes,
      alreadyPurchasedVotes,
    });

    const [updatedProgress] = await db
      .update(cohortProgress)
      .set({
        currentPoints: sql`${cohortProgress.currentPoints} + ${voteSpend.cost}`,
        updatedAt: new Date(),
      })
      .where(eq(cohortProgress.id, progress.id))
      .returning();
    const updatedVoteBalance = await addGuildVoteBalance(
      db,
      context.membership.guildId,
      context.cohortRecord.id,
      votes
    );

    return c.json({
      success: true,
      voteSpend,
      guildVoteBalance: getGuildVoteBalanceAmount(updatedVoteBalance),
      currentPoints: updatedProgress?.currentPoints ?? progress.currentPoints + voteSpend.cost,
    });
  } catch (error: any) {
    console.error('Bonus vote boost SQL error:', error.message);
    return apiError(c, error.message || 'Bonus vote boost failed.', 400);
  }
});
