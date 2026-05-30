import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  RotateCw,
  Shield,
} from 'lucide-react';
import { EditableFieldContext, EditableText } from '../../atoms/EditableText';
import { EditableIcon } from '../../atoms/EditableIcon';
import { EditableSchoolLogo } from '../EditableSchoolLogo';
import { ColorSwatchPicker } from '../ColorSwatchPicker';
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
  CardGenericBackSlot,
  CardStatValue,
  PlayingCardFace,
  PlayingCardFaceSlots,
  PlayingCardInfoSlot,
  PlayingCardKind,
  PlayingCardModel,
  PlayingCardOverlay,
  PlayingCardPresentation,
  PlayingCardSize,
} from './types';
import type { RadarGraphAxis, RadarGraphDataset } from '../RadarGraph';

export type {
  CardGenericBackSlot,
  PlayingCardFace,
  PlayingCardFaceSlots,
  PlayingCardInfoSlot,
  PlayingCardModel,
  PlayingCardOverlay,
  PlayingCardPresentation,
  PlayingCardSize,
} from './types';

export type PlayingCardAccent = UiColorTokenName;

export interface PlayingCardProps {
  id?: string;
  layoutId?: string;
  disableLayoutAnimation?: boolean;
  kind?: PlayingCardKind;
  accentToken?: PlayingCardAccent | string;
  model: PlayingCardModel;
  flipLabel?: string;
  interactive?: boolean;
  onClick?: () => void;
  onPointerEnter?: () => void;
  size?: PlayingCardSize;
  presentation?: PlayingCardPresentation;
  overlays?: PlayingCardOverlay[];
  auraClassName?: string;
  className?: string;
  innerClassName?: string;
  sideClassName?: string;
  autoFlipToBack?: boolean;
  onAutoFlipComplete?: () => void;
}

