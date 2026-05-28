import { Hono, type Context } from 'hono';
import { and, desc, eq, inArray, isNull, or, sql, sum } from 'drizzle-orm';
import {
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
  type GameActivityEdgeStyleWindow,
  type GameMapData,
  type GameMapNodeOccupancy,
  type GameMapRun,
  type GameRewardCardPayload,
  type Guild,
} from '@eduquest/shared';
import { getDb } from '../db';
import {
  gameActivityCompletions,
  gameActivityEdges,
  gameCharacters,
  gameCharacterMoves,
  cohortMemberships,
  cohortProgress,
  cohorts,
  gameActivities,
  gameMapRuns,
  guilds,
  notifications,
  pointTransactions,
  progressMilestones,
  students,
  users,
} from '../db/schema';
import type { UserPayload } from '../middleware/auth';
import { createEventContext, publishEvent } from '../events';
import { VotingCostService } from '../services/rewards';
import { apiError, missingDatabaseUrl, parseJsonBody, requireAdminUser, requireDatabaseUrl } from './http';

type Bindings = {
  APP_ENV?: string;
  DATABASE_URL?: string;
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
type ProgressMilestoneRecord = typeof progressMilestones.$inferSelect;
type Database = ReturnType<typeof getDb>;

type CompletionSubmissionPayload = {
  workUrl?: string;
  metadata?: Record<string, unknown>;
};

type CreateGuildPayload = {
  name?: unknown;
  description?: unknown;
  iconKey?: unknown;
  color?: unknown;
};

interface MapOccupancyMember {
  studentId: string;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  githubAvatarUrl?: string | null;
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
    createdAt: guild.createdAt?.toISOString?.(),
    updatedAt: guild.updatedAt?.toISOString?.(),
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

function formatOccupancyMemberName(member: MapOccupancyMember) {
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
    institutionalEmail: student.institutionalEmail || undefined,
    avatarUrl: student.avatarUrl || student.githubAvatarUrl || undefined,
    characterClass,
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
  nodeOccupancies: GameMapNodeOccupancy[] = []
): GameMapData {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const currentActivityId = currentMove?.toActivityId;
  const currentStep = cohortProgression?.currentStep ?? run.currentSectorDepth;
  const activityIds = new Set(activityRecords.map((activity) => activity.id));
  const incomingByActivity = new Map<string, string[]>();

  for (const edge of edges) {
    if (!activityIds.has(edge.fromActivityId) || !activityIds.has(edge.toActivityId)) continue;
    const incoming = incomingByActivity.get(edge.toActivityId) || [];
    incoming.push(edge.fromActivityId);
    incomingByActivity.set(edge.toActivityId, incoming);
  }

  const activities = activityRecords.map((activity) => {
    const prerequisites = incomingByActivity.get(activity.id) || [];
    const isCompleted = completedActivityIds.has(activity.id);
    const prerequisitesCompleted = prerequisites.every((id) => completedActivityIds.has(id));
    const isRoot = prerequisites.length === 0;
    const stepRanges = parseStepRanges(activity.stepRanges, activity.requiredLevel);
    const hasBeenRevealed = stepRanges.some((range) => currentStep >= range.startStep);
    const isActiveForStep = stepRanges.some((range) => isStepInsideRange(currentStep, range));
    const isRevealed = isCompleted || (hasBeenRevealed && isActiveForStep && (isRoot || prerequisitesCompleted));
    const isLocked = !isRevealed || !prerequisitesCompleted;
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
    currentStep,
    currentActivityId,
    currentMove,
  };
}

function getActivityLockState(
  activity: Pick<ActivityRecord, 'id' | 'requiredLevel' | 'stepRanges'>,
  activityRecords: Array<Pick<ActivityRecord, 'id' | 'requiredLevel' | 'stepRanges'>>,
  edges: Array<Pick<GameActivityEdge, 'fromActivityId' | 'toActivityId'>>,
  completions: Array<Pick<GameActivityCompletion, 'activityId'>>,
  currentStep: number
) {
  const completedActivityIds = new Set(completions.map((completion) => completion.activityId));
  const activityIds = new Set(activityRecords.map((record) => record.id));
  const prerequisites = edges
    .filter((edge) => edge.toActivityId === activity.id && activityIds.has(edge.fromActivityId))
    .map((edge) => edge.fromActivityId);
  const prerequisitesCompleted = prerequisites.every((id) => completedActivityIds.has(id));
  const isRoot = prerequisites.length === 0;
  const isCompleted = completedActivityIds.has(activity.id);
  const stepRanges = parseStepRanges(activity.stepRanges, activity.requiredLevel);
  const hasBeenRevealed = stepRanges.some((range) => currentStep >= range.startStep);
  const isActiveForStep = stepRanges.some((range) => isStepInsideRange(currentStep, range));
  const isRevealed = isCompleted || (hasBeenRevealed && isActiveForStep && (isRoot || prerequisitesCompleted));

  return {
    isCompleted,
    isRevealed,
    isLocked: !isRevealed || !prerequisitesCompleted,
  };
}

async function loadActivityAuthorizationState(
  db: Database,
  cohortId: string,
  mapRunId: string,
  studentId: string,
  currentStep: number,
  activity: ActivityRecord
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

  return getActivityLockState(
    activity,
    activityRecords,
    edgeRecords.map(toActivityEdge),
    completionRecords.map(toActivityCompletion),
    currentStep
  );
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

function toRewardCard(record: ProgressMilestoneRecord, gameId: string) {
  return {
    id: record.id,
    gameId,
    title: record.rewardTitleI18nKey,
    subtitle: record.rewardSubtitleI18nKey || undefined,
    description: record.descriptionI18nKey || undefined,
    cost: record.cost,
    accentToken: record.rewardAccentToken,
    iconKey: record.rewardIconKey,
    illustrationUrl: record.rewardIllustrationUrl || undefined,
    color: record.rewardColor || undefined,
    sortOrder: record.sortOrder,
    createdAt: toIsoString(record.createdAt),
  };
}

function normalizeRewardCardPayload(value: unknown): GameRewardCardPayload | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
  const cost = typeof candidate.cost === 'number' ? candidate.cost : Number(candidate.cost);

  if (!title || !Number.isInteger(cost) || cost < 0) return undefined;

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

export const mapRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

mapRouter.post('/map/activities', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
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

  const databaseUrl = requireDatabaseUrl(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  const edgeId = c.req.param('edgeId');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<{ styleWindows?: unknown }>(c, {});

  let styleWindows: GameActivityEdgeStyleWindow[] | undefined;
  try {
    styleWindows = validateEdgeStyleWindows(body?.styleWindows);
  } catch (error: any) {
    return apiError(c, error.message || 'Invalid edge style windows.', 400);
  }

  if (!styleWindows) {
    return apiError(c, 'styleWindows is required.', 400);
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

    const metadata =
      edge.metadata && typeof edge.metadata === 'object' && !Array.isArray(edge.metadata)
        ? (edge.metadata as Record<string, unknown>)
        : {};
    const [updatedEdge] = await db
      .update(gameActivityEdges)
      .set({
        metadata: {
          ...metadata,
          styleWindows,
        },
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
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);
  const body = await parseJsonBody<CreateGuildPayload>(c, {});

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : undefined;
  const iconKey = typeof body?.iconKey === 'string' ? body.iconKey.trim() : undefined;
  const color = typeof body?.color === 'string' ? body.color.trim() : undefined;

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
    return missingDatabaseUrl(c);
  }

  try {
    const db = getDb(databaseUrl);
    const context = await resolveStudentCohortContext(db, user, requestedCohortId);

    if (!context) {
      return apiError(c, 'Cohort context not found.', 404);
    }
    if (context.membership.guildId) {
      return apiError(c, 'Student already belongs to a guild for this cohort.', 409);
    }

    const createdGuild = await db.transaction(async (tx) => {
      const [guildRecord] = await tx
        .insert(guilds)
        .values({
          cohortId: context.cohortRecord.id,
          name,
          description: description || null,
          iconKey: iconKey || null,
          color: color || null,
        })
        .returning();

      const [updatedMembership] = await tx
        .update(cohortMemberships)
        .set({ guildId: guildRecord.id })
        .where(
          and(
            eq(cohortMemberships.userId, context.membership.userId),
            eq(cohortMemberships.cohortId, context.membership.cohortId),
            isNull(cohortMemberships.guildId)
          )
        )
        .returning();

      if (!updatedMembership) {
        throw new Error('Student already belongs to a guild for this cohort.');
      }

      return guildRecord;
    });

    const [creatorRecord] = await db
      .select({
        studentId: students.id,
        userId: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        githubAvatarUrl: users.githubAvatarUrl,
        guildId: cohortMemberships.guildId,
        institutionalEmail: cohortMemberships.institutionalEmail,
        characterClass: gameCharacters.characterClass,
        strength: gameCharacters.strength,
        dexterity: gameCharacters.dexterity,
        constitution: gameCharacters.constitution,
        intelligence: gameCharacters.intelligence,
        wisdom: gameCharacters.wisdom,
        charisma: gameCharacters.charisma,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(users, eq(users.id, cohortMemberships.userId))
      .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
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
  const databaseUrl = c.env?.DATABASE_URL;
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = user?.isAdmin
      ? await resolveAdminCohort(db, requestedCohortId)
      : (await resolveStudentCohortContext(db, user, requestedCohortId))?.cohortRecord;

    if (!cohortRecord) {
      return apiError(c, 'Guild cohort context not found.', 404);
    }

    const guildRecords = await db
      .select()
      .from(guilds)
      .where(eq(guilds.cohortId, cohortRecord.id))
      .orderBy(desc(guilds.gold));
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
    const rosterStudentRecords = await db
      .select({
        studentId: students.id,
        userId: users.id,
        displayName: users.displayName,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        avatarUrl: users.avatarUrl,
        githubAvatarUrl: users.githubAvatarUrl,
        guildId: cohortMemberships.guildId,
        institutionalEmail: cohortMemberships.institutionalEmail,
        characterClass: gameCharacters.characterClass,
        strength: gameCharacters.strength,
        dexterity: gameCharacters.dexterity,
        constitution: gameCharacters.constitution,
        intelligence: gameCharacters.intelligence,
        wisdom: gameCharacters.wisdom,
        charisma: gameCharacters.charisma,
      })
      .from(cohortMemberships)
      .innerJoin(students, eq(students.userId, cohortMemberships.userId))
      .innerJoin(users, eq(users.id, cohortMemberships.userId))
      .leftJoin(gameCharacters, eq(gameCharacters.studentId, students.id))
      .where(eq(cohortMemberships.cohortId, cohortRecord.id));
    const rosterStudents = rosterStudentRecords.map((record) => ({
      student: toClassRosterStudent(record),
      guildId: record.guildId,
    }));
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

    return c.json({
      success: true,
      source: 'database',
      guilds: guildRecords.map((guild) => ({
        id: guild.id,
        cohortId: guild.cohortId,
        name: guild.name,
        description: guild.description || undefined,
        iconUrl: guild.iconUrl || undefined,
        iconKey: guild.iconKey || undefined,
        color: guild.color || undefined,
        gold: guild.gold,
        boostPointsSpent: boostPointsSpentByGuildId.get(guild.id) || 0,
        createdAt: guild.createdAt?.toISOString?.(),
        updatedAt: guild.updatedAt?.toISOString?.(),
        members: (membersByGuildId.get(guild.id) || []).sort((a, b) =>
          a.displayName.localeCompare(b.displayName)
        ),
      })),
      unguildedStudents: rosterStudents
        .filter((item) => !item.guildId)
        .map((item) => item.student)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    });
  } catch (error: any) {
    console.error('Guild SQL error:', error.message);
    return apiError(c, 'Guilds could not be loaded.', 500);
  }
});

mapRouter.patch('/guilds/:guildId', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const guildId = c.req.param('guildId');
  const user = c.get('user');

  let body: Partial<Pick<Guild, 'iconKey'>>;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const iconKey = typeof body.iconKey === 'string' ? body.iconKey.trim() : undefined;
  if (!iconKey || !/^[A-Za-z0-9_-]{1,80}$/.test(iconKey)) {
    return apiError(c, 'iconKey must be a valid icon identifier.', 400);
  }

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      .set({ iconKey, updatedAt: new Date() })
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

mapRouter.post('/guilds/:guildId/votes', async (c) => {
  const databaseUrl = c.env?.DATABASE_URL;
  const guildId = c.req.param('guildId');
  const user = c.get('user');

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      .select({ guildId: cohortMemberships.guildId })
      .from(cohortMemberships)
      .where(and(eq(cohortMemberships.userId, user!.id), eq(cohortMemberships.guildId, guildId)))
      .limit(1);

    if (!studentMembership) {
      return apiError(c, 'Guild vote spend is not allowed.', 403);
    }

    const result = await new VotingCostService(db).spendGuildVotes({
      guildId,
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
  const databaseUrl = c.env?.DATABASE_URL;
  const activityId = c.req.param('activityId');
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      activity
    );
    if (lockState.isLocked) {
      return apiError(c, 'Activity is locked for this student.', 403);
    }

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
  const databaseUrl = c.env?.DATABASE_URL;
  const activityId = c.req.param('activityId');
  const user = c.get('user');
  const requestedCohortId = getRequestedGameId(c);

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      activity
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
      const [directEdge] = await db
        .select({ id: gameActivityEdges.id })
        .from(gameActivityEdges)
        .where(
          and(
            or(
              and(
                eq(gameActivityEdges.fromActivityId, latestMove.toActivityId),
                eq(gameActivityEdges.toActivityId, activityId)
              ),
              and(
                eq(gameActivityEdges.fromActivityId, activityId),
                eq(gameActivityEdges.toActivityId, latestMove.toActivityId)
              )
            ),
            or(
              sql`${gameActivityEdges.cohortId} IS NULL AND ${gameActivityEdges.mapRunId} IS NULL`,
              eq(gameActivityEdges.cohortId, membership.cohortId),
              eq(gameActivityEdges.mapRunId, activeRun.id)
            )
          )
        )
        .limit(1);

      if (!directEdge) {
        return apiError(c, 'Characters can only move to directly connected activities.', 403);
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
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      return apiError(c, 'Map cohort not found.', 404);
    }

    if (!user?.isAdmin && !studentContext) {
      return apiError(c, 'Student cohort context not found.', 404);
    }

    const activeRun = await getOrCreateActiveRun(db, cohortRecord.id);

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

    if (activitiesFromDb.length === 0) {
      return c.json({
        success: true,
        source: 'database',
        map: buildMapData(
          toMapRun(activeRun),
          [],
          [],
          completionsFromDb.map(toActivityCompletion),
          latestMove ? toCharacterMove(latestMove) : undefined,
          cohortRecord,
          Boolean(user?.isAdmin),
          nodeOccupancies
        ),
      });
    }

    const map = buildMapData(
      toMapRun(activeRun),
      activitiesFromDb,
      edgesFromDb.map(toActivityEdge),
      completionsFromDb.map(toActivityCompletion),
      latestMove ? toCharacterMove(latestMove) : undefined,
      cohortRecord,
      Boolean(user?.isAdmin),
      nodeOccupancies
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
  const databaseUrl = c.env?.DATABASE_URL;

  if (!databaseUrl) {
    return missingDatabaseUrl(c);
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
      return apiError(c, 'Progress cohort context not found.', 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return apiError(c, 'Cohort progress not found.', 404);
    }

    const guildId = studentContext?.membership.guildId;
    const notificationScope = guildId
      ? and(
          eq(notifications.cohortId, cohortRecord.id),
          or(eq(notifications.guildId, guildId), sql`${notifications.guildId} IS NULL`)
        )
      : and(eq(notifications.cohortId, cohortRecord.id), sql`${notifications.guildId} IS NULL`);

    const [milestones, [targetRow], notificationRows] = await Promise.all([
      db
        .select()
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id))
        .orderBy(progressMilestones.sortOrder),
      db
        .select({ targetPoints: sum(progressMilestones.cost) })
        .from(progressMilestones)
        .where(eq(progressMilestones.progressId, progress.id)),
      db
        .select()
        .from(notifications)
        .where(notificationScope)
        .orderBy(notifications.sortOrder),
    ]);

    const progressData: CohortProgressData = {
      gauge: {
        currentPoints: progress.currentPoints,
        targetPoints: Number(targetRow?.targetPoints || 0),
        labelI18nKey: progress.labelI18nKey,
        milestones: milestones.map((milestone) => ({
          id: milestone.id,
          labelI18nKey: milestone.labelI18nKey,
          descriptionI18nKey: milestone.descriptionI18nKey || undefined,
          cost: milestone.cost,
          reward: {
            id: milestone.id,
            titleI18nKey: milestone.rewardTitleI18nKey,
            subtitleI18nKey: milestone.rewardSubtitleI18nKey || undefined,
            accentToken: milestone.rewardAccentToken,
            iconKey: milestone.rewardIconKey,
            illustrationUrl: milestone.rewardIllustrationUrl || undefined,
            color: milestone.rewardColor || undefined,
          },
        })),
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

mapRouter.get('/games/:gameId/reward-cards', async (c) => {
  const adminUser = requireAdminUser(c);
  if (adminUser instanceof Response) return adminUser;

  const databaseUrl = c.env?.DATABASE_URL;
  if (!databaseUrl) {
    return missingDatabaseUrl(c);
  }

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return c.json({ success: true, source: 'database', rewardCards: [] });
    }

    const rewardCards = await db
      .select()
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id))
      .orderBy(progressMilestones.sortOrder);

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

  const databaseUrl = requireDatabaseUrl(c);
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

    let [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      [progress] = await db
        .insert(cohortProgress)
        .values({
          cohortId: cohortRecord.id,
          labelI18nKey: 'dashboard.dock.milestone',
        })
        .returning();
    }

    const [maxSortOrder] = await db
      .select({ value: sql<number>`coalesce(max(${progressMilestones.sortOrder}), -1)` })
      .from(progressMilestones)
      .where(eq(progressMilestones.progressId, progress.id));

    const [created] = await db
      .insert(progressMilestones)
      .values({
        progressId: progress.id,
        labelI18nKey: body.title,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        rewardTitleI18nKey: body.title,
        rewardSubtitleI18nKey: body.subtitle || null,
        rewardAccentToken: body.accentToken || 'quest',
        rewardIconKey: body.iconKey || 'Gift',
        rewardIllustrationUrl: body.illustrationUrl || null,
        rewardColor: body.color || null,
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

  const databaseUrl = requireDatabaseUrl(c);
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

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return apiError(c, 'Game progress not found.', 404);
    }

    const [updated] = await db
      .update(progressMilestones)
      .set({
        labelI18nKey: body.title,
        descriptionI18nKey: body.description || null,
        cost: body.cost,
        rewardTitleI18nKey: body.title,
        rewardSubtitleI18nKey: body.subtitle || null,
        rewardAccentToken: body.accentToken || 'quest',
        rewardIconKey: body.iconKey || 'Gift',
        rewardIllustrationUrl: body.illustrationUrl || null,
        rewardColor: body.color || null,
        sortOrder: body.sortOrder ?? 0,
      })
      .where(
        and(
          eq(progressMilestones.id, c.req.param('rewardCardId')),
          eq(progressMilestones.progressId, progress.id)
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

  const databaseUrl = requireDatabaseUrl(c);
  if (databaseUrl instanceof Response) return databaseUrl;

  try {
    const db = getDb(databaseUrl);
    const cohortRecord = await resolveAdminCohort(db, c.req.param('gameId'));
    if (!cohortRecord) {
      return apiError(c, 'Game not found.', 404);
    }

    const [progress] = await db
      .select()
      .from(cohortProgress)
      .where(eq(cohortProgress.cohortId, cohortRecord.id))
      .limit(1);

    if (!progress) {
      return apiError(c, 'Game progress not found.', 404);
    }

    const [deleted] = await db
      .delete(progressMilestones)
      .where(
        and(
          eq(progressMilestones.id, c.req.param('rewardCardId')),
          eq(progressMilestones.progressId, progress.id)
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
