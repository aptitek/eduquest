import { isValidElement, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { GameCharacterClass, Guild } from '@eduquest/shared';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Compass,
  Gift,
  GraduationCap,
  HandHelping,
  Plus,
  RotateCw,
  School,
  Shield,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import { EditableSchoolLogo } from '../EditableSchoolLogo';
import type { CornerRibbonPosition } from '../../atoms/CornerRibbon';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';
import { cn } from '../../../utils/cn';
import { readFileAsDataUrl } from '../../../utils/readFileAsDataUrl';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  DEFAULT_UI_COLOR_TOKEN,
  SOLARIZED_SWATCH_OPTIONS,
  UI_COLOR_TOKENS,
  resolveColorBackgroundClassName,
  resolvePlayingCardAccentClassName,
  resolveUiColorTokenName,
  resolveUiColorTokenValue,
  type UiColorTokenName,
} from '../../../styles/colorTokens';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import {
  PLAYING_CARD_TRANSITION,
  PlayingCardArtFrame,
  PlayingCardIllustration,
  PlayingCardRibbon,
  PlayingCardStatPanel,
  PlayingCardTitleBlock,
} from './PlayingCardParts';

export type PlayingCardSize = 'nano' | 'mini' | 'full';

export type PlayingCardAccent = UiColorTokenName;

export interface PlayingCardStat {
  id: string;
  label: string;
  value: number;
  displayValue?: string;
  min?: number;
  max?: number;
}

export type PlayingCardEditableField =
  | 'title'
  | 'subtitle'
  | 'description'
  | 'illustrationUrl'
  | 'ribbonText'
  | 'ribbonIcon';

export interface PlayingCardSide {
  title: string;
  description?: string;
  subtitle?: string;
  color?: CSSProperties['color'];
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  illustrationHidden?: boolean;
  ribbonText?: string;
  ribbonIcon?: ReactNode;
  ribbonIconKey?: string;
  ribbonPosition?: CornerRibbonPosition;
  ribbonHidden?: boolean;
  stats?: PlayingCardStat[];
  statsLabel?: string;
  statsEditable?: boolean;
  statPointsRemaining?: number;
  statPointsRemainingLabel?: string;
  getStatEditableRange?: (statId: string, currentValue: number) => { min: number; max: number };
  footer?: ReactNode;
  titleAccessory?: ReactNode;
  colorEditable?: boolean;
  editable?: boolean;
  ribbonEditable?: boolean;
  onFieldChange?: (field: PlayingCardEditableField, value: string) => void;
  onIllustrationUpload?: (file: File) => Promise<string | void>;
  illustrationUploadErrorMessageKey?: string;
  onColorChange?: (color: string) => void;
  onStatChange?: (statId: string, value: number) => void;
  onRibbonClick?: () => void;
  className?: string;
}

export type PlayingCardBack = ReactNode | PlayingCardSide;

export interface PlayingCardData {
  id?: string;
  layoutId?: string;
  disableLayoutAnimation?: boolean;
  kind?: 'activity' | 'character' | 'cohort' | 'guild' | 'reward' | 'school' | 'student';
  title?: string;
  subtitle?: string;
  description?: string;
  guild?: Pick<Guild, 'id' | 'name' | 'color' | 'iconUrl' | 'iconKey' | 'gold'>;
  characterClass?: GameCharacterClass;
  accentToken?: PlayingCardAccent;
  color?: CSSProperties['color'];
  illustrationUrl?: string;
  illustrationAlt?: string;
  illustration?: ReactNode;
  illustrationHidden?: boolean;
  faceDown?: boolean;
  ribbonText?: string;
  ribbonLabel?: string;
  ribbonIcon?: ReactNode;
  ribbonIconKey?: string;
  ribbonPosition?: CornerRibbonPosition;
  ribbonClassName?: string;
  stats?: PlayingCardStat[];
  statsLabel?: string;
  statsEditable?: boolean;
  statPointsRemaining?: number;
  statPointsRemainingLabel?: string;
  getStatEditableRange?: (statId: string, currentValue: number) => { min: number; max: number };
  footer?: ReactNode;
  titleAccessory?: ReactNode;
  colorEditable?: boolean;
  frontContent?: ReactNode;
  front?: PlayingCardSide;
  back?: PlayingCardBack;
  backSvgUrl?: string;
  backSvgAlt?: string;
  flipLabel?: string;
  interactive?: boolean;
  editable?: boolean;
  ribbonEditable?: boolean;
  onFieldChange?: (field: PlayingCardEditableField, value: string) => void;
  onColorChange?: (color: string) => void;
  onStatChange?: (statId: string, value: number) => void;
  onRibbonClick?: () => void;
  onClick?: () => void;
  onPointerEnter?: () => void;
  className?: string;
  innerClassName?: string;
  sideClassName?: string;
}

