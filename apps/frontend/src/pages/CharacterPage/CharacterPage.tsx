import { useEffect, useState } from 'react';
import {
  GAME_CHARACTER_CLASSES,
  type GameCharacterClass,
  type GameCharacterClassDefinition,
  type GameCharacterStatConfig,
  type GameStats,
} from '@eduquest/shared';
import { UserRound } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import {
  PlayingCard,
  PlayingHand,
  type PlayingCardData,
  type PlayingCardEditableField,
  type PlayingHandData,
} from '../../components/molecules/PlayingCard';
import { useGameStore } from '../../features/game/gameStore';
import { fetchCharacterClasses } from '../../features/game/api';
import { BACKEND_BASE_URL } from '../../config/deployment';
import { throwApiResponseError } from '../../features/errors/api';
import { useTranslation } from '../../hooks/useTranslation';
import { formatUserDisplayName } from '../../utils/displayName';
import { useErrorReporter } from '../../features/errors/notifications';
import { uploadAsset } from '../../features/assets/api';
import {
  CHARACTER_CLASS_BASE_STATS,
  GAME_STAT_FIELDS,
  createEmptyGameStats,
  type GameStatKey,
} from '../../features/game/characterStats';

type EditablePlayerCardOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};

type CharacterProfileUpdatePayload = {
  displayName?: string;
  bio?: string;
  characterIllustrationUrl?: string;
  characterStats?: GameStats;
  gameId?: string | null;
};

const DEFAULT_STAT_CONFIG: GameCharacterStatConfig = {
  maxValue: 5,
  allocationBudget: 6,
};

