import { cn } from '../../../utils/cn';

export type DashboardMiniDeckVariant = 'horizontal' | 'vertical';
export type DashboardMiniDeckStackSide = 'left' | 'right';

interface StackCardClassOptions {
  depth: number;
  variant: DashboardMiniDeckVariant;
  stackSide: DashboardMiniDeckStackSide;
  expandOnHover: boolean;
}

interface FrontCardClassOptions {
  variant: DashboardMiniDeckVariant;
  stackSide: DashboardMiniDeckStackSide;
  expandOnHover: boolean;
}

const VERTICAL_RESTING_CLASSES = [
  'z-10 -translate-y-14 rotate-[-4deg] scale-95',
  'z-[9] -translate-y-24 rotate-[4deg] scale-90',
  'z-[8] -translate-y-32 rotate-[-8deg] scale-[0.85]',
];

const VERTICAL_EXPANDED_CLASSES = [
  'group-hover:-translate-y-32 group-hover:rotate-[-3deg] group-hover:scale-100 group-focus:-translate-y-32 group-focus:rotate-[-3deg] group-focus:scale-100 group-focus-within:-translate-y-32 group-focus-within:rotate-[-3deg] group-focus-within:scale-100',
  'group-hover:-translate-y-56 group-hover:rotate-[3deg] group-hover:scale-95 group-focus:-translate-y-56 group-focus:rotate-[3deg] group-focus:scale-95 group-focus-within:-translate-y-56 group-focus-within:rotate-[3deg] group-focus-within:scale-95',
  'group-hover:-translate-y-80 group-hover:rotate-[-5deg] group-hover:scale-90 group-focus:-translate-y-80 group-focus:rotate-[-5deg] group-focus:scale-90 group-focus-within:-translate-y-80 group-focus-within:rotate-[-5deg] group-focus-within:scale-90',
];

const VERTICAL_CARD_HOVER_CLASSES = [
  'hover:!z-40 hover:!-translate-y-40 hover:!rotate-[-2deg] hover:!scale-105',
  'hover:!z-40 hover:!-translate-y-64 hover:!rotate-[2deg] hover:!scale-105',
  'hover:!z-40 hover:!-translate-y-96 hover:!rotate-[-3deg] hover:!scale-105',
];

const LEFT_RESTING_CLASSES = [
  'z-10 -translate-x-2 rotate-[-7deg] scale-95',
  'z-[9] -translate-x-5 rotate-[-11deg] scale-90',
  'z-[8] -translate-x-8 rotate-[-15deg] scale-[0.85]',
];

const RIGHT_RESTING_CLASSES = [
  'z-10 translate-x-2 rotate-[7deg] scale-95',
  'z-[9] translate-x-5 rotate-[11deg] scale-90',
  'z-[8] translate-x-8 rotate-[15deg] scale-[0.85]',
];

const LEFT_EXPANDED_CLASSES = [
  'group-hover:-translate-x-16 group-hover:rotate-[-4deg] group-hover:scale-100 group-focus-within:-translate-x-16 group-focus-within:rotate-[-4deg] group-focus-within:scale-100',
  'group-hover:-translate-x-28 group-hover:rotate-[-8deg] group-hover:scale-95 group-focus-within:-translate-x-28 group-focus-within:rotate-[-8deg] group-focus-within:scale-95',
  'group-hover:-translate-x-40 group-hover:rotate-[-12deg] group-hover:scale-90 group-focus-within:-translate-x-40 group-focus-within:rotate-[-12deg] group-focus-within:scale-90',
];

const RIGHT_EXPANDED_CLASSES = [
  'group-hover:translate-x-20 group-hover:rotate-[4deg] group-hover:scale-100 group-focus-within:translate-x-20 group-focus-within:rotate-[4deg] group-focus-within:scale-100',
  'group-hover:translate-x-36 group-hover:rotate-[8deg] group-hover:scale-95 group-focus-within:translate-x-36 group-focus-within:rotate-[8deg] group-focus-within:scale-95',
  'group-hover:translate-x-52 group-hover:rotate-[12deg] group-hover:scale-90 group-focus-within:translate-x-52 group-focus-within:rotate-[12deg] group-focus-within:scale-90',
];

const LEFT_CARD_HOVER_CLASSES = [
  'hover:!z-40 hover:!-translate-x-24 hover:!rotate-[-2deg] hover:!scale-105',
  'hover:!z-40 hover:!-translate-x-36 hover:!rotate-[-4deg] hover:!scale-105',
  'hover:!z-40 hover:!-translate-x-48 hover:!rotate-[-6deg] hover:!scale-105',
];

const RIGHT_CARD_HOVER_CLASSES = [
  'hover:!z-40 hover:!translate-x-28 hover:!rotate-[2deg] hover:!scale-105',
  'hover:!z-40 hover:!translate-x-44 hover:!rotate-[4deg] hover:!scale-105',
  'hover:!z-40 hover:!translate-x-60 hover:!rotate-[6deg] hover:!scale-105',
];

export function getStackCardClassName({
  depth,
  variant,
  stackSide,
  expandOnHover,
}: StackCardClassOptions) {
  const classSet = getClassSet(variant, stackSide);

  return cn(
    'absolute bottom-0 origin-bottom translate-y-0 shadow-xl',
    'transition-transform duration-300',
    variant === 'vertical' ? 'left-0' : stackSide === 'left' ? 'right-14' : 'left-14',
    getDepthClass(classSet.resting, depth),
    expandOnHover && getDepthClass(classSet.expanded, depth),
    expandOnHover && getDepthClass(classSet.cardHover, depth)
  );
}

export function getFrontCardClassName({
  variant,
  stackSide,
  expandOnHover,
}: FrontCardClassOptions) {
  return cn(
    'absolute bottom-0 z-30 origin-bottom translate-y-0',
    variant === 'vertical' ? 'left-0' : stackSide === 'left' ? 'right-0' : 'left-0',
    expandOnHover &&
      'group-hover:scale-110 group-focus-within:scale-110 group-hover:-translate-y-2 group-focus-within:-translate-y-2'
  );
}

function getClassSet(variant: DashboardMiniDeckVariant, stackSide: DashboardMiniDeckStackSide) {
  if (variant === 'vertical') {
    return {
      resting: VERTICAL_RESTING_CLASSES,
      expanded: VERTICAL_EXPANDED_CLASSES,
      cardHover: VERTICAL_CARD_HOVER_CLASSES,
    };
  }

  if (stackSide === 'left') {
    return {
      resting: LEFT_RESTING_CLASSES,
      expanded: LEFT_EXPANDED_CLASSES,
      cardHover: LEFT_CARD_HOVER_CLASSES,
    };
  }

  return {
    resting: RIGHT_RESTING_CLASSES,
    expanded: RIGHT_EXPANDED_CLASSES,
    cardHover: RIGHT_CARD_HOVER_CLASSES,
  };
}

function getDepthClass(classes: string[], depth: number) {
  return classes[Math.min(depth, classes.length) - 1];
}
