import { isValidElement, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { GameCharacterClass, Guild } from '@eduquest/shared';
import { motion } from 'framer-motion';
import { RotateCw, Shield } from 'lucide-react';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import { EditableSchoolLogo } from '../EditableSchoolLogo';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';
import { cn } from '../../../utils/cn';
import { readFileAsDataUrl } from '../../../utils/readFileAsDataUrl';
import {
  PLAYING_CARD_TRANSITION,
  PlayingCardArtFrame,
  PlayingCardIllustration,
  PlayingCardRibbon,
  PlayingCardStatPanel,
  PlayingCardTitleBlock,
} from './PlayingCardParts';

export type PlayingCardSize = 'mini' | 'full';

export type PlayingCardAccent =
  | 'scholar'
  | 'champion'
  | 'guide'
  | 'specialist'
  | 'quest'
  | 'campfire'
  | 'completed'
  | 'boss'
  | 'danger'
  | 'neutral';

export interface PlayingCardStat {
  id: string;
  label: string;
  value: number;
  max?: number;
}

export type PlayingCardEditableField =
  | 'title'
  | 'subtitle'
  | 'description'
  | 'illustrationUrl'
  | 'ribbonText';

export interface PlayingCardSide {
  title: string;
  description?: string;
  subtitle?: string;
  color?: CSSProperties['color'];
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  ribbonText?: string;
  ribbonPosition?: CornerRibbonPosition;
  stats?: PlayingCardStat[];
  statsLabel?: string;
  footer?: ReactNode;
  editable?: boolean;
  onFieldChange?: (field: PlayingCardEditableField, value: string) => void;
  onStatChange?: (statId: string, value: number) => void;
  className?: string;
}

export type PlayingCardBack = ReactNode | PlayingCardSide;

export interface PlayingCardData {
  id?: string;
  layoutId?: string;
  kind?: 'character' | 'guild';
  title?: string;
  subtitle?: string;
  description?: string;
  guild?: Pick<Guild, 'id' | 'name' | 'color' | 'iconUrl' | 'totalPoints'>;
  characterClass?: GameCharacterClass;
  accentToken?: PlayingCardAccent;
  color?: CSSProperties['color'];
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  faceDown?: boolean;
  ribbonText?: string;
  ribbonLabel?: string;
  ribbonPosition?: CornerRibbonPosition;
  ribbonClassName?: string;
  stats?: PlayingCardStat[];
  statsLabel?: string;
  footer?: ReactNode;
  frontContent?: ReactNode;
  front?: PlayingCardSide;
  back?: PlayingCardBack;
  backSvgUrl?: string;
  backSvgAlt?: string;
  flipLabel?: string;
  interactive?: boolean;
  editable?: boolean;
  onFieldChange?: (field: PlayingCardEditableField, value: string) => void;
  onStatChange?: (statId: string, value: number) => void;
  onClick?: () => void;
  className?: string;
  innerClassName?: string;
  sideClassName?: string;
}

export interface PlayingCardProps extends PlayingCardData {
  size?: PlayingCardSize;
  auraClassName?: string;
}

type AccentStyle = CSSProperties & {
  '--playing-card-accent': string;
};

const DEFAULT_CARD_COLOR = 'var(--color-status-quest)';

const CHARACTER_CLASS_ACCENTS: Record<GameCharacterClass, PlayingCardAccent> = {
  scholar: 'scholar',
  champion: 'champion',
  guide: 'guide',
  specialist: 'specialist',
};

const ACCENT_COLOR_MAP: Record<PlayingCardAccent, string> = {
  scholar: 'var(--color-accent-scholar)',
  champion: 'var(--color-accent-champion)',
  guide: 'var(--color-accent-guide)',
  specialist: 'var(--color-accent-specialist)',
  quest: 'var(--color-status-quest)',
  campfire: 'var(--color-status-campfire)',
  completed: 'var(--color-status-completed)',
  boss: 'var(--color-status-boss)',
  danger: 'var(--color-status-danger)',
  neutral: 'var(--color-accent-neutral)',
};

export function PlayingCard({
  size = 'mini',
  auraClassName,
  className,
  innerClassName,
  sideClassName,
  interactive = true,
  onClick,
  ...card
}: PlayingCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const front = resolveFrontSide(card);
  const color = resolveCardColor(card, front);
  const style: AccentStyle = { '--playing-card-accent': color };
  const layoutId = card.layoutId || card.id;
  const isFull = size === 'full';
  const hasBack = Boolean(isFull && (card.back || card.backSvgUrl));

  return (
    <motion.article
      layoutId={layoutId}
      role={onClick ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={interactive ? undefined : true}
      aria-label={interactive ? front.title : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick();
      }}
      style={style}
      transition={PLAYING_CARD_TRANSITION}
      className={cn(
        'group relative aspect-[5/7] min-h-0 overflow-hidden rounded-[1.4rem] border border-[color:var(--playing-card-accent)] bg-gaming-card shadow-2xl outline-none',
        'transition-[filter,box-shadow] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--playing-card-accent)]',
        isFull ? 'w-full max-w-sm p-2' : 'w-32 sm:w-36',
        card.faceDown && !isFull && 'bg-gaming-base',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[color:var(--playing-card-accent)] opacity-10" />

      <motion.div
        animate={{ rotateY: isFull && isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'relative h-full min-h-0 w-full rounded-[1.1rem] [transform-style:preserve-3d]',
          auraClassName,
          innerClassName
        )}
      >
        <CardFace className="absolute inset-0 [backface-visibility:hidden]">
          {card.frontContent ? (
            card.frontContent
          ) : (
            <PlayingCardFront
              card={card}
              side={front}
              size={size}
              color={color}
              ribbonClassName={card.ribbonClassName}
              layoutId={layoutId}
              className={sideClassName}
            />
          )}
        </CardFace>

        {hasBack ? (
          <CardFace className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {resolveBackContent(card, color, sideClassName)}
          </CardFace>
        ) : null}
      </motion.div>

      {isFull && hasBack ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsFlipped((current) => !current);
          }}
          aria-label={card.flipLabel || 'Flip card'}
          title={card.flipLabel || 'Flip card'}
          className="absolute bottom-3 right-3 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-gaming-border bg-gaming-base/95 text-text-secondary shadow-xl transition hover:scale-110 hover:border-status-quest hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-quest"
        >
          <RotateCw size={24} aria-hidden />
        </button>
      ) : null}
    </motion.article>
  );
}

