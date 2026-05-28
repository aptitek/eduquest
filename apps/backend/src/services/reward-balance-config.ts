import {
  DEFAULT_REWARD_POLICIES,
  type RewardBalanceConfigPayload,
  type RewardPolicy,
  type RewardPolicyId,
  type RewardSystemConfig,
} from '@eduquest/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { auditLogs, rewardBalanceConfigs } from '../db/schema';
import { RewardSystemConfigService } from './rewards';

type RewardDb = ReturnType<typeof import('../db').getDb>;

export interface ResolvedRewardBalanceConfig {
  version: number;
  label?: string;
  cohortId?: string;
  rewardSystem: RewardSystemConfig;
  policies: Record<RewardPolicyId, RewardPolicy>;
}

const cachedConfigs = new Map<string, { loadedAt: number; value: ResolvedRewardBalanceConfig }>();

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
    cohortId: row.cohortId || undefined,
    rewardSystem,
    policies: mergePolicies(payload),
  };
}

export class RewardBalanceConfigService {
  static async getActiveConfig(db?: RewardDb, cohortId?: string): Promise<ResolvedRewardBalanceConfig> {
    const now = Date.now();
    const cacheKey = cohortId || '__global__';
    const cachedConfig = cachedConfigs.get(cacheKey);
    if (cachedConfig && now - cachedConfig.loadedAt < CACHE_TTL_MS) {
      return cachedConfig.value;
    }

    if (!db) {
      const fallback: ResolvedRewardBalanceConfig = {
        version: 0,
        rewardSystem: RewardSystemConfigService.resolve(),
        policies: { ...DEFAULT_REWARD_POLICIES },
      };
      cachedConfigs.set(cacheKey, { loadedAt: now, value: fallback });
      return fallback;
    }

    const [cohortActiveRow] = cohortId
      ? await db
          .select()
          .from(rewardBalanceConfigs)
          .where(and(eq(rewardBalanceConfigs.isActive, true), eq(rewardBalanceConfigs.cohortId, cohortId)))
          .limit(1)
      : [];

    const [globalActiveRow] = cohortActiveRow
      ? []
      : await db
          .select()
          .from(rewardBalanceConfigs)
          .where(and(eq(rewardBalanceConfigs.isActive, true), isNull(rewardBalanceConfigs.cohortId)))
          .limit(1);

    const activeRow = cohortActiveRow || globalActiveRow;
    const resolved = activeRow
      ? resolveFromRow(activeRow)
      : {
          version: 0,
          cohortId,
          rewardSystem: RewardSystemConfigService.resolve(),
          policies: { ...DEFAULT_REWARD_POLICIES },
        };

    cachedConfigs.set(cacheKey, { loadedAt: now, value: resolved });
    return resolved;
  }

  static clearCache(): void {
    cachedConfigs.clear();
  }

  static async listVersions(db: RewardDb, cohortId?: string) {
    return db
      .select()
      .from(rewardBalanceConfigs)
      .where(cohortId ? eq(rewardBalanceConfigs.cohortId, cohortId) : isNull(rewardBalanceConfigs.cohortId))
      .orderBy(desc(rewardBalanceConfigs.version));
  }

  static async publish(
    db: RewardDb,
    payload: RewardBalanceConfigPayload,
    adminUserId: string,
    cohortId?: string
  ) {
    const [latest] = await db
      .select({ version: rewardBalanceConfigs.version })
      .from(rewardBalanceConfigs)
      .where(cohortId ? eq(rewardBalanceConfigs.cohortId, cohortId) : isNull(rewardBalanceConfigs.cohortId))
      .orderBy(desc(rewardBalanceConfigs.version))
      .limit(1);

    const nextVersion = (latest?.version || 0) + 1;

    return db.transaction(async (tx) => {
      const [previousActive] = await tx
        .select()
        .from(rewardBalanceConfigs)
        .where(
          and(
            eq(rewardBalanceConfigs.isActive, true),
            cohortId ? eq(rewardBalanceConfigs.cohortId, cohortId) : isNull(rewardBalanceConfigs.cohortId)
          )
        )
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
          cohortId,
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
