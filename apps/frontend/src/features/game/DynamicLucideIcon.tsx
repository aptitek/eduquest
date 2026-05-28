import { lazy, Suspense, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Hammer } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { kebabCaseFromIconId } from './lucideIconCatalog';

interface DynamicLucideIconProps {
  iconId: string;
  size?: number;
  className?: string;
  'aria-hidden'?: boolean;
}

type DynamicIconImportKey = keyof typeof dynamicIconImports;

const dynamicIconCache = new Map<string, ComponentType<Omit<DynamicLucideIconProps, 'iconId'>>>();

export function DynamicLucideIcon({ iconId, size, className }: DynamicLucideIconProps) {
  const Icon = useMemo(() => getDynamicIcon(iconId), [iconId]);

  if (!Icon) return <Hammer size={size} className={className} aria-hidden />;

  return (
    <Suspense fallback={<Hammer size={size} className={className} aria-hidden />}>
      <Icon size={size} className={className} aria-hidden />
    </Suspense>
  );
}

export function getAllDynamicLucideIconIds() {
  return Object.keys(dynamicIconImports).sort((a, b) => a.localeCompare(b));
}

function getDynamicIcon(iconId: string) {
  const key = kebabCaseFromIconId(iconId) as DynamicIconImportKey;
  const importIcon = dynamicIconImports[key];
  if (!importIcon) return null;

  const cached = dynamicIconCache.get(key);
  if (cached) return cached;

  const Icon = lazy(async () => {
    const module = await importIcon();
    return { default: module.default };
  });
  dynamicIconCache.set(key, Icon);
  return Icon;
}