interface PlayingCardFrontProps {
  card: PlayingCardData;
  side: PlayingCardSide;
  size: PlayingCardSize;
  color: string;
  ribbonClassName?: string;
  layoutId?: string;
  className?: string;
}

function PlayingCardFront({
  card,
  side,
  size,
  color,
  ribbonClassName,
  layoutId,
  className,
}: PlayingCardFrontProps) {
  if (card.faceDown) {
    return <FaceDownCard color={color} size={size} className={className} />;
  }

  if (size === 'full') {
    return <FullCardSide side={side} color={color} layoutId={layoutId} className={className} />;
  }

  return (
    <div className={cn('relative h-full min-h-0 overflow-hidden rounded-[1.25rem]', className)}>
      {side.ribbonText ? (
        <PlayingCardRibbon
          layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
          position={side.ribbonPosition || 'top-right'}
          size="sm"
          color={color}
          ribbonClassName={ribbonClassName}
        >
          {side.ribbonText}
        </PlayingCardRibbon>
      ) : null}

      <PlayingCardArtFrame size="mini" layoutId={layoutId ? `${layoutId}-art-frame` : undefined}>
        <PlayingCardIllustration
          title={side.title}
          illustrationUrl={side.illustrationUrl}
          illustrationAlt={side.illustrationAlt}
          illustration={side.illustration}
          iconSize={42}
          layoutId={layoutId ? `${layoutId}-illustration` : undefined}
        />
      </PlayingCardArtFrame>

      <PlayingCardTitleBlock
        title={side.title}
        subtitle={side.subtitle}
        size="mini"
        layoutId={layoutId ? `${layoutId}-title` : undefined}
      />
    </div>
  );
}

