export const UI_COLOR_TOKENS = {
  scholar: 'var(--color-accent-scholar)',
  champion: 'var(--color-accent-champion)',
  guide: 'var(--color-accent-guide)',
  specialist: 'var(--color-accent-specialist)',
  quest: 'var(--color-status-quest)',
  campfire: 'var(--color-status-campfire)',
  completed: 'var(--color-status-completed)',
  boss: 'var(--color-status-boss)',
  danger: 'var(--color-status-danger)',
  neutral: 'var(--color-accent-neutral)',
} as const;

export type UiColorTokenName = keyof typeof UI_COLOR_TOKENS;

export const DEFAULT_UI_COLOR_TOKEN: UiColorTokenName = 'quest';

export const COLOR_BACKGROUND_CLASSES: Record<string, string> = {
  [UI_COLOR_TOKENS.scholar]: 'bg-accent-scholar',
  [UI_COLOR_TOKENS.champion]: 'bg-accent-champion',
  [UI_COLOR_TOKENS.guide]: 'bg-accent-guide',
  [UI_COLOR_TOKENS.specialist]: 'bg-accent-specialist',
  [UI_COLOR_TOKENS.quest]: 'bg-status-quest',
  [UI_COLOR_TOKENS.campfire]: 'bg-status-campfire',
  [UI_COLOR_TOKENS.completed]: 'bg-status-completed',
  [UI_COLOR_TOKENS.boss]: 'bg-status-boss',
  [UI_COLOR_TOKENS.danger]: 'bg-status-danger',
  [UI_COLOR_TOKENS.neutral]: 'bg-accent-neutral',
  'var(--color-solarized-yellow)': 'bg-solarized-yellow',
  'var(--color-solarized-orange)': 'bg-solarized-orange',
  'var(--color-solarized-red)': 'bg-solarized-red',
  'var(--color-solarized-magenta)': 'bg-solarized-magenta',
  'var(--color-solarized-violet)': 'bg-solarized-violet',
  'var(--color-solarized-blue)': 'bg-solarized-blue',
  'var(--color-solarized-cyan)': 'bg-solarized-cyan',
  'var(--color-solarized-green)': 'bg-solarized-green',
  'var(--color-solarized-base0)': 'bg-solarized-base0',
};

export const COLOR_BORDER_CLASSES: Record<string, string> = {
  [UI_COLOR_TOKENS.scholar]: 'border-accent-scholar',
  [UI_COLOR_TOKENS.champion]: 'border-accent-champion',
  [UI_COLOR_TOKENS.guide]: 'border-accent-guide',
  [UI_COLOR_TOKENS.specialist]: 'border-accent-specialist',
  [UI_COLOR_TOKENS.quest]: 'border-status-quest',
  [UI_COLOR_TOKENS.campfire]: 'border-status-campfire',
  [UI_COLOR_TOKENS.completed]: 'border-status-completed',
  [UI_COLOR_TOKENS.boss]: 'border-status-boss',
  [UI_COLOR_TOKENS.danger]: 'border-status-danger',
  [UI_COLOR_TOKENS.neutral]: 'border-accent-neutral',
  'var(--color-solarized-yellow)': 'border-solarized-yellow',
  'var(--color-solarized-orange)': 'border-solarized-orange',
  'var(--color-solarized-red)': 'border-solarized-red',
  'var(--color-solarized-magenta)': 'border-solarized-magenta',
  'var(--color-solarized-violet)': 'border-solarized-violet',
  'var(--color-solarized-blue)': 'border-solarized-blue',
  'var(--color-solarized-cyan)': 'border-solarized-cyan',
  'var(--color-solarized-green)': 'border-solarized-green',
  'var(--color-solarized-base0)': 'border-solarized-base0',
};

