import type { GameCharacterClass, GameStats, Guild } from '@eduquest/shared';

export type DockGuildMember = {
  id: string;
  displayName: string;
  email?: string;
  bio?: string;
  institutionalEmail?: string;
  avatarUrl?: string;
  characterIllustrationUrl?: string;
  characterTitle?: string;
  characterClass?: GameCharacterClass;
  stats?: GameStats;
};

export type DockGuild = Pick<
  Guild,
  'id' | 'name' | 'description' | 'color' | 'iconUrl' | 'iconKey' | 'gold' | 'boostPointsSpent' | 'stats'
> & {
  members?: DockGuildMember[];
};