export interface PlayingCardProps extends PlayingCardData {
  size?: PlayingCardSize;
  auraClassName?: string;
}

const CHARACTER_CLASS_ACCENTS: Record<GameCharacterClass, PlayingCardAccent> = {
  scholar: 'scholar',
  champion: 'champion',
  guide: 'guide',
  specialist: 'specialist',
};
const GAME_STAT_IDS = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
const GAME_STAT_MAX_VALUE = 5;

export function PlayingCard({
  size = 'mini',
  auraClassName,
  className,
  innerClassName,
  sideClassName,
  interactive = true,
  onClick,
  onPointerEnter,
  ...card
}: PlayingCardProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(false);
  const front = resolveFrontSide(card);
  const accent = resolveCardAccent(card, front);
  const color = resolveCardColor(card, front, accent);
  const layoutId = card.disableLayoutAnimation ? undefined : card.layoutId || card.id;
  const isFull = size === 'full';
  const isNano = size === 'nano';
  const hasBack = Boolean(isFull && (card.back || card.backSvgUrl));
  const isActionable = Boolean(onClick);

  return (
    <motion.article
      layoutId={layoutId}
      role={isActionable ? 'button' : undefined}
      tabIndex={interactive && isActionable ? 0 : undefined}
      aria-label={isActionable ? front.title : undefined}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onKeyDown={(event) => {
        if (!isActionable || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick?.();
      }}
      transition={PLAYING_CARD_TRANSITION}
      className={cn(
        'group relative aspect-[5/7] min-h-0 overflow-hidden rounded-[1.4rem] border border-[color:var(--playing-card-accent)] bg-gaming-card shadow-2xl outline-none',
        'transition-[filter,box-shadow,width,transform,border-radius] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--playing-card-accent)]',
        resolvePlayingCardAccentClassName(color, accent),
        isFull && 'w-full max-w-sm p-2',
        !isFull && !isNano && 'w-32 sm:w-36',
        isNano &&
          'w-[2.15rem] rounded-lg p-0.5 shadow-lg hover:z-50 hover:w-32 hover:translate-y-1 hover:rounded-[1.4rem] hover:shadow-2xl focus-within:z-50 focus-within:w-32 focus-within:translate-y-1 focus-within:rounded-[1.4rem] focus-within:shadow-2xl sm:hover:w-36 sm:focus-within:w-36',
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
          isNano && 'rounded-lg group-hover:rounded-[1.1rem] group-focus-within:rounded-[1.1rem]',
          auraClassName,
          innerClassName
        )}
      >
        <CardFace
          className={cn(
            'absolute inset-0 [backface-visibility:hidden]',
            isFull && 'overflow-visible'
          )}
        >
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
          <CardFace
            className={cn(
              'absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]',
              isFull && 'overflow-visible'
            )}
          >
            {resolveBackContent(card, color, sideClassName, t('playingCard.backAlt'))}
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
          aria-label={card.flipLabel || t('playingCard.flip')}
          title={card.flipLabel || t('playingCard.flip')}
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
    return (
      <FaceDownCard
        kind={card.kind}
        color={color}
        size={size}
        editable={Boolean(card.editable)}
        className={className}
      />
    );
  }

  if (size === 'full') {
    return (
      <FullCardSide
        kind={card.kind}
        side={side}
        color={color}
        ribbonClassName={ribbonClassName}
        layoutId={layoutId}
        className={className}
      />
    );
  }

  if (size === 'nano') {
    return (
      <div
        className={cn(
          'relative h-full min-h-0 overflow-hidden rounded-[0.45rem] transition-[border-radius] duration-300 group-hover:rounded-[1.25rem] group-focus-within:rounded-[1.25rem]',
          className
        )}
      >
        {!side.ribbonHidden && (side.ribbonText || side.ribbonIconKey || side.ribbonIcon) ? (
          <div className="absolute inset-0 z-30 origin-top-right scale-50 opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100">
            <PlayingCardRibbon
              layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
              position={side.ribbonPosition || 'top-right'}
              size="sm"
              color={color}
              icon={resolveRibbonIcon(card, side)}
              ribbonClassName={ribbonClassName}
              onClick={side.onRibbonClick}
              ariaLabel={side.onRibbonClick ? side.ribbonText : undefined}
            >
              {side.ribbonText}
            </PlayingCardRibbon>
          </div>
        ) : null}

        <PlayingCardArtFrame
          size="mini"
          layoutId={layoutId ? `${layoutId}-art-frame` : undefined}
          className="absolute inset-0 rounded-[0.45rem] border-0 bg-transparent transition-all duration-300 group-hover:inset-x-3 group-hover:bottom-12 group-hover:top-3 group-hover:rounded-[1.05rem] group-hover:border group-hover:border-gaming-border group-hover:bg-gaming-base group-focus-within:inset-x-3 group-focus-within:bottom-12 group-focus-within:top-3 group-focus-within:rounded-[1.05rem] group-focus-within:border group-focus-within:border-gaming-border group-focus-within:bg-gaming-base"
          gradientClassName="opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {side.illustrationHidden ? null : (
            <PlayingCardIllustration
              title={side.title}
              illustrationUrl={side.illustrationUrl}
              illustrationAlt={side.illustrationAlt}
              illustration={side.illustration}
              iconSize={getIllustrationIconSize(card.kind, 'nano')}
              layoutId={layoutId ? `${layoutId}-illustration` : undefined}
            />
          )}
        </PlayingCardArtFrame>

        <PlayingCardTitleBlock
          title={side.title}
          subtitle={side.subtitle}
          size="mini"
          layoutId={layoutId ? `${layoutId}-title` : undefined}
          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        />
      </div>
    );
  }

  return (
    <div className={cn('relative h-full min-h-0 overflow-hidden rounded-[1.25rem]', className)}>
      {!side.ribbonHidden && (side.ribbonText || side.ribbonIconKey || side.ribbonIcon) ? (
        <PlayingCardRibbon
          layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
          position={side.ribbonPosition || 'top-right'}
          size="sm"
          color={color}
          icon={resolveRibbonIcon(card, side)}
          ribbonClassName={ribbonClassName}
          onClick={side.onRibbonClick}
          ariaLabel={side.onRibbonClick ? side.ribbonText : undefined}
        >
          {side.ribbonText}
        </PlayingCardRibbon>
      ) : null}

      <PlayingCardArtFrame size="mini" layoutId={layoutId ? `${layoutId}-art-frame` : undefined}>
        {side.illustrationHidden ? null : (
          <PlayingCardIllustration
            title={side.title}
            illustrationUrl={side.illustrationUrl}
            illustrationAlt={side.illustrationAlt}
            illustration={side.illustration}
            iconSize={getIllustrationIconSize(card.kind, 'mini')}
            layoutId={layoutId ? `${layoutId}-illustration` : undefined}
          />
        )}
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
  kind,
  side,
  color,
  ribbonClassName,
  layoutId,
  className,
}: {
  kind?: PlayingCardData['kind'];
  side: PlayingCardSide;
  color: string;
  ribbonClassName?: string;
  layoutId?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const radarGraph = buildRadarGraph(side.stats, side.statsLabel || side.title, color);
  const canEdit = Boolean(side.editable);
  const canEditStats = canEdit && side.statsEditable !== false && Boolean(side.onStatChange);
  const canEditRibbon = canEdit && side.ribbonEditable !== false;
  const canEditColor = canEdit && kind === 'guild' && side.colorEditable !== false && Boolean(side.onColorChange);
  const updateField = (field: PlayingCardEditableField, value: string) => {
    side.onFieldChange?.(field, value);
  };
  const updateIllustrationFromFile = async (file: File) => {
    if (side.onIllustrationUpload) {
      const uploadedUrl = await side.onIllustrationUpload(file);
      if (uploadedUrl) {
        updateField('illustrationUrl', uploadedUrl);
      }
      return;
    }

    updateField('illustrationUrl', await readFileAsDataUrl(file));
  };

  return (
    <EditableFieldContext.Provider value={{ showPencil: canEdit }}>
      <div
        aria-label={side.title}
        className={cn(
          'relative flex h-full min-h-0 flex-col overflow-visible rounded-[1.1rem] border border-gaming-border bg-gaming-card/95',
          className,
          side.className
        )}
      >
        {!side.ribbonHidden && (side.ribbonText || side.ribbonIconKey || side.ribbonIcon || canEdit) ? (
          <PlayingCardRibbon
            layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
            position={side.ribbonPosition || 'top-right'}
            size="md"
            color={color}
            icon={resolveRibbonIcon(undefined, side)}
            editableText={
              canEditRibbon && side.ribbonText
                ? {
                    value: side.ribbonText || '',
                    onChange: (value) => updateField('ribbonText', value),
                    placeholder: t('playingCard.placeholders.ribbon'),
                    className: 'text-inherit',
                  }
                : undefined
            }
            editableIcon={
              canEditRibbon && side.ribbonIconKey
                ? {
                    value: side.ribbonIconKey,
                    onChange: (value) => updateField('ribbonIcon', value),
                  }
                : undefined
            }
            ribbonClassName={ribbonClassName}
            contentInteractive={canEditRibbon}
            onClick={side.onRibbonClick}
            ariaLabel={side.onRibbonClick ? side.ribbonText : undefined}
          >
            {canEditRibbon ? null : side.ribbonText}
          </PlayingCardRibbon>
        ) : null}

        <PlayingCardArtFrame size="full" layoutId={layoutId ? `${layoutId}-art-frame` : undefined}>
          {side.illustrationHidden ? null : canEdit && (!side.illustration || side.illustrationUrl) ? (
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
                uploadErrorMessageKey={side.illustrationUploadErrorMessageKey}
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
              iconSize={getIllustrationIconSize(kind, 'full')}
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
            titleAccessory={
              canEditColor ? (
                <>
                  <GuildColorPicker color={color} onColorChange={(value) => side.onColorChange?.(value)} />
                  {side.titleAccessory}
                </>
              ) : (
                side.titleAccessory
              )
            }
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
                    placeholder={t('playingCard.placeholders.subtitle')}
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
                  placeholder={t('playingCard.placeholders.description')}
                  truncate={false}
                  className="text-sm leading-relaxed text-text-secondary"
                />
              ) : (
                <p className="line-clamp-6 text-sm leading-relaxed text-text-secondary">
                  {side.description}
                </p>
              )
            ) : null}
            {side.footer ? (
              <div className="mt-3 text-sm text-text-secondary">{side.footer}</div>
            ) : null}
          </div>

          {radarGraph ? (
            <PlayingCardStatPanel
              axes={radarGraph.axes}
              datasets={radarGraph.datasets}
              maxValue={radarGraph.maxValue}
              levels={radarGraph.levels}
              layoutId={layoutId ? `${layoutId}-stats` : undefined}
              editable={canEditStats}
              editableDatasetId={radarGraph.editableDatasetId}
              remainingValue={side.statPointsRemaining}
              remainingValueLabel={side.statPointsRemainingLabel}
              getEditableRange={side.getStatEditableRange}
              onValueChange={side.onStatChange}
            />
          ) : null}
        </section>
      </div>
    </EditableFieldContext.Provider>
  );
}

