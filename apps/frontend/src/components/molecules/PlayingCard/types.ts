import type { CSSProperties, ReactNode } from 'react';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';

export type PlayingCardSize = 'nano' | 'mini' | 'full';

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

export type CardFaceMode = 'content' | 'genericBack';

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
  position?: 'top-left' | 'top-right' | 'center';
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

export interface CardStatsSlot {
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

export interface CardRibbonSlot {
  text?: CardTextSlot;
  icon?: CardIconSlot;
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

export interface CardFaceModel {
  mode?: CardFaceMode;
  title?: CardTextSlot;
  subtitle?: CardTextSlot;
  description?: CardTextSlot;
  icon?: CardIconSlot;
  color?: CardColorSlot;
  art?: CardImageSlot;
  ribbon?: CardRibbonSlot;
  stats?: CardStatsSlot;
  metadata?: CardMetadataSlot;
  institutional?: CardInstitutionalSlot;
  genericBack?: CardGenericBackSlot;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export interface PlayingCardModel {
  front: CardFaceModel;
  back?: CardFaceModel;
}

export interface PlayingCardVariantOptions {
  size?: PlayingCardSize;
  tone?: CardTone;
  layout?: 'standard' | 'compact' | 'detail';
  state?: 'readonly' | 'editable' | 'disabled' | 'faceDown';
  color?: CSSProperties['color'];
}
