import { icons, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ActivityType } from '@eduquest/shared';
import { ACTIVITY_ICON_KEYS } from '@eduquest/shared';

export const LUCIDE_ICON_IDS = Object.keys(icons).sort((a, b) => a.localeCompare(b));

const ICON_BY_PASCAL = icons as Record<string, LucideIcon>;

export function pascalCaseFromIconId(iconId: string) {
  const trimmed = iconId.trim();
  if (!trimmed) return '';
  if (!trimmed.includes('-')) {
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return trimmed
    .split('-')
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
  const candidates = [
    iconId,
    iconId ? pascalCaseFromIconId(iconId) : undefined,
    fallbackType ? pascalCaseFromIconId(fallbackType) : undefined,
    fallbackType,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const pascal = candidate.includes('-') ? pascalCaseFromIconId(candidate) : candidate;
    const icon = ICON_BY_PASCAL[pascal];
    if (icon) return icon;
  }

  return ICON_BY_PASCAL.Hammer || null;
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
  const Icon = resolveLucideIcon(iconId) || ICON_BY_PASCAL.Hammer;
  return <Icon size={size} className={className} aria-hidden />;
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
