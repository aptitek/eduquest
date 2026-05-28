import {
  STUDENT_ATTRIBUTES,
  type CharacterStatValue,
  type GuildStatValue,
  type RewardSystemConfig,
  type StudentAttribute,
} from '@eduquest/shared';

export interface GuildStatProfile {
  guildId: string;
  memberCount: number;
  sizeModifier: number;
  members: Record<string, Record<StudentAttribute, CharacterStatValue>>;
  stats: Record<StudentAttribute, GuildStatValue>;
}

export class GuildStatCalculator {
  static computeSizeModifier(memberCount: number, config: RewardSystemConfig): number {
    const missingStudents = Math.max(0, config.guild.targetSizeForModifier - memberCount);
    return (
      1 + config.guild.sizeModifierPerMissingStudent * missingStudents
    );
  }

  static compute(
    guildId: string,
    members: Record<string, Record<StudentAttribute, CharacterStatValue>>,
    config: RewardSystemConfig
  ): GuildStatProfile {
    const memberCount = Object.keys(members).length;
    const sizeModifier = GuildStatCalculator.computeSizeModifier(memberCount, config);
    const stats = {} as Record<StudentAttribute, GuildStatValue>;

    for (const attribute of STUDENT_ATTRIBUTES) {
      const rawSum = Object.values(members).reduce(
        (sum, memberStats) => sum + (memberStats[attribute]?.effective || 0),
        0
      );
      const cappedSum = Math.min(config.guild.statCapPerAttribute, rawSum);
      stats[attribute] = {
        rawSum,
        cappedSum,
        sizeModifier,
        effective: cappedSum * sizeModifier,
      };
    }

    return {
      guildId,
      memberCount,
      sizeModifier,
      members,
      stats,
    };
  }
}
