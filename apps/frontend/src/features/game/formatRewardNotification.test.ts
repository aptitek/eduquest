import { describe, expect, it } from 'vitest';
import type { RewardNotificationContext } from '@eduquest/shared';
import {
  formatRewardNotificationDescription,
  formatRewardNotificationTitle,
} from './formatRewardNotification';

const translations: Record<string, string> = {
  'rewards.notification.description': 'Base {basePoints} → {finalAmount} gold.',
  'rewards.breakdownLine': '{label}: {signedEffect}',
  'rewards.modifiers.intelligence': 'Intelligence bonus',
  'rewards.modifiers.charismaPassive': 'Charisma passive',
};

const t = (key: string) => translations[key] || key;

describe('formatRewardNotification', () => {
  const context: RewardNotificationContext = {
    type: 'reward',
    breakdown: {
      basePoints: 100,
      subtotal: 150,
      finalAmount: 162,
      guildId: 'guild-1',
      trigger: 'activity.completed',
      modifiers: [
        {
          id: 'base',
          kind: 'base',
          labelI18nKey: 'rewards.modifiers.base',
          effect: 100,
        },
        {
          id: 'guild_stats',
          kind: 'attribute',
          labelI18nKey: 'rewards.modifiers.intelligence',
          effect: 50,
        },
        {
          id: 'charisma_passive',
          kind: 'charisma_passive',
          labelI18nKey: 'rewards.modifiers.charismaPassive',
          effect: 12,
        },
      ],
    },
  };

  it('formats the title with the final amount', () => {
    expect(formatRewardNotificationTitle(context, t)).toBe('rewards.notification.title');
  });

  it('includes modifier lines in the description', () => {
    const description = formatRewardNotificationDescription(context, t);
    expect(description).toContain('Base 100 → 162 gold.');
    expect(description).toContain('Intelligence bonus: +50');
    expect(description).toContain('Charisma passive: +12');
  });
});