export function CharacterPage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { user, student, character, activityCompletions, selectedGameId, setUserSession } = useGameStore();
  const [playerCardOverride, setPlayerCardOverride] = useState<EditablePlayerCardOverride>({});
  const [classDefinitions, setClassDefinitions] = useState<GameCharacterClassDefinition[]>([]);
  const [statConfig, setStatConfig] = useState<GameCharacterStatConfig>(DEFAULT_STAT_CONFIG);
  const [isSavingCharacterClass, setIsSavingCharacterClass] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchCharacterClasses(selectedGameId)
      .then((catalog) => {
        if (!isMounted) return;
        setClassDefinitions(catalog.characterClasses);
        setStatConfig(catalog.statConfig);
      })
      .catch((error) => {
        reportError(error, {
          messageKey: 'character.errors.loadClasses',
          id: 'character.errors.loadClasses',
          logMessage: 'Could not load character class definitions.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGameId]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-text-muted">
        {t('layout.loadingSession')}
      </div>
    );
  }

  const playerName = formatUserDisplayName(user);
  const avatarUrl = character?.illustrationUrl || user.avatarUrl || user.githubAvatarUrl;
  const savePlayerCardProfileUpdate = async (payload: CharacterProfileUpdatePayload) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      setSaveError(t('profile.errors.unauthorized'));
      return;
    }

    setSaveError(null);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, gameId: selectedGameId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throwApiResponseError(response, data, 'Character profile could not be saved.');
      }

      if (typeof data.token === 'string' && data.token) {
        localStorage.setItem('eduquest_token', data.token);
      }
      setUserSession(data.user, data.student || student || null, data.character || character || null, activityCompletions);
      window.dispatchEvent(new Event('eduquest:onboarding-state-updated'));
    } catch (error) {
      reportError(error, {
        messageKey: 'character.errors.saveProfile',
        id: 'character.errors.saveProfile',
        logMessage: 'Could not save character profile card.',
      });
      setSaveError(t('character.errors.saveProfile'));
    }
  };
  const saveCharacterClass = async (characterClass: GameCharacterClass) => {
    if (isSavingCharacterClass) return;

    const token = localStorage.getItem('eduquest_token');
    if (!token) {
      setSaveError(t('profile.errors.unauthorized'));
      return;
    }

    setIsSavingCharacterClass(true);
    setSaveError(null);
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ characterClass, gameId: selectedGameId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.user || !data.character) {
        throwApiResponseError(response, data, 'Character class could not be saved.');
      }

      if (typeof data.token === 'string' && data.token) {
        localStorage.setItem('eduquest_token', data.token);
      }
      setUserSession(data.user, data.student || student || null, data.character, activityCompletions);
      window.dispatchEvent(new Event('eduquest:onboarding-state-updated'));
      setPlayerCardOverride({});
    } catch (error) {
      reportError(error, {
        messageKey: 'character.errors.saveClass',
        id: 'character.errors.saveClass',
        logMessage: 'Could not save character class.',
      });
      setSaveError(t('character.errors.saveClass'));
    } finally {
      setIsSavingCharacterClass(false);
    }
  };
  const updatePlayerCardField = (field: PlayingCardEditableField, value: string) => {
    if (field === 'ribbonText' || field === 'ribbonIcon' || field === 'subtitle') return;
    setPlayerCardOverride((current) => ({
      ...current,
      [field]: value,
    }));

    const trimmedValue = value.trim();
    if (field === 'title') {
      void savePlayerCardProfileUpdate({ displayName: trimmedValue });
    } else if (field === 'description') {
      void savePlayerCardProfileUpdate({ bio: value });
    } else if (field === 'illustrationUrl') {
      void savePlayerCardProfileUpdate({ characterIllustrationUrl: trimmedValue });
    }
  };
  const uploadPlayerCardIllustration = async (file: File) => {
    const token = localStorage.getItem('eduquest_token');
    if (!token) throw new Error('profile.errors.unauthorized');

    const asset = await uploadAsset(token, 'character-illustration', file, character?.studentId);
    return asset.url;
  };
  const updatePlayerCardStat = (statId: string, value: number) => {
    if (!character) return;
    const statKey = getGameStatKey(statId);
    if (!statKey) return;

    const currentAllocations = getCurrentStatAllocations(character.stats, playerCardOverride.stats, statBudget, baseStats, statMaxValue);
    const currentRemainingPoints = getRemainingStatPoints(statBudget, currentAllocations);
    const nextAllocation = clampStatValue(
      value - baseStats[statKey],
      0,
      Math.min(statMaxValue - baseStats[statKey], currentAllocations[statKey] + currentRemainingPoints)
    );
    const nextStats = {
      ...currentAllocations,
      [statKey]: nextAllocation,
    };

    setPlayerCardOverride((current) => ({
      ...current,
      stats: nextStats,
    }));
    void savePlayerCardProfileUpdate({ characterStats: nextStats });
  };
  const getPlayerCardStatRange = (statId: string, currentValue: number) => {
    if (!character) return { min: 0, max: currentValue };
    const statKey = getGameStatKey(statId);
    if (!statKey) return { min: 0, max: currentValue };

    const baseValue = baseStats[statKey];
    const currentAllocation = Math.max(0, Math.round(currentValue - baseValue));

    return {
      min: baseValue,
      max: Math.min(statMaxValue, baseValue + currentAllocation + remainingStatPoints),
    };
  };
  const currentClassLabel = character ? t(`game.classes.${character.characterClass}`) : '';
  const baseStats = character ? getCharacterClassBaseStats(character.characterClass, classDefinitions) : createEmptyGameStats();
  const statMaxValue = statConfig.maxValue;
  const statBudget = character ? statConfig.allocationBudget : 0;
  const statAllocations = character
    ? getCurrentStatAllocations(character.stats, playerCardOverride.stats, statBudget, baseStats, statMaxValue)
    : createEmptyGameStats();
  const remainingStatPoints = getRemainingStatPoints(statBudget, statAllocations);
  const playerCard = character
    ? applyPlayerCardOverrides(
        buildPlayerCharacterCard({
          name: playerName,
          avatarUrl,
          characterClass: character.characterClass,
          classLabel: currentClassLabel,
          statAllocations,
          baseStats,
          statMaxValue,
          remainingStatPoints,
          remainingStatPointsLabel: t('character.pointsRemainingShort'),
          getStatEditableRange: getPlayerCardStatRange,
          bio: user.bio,
          fallbackDescription: t('character.activeCardDescription'),
        }),
        playerCardOverride,
        updatePlayerCardField,
        updatePlayerCardStat,
        uploadPlayerCardIllustration
      )
    : null;
  const currentClassIndex = Math.max(
    GAME_CHARACTER_CLASSES.findIndex((characterClass) => characterClass === character?.characterClass),
    0
  );
  const classCards = GAME_CHARACTER_CLASSES.map((characterClass) => {
    const label = t(`game.classes.${characterClass}`);
    return buildClassCard({
      characterClass,
      label,
      description: t(`game.classDescriptions.${characterClass}`),
      ribbonText: label,
      baseStats: getCharacterClassBaseStats(characterClass, classDefinitions),
    });
  }) as [PlayingCardData, ...PlayingCardData[]];
  const classHand: PlayingHandData = {
    id: 'character-class-hand',
    title: t('character.chooseClass'),
    cards: classCards,
    activeCardIndex: currentClassIndex,
    mainCardIndex: currentClassIndex,
    variant: 'fan',
  };

  if (!character) {
    return (
      <GameLayout hideDashboard>
        <GameHeader currentView="character" navigationMode="mapOnly" />

        <section aria-labelledby="character-onboarding-title" className="space-y-5">
          <div className="flex items-center gap-3">
            <UserRound className="text-status-quest" size={22} aria-hidden />
            <div>
              <h2 id="character-onboarding-title" className="text-2xl font-display font-bold">
                {t('character.onboardingTitle')}
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                {t('character.onboardingDescription')}
              </p>
            </div>
          </div>

          {saveError ? (
            <div role="alert" className="alert alert-warning text-sm">
              {saveError}
            </div>
          ) : null}

          <div className="min-w-0 overflow-visible rounded-3xl border border-gaming-border bg-gaming-card/40 p-4 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold">{t('character.chooseClass')}</h3>
              <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
                {isSavingCharacterClass ? t('character.creatingCharacter') : t('character.onboardingRibbon')}
              </span>
            </div>
            <PlayingHand
              hand={classHand}
              mode="full"
              visibleCardCount={classCards.length}
              expandOnHover={false}
              onCardSelect={(card) => {
                if (card.characterClass) void saveCharacterClass(card.characterClass);
              }}
              className="mx-auto h-[30rem] min-h-0 max-w-5xl"
            />
          </div>
        </section>
      </GameLayout>
    );
  }

  return (
    <GameLayout>
      <GameHeader currentView="character" />

      <div className="space-y-8">
        <section aria-labelledby="character-title" className="space-y-5">
          <div className="flex items-center gap-3">
            <UserRound className="text-status-quest" size={22} aria-hidden />
            <div>
              <h2 id="character-title" className="text-2xl font-display font-bold">
                {t('character.title')}
              </h2>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)] xl:items-center">
            <div className="mx-auto w-full max-w-sm">
              <PlayingCard {...playerCard} size="full" presentation={{ fit: 'fillWidth' }} />
            </div>
            <div className="min-w-0 overflow-visible rounded-3xl border border-gaming-border bg-gaming-card/40 p-4 shadow-lg">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-xl font-bold">{t('character.chooseClass')}</h3>
                <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
                  {t('character.currentClassRibbon')}
                </span>
              </div>
              <PlayingHand
                hand={classHand}
                mode="full"
                visibleCardCount={classCards.length}
                expandOnHover={false}
                onCardSelect={(card) => {
                  if (card.characterClass) void saveCharacterClass(card.characterClass);
                }}
                className="mx-auto h-[30rem] min-h-0 max-w-5xl"
              />
            </div>
          </div>
        </section>
      </div>
    </GameLayout>
  );
}

