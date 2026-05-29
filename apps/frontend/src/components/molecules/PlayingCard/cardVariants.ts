import { cn } from '../../../utils/cn';
import type { CardTone, PlayingCardSize, PlayingCardVariantOptions } from './types';

export interface PlayingCardSizeLayout {
  size: PlayingCardSize;
  artFrameSize: 'mini' | 'full';
  ribbonSize: 'sm' | 'md';
  titleSize: 'mini' | 'full';
  illustrationIconSize: 'nano' | 'mini' | 'full';
  showDetailPanel: boolean;
  revealCompactDetailsOnHover: boolean;
  shellClassName: string;
  artFrameClassName?: string;
  artFrameGradientClassName?: string;
  titleClassName?: string;
}

export const PLAYING_CARD_SIZE_LAYOUTS: Record<PlayingCardSize, PlayingCardSizeLayout> = {
  full: {
    size: 'full',
    artFrameSize: 'full',
    ribbonSize: 'md',
    titleSize: 'full',
    illustrationIconSize: 'full',
    showDetailPanel: true,
    revealCompactDetailsOnHover: false,
    shellClassName: 'relative flex h-full min-h-0 flex-col overflow-visible rounded-[1.1rem] border border-gaming-border bg-gaming-card/95',
  },
  mini: {
    size: 'mini',
    artFrameSize: 'mini',
    ribbonSize: 'sm',
    titleSize: 'mini',
    illustrationIconSize: 'mini',
    showDetailPanel: false,
    revealCompactDetailsOnHover: false,
    shellClassName: 'relative h-full min-h-0 overflow-hidden rounded-[1.25rem]',
  },
  nano: {
    size: 'nano',
    artFrameSize: 'mini',
    ribbonSize: 'sm',
    titleSize: 'mini',
    illustrationIconSize: 'nano',
    showDetailPanel: false,
    revealCompactDetailsOnHover: true,
    shellClassName:
      'relative h-full min-h-0 overflow-hidden rounded-[0.45rem] transition-[border-radius] duration-300 group-hover:rounded-[1.25rem] group-focus-within:rounded-[1.25rem]',
    artFrameClassName:
      'absolute inset-0 rounded-[0.45rem] border-0 bg-transparent transition-all duration-300 group-hover:inset-x-3 group-hover:bottom-12 group-hover:top-3 group-hover:rounded-[1.05rem] group-hover:border group-hover:border-gaming-border group-hover:bg-gaming-base group-focus-within:inset-x-3 group-focus-within:bottom-12 group-focus-within:top-3 group-focus-within:rounded-[1.05rem] group-focus-within:border group-focus-within:border-gaming-border group-focus-within:bg-gaming-base',
    artFrameGradientClassName: 'opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100',
    titleClassName: 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
  },
};

const toneClassNameMap: Record<CardTone, string> = {
  default: '',
  quest: '[--playing-card-tone:var(--color-status-quest)]',
  boss: '[--playing-card-tone:var(--color-status-boss)]',
  guild: '[--playing-card-tone:var(--color-status-campfire)]',
  character: '[--playing-card-tone:var(--color-status-quest)]',
  school: '[--playing-card-tone:var(--color-solarized-blue)]',
  cohort: '[--playing-card-tone:var(--color-solarized-violet)]',
  student: '[--playing-card-tone:var(--color-solarized-cyan)]',
  reward: '[--playing-card-tone:var(--color-solarized-yellow)]',
};

export function playingCardRootClassName({
  size = 'mini',
  tone = 'default',
  state = 'readonly',
}: PlayingCardVariantOptions = {}) {
  return cn(
    'group relative aspect-[5/7] min-h-0 overflow-hidden rounded-[1.4rem] border border-[color:var(--playing-card-accent)] bg-gaming-card shadow-2xl outline-none',
    'transition-[filter,box-shadow,width,transform,border-radius] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--playing-card-accent)]',
    size === 'full' && 'w-full max-w-sm p-2',
    size === 'mini' && 'w-32 sm:w-36',
    size === 'nano' &&
      'w-[2.15rem] rounded-lg p-0.5 shadow-lg hover:z-50 hover:w-32 hover:translate-y-1 hover:rounded-[1.4rem] hover:shadow-2xl focus-within:z-50 focus-within:w-32 focus-within:translate-y-1 focus-within:rounded-[1.4rem] focus-within:shadow-2xl sm:hover:w-36 sm:focus-within:w-36',
    state === 'faceDown' && size !== 'full' && 'bg-gaming-base',
    state === 'disabled' && 'pointer-events-none opacity-60',
    state === 'editable' && 'ring-1 ring-[color:var(--playing-card-accent)]/20',
    toneClassNameMap[tone]
  );
}

export function playingCardInnerClassName(size: PlayingCardVariantOptions['size']) {
  return cn(
    'relative h-full min-h-0 w-full rounded-[1.1rem] [transform-style:preserve-3d]',
    size === 'nano' && 'rounded-lg group-hover:rounded-[1.1rem] group-focus-within:rounded-[1.1rem]'
  );
}

export function playingCardFaceClassName(size: PlayingCardVariantOptions['size']) {
  return cn(
    'absolute inset-0 [backface-visibility:hidden]',
    size === 'full' && 'overflow-visible'
  );
}

export function playingCardBackClassName() {
  return 'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]';
}

export function playingCardDetailPanelClassName() {
  return 'relative flex max-h-[43%] shrink-0 gap-3 border-t border-gaming-border bg-gaming-card/95 p-4';
}
