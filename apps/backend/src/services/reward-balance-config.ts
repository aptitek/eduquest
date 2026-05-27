import {
  DEFAULT_REWARD_POLICIES,
  type RewardBalanceConfigPayload,
  type RewardPolicy,
  type RewardPolicyId,
  type RewardSystemConfig,
} from '@eduquest/shared';
import { desc, eq } from 'drizzle-orm';
import { auditLogs, rewardBalanceConfigs } from '../db/schema';
import { RewardSystemConfigService } from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;

export interface ResolvedRewardBalanceConfig {
  version: number;
  label?: string;
  rewardSystem: RewardSystemConfig;
  policies: Record<RewardPolicyId, RewardPolicy>;
}

let cachedConfig: { loadedAt: number; value: ResolvedRewardBalanceConfig | null } = {
  loadedAt: 0,
  value: null,
};

const CACHE_TTL_MS = 30_000;

function mergePolicies(
  payload?: RewardBalanceConfigPayload
): Record<RewardPolicyId, RewardPolicy> {
  const policies = { ...DEFAULT_REWARD_POLICIES };

  if (!payload?.policyIds) {
    return policies;
  }

  for (const [policyId, override] of Object.entries(payload.policyIds) as Array<
    [RewardPolicyId, { fixedBasePoints?: number }]
  >) {
    if (policies[policyId] && override?.fixedBasePoints !== undefined) {
      policies[policyId] = {
        ...policies[policyId],
        fixedBasePoints: override.fixedBasePoints,
      };
    }
  }

  return policies;
}

function resolveFromRow(
  row: typeof rewardBalanceConfigs.$inferSelect
): ResolvedRewardBalanceConfig {
  const payload = row.config as RewardBalanceConfigPayload;
  const rewardSystem = RewardSystemConfigService.resolve(payload.rewardSystem);

  return {
    version: row.version,
    label: row.label || undefined,
    rewardSystem,
    policies: mergePolicies(payload),
  };
}

export class RewardBalanceConfigService {
  static async getActiveConfig(db?: RewardDb): Promise<ResolvedRewardBalanceConfig> {
    const now = Date.now();
    if (cachedConfig.value && now - cachedConfig.loadedAt < CACHE_TTL_MS) {
      return cachedConfig.value;
    }

    if (!db) {
      const fallback: ResolvedRewardBalanceConfig = {
        version: 0,
        rewardSystem: RewardSystemConfigService.resolve(),
        policies: { ...DEFAULT_REWARD_POLICIES },
      };
      cachedConfig = { loadedAt: now, value: fallback };
      return fallback;
    }

    const [activeRow] = await db
      .select()
      .from(rewardBalanceConfigs)
      .where(eq(rewardBalanceConfigs.isActive, true))
      .limit(1);

    const resolved = activeRow
      ? resolveFromRow(activeRow)
      : {
          version: 0,
          rewardSystem: RewardSystemConfigService.resolve(),
          policies: { ...DEFAULT_REWARD_POLICIES },
        };

    cachedConfig = { loadedAt: now, value: resolved };
    return resolved;
  }

  static clearCache(): void {
    cachedConfig = { loadedAt: 0, value: null };
  }

  static async listVersions(db: RewardDb) {
    return db
      .select()
      .from(rewardBalanceConfigs)
      .orderBy(desc(rewardBalanceConfigs.version));
  }

  static async publish(
    db: RewardDb,
    payload: RewardBalanceConfigPayload,
    adminUserId: string
  ) {
    const [latest] = await db
      .select({ version: rewardBalanceConfigs.version })
      .from(rewardBalanceConfigs)
      .orderBy(desc(rewardBalanceConfigs.version))
      .limit(1);

    const nextVersion = (latest?.version || 0) + 1;

    return db.transaction(async (tx) => {
      const [previousActive] = await tx
        .select()
        .from(rewardBalanceConfigs)
        .where(eq(rewardBalanceConfigs.isActive, true))
        .limit(1);

      if (previousActive) {
        await tx
          .update(rewardBalanceConfigs)
          .set({ isActive: false })
          .where(eq(rewardBalanceConfigs.id, previousActive.id));
      }

      const [created] = await tx
        .insert(rewardBalanceConfigs)
        .values({
          version: nextVersion,
          label: payload.label || `Version ${nextVersion}`,
          config: payload,
          isActive: true,
          createdBy: adminUserId,
        })
        .returning();

      await tx.insert(auditLogs).values({
        tableName: 'reward_balance_configs',
        recordId: created.id,
        action: 'INSERT',
        oldData: previousActive?.config || null,
        newData: payload,
        userId: adminUserId,
      });

      RewardBalanceConfigService.clearCache();
      return created;
    });
  }
}
