import type { GuildStatProfile } from './guild-stat-calculator';
import type { ResolvedRewardBalanceConfig } from './reward-balance-config';
import { RewardContextResolver, type GuildProfileLoadOptions } from './reward-context-resolver';

type RewardDb = ReturnType<typeof import('../db').getDb>;

export async function loadGuildStatProfile(
  db: RewardDb,
  guildId: string,
  balanceConfig: ResolvedRewardBalanceConfig,
  options?: GuildProfileLoadOptions
): Promise<GuildStatProfile> {
  const resolver = new RewardContextResolver(db, balanceConfig);
  return resolver.loadGuildProfile(guildId, options);
}