function applyPlayerCardOverrides(
  card: PlayingCardData,
  override: EditablePlayerCardOverride,
  onFieldChange: (field: PlayingCardEditableField, value: string) => void,
  onStatChange: (statId: string, value: number) => void,
  onIllustrationUpload: (file: File) => Promise<string | void>
): PlayingCardData {
  const front = card.front;

  return {
    ...card,
    title: override.title ?? card.title,
    subtitle: override.subtitle ?? card.subtitle,
    illustrationUrl: override.illustrationUrl ?? card.illustrationUrl,
    editable: true,
    ribbonEditable: false,
    onFieldChange,
    onStatChange,
    front: front
      ? {
          ...front,
          title: override.title ?? front.title,
          subtitle: override.subtitle ?? front.subtitle,
          description: override.description ?? front.description,
          illustrationUrl: override.illustrationUrl ?? front.illustrationUrl,
          editable: true,
          ribbonEditable: false,
          onFieldChange,
          onIllustrationUpload,
          onStatChange,
        }
      : front,
  };
}

function buildPlayerCharacterCard({
  name,
  avatarUrl,
  characterClass,
  classLabel,
  statAllocations,
  baseStats,
  statMaxValue,
  remainingStatPoints,
  remainingStatPointsLabel,
  getStatEditableRange,
  bio,
  fallbackDescription,
}: {
  name: string;
  avatarUrl?: string;
  characterClass: GameCharacterClass;
  classLabel: string;
  statAllocations: GameStats;
  baseStats: GameStats;
  statMaxValue: number;
  remainingStatPoints: number;
  remainingStatPointsLabel: string;
  getStatEditableRange: (statId: string, currentValue: number) => { min: number; max: number };
  bio?: string;
  fallbackDescription: string;
}): PlayingCardData {
  return {
    id: 'character-page-player',
    kind: 'character',
    title: name,
    subtitle: classLabel,
    characterClass,
    illustrationUrl: avatarUrl,
    illustrationAlt: name,
    ribbonLabel: classLabel,
    front: {
      title: name,
      subtitle: classLabel,
      description: bio || fallbackDescription,
      illustrationUrl: avatarUrl,
      illustrationAlt: name,
      ribbonText: classLabel,
      ribbonEditable: false,
      statPointsRemaining: remainingStatPoints,
      statPointsRemainingLabel: remainingStatPointsLabel,
      getStatEditableRange,
      stats: GAME_STAT_FIELDS.map(({ id, label }) => ({
        id,
        label,
        value: Math.min(statMaxValue, baseStats[id] + statAllocations[id]),
        min: baseStats[id],
        max: statMaxValue,
      })),
    },
  };
}