const GAME_STAT_IDS = new Set(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
const GAME_STAT_MAX_VALUE = 5;
const PLAYING_CARD_FLIP_DURATION_MS = 420;
const NANO_GUILD_CHROME_REVEAL_CLASSNAME =
  'pointer-events-none opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100';

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
  autoFlipToBack,
  onAutoFlipComplete,
  ...card
}: PlayingCardProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(false);
  const front = card.model.front;
  const isFull = size === 'full' || size === 'page';
  const displayedFront: PlayingCardFace = front;
  const displayedBack = card.model.back;
  const accent = resolveCardAccent(card.accentToken, card.kind, front);
  const color = resolveCardColor(front, accent);
  const layoutId = card.disableLayoutAnimation || autoFlipToBack ? undefined : card.layoutId || card.id;
  const hasBack = Boolean(isFull && displayedBack !== undefined);
  const shouldRotateToBack = Boolean(isFull && hasBack && isFlipped);
  const isActionable = Boolean(onClick);
  const normalizedPresentation = normalizePlayingCardPresentation(presentation);
  const state = isRenderedFaceDown(displayedFront)
    ? 'faceDown'
    : isFaceEditable(displayedFront)
      ? 'editable'
      : 'readonly';
  const ariaLabel = getFaceTitle(front);
  const shouldAutoFlipToBack = Boolean(isFull && autoFlipToBack && card.model.back !== undefined);
  const isAutoFlipReveal = Boolean(autoFlipToBack);
  const flipAction =
    isFull && hasBack && !isAutoFlipReveal ? (
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
    ) : undefined;

  useEffect(() => {
    if (!shouldAutoFlipToBack) return;

    setIsFlipped(false);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsFlipped(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [card.id, shouldAutoFlipToBack]);

  useEffect(() => {
    if (hasBack || !isFlipped) return;

    setIsFlipped(false);
  }, [card.id, card.kind, hasBack, isFlipped, size]);

  return (
    <motion.article
      layoutId={layoutId}
      role={isActionable ? 'button' : undefined}
      tabIndex={interactive && isActionable ? 0 : undefined}
      aria-label={isActionable ? ariaLabel : undefined}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onKeyDown={(event) => {
        if (isKeyboardEventFromEditableElement(event.target)) return;
        if (!isActionable || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        onClick?.();
      }}
      style={{ transformStyle: 'preserve-3d' }}
      className={cn(
        playingCardRootClassName({
          size,
          tone: resolveCardTone(card.kind),
          state,
          ...normalizedPresentation,
        }),
        resolvePlayingCardAccentClassName(color, accent),
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[color:var(--playing-card-accent)] opacity-10" />

      <div
        style={{
          transform: shouldRotateToBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: hasBack
            ? `transform ${PLAYING_CARD_FLIP_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : 'none',
        }}
        onTransitionEnd={(event) => {
          if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
          if (shouldRotateToBack && autoFlipToBack) onAutoFlipComplete?.();
        }}
        className={cn(playingCardInnerClassName(size), auraClassName, innerClassName)}
      >
        <CardFace className={playingCardFaceClassName()}>
          <PlayingCardFaceView
            face={displayedFront}
            kind={card.kind}
            size={size}
            color={color}
            layoutId={layoutId}
            className={sideClassName}
            actions={flipAction}
            actionable={isActionable}
          />
        </CardFace>

        {hasBack ? (
          <CardFace className={playingCardBackClassName()}>
            <PlayingCardFaceView
              face={displayedBack ?? null}
              kind={card.kind}
              size={size}
              color={resolveCardColor(displayedBack, accent, color)}
              layoutId={layoutId ? `${layoutId}-back` : undefined}
              className={sideClassName}
              actions={flipAction}
              actionable={false}
            />
          </CardFace>
        ) : null}
      </div>

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

function PlayingCardFaceView({
  face,
  kind,
  size,
  color,
  layoutId,
  className,
  actions,
  actionable,
}: {
  face: PlayingCardFace | undefined;
  kind?: PlayingCardKind;
  size: PlayingCardSize;
  color: string;
  layoutId?: string;
  className?: string;
  actions?: ReactNode;
  actionable?: boolean;
}) {
  const layout = PLAYING_CARD_SIZE_LAYOUTS[size];
  const genericBack = typeof face === 'object' && face ? face.back : undefined;
  const faceDownIcon = typeof face === 'object' && face ? getCardIcon(face, getFaceDownIconSize(size)) : undefined;

  if (isFaceDown(face) || genericBack) {
    return (
      <FaceDownCard
        color={color}
        size={size}
        genericBack={genericBack}
        fallbackTitle={getFaceTitle(face)}
        fallbackIcon={faceDownIcon}
        className={className}
        actionable={actionable}
      />
    );
  }
  const visibleFace = face;
  const canEditFace = layout.showDetailPanel && isFaceEditable(visibleFace);
  const titleBlock = (
    <PlayingCardTitleBlock
      title={getTextValue(visibleFace.title, 'Card')}
      subtitle={getTextValue(visibleFace.subtitle)}
      size={layout.titleSize}
      layoutId={layoutId ? `${layoutId}-title` : undefined}
      editable={layout.showDetailPanel && Boolean(visibleFace.title?.editable && visibleFace.title.onChange)}
      onTitleChange={
        visibleFace.title?.onChange ? (value) => void visibleFace.title?.onChange?.(value) : undefined
      }
      className={layout.titleClassName}
    />
  );

  return (
    <EditableFieldContext.Provider value={{ showPencil: canEditFace }}>
      <div className={cn(layout.shellClassName, className, visibleFace.className)} aria-label={getFaceTitle(visibleFace)}>
        <PlayingCardType
          face={visibleFace}
          kind={kind}
          cardSize={size}
          size={layout.ribbonSize}
          color={color}
          layoutId={layoutId}
        />
        <PlayingCardColorAction face={visibleFace} color={color} canEdit={canEditFace} />

        <PlayingCardArtFrame
          size={layout.artFrameSize}
          layoutId={layoutId ? `${layoutId}-art-frame` : undefined}
          className={layout.artFrameClassName}
          gradientClassName={layout.artFrameGradientClassName}
        >
          {visibleFace.art?.hidden ? null : (
            <CardArtSlot
              face={visibleFace}
              kind={kind}
              size={layout.illustrationIconSize}
              canEdit={layout.showDetailPanel && Boolean(visibleFace.art?.editable)}
              layoutId={layoutId}
            />
          )}
          <CardIconOverlay face={visibleFace} kind={kind} cardSize={size} />
          {layout.artFrameSize === 'full' ? titleBlock : null}
        </PlayingCardArtFrame>
        {layout.artFrameSize === 'mini' ? titleBlock : null}

        {layout.showDetailPanel ? (
          <PlayingCardDetailPanel face={visibleFace} color={color} layoutId={layoutId} actions={actions} />
        ) : null}
        {(visibleFace.actions || actions) && !layout.showDetailPanel ? (
          <div className="pointer-events-auto absolute bottom-3 right-3 z-40 flex items-center gap-2">
            {visibleFace.actions}
            {actions}
          </div>
        ) : null}
      </div>
    </EditableFieldContext.Provider>
  );
}

function PlayingCardType({
  face,
  kind,
  cardSize,
  size,
  color,
  layoutId,
}: {
  face: PlayingCardFaceSlots;
  kind?: PlayingCardKind;
  cardSize: PlayingCardSize;
  size: 'sm' | 'md';
  color: string;
  layoutId?: string;
}) {
  const renderGuildIconInType = shouldRenderGuildIconInType(kind, cardSize, face);
  const hideGuildChromeUntilExpanded = shouldHideRibbonUntilNanoExpanded(cardSize);
  const type = face.type || (renderGuildIconInType ? { variant: 'custom' as const } : undefined);
  const text = type?.text ? getTextValue(type.text) : type?.value === undefined ? undefined : String(type.value);
  const icon =
    type?.icon?.icon ||
    (type?.icon?.value ? renderLucideIcon(type.icon.value, 18) : undefined) ||
    (shouldRenderCardIconInType(face) || renderGuildIconInType ? getCardIcon(face, 18) : undefined);
  const editableText =
    type?.text?.editable && type.text.onChange
      ? {
          value: text || '',
          onChange: type.text.onChange,
          placeholder: type.text.placeholder,
          className: 'text-inherit',
        }
      : undefined;

  if (!type || type.hidden || (!text && !icon)) return null;

  return (
    <PlayingCardRibbon
      layoutId={layoutId ? `${layoutId}-type` : undefined}
      position={type.position || 'top-right'}
      size={size}
      color={color}
      icon={type.icon?.editable ? undefined : icon}
      className={hideGuildChromeUntilExpanded ? NANO_GUILD_CHROME_REVEAL_CLASSNAME : undefined}
      editableText={editableText}
      editableIcon={
        type.icon?.editable && type.icon.onChange && type.icon.value
          ? { value: type.icon.value, onChange: type.icon.onChange }
          : undefined
      }
      ribbonClassName={type.className}
      contentInteractive={Boolean(type.contentInteractive || editableText || type.icon?.editable)}
      onClick={type.onClick}
      ariaLabel={type.ariaLabel}
    >
      {editableText ? null : text}
    </PlayingCardRibbon>
  );
}

function PlayingCardColorAction({
  face,
  color,
  canEdit,
}: {
  face: PlayingCardFaceSlots;
  color: string;
  canEdit: boolean;
}) {
  const { t } = useTranslation();

  if (!canEdit || !face.color?.editable || !face.color.onChange) return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-40">
      <ColorSwatchPicker
        value={color}
        onChange={(value) => face.color?.onChange?.(value)}
        variant="popover"
        ariaLabel={t('activityCard.cardColor')}
        useColorLabelKey="activityCard.useCardColor"
      />
    </div>
  );
}

function CardArtSlot({
  face,
  kind,
  size,
  canEdit,
  layoutId,
}: {
  face: PlayingCardFaceSlots;
  kind?: PlayingCardKind;
  size: 'nano' | 'mini' | 'full';
  canEdit: boolean;
  layoutId?: string;
}) {
  const updateArtFromFile = async (file: File) => {
    if (face.art?.upload) {
      const uploadedUrl = await face.art.upload(file);
      if (uploadedUrl) void face.art.onChange?.(uploadedUrl);
      return;
    }

    void face.art?.onChange?.(await readFileAsDataUrl(file));
  };

  if (canEdit && (face.art?.value || face.art?.upload || !face.art?.node)) {
    return (
      <motion.div
        layoutId={layoutId ? `${layoutId}-illustration` : undefined}
        transition={PLAYING_CARD_TRANSITION}
        className="absolute inset-0"
        onClick={(event) => event.stopPropagation()}
      >
        <EditableSchoolLogo
          src={face.art?.value}
          name={face.art?.alt || getFaceTitle(face)}
          isEditing
          canReset={Boolean(face.art?.value)}
          uploadErrorMessageKey={face.art?.uploadErrorMessageKey}
          onUpload={updateArtFromFile}
          onReset={() => {
            void face.art?.onChange?.('');
            return Promise.resolve();
          }}
          className="h-full rounded-none border-0 bg-transparent p-0"
        />
      </motion.div>
    );
  }

  const artValue = face.art?.value || face.art?.fallback;
  const renderGuildIconInType = shouldRenderGuildIconInType(kind, size, face);
  const renderIconAsOverlay =
    Boolean(face.icon) && !shouldRenderCardIconInType(face) && !renderGuildIconInType;
  const fallbackIcon =
    !artValue && !face.art?.node && !renderIconAsOverlay
      ? getCardIcon(face, getIllustrationIconSize(kind, size))
      : undefined;

  return (
    <PlayingCardIllustration
      title={getFaceTitle(face)}
      illustrationUrl={artValue}
      illustrationAlt={face.art?.alt}
      illustration={
        face.art?.node ||
        fallbackIcon ||
        (!artValue && (renderIconAsOverlay || renderGuildIconInType) ? <span aria-hidden /> : undefined)
      }
      iconSize={getIllustrationIconSize(kind, size)}
      layoutId={layoutId ? `${layoutId}-illustration` : undefined}
    />
  );
}

function CardIconOverlay({
  face,
  kind,
  cardSize,
}: {
  face: PlayingCardFaceSlots;
  kind?: PlayingCardKind;
  cardSize: PlayingCardSize;
}) {
  if (kind === 'guild' && face.art?.editable) return null;
  if (shouldRenderGuildIconInType(kind, cardSize, face)) return null;
  if (shouldRenderCardIconInType(face)) return null;
  const icon = getCardIcon(face, 64);
  if (!icon) return null;
  const editableIcon: (typeof face.icon & { value: string; onChange: (value: string) => void | Promise<void> }) | undefined =
    face.icon?.editable && face.icon.onChange && face.icon.value && !face.icon.icon
      ? {
          ...face.icon,
          value: face.icon.value,
          onChange: face.icon.onChange,
        }
      : undefined;
  const isInteractiveIcon = Boolean(editableIcon || face.icon?.onChange);
  const hideGuildChromeUntilExpanded = shouldHideRibbonUntilNanoExpanded(cardSize);

  return (
    <div
      aria-label={face.icon?.label}
      className={cn(
        'absolute left-4 top-4 z-20 flex h-20 w-20 items-center justify-center rounded-2xl border border-gaming-border bg-gaming-card/70 text-text-muted shadow-card backdrop-blur',
        isInteractiveIcon ? 'pointer-events-auto' : 'pointer-events-none',
        (face.icon?.colored || face.icon?.color) && 'text-[color:var(--playing-card-accent)]',
        hideGuildChromeUntilExpanded && NANO_GUILD_CHROME_REVEAL_CLASSNAME
      )}
      style={face.icon?.color ? { color: String(face.icon.color) } : undefined}
      onClick={(event) => {
        if (isInteractiveIcon) event.stopPropagation();
      }}
    >
      {editableIcon ? (
        <EditableIcon
          value={editableIcon.value}
          onChange={editableIcon.onChange}
          label={editableIcon.label}
          searchPlaceholder={editableIcon.searchPlaceholder}
          defaultIconIds={editableIcon.defaultIconIds}
          limit={editableIcon.limit}
          size={64}
          buttonClassName="h-20 w-20 rounded-2xl bg-transparent text-inherit hover:bg-gaming-base/40 focus-visible:ring-status-quest/70"
          iconClassName="drop-shadow-lg"
        />
      ) : (
        icon
      )}
    </div>
  );
}

function PlayingCardDetailPanel({
  face,
  color,
  layoutId,
  actions,
}: {
  face: PlayingCardFaceSlots;
  color: string;
  layoutId?: string;
  actions?: ReactNode;
}) {
  const radarGraph = buildRadarGraph(face.info?.stats?.values, face.info?.stats?.label || getFaceTitle(face), color);
  const canEditSubtitle = Boolean(face.subtitle?.editable && face.subtitle.onChange);

  return (
    <section className={playingCardDetailPanelClassName()}>
      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto pr-2 text-left">
        {face.subtitle || canEditSubtitle ? (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">
            {canEditSubtitle ? (
              <EditableText
                value={getTextValue(face.subtitle)}
                onChange={(value) => void face.subtitle?.onChange?.(value)}
                placeholder={face.subtitle?.placeholder}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted"
                truncate={false}
              />
            ) : (
              getTextValue(face.subtitle)
            )}
          </div>
        ) : null}
        <CardDescriptionSlot face={face} />
        {face.info?.content && face.info.placement !== 'aside' ? (
          <div className="mt-3 text-sm text-text-secondary">{face.info.content}</div>
        ) : null}
        <CardSections info={face.info} />
      </div>

      {radarGraph ? (
        <PlayingCardStatPanel
          axes={radarGraph.axes}
          datasets={radarGraph.datasets}
          maxValue={radarGraph.maxValue}
          levels={radarGraph.levels}
          layoutId={layoutId ? `${layoutId}-stats` : undefined}
          editable={Boolean(face.info?.stats?.editable)}
          editableDatasetId={radarGraph.editableDatasetId}
          remainingValue={face.info?.stats?.remainingValue}
          remainingValueLabel={face.info?.stats?.remainingValueLabel}
          getEditableRange={face.info?.stats?.getEditableRange}
          onValueChange={face.info?.stats?.onChange}
        />
      ) : face.info?.content && face.info.placement === 'aside' ? (
        <div className="flex w-36 shrink-0 items-center justify-center">{face.info.content}</div>
      ) : null}

      {(face.actions || actions) ? (
        <div className="pointer-events-auto absolute bottom-3 right-3 z-40 flex items-center gap-2">
          {face.actions}
          {actions}
        </div>
      ) : null}
    </section>
  );
}

function CardDescriptionSlot({ face }: { face: PlayingCardFaceSlots }) {
  const description = face.info?.sections?.find((section) => section.id === 'description')?.description;
  const slot = description || undefined;

  if (!slot) return null;

  if (slot.editable && slot.onChange) {
    return (
      <EditableText
        multiline
        value={getTextValue(slot)}
        onChange={slot.onChange}
        placeholder={slot.placeholder}
        truncate={false}
        className="text-sm leading-relaxed text-text-secondary"
      />
    );
  }

  return <p className="line-clamp-6 text-sm leading-relaxed text-text-secondary">{getTextValue(slot)}</p>;
}

function CardSections({ info }: { info?: PlayingCardInfoSlot }) {
  const sections = (info?.sections || []).filter((section) => section.id !== 'description');
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
  color,
  size,
  genericBack,
  fallbackTitle,
  fallbackIcon,
  className,
  actionable,
}: {
  color: string;
  size: PlayingCardSize;
  genericBack?: CardGenericBackSlot;
  fallbackTitle?: string;
  fallbackIcon?: ReactNode;
  className?: string;
  actionable?: boolean;
}) {
  const iconSize = getFaceDownIconSize(size);
  const plusSize = size === 'full' || size === 'page' ? 38 : 22;
  const iconKey = genericBack?.icon?.value || genericBack?.icon?.fallback;
  const icon = genericBack?.icon?.icon || (iconKey ? renderLucideIcon(iconKey, iconSize) : fallbackIcon);
  const svgAlt = genericBack?.svgAlt || fallbackTitle || 'Card back';

  return (
    <div
      className={cn(
        'relative h-full min-h-0 overflow-hidden rounded-[1.1rem] p-2',
        !actionable && !genericBack && 'opacity-70',
        className
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--playing-card-accent)_0,transparent_62%)] opacity-20" />
      <div className="relative flex h-full w-full items-center justify-center rounded-[0.9rem] border border-dashed border-[color:var(--playing-card-accent)] bg-gaming-base/80 text-[color:var(--playing-card-accent)]">
        {genericBack?.svgUrl ? (
          <img
            src={genericBack.svgUrl}
            alt={svgAlt}
            className="h-full max-h-full w-auto max-w-full object-contain"
          />
        ) : icon ? (
          <span className="text-[color:var(--playing-card-accent)]" aria-hidden>
            {icon}
          </span>
        ) : (
          <Shield size={iconSize} aria-hidden color={color} />
        )}
        {actionable && !genericBack ? (
          <div className={cn('absolute flex', size === 'full' || size === 'page' ? 'bottom-5 right-5' : 'bottom-2 right-2')}>
            <span
              className={cn(
                'flex items-center justify-center rounded-full border border-status-completed/60 bg-status-completed text-gaming-base shadow-glow-primary',
                size === 'full' || size === 'page' ? 'h-20 w-20' : 'h-10 w-10'
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

function CardFace({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('h-full min-h-0 overflow-hidden rounded-[1.1rem]', className)}>{children}</div>;
}

function isFaceDown(face: PlayingCardFace | undefined): face is undefined | null | 'none' {
  return !face || face === 'none';
}

function isRenderedFaceDown(face: PlayingCardFace | undefined) {
  return isFaceDown(face) || Boolean(face.back);
}

function isFaceEditable(face: PlayingCardFace | undefined) {
  if (isFaceDown(face)) return false;
  return Boolean(
    face.title?.editable ||
      face.subtitle?.editable ||
      face.art?.editable ||
      face.color?.editable ||
      face.type?.text?.editable ||
      face.type?.icon?.editable ||
      face.info?.stats?.editable
  );
}

function getTextValue(slot: { value?: string; fallback?: string } | undefined, fallback = '') {
  return slot?.value ?? slot?.fallback ?? fallback;
}

function getFaceTitle(face: PlayingCardFace | undefined) {
  if (isFaceDown(face)) return 'Card';
  return getTextValue(face.title, 'Card');
}

function resolveCardAccent(
  accentToken: PlayingCardProps['accentToken'],
  kind: PlayingCardKind | undefined,
  face: PlayingCardFace | undefined
): PlayingCardAccent {
  const color = !isFaceDown(face) ? face.color?.value || face.color?.fallback : undefined;
  const value = accentToken || color;

  if (value && (value in UI_COLOR_TOKENS || Object.values<string>(UI_COLOR_TOKENS).includes(value))) {
    return resolveUiColorTokenName(String(value));
  }

  if (kind === 'activity') return 'quest';
  if (kind === 'guild') return 'campfire';
  if (kind === 'reward') return 'quest';
  if (kind === 'school') return 'neutral';
  if (kind === 'cohort') return 'neutral';
  if (kind === 'student') return 'neutral';
  if (kind === 'character') return 'scholar';
  return resolveUiColorTokenName(String(value || DEFAULT_UI_COLOR_TOKEN));
}

function resolveCardColor(face: PlayingCardFace | undefined, accent: PlayingCardAccent, fallback?: string) {
  if (!isFaceDown(face)) {
    const color = face.color?.value || face.color?.fallback;
    if (color) return String(color);
  }

  return String(fallback || UI_COLOR_TOKENS[accent] || UI_COLOR_TOKENS[DEFAULT_UI_COLOR_TOKEN]);
}

function resolveCardTone(kind: PlayingCardKind | undefined) {
  if (kind === 'activity') return 'quest';
  if (kind === 'cohort') return 'cohort';
  if (kind === 'guild') return 'guild';
  if (kind === 'reward') return 'reward';
  if (kind === 'school') return 'school';
  if (kind === 'student') return 'student';
  if (kind === 'character') return 'character';
  return 'default';
}

function getCardIcon(face: PlayingCardFaceSlots, size: number) {
  return face.icon?.icon || (face.icon?.value ? renderLucideIcon(face.icon.value, size) : undefined);
}

function shouldRenderCardIconInType(face: PlayingCardFaceSlots) {
  if (!face.icon || !face.type || face.type.icon) return false;
  return !['cost', 'rank', 'votes'].includes(face.type.variant);
}

function isKeyboardEventFromEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    tagName === 'button'
  );
}

function shouldRenderGuildIconInType(
  kind: PlayingCardKind | undefined,
  size: PlayingCardSize | 'mini' | 'full' | 'nano',
  face: PlayingCardFaceSlots
) {
  return kind === 'guild' && size !== 'nano' && Boolean(face.icon) && !face.art?.editable;
}

function shouldHideRibbonUntilNanoExpanded(
  size: PlayingCardSize | 'mini' | 'full' | 'nano'
) {
  return size === 'nano';
}

function getFaceDownIconSize(size: PlayingCardSize) {
  if (size === 'full' || size === 'page') return 72;
  if (size === 'mini') return 38;
  return 24;
}

function getIllustrationIconSize(kind: PlayingCardKind | undefined, size: 'nano' | 'mini' | 'full') {
  if (kind === 'reward') {
    if (size === 'full') return 132;
    if (size === 'mini') return 58;
    return 30;
  }

  if (size === 'full') return 72;
  if (size === 'mini') return 42;
  return 24;
}

function buildRadarGraph(stats: CardStatValue[] | undefined, label: string, color: string) {
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
