import type { ReactNode } from 'react';
import { AvatarBadge } from '../../atoms/AvatarBadge';
import { cn } from '../../../utils/cn';

export interface AvatarDeckMember {
  id: string;
  name: string;
  avatarUrl?: string;
  icon?: ReactNode;
  color?: string;
  subtitle?: string;
  onClick?: () => void;
}

export interface AvatarDeckMotion {
  travelX: number;
  travelY: number;
}

interface AvatarDeckProps {
  members: AvatarDeckMember[];
  color?: string;
  size?: 'sm' | 'md';
  restStepRem?: number;
  openStepRem?: number;
  className?: string;
  avatarClassName?: string;
  labelClassName?: string;
  getAvatarMotion?: (member: AvatarDeckMember, index: number) => AvatarDeckMotion | undefined;
  expandOnParentHover?: boolean;
  align?: 'start' | 'center';
  interactive?: boolean;
}

const SIZE_CLASS_NAMES = {
  sm: {
    container: 'h-8',
    label: 'text-[0.65rem]',
    restOffset: 0.55,
    openOffset: 2.35,
  },
  md: {
    container: 'h-12',
    label: 'text-xs',
    restOffset: 0.7,
    openOffset: 2.85,
  },
};

export function AvatarDeck({
  members,
  color = 'var(--color-gaming-border)',
  size = 'md',
  restStepRem = SIZE_CLASS_NAMES[size].restOffset,
  openStepRem = SIZE_CLASS_NAMES[size].openOffset,
  className,
  avatarClassName,
  labelClassName,
  getAvatarMotion,
  expandOnParentHover = true,
  align = 'start',
  interactive = true,
}: AvatarDeckProps) {
  if (members.length === 0) return null;

  const sizeClassNames = SIZE_CLASS_NAMES[size];
  const restWidth = 2.5 + (members.length - 1) * restStepRem;
  const openWidth = 5 + (members.length - 1) * openStepRem;

  return (
    <div
      className={cn(
        'group/avatar-deck relative z-[90] overflow-visible outline-none transition-[width] duration-300 [width:var(--deck-rest-width)] hover:[width:var(--deck-open-width)] focus:[width:var(--deck-open-width)] focus-within:[width:var(--deck-open-width)]',
        expandOnParentHover &&
          'group-hover/graph-node:[width:var(--deck-open-width)] group-focus-within/graph-node:[width:var(--deck-open-width)]',
        sizeClassNames.container,
        !interactive && 'pointer-events-none',
        className
      )}
      ref={(node) => setDeckSizeProperties(node, restWidth, openWidth)}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? (event) => event.stopPropagation() : undefined}
      onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}
    >
      {members.map((member, index) => {
        const isEmphasis = index === 0;
        const depth = Math.max(index, 1);
        const restX = isEmphasis ? 0 : depth * restStepRem;
        const openX = isEmphasis ? 0 : depth * openStepRem;
        const motion = getAvatarMotion?.(member, index);

        return (
          <div
            key={member.id}
            className={cn(
              'absolute bottom-0 origin-bottom transition-[filter,transform] duration-300 [transform:translateX(calc(var(--avatar-rest-x)_-_var(--avatar-rest-anchor)))_translateY(var(--avatar-rest-y))_scale(var(--avatar-rest-scale))] group-hover/avatar-deck:[transform:translateX(calc(var(--avatar-open-x)_-_var(--avatar-open-anchor)))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))] group-focus-within/avatar-deck:[transform:translateX(calc(var(--avatar-open-x)_-_var(--avatar-open-anchor)))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))]',
              expandOnParentHover &&
                'group-hover/graph-node:[transform:translateX(calc(var(--avatar-open-x)_-_var(--avatar-open-anchor)))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))] group-focus-within/graph-node:[transform:translateX(calc(var(--avatar-open-x)_-_var(--avatar-open-anchor)))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))]'
            )}
            ref={(node) =>
              setAvatarItemProperties(node, {
                zIndex: members.length - index,
                restX,
                restAnchor: align === 'center' ? restWidth / 2 : 0,
                restY: isEmphasis ? 0 : 0.12,
                restScale: isEmphasis ? 1 : Math.max(1 - depth * 0.05, 0.84),
                openX,
                openAnchor: align === 'center' ? openWidth / 2 : 0,
                openY: isEmphasis ? -0.2 : 0,
                openScale: isEmphasis ? 1.08 : Math.max(1 - (depth - 1) * 0.035, 0.9),
              })
            }
          >
            <button
              type="button"
              className={cn(
                'group/avatar-item flex items-center rounded-full outline-none transition-[filter,transform] duration-200 hover:!z-50 hover:[transform:translateY(var(--avatar-hover-y))_scale(1.12)] hover:drop-shadow-2xl focus:!z-50 focus:[transform:translateY(var(--avatar-hover-y))_scale(1.12)] focus:drop-shadow-2xl',
                motion && 'map-avatar-travel'
              )}
              title={member.name}
              tabIndex={interactive ? 0 : -1}
              onPointerDown={interactive ? (event) => event.stopPropagation() : undefined}
              onClick={(event) => {
                if (!interactive) return;
                event.stopPropagation();
                member.onClick?.();
              }}
              ref={(node) => setAvatarMotionProperties(node, motion)}
            >
              <AvatarBadge
                name={member.name}
                src={member.avatarUrl}
                icon={member.icon}
                color={member.color || color}
                size={size}
                className={avatarClassName}
              />
              <span
                className={cn(
                  'ml-2 max-w-0 overflow-hidden whitespace-nowrap rounded-full border border-gaming-border bg-gaming-card/95 px-0 py-0 font-semibold text-text-primary opacity-0 shadow-xl transition-[max-width,opacity,padding] duration-200 group-hover/avatar-item:max-w-32 group-hover/avatar-item:px-2 group-hover/avatar-item:py-0.5 group-hover/avatar-item:opacity-100 group-focus/avatar-item:max-w-32 group-focus/avatar-item:px-2 group-focus/avatar-item:py-0.5 group-focus/avatar-item:opacity-100',
                  sizeClassNames.label,
                  labelClassName
                )}
              >
                {member.name}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function setDeckSizeProperties(node: HTMLDivElement | null, restWidth: number, openWidth: number) {
  if (!node) return;
  node.style.setProperty('--deck-rest-width', `${restWidth}rem`);
  node.style.setProperty('--deck-open-width', `${openWidth}rem`);
}

function setAvatarItemProperties(
  node: HTMLDivElement | null,
  properties: {
    zIndex: number;
    restX: number;
    restAnchor: number;
    restY: number;
    restScale: number;
    openX: number;
    openAnchor: number;
    openY: number;
    openScale: number;
  }
) {
  if (!node) return;
  node.style.zIndex = String(properties.zIndex);
  node.style.setProperty('--avatar-rest-x', `${properties.restX}rem`);
  node.style.setProperty('--avatar-rest-anchor', `${properties.restAnchor}rem`);
  node.style.setProperty('--avatar-rest-y', `${properties.restY}rem`);
  node.style.setProperty('--avatar-rest-scale', String(properties.restScale));
  node.style.setProperty('--avatar-open-x', `${properties.openX}rem`);
  node.style.setProperty('--avatar-open-anchor', `${properties.openAnchor}rem`);
  node.style.setProperty('--avatar-open-y', `${properties.openY}rem`);
  node.style.setProperty('--avatar-open-scale', String(properties.openScale));
  node.style.setProperty('--avatar-hover-y', '-0.75rem');
}

function setAvatarMotionProperties(node: HTMLButtonElement | null, motion?: AvatarDeckMotion) {
  if (!node || !motion) return;
  node.style.setProperty('--travel-x', `${motion.travelX}px`);
  node.style.setProperty('--travel-y', `${motion.travelY}px`);
}

export default AvatarDeck;