export const COLOR_TEXT_CLASSES: Record<string, string> = {
  [UI_COLOR_TOKENS.scholar]: 'text-accent-scholar',
  [UI_COLOR_TOKENS.champion]: 'text-accent-champion',
  [UI_COLOR_TOKENS.guide]: 'text-accent-guide',
  [UI_COLOR_TOKENS.specialist]: 'text-accent-specialist',
  [UI_COLOR_TOKENS.quest]: 'text-status-quest',
  [UI_COLOR_TOKENS.campfire]: 'text-status-campfire',
  [UI_COLOR_TOKENS.completed]: 'text-status-completed',
  [UI_COLOR_TOKENS.boss]: 'text-status-boss',
  [UI_COLOR_TOKENS.danger]: 'text-status-danger',
  [UI_COLOR_TOKENS.neutral]: 'text-accent-neutral',
  'var(--color-solarized-yellow)': 'text-solarized-yellow',
  'var(--color-solarized-orange)': 'text-solarized-orange',
  'var(--color-solarized-red)': 'text-solarized-red',
  'var(--color-solarized-magenta)': 'text-solarized-magenta',
  'var(--color-solarized-violet)': 'text-solarized-violet',
  'var(--color-solarized-blue)': 'text-solarized-blue',
  'var(--color-solarized-cyan)': 'text-solarized-cyan',
  'var(--color-solarized-green)': 'text-solarized-green',
  'var(--color-solarized-base0)': 'text-solarized-base0',
};

export const COLOR_PLAYING_CARD_VARIABLE_CLASSES: Record<string, string> = {
  [UI_COLOR_TOKENS.scholar]: '[--playing-card-accent:var(--color-accent-scholar)]',
  [UI_COLOR_TOKENS.champion]: '[--playing-card-accent:var(--color-accent-champion)]',
  [UI_COLOR_TOKENS.guide]: '[--playing-card-accent:var(--color-accent-guide)]',
  [UI_COLOR_TOKENS.specialist]: '[--playing-card-accent:var(--color-accent-specialist)]',
  [UI_COLOR_TOKENS.quest]: '[--playing-card-accent:var(--color-status-quest)]',
  [UI_COLOR_TOKENS.campfire]: '[--playing-card-accent:var(--color-status-campfire)]',
  [UI_COLOR_TOKENS.completed]: '[--playing-card-accent:var(--color-status-completed)]',
  [UI_COLOR_TOKENS.boss]: '[--playing-card-accent:var(--color-status-boss)]',
  [UI_COLOR_TOKENS.danger]: '[--playing-card-accent:var(--color-status-danger)]',
  [UI_COLOR_TOKENS.neutral]: '[--playing-card-accent:var(--color-accent-neutral)]',
  'var(--color-solarized-yellow)': '[--playing-card-accent:var(--color-solarized-yellow)]',
  'var(--color-solarized-orange)': '[--playing-card-accent:var(--color-solarized-orange)]',
  'var(--color-solarized-red)': '[--playing-card-accent:var(--color-solarized-red)]',
  'var(--color-solarized-magenta)': '[--playing-card-accent:var(--color-solarized-magenta)]',
  'var(--color-solarized-violet)': '[--playing-card-accent:var(--color-solarized-violet)]',
  'var(--color-solarized-blue)': '[--playing-card-accent:var(--color-solarized-blue)]',
  'var(--color-solarized-cyan)': '[--playing-card-accent:var(--color-solarized-cyan)]',
  'var(--color-solarized-green)': '[--playing-card-accent:var(--color-solarized-green)]',
  'var(--color-solarized-base0)': '[--playing-card-accent:var(--color-solarized-base0)]',
};

export const UI_COLOR_VARIABLE_CLASSES: Record<UiColorTokenName, string> = {
  scholar: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.scholar],
  champion: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.champion],
  guide: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.guide],
  specialist: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.specialist],
  quest: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.quest],
  campfire: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.campfire],
  completed: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.completed],
  boss: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.boss],
  danger: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.danger],
  neutral: COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS.neutral],
};

