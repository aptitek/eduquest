import { describe, expect, it } from 'vitest';
import { DEFAULT_REWARD_SYSTEM_CONFIG } from '@eduquest/shared';
import { CharacterStatCalculator } from './character-stat-calculator';
import { GuildStatCalculator } from './guild-stat-calculator';
import { SpendBreakdownBuilder } from './spend-breakdown';

const config = DEFAULT_REWARD_SYSTEM_CONFIG;

function buildGuildProfile(charismaEffectiveMultiplier = 1) {
  const members = {
    'student-1': CharacterStatCalculator.compute(
      {
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        charisma: 2,
      },
      {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: charismaEffectiveMultiplier > 1 ? 3 : 0,
      },
      config
    ),
  };

  return GuildStatCalculator.compute('guild-1', members, config);
}

describe('SpendBreakdownBuilder', () => {
  it('returns configurable quadratic vote cost without charisma discount for low charisma', () => {
    const guildProfile = buildGuildProfile(0);
    const noDiscountConfig = {
      ...config,
      voting: {
        ...config.voting,
        charismaDiscountMultiplier: 0,
      },
    };
    const breakdown = SpendBreakdownBuilder.build({
      votes: 5,
      guildProfile,
      config: noDiscountConfig,
      guildId: 'guild-1',
    });

    expect(breakdown.baseCost).toBe(25);
    expect(breakdown.finalCost).toBe(25);
    expect(breakdown.modifiers).toHaveLength(1);
  });

  it('applies guild effective charisma discount', () => {
    const guildProfile = buildGuildProfile(1);
    const breakdown = SpendBreakdownBuilder.build({
      votes: 10,
      guildProfile,
      config,
      guildId: 'guild-1',
    });

    expect(breakdown.baseCost).toBe(100);
    expect(breakdown.finalCost).toBeLessThan(100);
    expect(breakdown.modifiers.map((modifier) => modifier.kind)).toEqual(
      expect.arrayContaining(['base', 'charisma_discount'])
    );
  });

  it('charges only the quadratic delta for additional boosts', () => {
    const guildProfile = buildGuildProfile(0);
    const noDiscountConfig = {
      ...config,
      voting: {
        ...config.voting,
        charismaDiscountMultiplier: 0,
      },
    };
    const breakdown = SpendBreakdownBuilder.build({
      votes: 1,
      alreadyPurchasedVotes: 2,
      guildProfile,
      config: noDiscountConfig,
      guildId: 'guild-1',
    });

    expect(breakdown.baseCost).toBe(5);
    expect(breakdown.finalCost).toBe(5);
  });

  it('charges the base cost when no RPG character stats are available', () => {
    const guildProfile = GuildStatCalculator.compute('guild-1', {}, config);
    const breakdown = SpendBreakdownBuilder.build({
      votes: 3,
      guildProfile,
      config,
      guildId: 'guild-1',
    });

    expect(breakdown.baseCost).toBe(9);
    expect(breakdown.finalCost).toBe(9);
    expect(breakdown.modifiers.map((modifier) => modifier.kind)).toEqual(['base']);
  });

  it('does not penalize oversized guild profiles when computing vote discounts', () => {
    const members = Object.fromEntries(
      Array.from({ length: 4 }, (_, index) => [
        `student-${index + 1}`,
        CharacterStatCalculator.compute(
          {
            strength: 1,
            dexterity: 1,
            constitution: 1,
            intelligence: 1,
            wisdom: 1,
            charisma: 1,
          },
          {
            strength: 0,
            dexterity: 0,
            constitution: 0,
            intelligence: 0,
            wisdom: 0,
            charisma: 0,
          },
          config
        ),
      ])
    );
    const guildProfile = GuildStatCalculator.compute('guild-1', members, config);

    expect(guildProfile.sizeModifier).toBe(1);
  });
});
