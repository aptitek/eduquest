import type { Guild } from '@eduquest/shared';

export type DockGuild = Pick<Guild, 'name' | 'color' | 'iconUrl' | 'totalPoints'>;
