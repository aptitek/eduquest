const SEEDED_BACKGROUND_CLASSES = [
  'bg-status-quest',
  'bg-status-campfire',
  'bg-status-completed',
  'bg-status-boss',
  'bg-primary',
  'bg-secondary',
  'bg-accent',
];

export function getSeededBackgroundClass(seed: string) {
  const hash = Array.from(seed).reduce((currentHash, character) => {
    return (currentHash * 31 + character.charCodeAt(0)) >>> 0;
  }, 0);

  return SEEDED_BACKGROUND_CLASSES[hash % SEEDED_BACKGROUND_CLASSES.length];
}
