import { create } from 'zustand';
import {
  User,
  Student,
  Game,
  GameCharacter,
  Activity,
  GameActivityCompletion,
  GameActivityEdge,
  GameCharacterMove,
  GameCharacterClass,
  GameMapData,
  GameMapOccupancySegment,
  GameMapNodeOccupancy,
  GameMapRun,
  Guild,
  School,
} from '@eduquest/shared';

interface GameState {
  user: User | null;
  student: Student | null;
  character: GameCharacter | null;
  activities: Activity[];
  activityEdges: GameActivityEdge[];
  mapRun: GameMapRun | null;
  currentStep: number;
  availableGames: Game[];
  selectedGameId: string | null;
  activityCompletions: GameActivityCompletion[];
  nodeOccupancies: GameMapNodeOccupancy[];
  currentActivityId: string | null;
  currentMove: GameCharacterMove | null;
  setUserSession: (
    user: User,
    student: Student | null,
    character: GameCharacter | null,
    activityCompletions?: GameActivityCompletion[]
  ) => void;
  patchUser: (patch: Partial<User>) => void;
  patchSchool: (school: School) => void;
  patchCharacter: (patch: Partial<GameCharacter>) => void;
  setCharacterClass: (characterClass: GameCharacterClass) => void;
  setActivities: (activities: Activity[]) => void;
  patchActivity: (activityId: string, patch: Partial<Activity>) => void;
  setActivityEdges: (activityEdges: GameActivityEdge[]) => void;
  patchActivityEdge: (edgeId: string, patch: Partial<GameActivityEdge>) => void;
  removeActivityEdges: (edgeIds: string[]) => void;
  setMapData: (mapData: GameMapData) => void;
  setAvailableGames: (games: Game[]) => void;
  setSelectedGameId: (gameId: string | null) => void;
  setStudentGuild: (cohortId: string, guild: Guild) => void;
  setActivityCompletions: (activityCompletions: GameActivityCompletion[]) => void;
  addActivityCompletion: (completion: GameActivityCompletion) => void;
  setCurrentMove: (move: GameCharacterMove, currentActivityId: string) => void;
  gainXp: (amount: number) => void;
  logout: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  user: null,
  student: null,
  character: null,
  activities: [],
  activityEdges: [],
  mapRun: null,
  currentStep: 0,
  availableGames: [],
  selectedGameId: null,
  activityCompletions: [],
  nodeOccupancies: [],
  currentActivityId: null,
  currentMove: null,

