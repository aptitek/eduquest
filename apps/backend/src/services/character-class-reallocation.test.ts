import { describe, expect, it } from 'vitest';
import { normalizeBaseStats, repairManualAllocation } from './character-class-reallocation';

describe('character class reallocation', () => {
  it('rejects base stats outside the first-level cap', () => {
    expect(
      normalizeBaseStats({
        strength: 6,
        dexterity: 0,
        constitution: 0,
        intelligence: 0,
        wisdom: 0,
        charisma: 0,
      })
    ).toBeUndefined();
  });

  it('refunds manual allocation that would exceed the class base cap', () => {
    const repair = repairManualAllocation(
      {
        strength: 4,
        dexterity: 1,
        constitution: 3,
        intelligence: 0,
        wisdom: 2,
        charisma: 5,
      },
      {
        strength: 3,
        dexterity: 1,
        constitution: 2,
        intelligence: 0,
        wisdom: 4,
        charisma: 5,
      }
    );

    expect(repair.changed).toBe(true);
    expect(repair.refundedPoints).toBe(9);
    expect(repair.nextManual).toEqual({
      strength: 2,
      dexterity: 1,
      constitution: 3,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    });
  });
});
