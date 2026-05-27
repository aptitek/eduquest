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
} from '@eduquest/shared';

interface GameState {
  user: User | null;
  student: Student | null;
  character: GameCharacter | null;
  activities: Activity[];
  activityEdges: GameActivityEdge[];
  mapRun: GameMapRun | null;
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
  patchCharacter: (patch: Partial<GameCharacter>) => void;
  setCharacterClass: (characterClass: GameCharacterClass) => void;
  setActivities: (activities: Activity[]) => void;
  setMapData: (mapData: GameMapData) => void;
  setAvailableGames: (games: Game[]) => void;
  setSelectedGameId: (gameId: string | null) => void;
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
  availableGames: [],
  selectedGameId: null,
  activityCompletions: [],
  nodeOccupancies: [],
  currentActivityId: null,
  currentMove: null,

  setUserSession: (user, student, character, activityCompletions = []) =>
    set({ user, student, character, activityCompletions }),
  patchUser: (patch) => set((state) => (state.user ? { user: { ...state.user, ...patch } } : {})),
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
  setMapData: (mapData) =>
    set({
      activities: mapData.activities,
      activityEdges: mapData.edges,
      mapRun: mapData.run,
      activityCompletions: mapData.completions,
      nodeOccupancies: mapData.nodeOccupancies || [],
      currentActivityId: mapData.currentActivityId || null,
      currentMove: mapData.currentMove || null,
    }),
  setAvailableGames: (availableGames) => set({ availableGames }),
  setSelectedGameId: (selectedGameId) => set({ selectedGameId }),
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
  if (!state.student || !state.user || !state.character) return state.nodeOccupancies;

  const fromActivityId = move.fromActivityId || state.currentActivityId || undefined;
  const targetActivity = state.activities.find((activity) => activity.id === currentActivityId);
  if (!targetActivity) return state.nodeOccupancies;

  const guild = getSelectedGuild(state);
  const member = {
    studentId: state.student.id,
    displayName: getUserDisplayName(state.user),
    avatarUrl: state.user.avatarUrl || state.user.githubAvatarUrl,
    characterClass: state.character.characterClass,
    guildId: guild?.id,
    guildName: guild?.name,
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
