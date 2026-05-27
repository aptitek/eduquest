import type { RewardActorScope, StudentAttribute } from '@eduquest/shared';
import type { GuildStatProfile } from './guild-stat-calculator';

export class AttributeResolver {
  static resolve(
    scope: RewardActorScope,
    profile: GuildStatProfile,
    studentId: string | undefined,
    attribute: StudentAttribute
  ): number {
    if (scope === 'guild') {
      return profile.stats[attribute].effective;
    }

    if (!studentId) {
      throw new Error('studentId is required for student-scoped attribute resolution.');
    }

    const memberStats = profile.members[studentId];
    if (!memberStats) {
      throw new Error(`Student ${studentId} is not a member of guild ${profile.guildId}.`);
    }

    return memberStats[attribute].effective;
  }
}
