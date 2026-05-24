import { User } from '@eduquest/shared';

/** Merge API user onto optimistic patch; keep sent values when API omits a field. */
export function reconcileProfileUser(
  current: User,
  sent: Partial<User>,
  apiUser?: Partial<User> | null
): User {
  const merged: User = { ...current, ...sent };
  if (!apiUser) return merged;

  const result = { ...merged };
  for (const key of Object.keys(sent) as (keyof User)[]) {
    const apiValue = apiUser[key];
    if (apiValue !== undefined && apiValue !== null) {
      (result as Record<keyof User, unknown>)[key] = apiValue;
    }
  }
  return result;
}
