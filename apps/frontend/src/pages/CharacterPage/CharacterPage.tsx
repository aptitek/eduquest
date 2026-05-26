import { GAME_CHARACTER_CLASSES, type GameCharacterClass } from '@eduquest/shared';
import { Sparkles, UserRound } from 'lucide-react';
import { GameHeader } from '../../components/organisms/GameHeader';
import { GameLayout } from '../../components/templates/GameLayout';
import { PlayingCard, type PlayingCardData } from '../../components/molecules/PlayingCard';
import { ResponsiveCardGrid } from '../../components/molecules/ResponsiveCardGrid';
import { useGameStore } from '../../features/game/gameStore';
import { useTranslation } from '../../hooks/useTranslation';
import { formatUserDisplayName } from '../../utils/displayName';

export function CharacterPage() {
  const { t } = useTranslation();
  const { user, character, setCharacterClass } = useGameStore();

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
  const playerCard = buildPlayerCharacterCard({
    name: playerName,
    avatarUrl,
    characterClass: character.characterClass,
    classLabel: currentClassLabel,
    level: character.currentLevel,
    bio: user.bio,
  });
  const currentClassCard = buildClassCard({
    characterClass: character.characterClass,
    label: currentClassLabel,
    description: t(`game.classDescriptions.${character.characterClass}`),
    ribbonText: t('character.currentClassRibbon'),
  });
  const selectableClasses = GAME_CHARACTER_CLASSES.filter(
    (characterClass) => characterClass !== character.characterClass
  );

  return (
    <GameLayout>
      <GameHeader currentView="character" />

      <main className="space-y-8 pb-8 pt-4">
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

          <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
            <div className="mx-auto w-full max-w-sm">
              <PlayingCard {...playerCard} size="full" className="w-full" />
            </div>
            <div className="mx-auto w-full max-w-sm">
              <PlayingCard {...currentClassCard} size="full" className="w-full" />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4" role="separator" aria-hidden>
          <div className="h-px flex-1 bg-gaming-border" />
          <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-text-muted">
            {t('character.chooseClass')}
          </span>
          <div className="h-px flex-1 bg-gaming-border" />
        </div>

        <section aria-labelledby="character-class-grid-title" className="space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-status-campfire" size={22} aria-hidden />
            <h3 id="character-class-grid-title" className="text-xl font-bold">
              {t('character.otherClasses')}
            </h3>
          </div>
          <ResponsiveCardGrid
            items={selectableClasses}
            getKey={(characterClass) => characterClass}
            renderItem={(characterClass) => {
              const label = t(`game.classes.${characterClass}`);
              return (
                <PlayingCard
                  {...buildClassCard({
                    characterClass,
                    label,
                    description: t(`game.classDescriptions.${characterClass}`),
                    ribbonText: label,
                  })}
                  size="full"
                  className="w-full"
                  onClick={() => setCharacterClass(characterClass)}
                />
              );
            }}
          />
        </section>
      </main>
    </GameLayout>
  );
}

function buildPlayerCharacterCard({
  name,
  avatarUrl,
  characterClass,
  classLabel,
  level,
  bio,
}: {
  name: string;
  avatarUrl?: string;
  characterClass: GameCharacterClass;
  classLabel: string;
  level: number;
  bio?: string;
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
      description: bio || 'Your active adventurer card. Change class below to update its role.',
      illustrationUrl: avatarUrl,
      illustrationAlt: name,
      ribbonText: classLabel,
      stats: [
        { id: 'str', label: 'STR', value: 62 },
        { id: 'dex', label: 'DEX', value: 68 },
        { id: 'int', label: 'INT', value: 78 },
        { id: 'cha', label: 'CHA', value: 72 },
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