function FullCardSide({
  side,
  color,
  layoutId,
  className,
}: {
  side: PlayingCardSide;
  color: string;
  layoutId?: string;
  className?: string;
}) {
  const radarGraph = buildRadarGraph(side.stats, side.statsLabel || side.title, color);
  const canEdit = Boolean(side.editable);
  const updateField = (field: PlayingCardEditableField, value: string) => {
    side.onFieldChange?.(field, value);
  };
  const updateIllustrationFromFile = async (file: File) => {
    updateField('illustrationUrl', await readFileAsDataUrl(file));
  };

  return (
    <EditableFieldContext.Provider value={{ showPencil: canEdit }}>
      <div
        aria-label={side.title}
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.1rem] border border-gaming-border bg-gaming-card/95',
          className,
          side.className
        )}
      >
        {side.ribbonText || canEdit ? (
          <PlayingCardRibbon
            layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
            position={side.ribbonPosition || 'top-right'}
            size="md"
            color={color}
          >
            {canEdit ? (
              <EditableText
                value={side.ribbonText || ''}
                onChange={(value) => updateField('ribbonText', value)}
                placeholder="Ribbon"
                className="text-inherit"
                truncate={false}
              />
            ) : (
              side.ribbonText
            )}
          </PlayingCardRibbon>
        ) : null}

        <PlayingCardArtFrame size="full" layoutId={layoutId ? `${layoutId}-art-frame` : undefined}>
          {canEdit ? (
            <motion.div
              layoutId={layoutId ? `${layoutId}-illustration` : undefined}
              transition={PLAYING_CARD_TRANSITION}
              className="absolute inset-0"
              onClick={(event) => event.stopPropagation()}
            >
              <EditableSchoolLogo
                src={side.illustrationUrl}
                name={side.illustrationAlt || side.title}
                isEditing
                canReset={Boolean(side.illustrationUrl)}
                onUpload={updateIllustrationFromFile}
                onReset={() => {
                  updateField('illustrationUrl', '');
                  return Promise.resolve();
                }}
                className="h-full rounded-none border-0 bg-transparent p-0"
              />
            </motion.div>
          ) : (
            <PlayingCardIllustration
              title={side.title}
              illustrationUrl={side.illustrationUrl}
              illustrationAlt={side.illustrationAlt}
              illustration={side.illustration}
              iconSize={72}
              layoutId={layoutId ? `${layoutId}-illustration` : undefined}
            />
          )}
          <PlayingCardTitleBlock
            title={side.title}
            subtitle={side.subtitle}
            size="full"
            layoutId={layoutId ? `${layoutId}-title` : undefined}
            editable={canEdit}
            onTitleChange={(value) => updateField('title', value)}
          />
        </PlayingCardArtFrame>

        <section className="relative flex max-h-[43%] shrink-0 gap-3 border-t border-gaming-border bg-gaming-card/95 p-4">
          <div className="min-w-0 flex-1 text-left">
            {side.subtitle || canEdit ? (
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
                {canEdit ? (
                  <EditableText
                    value={side.subtitle || ''}
                    onChange={(value) => updateField('subtitle', value)}
                    placeholder="Subtitle"
                    className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted"
                    truncate={false}
                  />
                ) : (
                  side.subtitle
                )}
              </div>
            ) : null}
            {side.description || canEdit ? (
              canEdit ? (
                <EditableText
                  multiline
                  value={side.description || ''}
                  onChange={(value) => updateField('description', value)}
                  placeholder="Card description"
                  truncate={false}
                  className="text-sm leading-relaxed text-text-secondary"
                />
              ) : (
                <p className="line-clamp-6 text-sm leading-relaxed text-text-secondary">
                  {side.description}
                </p>
              )
            ) : null}
            {side.footer ? <div className="mt-3 text-sm text-text-secondary">{side.footer}</div> : null}
          </div>

          {radarGraph ? (
            <PlayingCardStatPanel
              axes={radarGraph.axes}
              datasets={radarGraph.datasets}
              layoutId={layoutId ? `${layoutId}-stats` : undefined}
              editable={canEdit && Boolean(side.onStatChange)}
              onValueChange={side.onStatChange}
            />
          ) : null}
        </section>
      </div>
    </EditableFieldContext.Provider>
  );
}