export const SOLARIZED_SWATCH_OPTIONS = [
  {
    label: 'Yellow',
    labelKey: 'activityCard.colors.yellow',
    value: 'var(--color-solarized-yellow)',
    className: 'bg-solarized-yellow',
  },
  {
    label: 'Orange',
    labelKey: 'activityCard.colors.orange',
    value: 'var(--color-solarized-orange)',
    className: 'bg-solarized-orange',
  },
  {
    label: 'Red',
    labelKey: 'activityCard.colors.red',
    value: 'var(--color-solarized-red)',
    className: 'bg-solarized-red',
  },
  {
    label: 'Magenta',
    labelKey: 'activityCard.colors.magenta',
    value: 'var(--color-solarized-magenta)',
    className: 'bg-solarized-magenta',
  },
  {
    label: 'Violet',
    labelKey: 'activityCard.colors.violet',
    value: 'var(--color-solarized-violet)',
    className: 'bg-solarized-violet',
  },
  {
    label: 'Blue',
    labelKey: 'activityCard.colors.blue',
    value: 'var(--color-solarized-blue)',
    className: 'bg-solarized-blue',
  },
  {
    label: 'Cyan',
    labelKey: 'activityCard.colors.cyan',
    value: 'var(--color-solarized-cyan)',
    className: 'bg-solarized-cyan',
  },
  {
    label: 'Green',
    labelKey: 'activityCard.colors.green',
    value: 'var(--color-solarized-green)',
    className: 'bg-solarized-green',
  },
  {
    label: 'Base0',
    labelKey: 'activityCard.colors.base0',
    value: 'var(--color-solarized-base0)',
    className: 'bg-solarized-base0',
  },
] as const;

export const SOLARIZED_GRADIENT_COLORS = [
  'var(--color-solarized-violet)',
  'var(--color-solarized-blue)',
  'var(--color-solarized-cyan)',
  'var(--color-solarized-green)',
  'var(--color-solarized-yellow)',
  'var(--color-solarized-orange)',
  'var(--color-solarized-red)',
  'var(--color-solarized-magenta)',
] as const;

export function resolveUiColorTokenName(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
): UiColorTokenName {
  if (value && value in UI_COLOR_TOKENS) return value as UiColorTokenName;
  const tokenEntry = Object.entries(UI_COLOR_TOKENS).find(([, tokenValue]) => tokenValue === value);
  return tokenEntry ? (tokenEntry[0] as UiColorTokenName) : fallback;
}

export function resolveUiColorTokenValue(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
) {
  if (!value) return UI_COLOR_TOKENS[fallback];
  if (value in UI_COLOR_TOKENS) return UI_COLOR_TOKENS[value as UiColorTokenName];
  return value;
}

export function resolveColorBackgroundClassName(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
) {
  if (value && COLOR_BACKGROUND_CLASSES[value]) return COLOR_BACKGROUND_CLASSES[value];
  return COLOR_BACKGROUND_CLASSES[UI_COLOR_TOKENS[resolveUiColorTokenName(value, fallback)]];
}

export function resolveColorBorderClassName(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
) {
  if (value && COLOR_BORDER_CLASSES[value]) return COLOR_BORDER_CLASSES[value];
  return COLOR_BORDER_CLASSES[UI_COLOR_TOKENS[resolveUiColorTokenName(value, fallback)]];
}

export function resolveColorTextClassName(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
) {
  if (value && COLOR_TEXT_CLASSES[value]) return COLOR_TEXT_CLASSES[value];
  return COLOR_TEXT_CLASSES[UI_COLOR_TOKENS[resolveUiColorTokenName(value, fallback)]];
}

export function resolvePlayingCardAccentClassName(
  value: string | undefined,
  fallback: UiColorTokenName = DEFAULT_UI_COLOR_TOKEN
) {
  if (value && COLOR_PLAYING_CARD_VARIABLE_CLASSES[value]) {
    return COLOR_PLAYING_CARD_VARIABLE_CLASSES[value];
  }
  return COLOR_PLAYING_CARD_VARIABLE_CLASSES[UI_COLOR_TOKENS[resolveUiColorTokenName(value, fallback)]];
}
