import type { ReactNode } from 'react';
import { AvatarBadge } from '../../atoms/AvatarBadge';
import { StackLayout } from '../StackLayout';
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
  arcRadius?: number;
  messiness?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  avatarClassName?: string;
  stackItemClassName?: string;
  labelClassName?: string;
  getAvatarMotion?: (member: AvatarDeckMember, index: number) => AvatarDeckMotion | undefined;
  expanded?: boolean;
  reserveOpenWidth?: boolean;
  expandOnHover?: boolean;
  expandOnParentHover?: boolean;
  liftItemsOnHover?: boolean;
  showLabelsOnHover?: boolean;
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
  arcRadius = 0,
  messiness = 0,
  orientation = 'horizontal',
  className,
  avatarClassName,
  stackItemClassName,
  labelClassName,
  getAvatarMotion,
  expanded = true,
  reserveOpenWidth = false,
  expandOnHover = true,
  expandOnParentHover = true,
  liftItemsOnHover = true,
  showLabelsOnHover = true,
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
        'group/avatar-deck relative z-[90] overflow-visible outline-none transition-[width] duration-300',
        reserveOpenWidth ? '[width:var(--deck-open-width)]' : '[width:var(--deck-rest-width)]',
        expandOnHover && 'hover:[width:var(--deck-open-width)] focus:[width:var(--deck-open-width)] focus-within:[width:var(--deck-open-width)]',
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
      <StackLayout
        items={members as [AvatarDeckMember, ...AvatarDeckMember[]]}
        orientation={orientation}
        arcRadius={arcRadius}
        messiness={messiness}
        restStepRem={restStepRem}
        openStepRem={openStepRem}
        emphasisIndex={0}
        visibleStackCount={members.length}
        expandOnHover={false}
        expanded={expanded}
        className={cn('absolute inset-0', align === 'center' && 'left-1/2 -translate-x-1/2')}
        emphasisClassName="shadow-none"
        stackItemClassName={cn(
          'shadow-none',
          expandOnParentHover &&
            'group-hover/graph-node:[--stack-x:var(--stack-open-x)] group-hover/graph-node:[--stack-y:var(--stack-open-y)] group-hover/graph-node:[--stack-rotation:var(--stack-open-rotation)] group-hover/graph-node:[--stack-scale:var(--stack-open-scale)] group-focus-within/graph-node:[--stack-x:var(--stack-open-x)] group-focus-within/graph-node:[--stack-y:var(--stack-open-y)] group-focus-within/graph-node:[--stack-rotation:var(--stack-open-rotation)] group-focus-within/graph-node:[--stack-scale:var(--stack-open-scale)]',
          stackItemClassName
        )}
        renderItem={({ item: member, index }) => {
          const motion = getAvatarMotion?.(member, index);

          return (
            <button
              type="button"
              className={cn(
                'group/avatar-item flex items-center rounded-full outline-none transition-[filter,transform] duration-200',
                liftItemsOnHover
                  ? 'hover:!z-50 hover:[transform:translateY(-0.75rem)_scale(1.12)] hover:drop-shadow-2xl focus:!z-50 focus:[transform:translateY(-0.75rem)_scale(1.12)] focus:drop-shadow-2xl'
                  : 'hover:!z-50 focus:!z-50',
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
              {showLabelsOnHover ? (
                <span
                  className={cn(
                    'ml-2 max-w-0 overflow-hidden whitespace-nowrap rounded-full border border-gaming-border bg-gaming-card/95 px-0 py-0 font-semibold text-text-primary opacity-0 shadow-xl transition-[max-width,opacity,padding] duration-200 group-hover/avatar-item:max-w-32 group-hover/avatar-item:px-2 group-hover/avatar-item:py-0.5 group-hover/avatar-item:opacity-100 group-focus/avatar-item:max-w-32 group-focus/avatar-item:px-2 group-focus/avatar-item:py-0.5 group-focus/avatar-item:opacity-100',
                    sizeClassNames.label,
                    labelClassName
                  )}
                >
                  {member.name}
                </span>
              ) : null}
            </button>
          );
        }}
      />
    </div>
  );
}

function setDeckSizeProperties(node: HTMLDivElement | null, restWidth: number, openWidth: number) {
  if (!node) return;
  node.style.setProperty('--deck-rest-width', `${restWidth}rem`);
  node.style.setProperty('--deck-open-width', `${openWidth}rem`);
}

function setAvatarMotionProperties(node: HTMLButtonElement | null, motion?: AvatarDeckMotion) {
  if (!node || !motion) return;
  node.style.setProperty('--travel-x', `${motion.travelX}px`);
  node.style.setProperty('--travel-y', `${motion.travelY}px`);
}

export default AvatarDeck;