function FaceDownCard({ color, size, className }: { color: string; size: PlayingCardSize; className?: string }) {
  return (
    <div className={cn('relative h-full min-h-0 overflow-hidden rounded-[1.1rem] p-2', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--playing-card-accent)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[0.9rem] border border-dashed border-[color:var(--playing-card-accent)] bg-gaming-base/80 text-[color:var(--playing-card-accent)]">
        <Shield size={size === 'full' ? 72 : 38} aria-hidden color={color} />
      </div>
    </div>
  );
}

function CardFace({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('h-full min-h-0 overflow-hidden rounded-[1.1rem]', className)}>{children}</div>;
}

function resolveFrontSide(card: PlayingCardData): PlayingCardSide {
  if (card.front) {
    return {
      ...card.front,
      ribbonText: card.front.ribbonText || card.ribbonText || card.ribbonLabel,
      editable: card.front.editable ?? card.editable,
      onFieldChange: card.front.onFieldChange || card.onFieldChange,
      onStatChange: card.front.onStatChange || card.onStatChange,
    };
  }

  const title = card.title || card.guild?.name || (card.characterClass ? formatCharacterClass(card.characterClass) : card.kind || 'Card');

  return {
    title,
    subtitle: card.subtitle,
    description: card.description || card.subtitle,
    color: card.color,
    illustrationUrl: card.illustrationUrl || card.guild?.iconUrl,
    illustrationAlt: card.illustrationAlt || title,
    illustration: card.illustration,
    ribbonText: card.ribbonText || card.ribbonLabel,
    ribbonPosition: card.ribbonPosition,
    stats: card.stats,
    statsLabel: card.statsLabel,
    footer: card.footer,
      editable: card.editable,
      onFieldChange: card.onFieldChange,
      onStatChange: card.onStatChange,
  };
}

function resolveBackContent(card: PlayingCardData, color: string, className?: string) {
  if (isPlayingCardSide(card.back)) {
    return <FullCardSide side={card.back} color={card.back.color || color} className={className} />;
  }

  if (card.back && isValidElement(card.back)) {
    return card.back;
  }

  return <DefaultCardBack svgUrl={card.backSvgUrl} svgAlt={card.backSvgAlt || 'Card back'} className={className} />;
}

function DefaultCardBack({ svgUrl, svgAlt, className }: { svgUrl?: string; svgAlt: string; className?: string }) {
  return (
    <div className={cn('relative flex h-full min-h-0 items-center justify-center rounded-[1.1rem] bg-gaming-card p-4', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-status-quest)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[1rem] border border-gaming-border bg-gaming-base/90 p-4">
        {svgUrl ? (
          <img src={svgUrl} alt={svgAlt} className="h-full max-h-full w-auto max-w-full object-contain" />
        ) : (
          <Shield size={84} aria-label={svgAlt} className="text-status-quest" />
        )}
      </div>
    </div>
  );
}

function isPlayingCardSide(value: PlayingCardBack | undefined): value is PlayingCardSide {
  return Boolean(value && typeof value === 'object' && !isValidElement(value) && 'title' in value);
}

function resolveCardColor(card: PlayingCardData, front: PlayingCardSide) {
  if (front.color) return front.color;
  if (card.color) return card.color;
  const accent = resolveAccentToken(card.accentToken || card.guild?.color, card.characterClass);
  return ACCENT_COLOR_MAP[accent] || DEFAULT_CARD_COLOR;
}

function resolveAccentToken(value: string | undefined, characterClass?: GameCharacterClass): PlayingCardAccent {
  if (value && value in ACCENT_COLOR_MAP) return value as PlayingCardAccent;
  if (characterClass) return CHARACTER_CLASS_ACCENTS[characterClass];
  return 'quest';
}

function formatCharacterClass(characterClass: GameCharacterClass) {
  return characterClass.charAt(0).toUpperCase() + characterClass.slice(1);
}

function buildRadarGraph(stats: PlayingCardStat[] | undefined, label: string, color: string) {
  if (!stats?.length) return null;

  const axes: RadarGraphAxis[] = stats.map((stat) => ({
    id: stat.id,
    label: stat.label,
    max: stat.max,
  }));
  const values = stats.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.id] = stat.value;
    return accumulator;
  }, {});
  const datasets: RadarGraphDataset[] = [
    {
      id: 'stats',
      label,
      values,
      color,
    },
  ];

  return { axes, datasets };
}

export default PlayingCard;
