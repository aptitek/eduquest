export function getSeededBackgroundColor(seed: string) {
  const hash = Array.from(seed).reduce((currentHash, character) => {
    return (currentHash * 31 + character.charCodeAt(0)) >>> 0;
  }, 0);
  const hue = hash % 360;
  const saturation = 68 + (hash % 12);
  const lightness = 34 + ((hash >> 4) % 10);

  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