  setUserSession: (user, student, character, activityCompletions = []) =>
    set((state) => ({
      user,
      student,
      character,
      activityCompletions,
      nodeOccupancies: syncProfileInNodeOccupancies(state.nodeOccupancies, student, user, character),
    })),
  patchUser: (patch) =>
    set((state) => {
      if (!state.user) return {};
      const user = { ...state.user, ...patch };
      return {
        user,
        nodeOccupancies: syncProfileInNodeOccupancies(state.nodeOccupancies, state.student, user, state.character),
      };
    }),
  patchSchool: (school) =>
    set((state) => {
      if (!state.student?.cohortMemberships) return {};

      return {
        student: {
          ...state.student,
          cohortMemberships: state.student.cohortMemberships.map((membership) =>
            membership.cohort?.schoolId === school.id || membership.cohort?.school?.id === school.id
              ? {
                  ...membership,
                  cohort: membership.cohort
                    ? {
                        ...membership.cohort,
                        school,
                      }
                    : membership.cohort,
                }
              : membership
          ),
        },
      };
    }),
  patchCharacter: (patch) =>
    set((state) => (state.character ? { character: { ...state.character, ...patch } } : {})),
  setCharacterClass: (characterClass) =>
    set((state) =>
      state.character
        ? {
            character: {
              ...state.character,
              characterClass,
              updatedAt: new Date().toISOString(),
            },
          }
        : {}
    ),
  setActivities: (activities) => set({ activities }),
  patchActivity: (activityId, patch) =>
    set((state) => ({
      activities: state.activities.map((activity) =>
        activity.id === activityId ? { ...activity, ...patch } : activity
      ),
    })),
  setActivityEdges: (activityEdges) => set({ activityEdges }),
  patchActivityEdge: (edgeId, patch) =>
    set((state) => ({
      activityEdges: state.activityEdges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...patch } : edge
      ),
    })),
  removeActivityEdges: (edgeIds) =>
    set((state) => ({
      activityEdges: state.activityEdges.filter((edge) => !edgeIds.includes(edge.id)),
    })),
  setMapData: (mapData) =>
    set({
      activities: mapData.activities,
      activityEdges: mapData.edges,
      mapRun: mapData.run || null,
      currentStep: mapData.currentStep ?? mapData.run?.currentSectorDepth ?? 0,
      activityCompletions: mapData.completions,
      nodeOccupancies: mapData.nodeOccupancies || [],
      currentActivityId: mapData.currentActivityId || null,
      currentMove: mapData.currentMove || null,
    }),
  setAvailableGames: (availableGames) => set({ availableGames }),
  setSelectedGameId: (selectedGameId) => set({ selectedGameId }),
  setStudentGuild: (cohortId, guild) =>
    set((state) => {
      if (!state.student) return {};
      return {
        student: {
          ...state.student,
          cohortMemberships: state.student.cohortMemberships?.map((membership) =>
            membership.cohortId === cohortId
              ? { ...membership, guildId: guild.id, guild }
              : membership
          ),
        },
      };
    }),
  setActivityCompletions: (activityCompletions) => set({ activityCompletions }),
  addActivityCompletion: (completion) =>
    set((state) => ({
      activityCompletions: [
        ...state.activityCompletions.filter((item) => item.id !== completion.id),
        completion,
      ],
      activities: state.activities.map((activity) =>
        activity.id === completion.activityId
          ? { ...activity, isCompleted: true, isLocked: false, isRevealed: true }
          : activity
      ),
    })),
  setCurrentMove: (move, currentActivityId) =>
    set((state) => ({
      currentActivityId,
      currentMove: move,
      nodeOccupancies: updateNodeOccupanciesForMove(state, move, currentActivityId),
      activities: state.activities.map((activity) => ({
        ...activity,
        isCurrent: activity.id === currentActivityId,
      })),
    })),
  logout: () =>
    set({
      user: null,
      student: null,
      character: null,
      activities: [],
      activityEdges: [],
      mapRun: null,
      currentStep: 0,
      availableGames: [],
      selectedGameId: null,
      activityCompletions: [],
      nodeOccupancies: [],
      currentActivityId: null,
      currentMove: null,
    }),

  gainXp: () => set({}),
}));

