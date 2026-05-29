import { cn } from '../../../utils/cn';
import type {
  CardTone,
  PlayingCardEmphasis,
  PlayingCardFit,
  PlayingCardOverlayPlacement,
  PlayingCardPresentation,
  PlayingCardSize,
  PlayingCardVariantOptions,
  PlayingCardWidthPreset,
} from './types';

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
  fit = 'intrinsic',
  width = 'default',
  emphasis = 'none',
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
    playingCardFitClassName(fit),
    playingCardWidthPresetClassName(width),
    playingCardEmphasisClassName(emphasis),
    toneClassNameMap[tone]
  );
}

export function normalizePlayingCardPresentation(
  presentation?: PlayingCardPresentation
): Required<PlayingCardPresentation> {
  return {
    fit: presentation?.fit || 'intrinsic',
    width: presentation?.width || 'default',
    emphasis: presentation?.emphasis || 'none',
  };
}

export function playingCardFitClassName(fit: PlayingCardFit = 'intrinsic') {
  if (fit === 'fillWidth') return 'w-full max-w-none';
  if (fit === 'fillHeight') return 'h-full max-h-full';
  if (fit === 'contain') return 'h-full max-h-full w-auto max-w-full';
  return '';
}

export function playingCardWidthPresetClassName(width: PlayingCardWidthPreset = 'default') {
  if (width === 'handFull') return 'w-72 max-w-none md:w-80';
  if (width === 'dockSmall') return 'w-28 sm:w-32 2xl:w-36';
  if (width === 'dockSmallStack') return 'w-24 sm:w-28 2xl:w-32';
  if (width === 'dockMedium') return 'w-32 sm:w-36 xl:w-40';
  if (width === 'dockMediumStack') return 'w-28 sm:w-32 xl:w-36';
  if (width === 'dockLarge') return 'w-32 sm:w-36 xl:w-36 2xl:w-40';
  if (width === 'dockLargeStack') return 'w-28 sm:w-32 xl:w-32 2xl:w-36';
  if (width === 'viewportConstrained') return 'max-w-[min(24rem,calc((100vh-8rem)*5/7))]';
  return '';
}

export function playingCardEmphasisClassName(emphasis: PlayingCardEmphasis = 'none') {
  if (emphasis === 'glow') return 'shadow-glow-primary';
  if (emphasis === 'handEmphasis') {
    return 'duration-500 hover:!z-50 hover:-translate-y-5 hover:scale-[1.03] hover:drop-shadow-2xl focus-within:!z-50 focus-within:-translate-y-5 focus-within:scale-[1.03] focus-within:drop-shadow-2xl';
  }
  if (emphasis === 'handStack') return 'duration-500';
  if (emphasis === 'dockHover') {
    return 'translate-y-0 duration-500 hover:!z-50 hover:-translate-y-2 hover:scale-110 hover:drop-shadow-2xl focus-within:!z-50 focus-within:-translate-y-2 focus-within:scale-110 focus-within:drop-shadow-2xl';
  }
  return '';
}

export function playingCardOverlayClassName(placement: PlayingCardOverlayPlacement) {
  return cn(
    'absolute z-50 flex',
    placement === 'top-left-inside' && 'left-3 top-3',
    placement === 'top-right-inside' && 'right-3 top-3',
    placement === 'bottom-left-inside' && 'bottom-3 left-3',
    placement === 'bottom-right-inside' && 'bottom-3 right-3',
    placement === 'bottom-right-outside' && 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 justify-end'
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
