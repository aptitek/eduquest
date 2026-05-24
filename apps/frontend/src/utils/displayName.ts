import type { User } from '@eduquest/shared';

export function formatUserDisplayName(user: Pick<User, 'displayName' | 'firstName' | 'lastName' | 'githubUsername' | 'email'>) {
  const displayName = user.displayName?.trim();
  const firstName = user.firstName?.trim();
  const lastName = user.lastName?.trim();

  if (displayName) {
    if (!lastName) return displayName;

    const parts = displayName.split(/\s+/);
    let lastIndex = -1;
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      if (parts[index].toLowerCase() === lastName.toLowerCase()) {
        lastIndex = index;
        break;
      }
    }
    if (lastIndex === -1) return displayName;

    parts[lastIndex] = lastName;
    return parts.join(' ');
  }

  const firstLast = [firstName, lastName].filter(Boolean).join(' ').trim();
  return firstLast || user.githubUsername || user.email;
}
