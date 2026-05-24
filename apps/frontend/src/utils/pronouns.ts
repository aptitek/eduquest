export const PRONOUN_OPTION_IDS = ['he', 'him', 'she', 'her', 'they', 'them', 'any', 'ask'];

const PRONOUN_ALIASES: Record<string, string> = {
  he: 'he',
  il: 'he',
  him: 'him',
  lui: 'him',
  she: 'she',
  elle: 'she',
  her: 'her',
  they: 'they',
  iel: 'they',
  them: 'them',
  eux: 'them',
  elles: 'them',
  any: 'any',
  'any pronouns': 'any',
  'tous pronoms': 'any',
  ask: 'ask',
  'ask me': 'ask',
  'demandez-moi': 'ask',
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizePronoun(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return PRONOUN_ALIASES[normalizeText(trimmed)] || trimmed;
}

/** Stored as comma-separated stable ids/custom values in the API. */
export function parsePronouns(value: string): string[] {
  if (!value.trim()) return [];
  const separator = value.includes(',') ? ',' : '/';

  return Array.from(
    new Set(
      value
        .split(separator)
        .map((p) => normalizePronoun(p))
        .filter(Boolean)
    )
  );
}

export function formatPronouns(pronouns: string[]): string {
  return Array.from(new Set(pronouns.map(normalizePronoun).filter(Boolean))).join(', ');
}

export function getPronounLabel(pronoun: string, t: (key: string) => string): string {
  const normalized = normalizePronoun(pronoun);
  if (PRONOUN_OPTION_IDS.includes(normalized)) {
    return t(`profile.institutionalCard.pronouns.${normalized}`);
  }
  return pronoun;
}

export function getPronounSearchText(pronoun: string, t: (key: string) => string): string {
  const normalized = normalizePronoun(pronoun);
  return `${normalized} ${getPronounLabel(normalized, t)}`;
}

export function formatPronounsForDisplay(value: string, t: (key: string) => string): string {
  return parsePronouns(value)
    .map((pronoun) => getPronounLabel(pronoun, t))
    .join(', ');
}