function getCharacterClassBaseStats(
  characterClass: GameCharacterClass,
  classDefinitions: GameCharacterClassDefinition[]
): GameStats {
  return (
    classDefinitions.find((definition) => definition.slug === characterClass)?.baseStats ||
    CHARACTER_CLASS_BASE_STATS[characterClass]
  );
}

function getStatAllocationBudget(stats: GameStats) {
  return GAME_STAT_FIELDS.reduce((total, { id }) => total + Math.max(0, Math.round(stats[id])), 0);
}

function getCurrentStatAllocations(
  characterStats: GameStats,
  overrides: Record<string, number> | undefined,
  statBudget: number,
  baseStats: GameStats,
  statMaxValue: number
): GameStats {
  const allocations = GAME_STAT_FIELDS.reduce<GameStats>((current, { id }) => {
    current[id] = clampStatValue(
      Math.round(overrides?.[id] ?? characterStats[id]),
      0,
      Math.max(0, statMaxValue - baseStats[id])
    );
    return current;
  }, createEmptyGameStats());
  const spentPoints = getStatAllocationBudget(allocations);

  if (spentPoints <= statBudget) return allocations;

  let overflow = spentPoints - statBudget;
  const normalizedAllocations = { ...allocations };

  for (const { id } of [...GAME_STAT_FIELDS].reverse()) {
    if (overflow <= 0) break;
    const refundablePoints = Math.min(normalizedAllocations[id], overflow);
    normalizedAllocations[id] -= refundablePoints;
    overflow -= refundablePoints;
  }

  return normalizedAllocations;
}

function getRemainingStatPoints(statBudget: number, allocations: GameStats) {
  return Math.max(0, statBudget - getStatAllocationBudget(allocations));
}

function getGameStatKey(statId: string): GameStatKey | null {
  return GAME_STAT_FIELDS.some(({ id }) => id === statId) ? (statId as GameStatKey) : null;
}

function clampStatValue(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(Math.round(value), min), Math.max(min, max));
}

function buildClassCard({
  characterClass,
  label,
  description,
  ribbonText,
  baseStats,
}: {
  characterClass: GameCharacterClass;
  label: string;
  description: string;
  ribbonText: string;
  baseStats: GameStats;
}): PlayingCardData {
  return {
    id: `character-class-${characterClass}`,
    disableLayoutAnimation: true,
    kind: 'character',
    title: label,
    subtitle: characterClass,
    characterClass,
    ribbonLabel: ribbonText,
    front: {
      title: label,
      subtitle: characterClass,
      description,
      ribbonText,
      stats: GAME_STAT_FIELDS.map(({ id, label: statLabel }) => ({
        id,
        label: statLabel,
        value: baseStats[id],
        displayValue: formatClassStatBonus(baseStats[id]),
      })),
    },
  };
}

function formatClassStatBonus(value: number) {
  const roundedValue = Math.round(value);
  if (roundedValue <= 0) return '';
  return `+${roundedValue}`;
}

export default CharacterPage;
