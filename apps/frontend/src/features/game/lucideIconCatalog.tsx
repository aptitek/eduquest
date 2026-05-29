import {
  Award,
  Anvil,
  BookOpen,
  Castle,
  CheckCircle2,
  CloudFog,
  Coins,
  Compass,
  Crown,
  Flame,
  Gift,
  Gamepad2,
  Gem,
  Hammer,
  Heart,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Lock,
  Map as MapIcon,
  Medal,
  Rocket,
  ScrollText,
  Shield,
  Snowflake,
  Sparkles,
  Star,
  Swords,
  Target,
  Terminal,
  Trophy,
  TreePine,
  User,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { ActivityType } from '@eduquest/shared';
import { ACTIVITY_ICON_KEYS } from '@eduquest/shared';

const ICON_BY_PASCAL: Record<string, LucideIcon> = {
  Anvil,
  Award,
  BookOpen,
  Castle,
  CheckCircle2,
  CloudFog,
  Coins,
  Compass,
  Crown,
  Flame,
  Gift,
  Gamepad2,
  Gem,
  Hammer,
  Heart,
  HelpCircle,
  KeyRound,
  Lightbulb,
  Lock,
  Map: MapIcon,
  Medal,
  Rocket,
  ScrollText,
  Shield,
  Snowflake,
  Sparkles,
  Star,
  Swords,
  Target,
  Terminal,
  Trophy,
  TreePine,
  User,
  UserCheck,
  Users,
  onboarding: Compass,
  character_creation: User,
  tavern: Users,
  tutorial: BookOpen,
  ice_breaker: Snowflake,
  campfire: Flame,
  quiz: HelpCircle,
  practical: Hammer,
  mini_boss: Shield,
  boss: Swords,
};

export const LUCIDE_ICON_IDS = Object.keys(ICON_BY_PASCAL).sort((a, b) => a.localeCompare(b));

export function pascalCaseFromIconId(iconId: string) {
  const trimmed = iconId.trim();
  if (!trimmed) return '';
  if (!/[-_]/.test(trimmed)) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

export function kebabCaseFromIconId(iconId: string) {
  const pascal = pascalCaseFromIconId(iconId);
  if (!pascal) return '';
  return pascal.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function resolveLucideIcon(iconId?: string, fallbackType?: ActivityType): LucideIcon | null {
  return resolveStaticLucideIcon(iconId, fallbackType) || ICON_BY_PASCAL.Hammer || null;
}

function resolveStaticLucideIcon(iconId?: string, fallbackType?: ActivityType): LucideIcon | null {
  const candidates = [
    iconId,
    iconId ? pascalCaseFromIconId(iconId) : undefined,
    fallbackType ? pascalCaseFromIconId(fallbackType) : undefined,
    fallbackType,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const pascal = candidate.includes('-') || candidate.includes('_') ? pascalCaseFromIconId(candidate) : candidate;
    const icon = ICON_BY_PASCAL[pascal];
    if (icon) return icon;
  }

  return null;
}

type LazyLucideIcon = ComponentType<{
  iconId: string;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}>;

const lazyIconCache: globalThis.Map<string, LazyLucideIcon> = new globalThis.Map();

function getLazyLucideIcon(iconId: string) {
  const pascal = pascalCaseFromIconId(iconId);
  if (!pascal) return null;

  const cached = lazyIconCache.get(pascal);
  if (cached) return cached;

  const LazyIcon = lazy(async () => {
    const module = await import('./DynamicLucideIcon');
    return { default: module.DynamicLucideIcon as LazyLucideIcon };
  });

  lazyIconCache.set(pascal, LazyIcon);
  return LazyIcon;
}

export function resolveActivityIconId(
  metadata?: { iconKey?: string },
  fallbackType?: ActivityType
): string {
  if (metadata?.iconKey?.trim()) {
    const resolved = resolveLucideIcon(metadata.iconKey, fallbackType);
    if (resolved) return metadata.iconKey.trim();
  }
  if (fallbackType && ACTIVITY_ICON_KEYS.includes(fallbackType as (typeof ACTIVITY_ICON_KEYS)[number])) {
    return fallbackType;
  }
  return 'practical';
}

export function renderLucideIcon(iconId: string, size = 20, className?: string): ReactNode {
  const Icon = resolveStaticLucideIcon(iconId);
  if (Icon) return <Icon size={size} className={className} aria-hidden />;

  const LazyIcon = getLazyLucideIcon(iconId);
  if (!LazyIcon) return <Hammer size={size} className={className} aria-hidden />;

  return (
    <Suspense fallback={<Hammer size={size} className={className} aria-hidden />}>
      <LazyIcon iconId={iconId} size={size} className={className} aria-hidden />
    </Suspense>
  );
}

export function filterLucideIconIds(query: string, limit = 48) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return LUCIDE_ICON_IDS.slice(0, limit);
  }

  return LUCIDE_ICON_IDS.filter((iconId) => {
    const kebab = kebabCaseFromIconId(iconId);
    return (
      iconId.toLowerCase().includes(normalized) ||
      kebab.includes(normalized)
    );
  }).slice(0, limit);
}
