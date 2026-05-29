import { isValidElement, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
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
  UI_COLOR_TOKENS,
  resolvePlayingCardAccentClassName,
  resolveUiColorTokenName,
  resolveUiColorTokenValue,
  type UiColorTokenName,
} from '../../../styles/colorTokens';
import { renderLucideIcon } from '../../../features/game/lucideIconCatalog';
import { ColorSwatchPicker } from '../ColorSwatchPicker';
import {
  PLAYING_CARD_TRANSITION,
  PlayingCardArtFrame,
  PlayingCardIllustration,
  PlayingCardRibbon,
  PlayingCardStatPanel,
  PlayingCardTitleBlock,
} from './PlayingCardParts';
import {
  PLAYING_CARD_SIZE_LAYOUTS,
  normalizePlayingCardPresentation,
  playingCardBackClassName,
  playingCardDetailPanelClassName,
  playingCardFaceClassName,
  playingCardInnerClassName,
  playingCardOverlayClassName,
  playingCardRootClassName,
} from './cardVariants';
import { CardSection } from './slots';
import type {
  CardFaceMode,
  CardFaceModel,
  CardGenericBackSlot,
  CardInstitutionalSlot,
  CardMetadataSlot,
  PlayingCardOverlay,
  PlayingCardPresentation,
  PlayingCardSize,
  PlayingCardModel,
} from './types';

export type {
  CardFaceModel,
  CardGenericBackSlot,
  CardInstitutionalSlot,
  CardMetadataSlot,
  PlayingCardOverlay,
  PlayingCardPresentation,
  PlayingCardSize,
  PlayingCardModel,
} from './types';

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
  mode?: CardFaceMode;
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
  footerPlacement?: 'body' | 'aside';
  titleAccessory?: ReactNode;
  colorEditable?: boolean;
  editable?: boolean;
  ribbonEditable?: boolean;
  metadata?: CardMetadataSlot;
  institutional?: CardInstitutionalSlot;
  genericBack?: CardGenericBackSlot;
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
  footerPlacement?: 'body' | 'aside';
  titleAccessory?: ReactNode;
  colorEditable?: boolean;
  frontContent?: ReactNode;
  model?: PlayingCardModel;
  front?: PlayingCardSide;
  back?: PlayingCardBack;
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
  presentation?: PlayingCardPresentation;
  overlays?: PlayingCardOverlay[];
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
  presentation,
  overlays,
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
  const front = card.model?.front ? resolveModelSide(card.model.front, card) : resolveFrontSide(card);
  const accent = resolveCardAccent(card, front);
  const color = resolveCardColor(card, front, accent);
  const layoutId = card.disableLayoutAnimation ? undefined : card.layoutId || card.id;
  const isFull = size === 'full';
  const hasBack = Boolean(isFull && (card.model?.back || card.back));
  const isActionable = Boolean(onClick);
  const normalizedPresentation = normalizePlayingCardPresentation(presentation);
  const hasOutsideOverlay = overlays?.some((overlay) => overlay.placement.endsWith('-outside'));

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
        playingCardRootClassName({
          size,
          tone: resolveCardTone(card),
          state: card.faceDown || front.mode === 'genericBack' ? 'faceDown' : card.editable ? 'editable' : 'readonly',
          ...normalizedPresentation,
        }),
        resolvePlayingCardAccentClassName(color, accent),
        hasOutsideOverlay && 'overflow-visible',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[color:var(--playing-card-accent)] opacity-10" />

      <motion.div
        animate={{ rotateY: isFull && isFlipped ? 180 : 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          playingCardInnerClassName(size),
          auraClassName,
          innerClassName
        )}
      >
        <CardFace
          className={cn(
            playingCardFaceClassName(size)
          )}
        >
          {card.frontContent && !card.model ? (
            card.frontContent
          ) : (
            <PlayingCardFace
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
              playingCardBackClassName(),
              isFull && 'overflow-visible'
            )}
          >
            {resolveBackContent(card, color, sideClassName, t('playingCard.backAlt'))}
          </CardFace>
        ) : null}
      </motion.div>

      {isFull && hasBack ? (
        <PlayingCardOverlaySlot
          overlay={{
            id: 'flip',
            placement: 'bottom-right-inside',
            interactive: true,
            content: (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsFlipped((current) => !current);
                }}
                aria-label={card.flipLabel || t('playingCard.flip')}
                title={card.flipLabel || t('playingCard.flip')}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-gaming-border bg-gaming-base/95 text-text-secondary shadow-xl transition hover:scale-110 hover:border-status-quest hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-status-quest"
              >
                <RotateCw size={24} aria-hidden />
              </button>
            ),
          }}
        />
      ) : null}

      {overlays?.map((overlay) => (
        <PlayingCardOverlaySlot key={overlay.id} overlay={overlay} />
      ))}
    </motion.article>
  );
}