function updateNodeOccupanciesForMove(
  state: GameState,
  move: GameCharacterMove,
  currentActivityId: string
): GameMapNodeOccupancy[] {
  if (!state.student || !state.user) return state.nodeOccupancies;

  const fromActivityId = move.fromActivityId || state.currentActivityId || undefined;
  const targetActivity = state.activities.find((activity) => activity.id === currentActivityId);
  if (!targetActivity) return state.nodeOccupancies;

  const guild = getSelectedGuild(state);
  const member = {
    studentId: state.student.id,
    displayName: getUserDisplayName(state.user),
    avatarUrl: state.user.avatarUrl || state.user.githubAvatarUrl,
    characterIllustrationUrl: state.character?.illustrationUrl,
    characterClass: state.character?.characterClass,
    guildId: guild?.id,
    guildName: guild?.name,
    guildIconUrl: guild?.iconUrl,
    guildIconKey: guild?.iconKey,
    guildColor: guild?.color,
    fromActivityId,
    toActivityId: currentActivityId,
  };
  const isGuildSegment = targetActivity.participationMode === 'guild' && guild?.id;
  const totalStudents = Math.max(
    state.nodeOccupancies.find((occupancy) => occupancy.totalStudents > 0)?.totalStudents || 0,
    1
  );
  const withoutMember = state.nodeOccupancies
    .map((occupancy) => ({
      ...occupancy,
      segments: occupancy.segments.flatMap((segment) => {
        const members = (segment.members || []).filter((candidate) => candidate.studentId !== state.student?.id);
        const removedCount = (segment.members?.length || 0) - members.length;
        const studentCount = Math.max(0, segment.studentCount - removedCount);
        return studentCount > 0 ? [{ ...segment, studentCount, members }] : [];
      }),
    }))
    .filter((occupancy) => occupancy.segments.length > 0);

  const targetIndex = withoutMember.findIndex((occupancy) => occupancy.activityId === currentActivityId);
  const nextOccupancies =
    targetIndex === -1
      ? [
          ...withoutMember,
          {
            activityId: currentActivityId,
            totalStudents,
            segments: [],
          },
        ]
      : [...withoutMember];
  const targetOccupancyIndex =
    targetIndex === -1 ? nextOccupancies.length - 1 : targetIndex;
  const targetOccupancy = nextOccupancies[targetOccupancyIndex];
  const segmentIndex = targetOccupancy.segments.findIndex((segment) =>
    isGuildSegment ? segment.guildId === guild?.id : segment.kind === 'solo'
  );
  const targetSegment: GameMapOccupancySegment =
    segmentIndex === -1
      ? {
          kind: isGuildSegment ? 'guild' : 'solo',
          studentCount: 0,
          guildId: isGuildSegment ? guild?.id : undefined,
          guildName: isGuildSegment ? guild?.name : undefined,
          guildIconUrl: isGuildSegment ? guild?.iconUrl : undefined,
          guildIconKey: isGuildSegment ? guild?.iconKey : undefined,
          color: isGuildSegment ? guild?.color : undefined,
          members: [],
        }
      : targetOccupancy.segments[segmentIndex];
  const nextSegment = {
    ...targetSegment,
    studentCount: targetSegment.studentCount + 1,
    members: [...(targetSegment.members || []), member],
  };
  const nextSegments =
    segmentIndex === -1
      ? [...targetOccupancy.segments, nextSegment]
      : targetOccupancy.segments.map((segment, index) => (index === segmentIndex ? nextSegment : segment));

  nextOccupancies[targetOccupancyIndex] = {
    ...targetOccupancy,
    totalStudents,
    segments: nextSegments,
  };

  return nextOccupancies;
}

function syncProfileInNodeOccupancies(
  nodeOccupancies: GameMapNodeOccupancy[],
  student: Student | null,
  user: User,
  character: GameCharacter | null
): GameMapNodeOccupancy[] {
  if (!student) return nodeOccupancies;

  const displayName = getUserDisplayName(user);
  const avatarUrl = user.avatarUrl || user.githubAvatarUrl;
  let changed = false;

  const nextOccupancies = nodeOccupancies.map((occupancy) => ({
    ...occupancy,
    segments: occupancy.segments.map((segment) => ({
      ...segment,
      members: segment.members?.map((member) => {
        if (member.studentId !== student.id) return member;

        changed = true;
        return {
          ...member,
          displayName,
          avatarUrl,
          characterIllustrationUrl: character?.illustrationUrl,
        };
      }),
    })),
  }));

  return changed ? nextOccupancies : nodeOccupancies;
}

function getSelectedGuild(state: GameState) {
  const memberships = state.student?.cohortMemberships || [];
  const membership =
    (state.selectedGameId && memberships.find((item) => item.cohortId === state.selectedGameId)) ||
    memberships[0];

  return membership?.guild;
}

function getUserDisplayName(user: User) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return user.displayName || fullName || user.githubUsername || user.email;
}
