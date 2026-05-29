import type { GameCharacterClass, GameStats } from '@eduquest/shared';
import type { PlayingCardStat } from '../../components/molecules/PlayingCard';

export type GameStatKey = keyof GameStats;

export const GAME_STAT_FIELDS: Array<{ id: GameStatKey; label: string }> = [
  { id: 'strength', label: 'STR' },
  { id: 'dexterity', label: 'DEX' },
  { id: 'constitution', label: 'CON' },
  { id: 'intelligence', label: 'INT' },
  { id: 'wisdom', label: 'WIS' },
  { id: 'charisma', label: 'CHA' },
];

export const CHARACTER_CLASS_BASE_STATS: Record<GameCharacterClass, GameStats> = {
  scholar: {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 2,
    wisdom: 1,
    charisma: 1,
  },
  champion: {
    strength: 2,
    dexterity: 0,
    constitution: 1,
    intelligence: 0,
    wisdom: 0,
    charisma: 1,
  },
  guide: {
    strength: 0,
    dexterity: 2,
    constitution: 0,
    intelligence: 0,
    wisdom: 1,
    charisma: 1,
  },
  specialist: {
    strength: 1,
    dexterity: 1,
    constitution: 1,
    intelligence: 1,
    wisdom: 0,
    charisma: 0,
  },
};

export function createEmptyGameStats(): GameStats {
  return {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  };
}

export function toPlayingCardStats(stats?: GameStats, max = 5): PlayingCardStat[] | undefined {
  if (!stats) return undefined;
  return GAME_STAT_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    value: stats[field.id],
    max,
  }));
}