function PlayingCardOverlaySlot({ overlay }: { overlay: PlayingCardOverlay }) {
  return (
    <div
      className={cn(
        playingCardOverlayClassName(overlay.placement),
        overlay.interactive === false ? 'pointer-events-none' : 'pointer-events-auto',
        overlay.className
      )}
    >
      {overlay.content}
    </div>
  );
}

interface PlayingCardFaceProps {
  card: PlayingCardData;
  side: PlayingCardSide;
  size: PlayingCardSize;
  color: string;
  ribbonClassName?: string;
  layoutId?: string;
  className?: string;
}

function PlayingCardFace({
  card,
  side,
  size,
  color,
  ribbonClassName,
  layoutId,
  className,
}: PlayingCardFaceProps) {
  const layout = PLAYING_CARD_SIZE_LAYOUTS[size];
  const { t } = useTranslation();
  const canEdit = Boolean(side.editable);
  const canEditRibbon = canEdit && side.ribbonEditable !== false;

  if (card.faceDown || side.mode === 'genericBack') {
    return (
      <FaceDownCard
        kind={card.kind}
        color={color}
        size={size}
        editable={Boolean(card.editable)}
        genericBack={side.genericBack}
        fallbackTitle={side.title}
        className={className}
      />
    );
  }

  return (
    <EditableFieldContext.Provider value={{ showPencil: canEdit }}>
      <div className={cn(layout.shellClassName, className, side.className)} aria-label={side.title}>
      {!side.ribbonHidden && (side.ribbonText || side.ribbonIconKey || side.ribbonIcon) ? (
        <div
          className={cn(
            layout.revealCompactDetailsOnHover &&
              'absolute inset-0 z-30 origin-top-right scale-50 opacity-0 transition-[opacity,transform] duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100'
          )}
        >
          <PlayingCardRibbon
            layoutId={layoutId ? `${layoutId}-ribbon` : undefined}
            position={side.ribbonPosition || 'top-right'}
            size={layout.ribbonSize}
            color={color}
            icon={canEditRibbon && side.ribbonIconKey ? undefined : resolveRibbonIcon(card, side)}
            editableText={
              canEditRibbon && side.ribbonText
                ? {
                    value: side.ribbonText || '',
                    onChange: (value) => side.onFieldChange?.('ribbonText', value),
                    placeholder: t('playingCard.placeholders.ribbon'),
                    className: 'text-inherit',
                  }
                : undefined
            }
            editableIcon={
              canEditRibbon && side.ribbonIconKey
                ? {
                    value: side.ribbonIconKey,
                    onChange: (value) => side.onFieldChange?.('ribbonIcon', value),
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
        </div>
      ) : null}

      <PlayingCardArtFrame
        size={layout.artFrameSize}
        layoutId={layoutId ? `${layoutId}-art-frame` : undefined}
        className={layout.artFrameClassName}
        gradientClassName={layout.artFrameGradientClassName}
      >
        {side.illustrationHidden ? null : (
          <CardIllustrationSlot
            kind={card.kind}
            side={side}
            size={layout.illustrationIconSize}
            canEdit={layout.showDetailPanel && Boolean(side.editable)}
            layoutId={layoutId}
          />
        )}
        <PlayingCardTitleBlock
          title={side.title}
          subtitle={side.subtitle}
          size={layout.titleSize}
          layoutId={layoutId ? `${layoutId}-title` : undefined}
          editable={layout.showDetailPanel && canEdit}
          onTitleChange={(value) => side.onFieldChange?.('title', value)}
          titleAccessory={
            layout.showDetailPanel && canEdit && side.colorEditable !== false && side.onColorChange ? (
              <>
                <ColorSwatchPicker
                  value={color}
                  onChange={(value) => side.onColorChange?.(value)}
                  variant="popover"
                  ariaLabel={t('activityCard.cardColor')}
                  useColorLabelKey="activityCard.useCardColor"
                />
                {side.titleAccessory}
              </>
            ) : (
              side.titleAccessory
            )
          }
          className={layout.titleClassName}
        />
      </PlayingCardArtFrame>

      {layout.showDetailPanel ? (
        <PlayingCardDetailPanel side={side} color={color} layoutId={layoutId} />
      ) : null}
      </div>
    </EditableFieldContext.Provider>
  );
}

function CardIllustrationSlot({
  kind,
  side,
  size,
  canEdit,
  layoutId,
}: {
  kind?: PlayingCardData['kind'];
  side: PlayingCardSide;
  size: PlayingCardSize;
  canEdit: boolean;
  layoutId?: string;
}) {
  const updateField = (field: PlayingCardEditableField, value: string) => {
    side.onFieldChange?.(field, value);
  };
  const updateIllustrationFromFile = async (file: File) => {
    if (side.onIllustrationUpload) {
      const uploadedUrl = await side.onIllustrationUpload(file);
      if (uploadedUrl) updateField('illustrationUrl', uploadedUrl);
      return;
    }

    updateField('illustrationUrl', await readFileAsDataUrl(file));
  };

  if (canEdit && (!side.illustration || side.illustrationUrl)) {
    return (
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
    );
  }

  return (
    <PlayingCardIllustration
      title={side.title}
      illustrationUrl={side.illustrationUrl}
      illustrationAlt={side.illustrationAlt}
      illustration={side.illustration}
      iconSize={getIllustrationIconSize(kind, size)}
      layoutId={layoutId ? `${layoutId}-illustration` : undefined}
    />
  );
}

function PlayingCardDetailPanel({
  side,
  color,
  layoutId,
}: {
  side: PlayingCardSide;
  color: string;
  layoutId?: string;
}) {
  const { t } = useTranslation();
  const radarGraph = buildRadarGraph(side.stats, side.statsLabel || side.title, color);
  const canEdit = Boolean(side.editable);
  const canEditStats = canEdit && side.statsEditable !== false && Boolean(side.onStatChange);
  const updateField = (field: PlayingCardEditableField, value: string) => {
    side.onFieldChange?.(field, value);
  };

  return (
    <section className={playingCardDetailPanelClassName()}>
      <div className="min-w-0 flex-1 space-y-3 text-left">
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
        {side.footer && side.footerPlacement !== 'aside' ? (
          <div className="mt-3 text-sm text-text-secondary">{side.footer}</div>
        ) : null}
        <CardSections metadata={side.metadata} institutional={side.institutional} />
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
      ) : side.footer && side.footerPlacement === 'aside' ? (
        <div className="flex w-36 shrink-0 items-center justify-center">
          {side.footer}
        </div>
      ) : null}
    </section>
  );
}

