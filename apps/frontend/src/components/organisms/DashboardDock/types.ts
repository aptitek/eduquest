import type { Guild } from '@eduquest/shared';

export type DockGuild = Pick<Guild, 'id' | 'name' | 'color' | 'iconUrl' | 'totalPoints'>;
