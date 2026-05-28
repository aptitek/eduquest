import type { RewardModifier, RewardSystemConfig, VoteSpendBreakdown } from '@eduquest/shared';
import type { GuildStatProfile } from './guild-stat-calculator';

export interface SpendBreakdownInput {
  votes: number;
  guildProfile: GuildStatProfile;
  config: RewardSystemConfig;
  guildId: string;
  studentId?: string;
  alreadyPurchasedVotes?: number;
  balanceConfigVersion?: number;
}

export class SpendBreakdownBuilder {
  static build(input: SpendBreakdownInput): VoteSpendBreakdown {
    const { votes, guildProfile, config } = input;

    if (!Number.isFinite(votes)) {
      throw new Error('Expected votes to be a finite number.');
    }

    if (!Number.isInteger(votes) || votes < 0) {
      throw new Error('votes must be a positive integer or zero.');
    }

    const modifiers: RewardModifier[] = [];
    const alreadyPurchasedVotes = Math.max(0, input.alreadyPurchasedVotes || 0);
    const baseCost =
      config.voting.baseVoteCost *
      (Math.pow(alreadyPurchasedVotes + votes, config.voting.quadraticExponent) -
        Math.pow(alreadyPurchasedVotes, config.voting.quadraticExponent));

    modifiers.push({
      id: 'vote_base',
      kind: 'base',
      labelI18nKey: 'rewards.spend.base',
      effect: baseCost,
      detail: { votes, alreadyPurchasedVotes },
    });

    const chaEffective = guildProfile.stats.charisma.effective;
    const discountFactor = Math.max(
      config.voting.minimumDiscountFactor,
      1 - config.voting.charismaDiscountMultiplier * chaEffective
    );
    const finalCost = Math.ceil(baseCost * discountFactor);
    const discountEffect = finalCost - baseCost;

    if (discountEffect !== 0) {
      modifiers.push({
        id: 'charisma_discount',
        kind: 'charisma_discount',
        labelI18nKey: 'rewards.spend.charismaDiscount',
        effect: discountEffect,
        multiplier: discountFactor,
        detail: {
          effective: chaEffective,
          rawSum: guildProfile.stats.charisma.rawSum,
          cappedSum: guildProfile.stats.charisma.cappedSum,
        },
      });
    }

    return {
      votes,
      baseCost,
      subtotal: baseCost,
      modifiers,
      finalCost,
      guildId: input.guildId,
      studentId: input.studentId,
      balanceConfigVersion: input.balanceConfigVersion,
    };
  }
}
