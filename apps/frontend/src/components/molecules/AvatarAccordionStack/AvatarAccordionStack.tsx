import type { CSSProperties } from 'react';
import { cn } from '../../../utils/cn';

export interface AvatarAccordionMember {
  id: string;
  name: string;
  avatarUrl?: string;
  subtitle?: string;
}

interface AvatarAccordionStackProps {
  members: AvatarAccordionMember[];
  color?: string;
  size?: 'sm' | 'md';
  restStepRem?: number;
  openStepRem?: number;
  className?: string;
  avatarClassName?: string;
  labelClassName?: string;
  getItemStyle?: (member: AvatarAccordionMember, index: number) => CSSProperties | undefined;
  getAvatarStyle?: (member: AvatarAccordionMember, index: number) => CSSProperties | undefined;
}

const SIZE_CLASS_NAMES = {
  sm: {
    container: 'h-8',
    avatar: 'h-8 w-8 text-[0.6rem]',
    label: 'text-[0.65rem]',
  },
  md: {
    container: 'h-12',
    avatar: 'h-10 w-10 text-xs',
    label: 'text-xs',
  },
};

export function AvatarAccordionStack({
  members,
  color = 'var(--color-gaming-border)',
  size = 'md',
  restStepRem = size === 'sm' ? 0.65 : 1.05,
  openStepRem = size === 'sm' ? 1.65 : 2.05,
  className,
  avatarClassName,
  labelClassName,
  getItemStyle,
  getAvatarStyle,
}: AvatarAccordionStackProps) {
  if (members.length === 0) return null;

  const sizeClassNames = SIZE_CLASS_NAMES[size];
  const restWidth = 2.5 + (members.length - 1) * restStepRem;
  const openWidth = 2.5 + (members.length - 1) * openStepRem;

  return (
    <div
      className={cn(
        'group/avatar-stack relative overflow-visible outline-none transition-[width] duration-300 [width:var(--stack-rest-width)] group-hover/graph-node:[width:var(--stack-open-width)] focus:[width:var(--stack-open-width)] focus-within:[width:var(--stack-open-width)] hover:[width:var(--stack-open-width)]',
        sizeClassNames.container,
        className
      )}
      style={
        {
          '--stack-rest-width': `${restWidth}rem`,
          '--stack-open-width': `${openWidth}rem`,
        } as CSSProperties
      }
      tabIndex={0}
    >
      {members.map((member, index) => (
        <div
          key={member.id}
          className="absolute top-0 transition-transform duration-300 [transform:translateX(var(--avatar-rest-x))] group-hover/avatar-stack:[transform:translateX(var(--avatar-open-x))] group-focus-within/avatar-stack:[transform:translateX(var(--avatar-open-x))]"
          style={
            {
              zIndex: members.length - index,
              '--avatar-rest-x': `${index * restStepRem}rem`,
              '--avatar-open-x': `${index * openStepRem}rem`,
              ...getItemStyle?.(member, index),
            } as CSSProperties
          }
        >
          <button
            type="button"
            className="group/avatar-item flex items-center rounded-full outline-none transition-transform duration-200 hover:z-50 hover:scale-110 focus:scale-110"
            title={member.name}
            style={getAvatarStyle?.(member, index)}
          >
            <span
              className={cn(
                'relative flex shrink-0 items-center justify-center overflow-visible rounded-full border-2 bg-gaming-base font-black text-text-primary shadow-lg',
                sizeClassNames.avatar,
                avatarClassName
              )}
              style={{
                borderColor: color,
                boxShadow: `0 0 12px color-mix(in srgb, ${color} 36%, transparent)`,
              }}
            >
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                {member.avatarUrl ? (
                  <img src={member.avatarUrl} alt={member.name} className="h-full w-full object-cover" />
                ) : (
                  getInitials(member.name)
                )}
              </span>
            </span>
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
      ))}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default AvatarAccordionStack;