function CardSections({
  metadata,
  institutional,
}: {
  metadata?: CardMetadataSlot;
  institutional?: CardInstitutionalSlot;
}) {
  const sections = [...(metadata?.sections || []), ...(institutional?.sections || [])];
  if (!sections.length) return null;

  return (
    <div className="grid gap-2">
      {sections.map((section) => (
        <CardSection key={section.id} section={section} />
      ))}
    </div>
  );
}

function FaceDownCard({
  kind,
  color,
  size,
  editable,
  genericBack,
  fallbackTitle,
  className,
}: {
  kind?: PlayingCardData['kind'];
  color: string;
  size: PlayingCardSize;
  editable?: boolean;
  genericBack?: CardGenericBackSlot;
  fallbackTitle?: string;
  className?: string;
}) {
  const Icon = getFaceDownIcon(kind);
  const iconSize = size === 'full' ? 72 : 38;
  const plusSize = size === 'full' ? 38 : 22;
  const iconKey = genericBack?.icon?.value || genericBack?.icon?.fallback;
  const icon = genericBack?.icon?.icon || (iconKey ? renderLucideIcon(iconKey, iconSize) : null);
  const svgAlt = genericBack?.svgAlt || fallbackTitle || 'Card back';

  return (
    <div className={cn('relative h-full min-h-0 overflow-hidden rounded-[1.1rem] p-2', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--playing-card-accent)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[0.9rem] border border-dashed border-[color:var(--playing-card-accent)] bg-gaming-base/80 text-[color:var(--playing-card-accent)]">
        {genericBack?.svgUrl ? (
          <img
            src={genericBack.svgUrl}
            alt={svgAlt}
            className={cn('h-full max-h-full w-auto max-w-full object-contain', editable && 'opacity-35')}
          />
        ) : icon ? (
          <span className={cn('text-[color:var(--playing-card-accent)]', editable && 'opacity-35')} aria-hidden>
            {icon}
          </span>
        ) : (
          <Icon size={iconSize} aria-hidden color={color} className={cn(editable && 'opacity-35')} />
        )}
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
    footerPlacement: card.footerPlacement,
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
  _fallbackAlt: string
) {
  if (card.model?.back) {
    const side = resolveModelSide(card.model.back, card);
    return (
      <PlayingCardFace
        card={{ ...card, faceDown: false }}
        side={side}
        size="full"
        color={side.color ? String(side.color) : color}
        ribbonClassName={card.ribbonClassName}
        className={className}
      />
    );
  }

  if (isPlayingCardSide(card.back)) {
    return (
      <PlayingCardFace
        card={{ ...card, faceDown: false }}
        side={{
          ...card.back,
          statsEditable: card.back.statsEditable ?? card.statsEditable ?? card.kind !== 'guild',
        }}
        size="full"
        color={card.back.color || color}
        className={className}
      />
    );
  }

  if (card.back && isValidElement(card.back)) {
    return card.back;
  }

  return null;
}

function resolveModelSide(model: CardFaceModel, card: PlayingCardData): PlayingCardSide {
  const title = model.title?.value || model.title?.fallback || card.title || card.kind || 'Card';
  const subtitle = model.subtitle?.value || model.subtitle?.fallback;
  const description = model.description?.value || model.description?.fallback;
  const ribbonText = model.ribbon?.text?.value || model.ribbon?.text?.fallback;
  const ribbonIconKey = model.ribbon?.icon?.value || model.ribbon?.icon?.fallback;
  const artValue = model.art?.value || model.art?.fallback;

  return {
    mode: model.mode,
    title,
    subtitle,
    description,
    color: model.color?.value || model.color?.fallback || card.color,
    illustrationUrl: artValue,
    illustrationAlt: model.art?.alt || title,
    illustration: model.art?.node,
    illustrationHidden: model.art?.hidden,
    ribbonText,
    ribbonIcon: model.ribbon?.icon?.icon,
    ribbonIconKey,
    ribbonPosition: model.ribbon?.position,
    ribbonHidden: model.ribbon?.hidden,
    ribbonEditable: model.ribbon?.text?.editable || model.ribbon?.icon?.editable,
    stats: model.stats?.values,
    statsLabel: model.stats?.label,
    statsEditable: model.stats?.editable,
    statPointsRemaining: model.stats?.remainingValue,
    statPointsRemainingLabel: model.stats?.remainingValueLabel,
    getStatEditableRange: model.stats?.getEditableRange,
    footer: model.footer,
    footerPlacement: model.footerPlacement,
    titleAccessory: model.actions,
    colorEditable: model.color?.editable,
    editable:
      model.title?.editable ||
      model.subtitle?.editable ||
      model.description?.editable ||
      model.art?.editable ||
      model.color?.editable ||
      model.ribbon?.text?.editable ||
      model.ribbon?.icon?.editable ||
      model.stats?.editable,
    metadata: model.metadata,
    institutional: model.institutional,
    genericBack: model.genericBack,
    onFieldChange: (field, value) => {
      if (field === 'title') void model.title?.onChange?.(value);
      if (field === 'subtitle') void model.subtitle?.onChange?.(value);
      if (field === 'description') void model.description?.onChange?.(value);
      if (field === 'illustrationUrl') void model.art?.onChange?.(value);
      if (field === 'ribbonText') void model.ribbon?.text?.onChange?.(value);
      if (field === 'ribbonIcon') void model.ribbon?.icon?.onChange?.(value);
    },
    onIllustrationUpload: model.art?.upload,
    illustrationUploadErrorMessageKey: model.art?.uploadErrorMessageKey,
    onColorChange: model.color?.onChange,
    onStatChange: model.stats?.onChange,
    onRibbonClick: model.ribbon?.onClick,
    className: model.className,
  };
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

function resolveCardTone(card: PlayingCardData) {
  if (card.kind === 'activity') return 'quest';
  if (card.kind === 'cohort') return 'cohort';
  if (card.kind === 'guild') return 'guild';
  if (card.kind === 'reward') return 'reward';
  if (card.kind === 'school') return 'school';
  if (card.kind === 'student') return 'student';
  if (card.kind === 'character') return 'character';
  return 'default';
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
