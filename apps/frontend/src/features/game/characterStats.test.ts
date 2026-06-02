import { describe, expect, it } from 'vitest';
import { computeEffectiveCharacterStats } from './characterStats';

describe('computeEffectiveCharacterStats', () => {
  it('adds class base stats to manual character allocations', () => {
    expect(
      computeEffectiveCharacterStats('guide', {
        strength: 1,
        dexterity: 2,
        constitution: 0,
        intelligence: 1,
        wisdom: 0,
        charisma: 1,
      })
    ).toEqual({
      strength: 1,
      dexterity: 4,
      constitution: 0,
      intelligence: 1,
      wisdom: 1,
      charisma: 2,
    });
  });

  it('caps effective stats at the level one maximum', () => {
    expect(
      computeEffectiveCharacterStats('scholar', {
        strength: 0,
        dexterity: 0,
        constitution: 0,
        intelligence: 5,
        wisdom: 5,
        charisma: 5,
      })
    ).toMatchObject({
      intelligence: 5,
      wisdom: 5,
      charisma: 5,
    });
  });
});
