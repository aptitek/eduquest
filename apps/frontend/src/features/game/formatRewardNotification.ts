import type { RewardComputationBreakdown, RewardNotificationContext } from '@eduquest/shared';

type TranslateFn = (key: string) => string;

function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((result, [key, value]) => {
    return result.split(`{${key}}`).join(String(value));
  }, template);
}

function formatSignedEffect(effect: number): string {
  if (effect > 0) return `+${effect}`;
  if (effect < 0) return `${effect}`;
  return '0';
}

export function formatRewardNotificationTitle(
  context: RewardNotificationContext,
  t: TranslateFn
): string {
  return interpolate(t('rewards.notification.title'), {
    amount: context.breakdown.finalAmount,
  });
}

export function formatRewardNotificationDescription(
  context: RewardNotificationContext,
  t: TranslateFn
): string {
  const { breakdown } = context;
  const summary = interpolate(t('rewards.notification.description'), {
    basePoints: breakdown.basePoints,
    finalAmount: breakdown.finalAmount,
  });

  const modifierLines = breakdown.modifiers
    .filter((modifier) => modifier.id !== 'base')
    .map((modifier) =>
      interpolate(t('rewards.breakdownLine'), {
        label: t(modifier.labelI18nKey),
        signedEffect: formatSignedEffect(modifier.effect),
      })
    );

  if (modifierLines.length === 0) {
    return summary;
  }

  return `${summary} ${modifierLines.join(' · ')}`;
}

export function formatRewardBreakdownSummary(
  breakdown: RewardComputationBreakdown,
  t: TranslateFn
): string {
  return breakdown.modifiers
    .map((modifier) =>
      interpolate(t('rewards.breakdownLine'), {
        label: t(modifier.labelI18nKey),
        signedEffect: formatSignedEffect(modifier.effect),
      })
    )
    .join(' · ');
}
