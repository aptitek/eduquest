/** Stored as comma-separated in the API */
export function parsePronouns(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatPronouns(pronouns: string[]): string {
  return pronouns.join(', ');
}
