import type { CSSProperties, ReactNode } from 'react';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';

export type PlayingCardSize = 'nano' | 'mini' | 'full' | 'page';

export type PlayingCardFit = 'intrinsic' | 'fillWidth' | 'fillHeight' | 'contain';

export type PlayingCardWidthPreset =
  | 'default'
  | 'activityPage'
  | 'handFull'
  | 'dockSmall'
  | 'dockSmallStack'
  | 'dockMedium'
  | 'dockMediumStack'
  | 'dockLarge'
  | 'dockLargeStack'
  | 'viewportConstrained';

export type PlayingCardEmphasis =
  | 'none'
  | 'glow'
  | 'handEmphasis'
  | 'handStack'
  | 'dockHover';

export interface PlayingCardPresentation {
  fit?: PlayingCardFit;
  width?: PlayingCardWidthPreset;
  emphasis?: PlayingCardEmphasis;
}

export type PlayingCardOverlayPlacement =
  | 'top-left-inside'
  | 'top-right-inside'
  | 'bottom-left-inside'
  | 'bottom-right-inside'
  | 'bottom-right-outside';

export interface PlayingCardOverlay {
  id: string;
  content: ReactNode;
  placement: PlayingCardOverlayPlacement;
  className?: string;
  interactive?: boolean;
}

export type PlayingCardKind =
  | 'activity'
  | 'character'
  | 'cohort'
  | 'guild'
  | 'reward'
  | 'school'
  | 'student';

export type CardTone =
  | 'default'
  | 'quest'
  | 'boss'
  | 'guild'
  | 'character'
  | 'school'
  | 'cohort'
  | 'student'
  | 'reward';

export interface CardSlot<TValue> {
  value?: TValue;
  fallback?: TValue;
  editable?: boolean;
  onChange?: (value: TValue) => void | Promise<void>;
}

export interface CardTextSlot extends CardSlot<string> {
  variant?: 'title' | 'subtitle' | 'description' | 'ribbon' | 'metadata' | 'label';
  placeholder?: string;
  multiline?: boolean;
}

export interface CardIconSlot extends CardSlot<string> {
  icon?: ReactNode;
  label?: string;
  color?: CSSProperties['color'];
  colored?: boolean;
  searchPlaceholder?: string;
  defaultIconIds?: string[];
  limit?: number;
}

export interface CardColorSlot extends CardSlot<string> {
  variant?: 'inline' | 'popover' | 'grid';
  palette?: 'solarized';
}

export interface CardImageSlot extends CardSlot<string> {
  alt?: string;
  node?: ReactNode;
  hidden?: boolean;
  upload?: (file: File) => Promise<string | void>;
  uploadErrorMessageKey?: string;
}

export interface CardStatValue {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
  min?: number;
  max?: number;
}

export interface PlayingCardStatsSlot {
  values?: CardStatValue[];
  label?: string;
  editable?: boolean;
  remainingValue?: number;
  remainingValueLabel?: string;
  getEditableRange?: (statId: string, currentValue: number) => { min: number; max: number };
  onChange?: (statId: string, value: number) => void;
  radar?: {
    axes: RadarGraphAxis[];
    datasets: RadarGraphDataset[];
    maxValue?: number;
    levels?: number;
  };
}

export type PlayingCardTypeVariant = 'class' | 'rank' | 'cost' | 'votes' | 'new' | 'custom';

export interface PlayingCardTypeSlot {
  variant: PlayingCardTypeVariant;
  text?: CardTextSlot;
  icon?: CardIconSlot;
  value?: string | number;
  position?: CornerRibbonPosition;
  hidden?: boolean;
  className?: string;
  contentInteractive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface CardMetadataItem {
  id: string;
  label: string;
  value?: ReactNode;
}

export interface CardSection {
  id: string;
  title?: CardTextSlot;
  description?: CardTextSlot;
  items?: CardMetadataItem[];
  content?: ReactNode;
  actions?: ReactNode;
}

export interface CardMetadataSlot {
  sections?: CardSection[];
}

export interface PlayingCardInfoSlot {
  stats?: PlayingCardStatsSlot;
  sections?: CardSection[];
  content?: ReactNode;
  placement?: 'body' | 'aside';
}

export interface CardInstitutionalSlot {
  sections?: CardSection[];
}

export interface CardGenericBackSlot {
  mode?: 'css' | 'svg' | 'icon' | 'pattern';
  icon?: CardIconSlot;
  svgUrl?: string;
  svgAlt?: string;
  pattern?: 'radial' | 'grid' | 'arcane' | 'institution';
  tone?: CardTone;
}

export interface PlayingCardFaceSlots {
  title?: CardTextSlot;
  subtitle?: CardTextSlot;
  art?: CardImageSlot;
  type?: PlayingCardTypeSlot;
  color?: CardColorSlot;
  icon?: CardIconSlot;
  info?: PlayingCardInfoSlot;
  actions?: ReactNode;
  back?: CardGenericBackSlot;
  className?: string;
}

export type PlayingCardFace = PlayingCardFaceSlots | null | 'none';

export interface PlayingCardModel {
  front: PlayingCardFace;
  back?: PlayingCardFace;
}

export interface PlayingCardVariantOptions {
  size?: PlayingCardSize;
  tone?: CardTone;
  layout?: 'standard' | 'compact' | 'detail';
  state?: 'readonly' | 'editable' | 'disabled' | 'faceDown';
  color?: CSSProperties['color'];
  fit?: PlayingCardFit;
  width?: PlayingCardWidthPreset;
  emphasis?: PlayingCardEmphasis;
}
