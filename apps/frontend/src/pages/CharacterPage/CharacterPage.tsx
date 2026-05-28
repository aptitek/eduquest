import { useEffect, useState } from 'react';
import {
  GAME_CHARACTER_CLASSES,
  type GameCharacterClass,
  type GameCharacterClassDefinition,
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
import { useTranslation } from '../../hooks/useTranslation';
import { formatUserDisplayName } from '../../utils/displayName';
import { useErrorReporter } from '../../features/errors/notifications';

type EditablePlayerCardOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};

type GameStatKey = keyof GameStats;

const STAT_FIELDS: Array<{ id: GameStatKey; label: string }> = [
  { id: 'strength', label: 'STR' },
  { id: 'dexterity', label: 'DEX' },
  { id: 'constitution', label: 'CON' },
  { id: 'intelligence', label: 'INT' },
  { id: 'wisdom', label: 'WIS' },
  { id: 'charisma', label: 'CHA' },
];

const CHARACTER_CLASS_BASE_STATS: Record<GameCharacterClass, GameStats> = {
  scholar: {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 3,
    wisdom: 1,
    charisma: 0,
  },
  champion: {
    strength: 3,
    dexterity: 0,
    constitution: 2,
    intelligence: 0,
    wisdom: 0,
    charisma: 1,
  },
  guide: {
    strength: 0,
    dexterity: 3,
    constitution: 0,
    intelligence: 0,
    wisdom: 2,
    charisma: 1,
  },
  specialist: {
    strength: 1,
    dexterity: 1,
    constitution: 0,
    intelligence: 2,
    wisdom: 0,
    charisma: 0,
  },
};

export function CharacterPage() {
  const { t } = useTranslation();
  const reportError = useErrorReporter();
  const { user, character, setCharacterClass } = useGameStore();
  const [playerCardOverride, setPlayerCardOverride] = useState<EditablePlayerCardOverride>({});
  const [classDefinitions, setClassDefinitions] = useState<GameCharacterClassDefinition[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetchCharacterClasses()
      .then((definitions) => {
        if (isMounted) setClassDefinitions(definitions);
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
  }, []);

  if (!user || !character) {
    return (
      <div className="flex min-h-screen items-center justify-center font-display text-text-muted">
        {t('layout.loadingSession')}
      </div>
    );
  }

  const playerName = formatUserDisplayName(user);
  const avatarUrl = user.avatarUrl || user.githubAvatarUrl;
  const currentClassLabel = t(`game.classes.${character.characterClass}`);
  const baseStats = getCharacterClassBaseStats(character.characterClass, classDefinitions);
  const statBudget = getStatAllocationBudget(character.stats);
  const statAllocations = getCurrentStatAllocations(character.stats, playerCardOverride.stats, statBudget);
  const remainingStatPoints = getRemainingStatPoints(statBudget, statAllocations);
  const updatePlayerCardField = (field: PlayingCardEditableField, value: string) => {
    if (field === 'ribbonText') return;
    setPlayerCardOverride((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const updatePlayerCardStat = (statId: string, value: number) => {
    const statKey = getGameStatKey(statId);
    if (!statKey) return;

    setPlayerCardOverride((current) => {
      const currentAllocations = getCurrentStatAllocations(character.stats, current.stats, statBudget);
      const currentRemainingPoints = getRemainingStatPoints(statBudget, currentAllocations);
      const nextAllocation = clampStatValue(
        value - baseStats[statKey],
        0,
        currentAllocations[statKey] + currentRemainingPoints
      );

      return {
        ...current,
        stats: {
          ...current.stats,
          [statKey]: nextAllocation,
        },
      };
    });
  };
  const getPlayerCardStatRange = (statId: string, currentValue: number) => {
    const statKey = getGameStatKey(statId);
    if (!statKey) return { min: 0, max: currentValue };

    const baseValue = baseStats[statKey];
    const currentAllocation = Math.max(0, Math.round(currentValue - baseValue));

    return {
      min: baseValue,
      max: baseValue + currentAllocation + remainingStatPoints,
    };
  };
  const playerCard = applyPlayerCardOverrides(
    buildPlayerCharacterCard({
      name: playerName,
      avatarUrl,
      characterClass: character.characterClass,
      classLabel: currentClassLabel,
      statAllocations,
      baseStats,
      statBudget,
      remainingStatPoints,
      remainingStatPointsLabel: t('character.pointsRemainingShort'),
      getStatEditableRange: getPlayerCardStatRange,
      bio: user.bio,
      fallbackDescription: t('character.activeCardDescription'),
    }),
    playerCardOverride,
    updatePlayerCardField,
    updatePlayerCardStat
  );
  const currentClassIndex = Math.max(
    GAME_CHARACTER_CLASSES.findIndex((characterClass) => characterClass === character.characterClass),
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
              <PlayingCard {...playerCard} size="full" className="w-full" />
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
                  if (card.characterClass) setCharacterClass(card.characterClass);
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
  onStatChange: (statId: string, value: number) => void
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
  statBudget,
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
  statBudget: number;
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
      stats: STAT_FIELDS.map(({ id, label }) => ({
        id,
        label,
        value: baseStats[id] + statAllocations[id],
        min: baseStats[id],
        max: baseStats[id] + statBudget,
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
  return STAT_FIELDS.reduce((total, { id }) => total + Math.max(0, Math.round(stats[id])), 0);
}

function getCurrentStatAllocations(
  characterStats: GameStats,
  overrides: Record<string, number> | undefined,
  statBudget: number
): GameStats {
  const allocations = STAT_FIELDS.reduce<GameStats>((current, { id }) => {
    current[id] = Math.max(0, Math.round(overrides?.[id] ?? characterStats[id]));
    return current;
  }, createEmptyStats());
  const spentPoints = getStatAllocationBudget(allocations);

  if (spentPoints <= statBudget) return allocations;

  let overflow = spentPoints - statBudget;
  const normalizedAllocations = { ...allocations };

  for (const { id } of [...STAT_FIELDS].reverse()) {
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
  return STAT_FIELDS.some(({ id }) => id === statId) ? (statId as GameStatKey) : null;
}

function createEmptyStats(): GameStats {
  return {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  };
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
      stats: STAT_FIELDS.map(({ id, label: statLabel }) => ({
        id,
        label: statLabel,
        value: baseStats[id],
      })),
    },
  };
}

export default CharacterPage;
