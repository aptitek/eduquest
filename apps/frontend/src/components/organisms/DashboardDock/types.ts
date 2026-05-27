import type { GameCharacterClass, GameStats, Guild } from '@eduquest/shared';

export type DockGuildMember = {
  id: string;
  displayName: string;
  email?: string;
  institutionalEmail?: string;
  avatarUrl?: string;
  characterClass?: GameCharacterClass;
  stats?: GameStats;
};

export type DockGuild = Pick<Guild, 'id' | 'name' | 'description' | 'color' | 'iconUrl' | 'iconKey' | 'gold'> & {
  members?: DockGuildMember[];
};