function GuildColorPicker({
  color,
  onColorChange,
}: {
  color: string;
  onColorChange: (color: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 16 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = 160;
      const margin = 16;
      setPanelPosition({
        top: rect.bottom + 8,
        left: Math.min(window.innerWidth - panelWidth - margin, Math.max(margin, rect.left + rect.width / 2 - panelWidth / 2)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className={cn(
          'h-7 w-7 rounded-full border border-gaming-border shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-status-quest',
          resolveColorBackgroundClassName(color)
        )}
        aria-label="Changer la couleur de la guilde"
        aria-expanded={isOpen}
        title="Changer la couleur"
      />

      {isOpen
        ? createPortal(
            <span
              ref={panelRef}
              className="fixed z-[120] grid w-40 grid-cols-3 gap-2 rounded-2xl border border-gaming-border bg-gaming-card/95 p-3 shadow-2xl backdrop-blur"
              style={{ top: panelPosition.top, left: panelPosition.left }}
            >
              {SOLARIZED_SWATCH_OPTIONS.map((option) => {
                const isSelected = color === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onColorChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'h-8 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-status-quest',
                      isSelected
                        ? 'border-text-primary bg-gaming-card p-0.5 shadow-glow-primary'
                        : 'border-gaming-border bg-gaming-base p-1 hover:border-status-quest'
                    )}
                    aria-label={`Utiliser la couleur ${option.label}`}
                    aria-pressed={isSelected}
                    title={option.label}
                  >
                    <span className={cn('block h-full w-full rounded-md shadow-sm', option.className)} aria-hidden />
                  </button>
                );
              })}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

function FaceDownCard({
  kind,
  color,
  size,
  editable,
  className,
}: {
  kind?: PlayingCardData['kind'];
  color: string;
  size: PlayingCardSize;
  editable?: boolean;
  className?: string;
}) {
  const Icon = getFaceDownIcon(kind);
  const iconSize = size === 'full' ? 72 : 38;
  const plusSize = size === 'full' ? 38 : 22;

  return (
    <div className={cn('relative h-full min-h-0 overflow-hidden rounded-[1.1rem] p-2', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--playing-card-accent)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[0.9rem] border border-dashed border-[color:var(--playing-card-accent)] bg-gaming-base/80 text-[color:var(--playing-card-accent)]">
        <Icon size={iconSize} aria-hidden color={color} className={cn(editable && 'opacity-35')} />
        {editable ? (
          <div className={cn('absolute flex', size === 'full' ? 'bottom-5 right-5' : 'bottom-2 right-2')}>
            <span
              className={cn(
                'flex items-center justify-center rounded-full border border-status-completed/60 bg-status-completed text-gaming-base shadow-glow-primary',
                size === 'full' ? 'h-20 w-20' : 'h-10 w-10'
              )}
            >
              <Plus size={plusSize} aria-hidden strokeWidth={3} />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getFaceDownIcon(kind: PlayingCardData['kind'] | undefined) {
  if (kind === 'activity') return Compass;
  if (kind === 'character') return User;
  if (kind === 'cohort') return GraduationCap;
  if (kind === 'reward') return Gift;
  if (kind === 'school') return School;
  if (kind === 'student') return User;
  return Shield;
}

function CardFace({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('h-full min-h-0 overflow-hidden rounded-[1.1rem]', className)}>
      {children}
    </div>
  );
}

function resolveFrontSide(card: PlayingCardData): PlayingCardSide {
  if (card.front) {
    return {
      ...card.front,
      ribbonText: card.front.ribbonText || card.ribbonText || card.ribbonLabel,
      ribbonIconKey: card.front.ribbonIconKey || card.ribbonIconKey,
      ribbonIcon:
        card.front.ribbonIcon || card.ribbonIcon || getCharacterClassIcon(card.characterClass),
      illustrationHidden: card.front.illustrationHidden,
      editable: card.front.editable ?? card.editable,
      colorEditable: card.front.colorEditable ?? card.colorEditable,
      ribbonEditable: card.front.ribbonEditable ?? card.ribbonEditable,
      ribbonHidden: card.front.ribbonHidden,
      statsEditable: card.front.statsEditable ?? card.statsEditable ?? card.kind !== 'guild',
      statPointsRemaining: card.front.statPointsRemaining ?? card.statPointsRemaining,
      statPointsRemainingLabel:
        card.front.statPointsRemainingLabel ?? card.statPointsRemainingLabel,
      getStatEditableRange: card.front.getStatEditableRange || card.getStatEditableRange,
      onFieldChange: card.front.onFieldChange || card.onFieldChange,
      onColorChange: card.front.onColorChange || card.onColorChange,
      onIllustrationUpload: card.front.onIllustrationUpload,
      onStatChange: card.front.onStatChange || card.onStatChange,
      onRibbonClick: card.front.onRibbonClick || card.onRibbonClick,
    };
  }

  const title =
    card.title ||
    card.guild?.name ||
    (card.characterClass ? formatCharacterClass(card.characterClass) : card.kind || 'Card');

  return {
    title,
    subtitle: card.subtitle,
    description: card.description || card.subtitle,
    color: card.color,
    illustrationUrl: card.illustrationUrl || card.guild?.iconUrl,
    illustrationAlt: card.illustrationAlt || title,
    illustration: card.illustration,
    illustrationHidden: card.illustrationHidden,
    ribbonText: card.ribbonText || card.ribbonLabel,
    ribbonIconKey: card.ribbonIconKey,
    ribbonIcon: card.ribbonIcon || getCharacterClassIcon(card.characterClass),
    ribbonPosition: card.ribbonPosition,
    ribbonHidden: false,
    stats: card.stats,
    statsLabel: card.statsLabel,
    statsEditable: card.statsEditable ?? card.kind !== 'guild',
    statPointsRemaining: card.statPointsRemaining,
    statPointsRemainingLabel: card.statPointsRemainingLabel,
    getStatEditableRange: card.getStatEditableRange,
    footer: card.footer,
      titleAccessory: card.titleAccessory,
    colorEditable: card.colorEditable,
    editable: card.editable,
    ribbonEditable: card.ribbonEditable,
    onFieldChange: card.onFieldChange,
    onColorChange: card.onColorChange,
    onStatChange: card.onStatChange,
    onRibbonClick: card.onRibbonClick,
  };
}

function resolveRibbonIcon(card: PlayingCardData | undefined, side: PlayingCardSide) {
  if (side.ribbonIconKey) return renderLucideIcon(side.ribbonIconKey, 18);
  return side.ribbonIcon || getCharacterClassIcon(card?.characterClass);
}

function getCharacterClassIcon(characterClass?: GameCharacterClass) {
  if (characterClass === 'scholar') return <BookOpen size={18} aria-hidden />;
  if (characterClass === 'champion') return <Trophy size={18} aria-hidden />;
  if (characterClass === 'guide') return <HandHelping size={18} aria-hidden />;
  if (characterClass === 'specialist') return <Sparkles size={18} aria-hidden />;
  return undefined;
}

function getIllustrationIconSize(kind: PlayingCardData['kind'] | undefined, size: PlayingCardSize) {
  if (kind === 'reward') {
    if (size === 'full') return 132;
    if (size === 'mini') return 58;
    return 30;
  }

  if (size === 'full') return 72;
  if (size === 'mini') return 42;
  return 24;
}

function resolveBackContent(
  card: PlayingCardData,
  color: string,
  className: string | undefined,
  fallbackAlt: string
) {
  if (isPlayingCardSide(card.back)) {
    return (
      <FullCardSide
        kind={card.kind}
        side={{
          ...card.back,
          statsEditable: card.back.statsEditable ?? card.statsEditable ?? card.kind !== 'guild',
        }}
        color={card.back.color || color}
        className={className}
      />
    );
  }

  if (card.back && isValidElement(card.back)) {
    return card.back;
  }

  return (
    <DefaultCardBack
      svgUrl={card.backSvgUrl}
      svgAlt={card.backSvgAlt || fallbackAlt}
      className={className}
    />
  );
}

function DefaultCardBack({
  svgUrl,
  svgAlt,
  className,
}: {
  svgUrl?: string;
  svgAlt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 items-center justify-center rounded-[1.1rem] bg-gaming-card p-4',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-status-quest)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[1rem] border border-gaming-border bg-gaming-base/90 p-4">
        {svgUrl ? (
          <img
            src={svgUrl}
            alt={svgAlt}
            className="h-full max-h-full w-auto max-w-full object-contain"
          />
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

function resolveCardAccent(card: PlayingCardData, front: PlayingCardSide) {
  return resolveAccentToken(
    card.accentToken || card.guild?.color || String(front.color || card.color || ''),
    card.characterClass
  );
}

function resolveCardColor(
  card: PlayingCardData,
  front: PlayingCardSide,
  accent: PlayingCardAccent
) {
  return String(
    front.color || card.color || UI_COLOR_TOKENS[accent] || UI_COLOR_TOKENS[DEFAULT_UI_COLOR_TOKEN]
  );
}

function resolveAccentToken(
  value: string | undefined,
  characterClass?: GameCharacterClass
): PlayingCardAccent {
  if (
    value &&
    (value in UI_COLOR_TOKENS || Object.values<string>(UI_COLOR_TOKENS).includes(value))
  ) {
    return resolveUiColorTokenName(value);
  }
  if (characterClass) return CHARACTER_CLASS_ACCENTS[characterClass];
  return resolveUiColorTokenName(value);
}

function formatCharacterClass(characterClass: GameCharacterClass) {
  return characterClass.charAt(0).toUpperCase() + characterClass.slice(1);
}

function buildRadarGraph(stats: PlayingCardStat[] | undefined, label: string, color: string) {
  if (!stats?.length) return null;

  const axes: RadarGraphAxis[] = stats.map((stat) => {
    const defaultMax = GAME_STAT_IDS.has(stat.id) ? GAME_STAT_MAX_VALUE : undefined;
    return {
      id: stat.id,
      label: stat.label,
      min: stat.min,
      max: stat.max ?? defaultMax,
    };
  });
  const values = stats.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.id] = stat.value;
    return accumulator;
  }, {});
  const valueLabels = stats.reduce<Record<string, string>>((accumulator, stat) => {
    if (stat.displayValue !== undefined) accumulator[stat.id] = stat.displayValue;
    return accumulator;
  }, {});
  const minValues = stats.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.id] = stat.min ?? 0;
    return accumulator;
  }, {});
  const maxValues = stats.reduce<Record<string, number>>((accumulator, stat) => {
    accumulator[stat.id] = stat.max ?? (GAME_STAT_IDS.has(stat.id) ? GAME_STAT_MAX_VALUE : stat.value);
    return accumulator;
  }, {});
  const hasRestrictedRange = stats.some((stat) => stat.min !== undefined || stat.max !== undefined);
  const datasets: RadarGraphDataset[] = [
    ...(hasRestrictedRange
      ? [
          {
            id: 'stat-limit-underlay',
            label: `${label} limit warning`,
            values: maxValues,
            color: resolveUiColorTokenValue('danger'),
            fillOpacity: 0.08,
            strokeOpacity: 0.32,
            strokeWidth: 1.7,
            strokeDasharray: '2.2 1.4',
          },
          {
            id: 'stat-maximum',
            label: `${label} maximum`,
            values: maxValues,
            color: 'rgba(248, 250, 252, 0.92)',
            fillOpacity: 0.035,
            strokeOpacity: 0.95,
            strokeWidth: 0.95,
            strokeDasharray: '1.8 1.35',
          },
        ]
      : []),
    {
      id: 'stats',
      label,
      values,
      valueLabels,
      color,
      fillOpacity: hasRestrictedRange ? 0.2 : 0.22,
    },
    ...(hasRestrictedRange
      ? [
          {
            id: 'stat-base',
            label: `${label} base`,
            values: minValues,
            color,
            fillOpacity: 0.72,
            strokeOpacity: 1,
            strokeWidth: 1.15,
          },
        ]
      : []),
  ];

  const axisMaxValues = axes.map((axis) => axis.max).filter((value): value is number => value !== undefined);
  const sharedMaxValue =
    axisMaxValues.length === axes.length && new Set(axisMaxValues).size === 1
      ? axisMaxValues[0]
      : undefined;

  return {
    axes,
    datasets,
    editableDatasetId: 'stats',
    maxValue: sharedMaxValue,
    levels: sharedMaxValue === GAME_STAT_MAX_VALUE ? GAME_STAT_MAX_VALUE : undefined,
  };
}

export default PlayingCard;
