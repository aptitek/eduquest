import type { CSSProperties } from 'react';
import { AvatarBadge } from '../../atoms/AvatarBadge';
import { cn } from '../../../utils/cn';

export interface AvatarDeckMember {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle?: string;
  onClick?: () => void;
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
  getItemStyle?: (member: AvatarDeckMember, index: number) => CSSProperties | undefined;
  getAvatarStyle?: (member: AvatarDeckMember, index: number) => CSSProperties | undefined;
}

const SIZE_CLASS_NAMES = {
  sm: {
    container: 'h-8',
    label: 'text-[0.65rem]',
    restOffset: 0.55,
    openOffset: 2.35,
    hoverOffset: 2.65,
  },
  md: {
    container: 'h-12',
    label: 'text-xs',
    restOffset: 0.7,
    openOffset: 2.85,
    hoverOffset: 3.2,
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
  getItemStyle,
  getAvatarStyle,
}: AvatarDeckProps) {
  if (members.length === 0) return null;

  const sizeClassNames = SIZE_CLASS_NAMES[size];
  const restWidth = 2.5 + (members.length - 1) * restStepRem;
  const openWidth = 5 + (members.length - 1) * openStepRem;

  return (
    <div
      className={cn(
        'group/avatar-deck relative overflow-visible outline-none transition-[width] duration-300 [width:var(--deck-rest-width)] hover:[width:var(--deck-open-width)] focus:[width:var(--deck-open-width)] focus-within:[width:var(--deck-open-width)] group-hover/graph-node:[width:var(--deck-open-width)] group-focus-within/graph-node:[width:var(--deck-open-width)]',
        sizeClassNames.container,
        className
      )}
      style={
        {
          '--deck-rest-width': `${restWidth}rem`,
          '--deck-open-width': `${openWidth}rem`,
        } as CSSProperties
      }
      tabIndex={0}
    >
      {members.map((member, index) => {
        const isEmphasis = index === 0;
        const depth = Math.max(index, 1);
        const restX = isEmphasis ? 0 : depth * restStepRem;
        const openX = isEmphasis ? 0 : depth * openStepRem;
        const hoverX = isEmphasis ? 0 : depth * sizeClassNames.hoverOffset;

        return (
          <div
            key={member.id}
            className="absolute bottom-0 origin-bottom transition-[filter,transform] duration-300 [transform:translateX(var(--avatar-rest-x))_translateY(var(--avatar-rest-y))_scale(var(--avatar-rest-scale))] group-hover/avatar-deck:[transform:translateX(var(--avatar-open-x))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))] group-focus-within/avatar-deck:[transform:translateX(var(--avatar-open-x))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))] group-hover/graph-node:[transform:translateX(var(--avatar-open-x))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))] group-focus-within/graph-node:[transform:translateX(var(--avatar-open-x))_translateY(var(--avatar-open-y))_scale(var(--avatar-open-scale))]"
            style={
              {
                zIndex: members.length - index,
                '--avatar-rest-x': `${restX}rem`,
                '--avatar-rest-y': isEmphasis ? '0rem' : '0.12rem',
                '--avatar-rest-scale': isEmphasis ? 1 : Math.max(1 - depth * 0.05, 0.84),
                '--avatar-open-x': `${openX}rem`,
                '--avatar-open-y': isEmphasis ? '-0.2rem' : '0rem',
                '--avatar-open-scale': isEmphasis ? 1.08 : Math.max(1 - (depth - 1) * 0.035, 0.9),
                '--avatar-hover-x': `${hoverX}rem`,
                '--avatar-hover-y': '-0.75rem',
                ...getItemStyle?.(member, index),
              } as CSSProperties
            }
          >
            <button
              type="button"
              className="group/avatar-item flex items-center rounded-full outline-none transition-[filter,transform] duration-200 hover:!z-50 hover:[transform:translateX(var(--avatar-hover-x))_translateY(var(--avatar-hover-y))_scale(1.12)] hover:drop-shadow-2xl focus:!z-50 focus:[transform:translateX(var(--avatar-hover-x))_translateY(var(--avatar-hover-y))_scale(1.12)] focus:drop-shadow-2xl"
              title={member.name}
              onClick={(event) => {
                event.stopPropagation();
                member.onClick?.();
              }}
              style={getAvatarStyle?.(member, index)}
            >
              <AvatarBadge
                name={member.name}
                src={member.avatarUrl}
                color={color}
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

export default AvatarDeck;
