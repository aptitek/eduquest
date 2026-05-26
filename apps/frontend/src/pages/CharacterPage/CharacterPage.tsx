import { useState } from 'react';
import {
  GAME_CHARACTER_CLASSES,
  type GameCharacter,
  type GameCharacterClass,
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
import { useTranslation } from '../../hooks/useTranslation';
import { formatUserDisplayName } from '../../utils/displayName';

type EditablePlayerCardOverride = Partial<Record<PlayingCardEditableField, string>> & {
  stats?: Record<string, number>;
};

export function CharacterPage() {
  const { t } = useTranslation();
  const { user, character, setCharacterClass } = useGameStore();
  const [playerCardOverride, setPlayerCardOverride] = useState<EditablePlayerCardOverride>({});

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
  const updatePlayerCardField = (field: PlayingCardEditableField, value: string) => {
    if (field === 'ribbonText') return;
    setPlayerCardOverride((current) => ({
      ...current,
      [field]: value,
    }));
  };
  const updatePlayerCardStat = (statId: string, value: number) => {
    setPlayerCardOverride((current) => ({
      ...current,
      stats: {
        ...current.stats,
        [statId]: value,
      },
    }));
  };
  const playerCard = applyPlayerCardOverrides(
    buildPlayerCharacterCard({
      name: playerName,
      avatarUrl,
      characterClass: character.characterClass,
      classLabel: currentClassLabel,
      level: character.currentLevel,
      stats: character.stats,
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

      <div className="space-y-8 pb-8 pt-4">
        <section aria-labelledby="character-title" className="space-y-5">
          <div className="flex items-center gap-3">
            <UserRound className="text-status-quest" size={22} aria-hidden />
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
                {t('character.eyebrow')}
              </p>
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
          stats: front.stats?.map((stat) => ({
            ...stat,
            value: override.stats?.[stat.id] ?? stat.value,
          })),
        }
      : front,
  };
}

function buildPlayerCharacterCard({
  name,
  avatarUrl,
  characterClass,
  classLabel,
  level,
  stats,
  bio,
  fallbackDescription,
}: {
  name: string;
  avatarUrl?: string;
  characterClass: GameCharacterClass;
  classLabel: string;
  level: number;
  stats: GameCharacter['stats'];
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
      subtitle: `${classLabel} · ${level}`,
      description: bio || fallbackDescription,
      illustrationUrl: avatarUrl,
      illustrationAlt: name,
      ribbonText: classLabel,
      ribbonEditable: false,
      stats: [
        { id: 'str', label: 'STR', value: stats.str ?? stats.force ?? 0 },
        { id: 'dex', label: 'DEX', value: stats.dex ?? stats.dexterity ?? 0 },
        { id: 'int', label: 'INT', value: stats.int ?? stats.intelligence ?? 0 },
        { id: 'cha', label: 'CHA', value: stats.cha ?? stats.charisma ?? 0 },
        { id: 'xp', label: 'XP', value: Math.min(level * 8, 100) },
      ],
    },
  };
}

function buildClassCard({
  characterClass,
  label,
  description,
  ribbonText,
}: {
  characterClass: GameCharacterClass;
  label: string;
  description: string;
  ribbonText: string;
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
      stats: getClassStats(characterClass),
    },
  };
}

function getClassStats(characterClass: GameCharacterClass) {
  const stats: Record<GameCharacterClass, PlayingCardData['stats']> = {
    scholar: [
      { id: 'logic', label: 'Logic', value: 88 },
      { id: 'focus', label: 'Focus', value: 80 },
      { id: 'team', label: 'Team', value: 62 },
      { id: 'speed', label: 'Speed', value: 58 },
    ],
    champion: [
      { id: 'logic', label: 'Logic', value: 68 },
      { id: 'focus', label: 'Focus', value: 76 },
      { id: 'team', label: 'Team', value: 82 },
      { id: 'speed', label: 'Speed', value: 74 },
    ],
    guide: [
      { id: 'logic', label: 'Logic', value: 64 },
      { id: 'focus', label: 'Focus', value: 72 },
      { id: 'team', label: 'Team', value: 92 },
      { id: 'speed', label: 'Speed', value: 66 },
    ],
    specialist: [
      { id: 'logic', label: 'Logic', value: 82 },
      { id: 'focus', label: 'Focus', value: 68 },
      { id: 'team', label: 'Team', value: 58 },
      { id: 'speed', label: 'Speed', value: 86 },
    ],
  };

  return stats[characterClass];
}

export default CharacterPage;
