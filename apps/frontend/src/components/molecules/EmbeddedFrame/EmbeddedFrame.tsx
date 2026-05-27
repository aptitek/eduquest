import { useState } from 'react';
import { ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface EmbeddedFrameProps {
  title: string;
  src: string;
  className?: string;
  frameClassName?: string;
  placeholder?: string;
  allowFullScreen?: boolean;
  showControls?: boolean;
}

export function EmbeddedFrame({
  title,
  src,
  className,
  frameClassName,
  placeholder,
  allowFullScreen = true,
  showControls = true,
}: EmbeddedFrameProps) {
  const { t } = useTranslation();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const resolvedPlaceholder = placeholder || t('embeddedFrame.placeholder');

  const openInNewTab = () => {
    window.open(src, '_blank', 'noopener,noreferrer');
  };

  const frame = (
    <iframe
      title={title}
      src={src}
      allowFullScreen={allowFullScreen}
      className={cn(
        'h-full w-full rounded-xl border-0 bg-gaming-card text-text-muted',
        frameClassName
      )}
    />
  );

  return (
    <>
      <section className={cn('rounded-2xl border border-gaming-border bg-gaming-base/60 p-3', className)}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate font-display text-xs font-bold uppercase tracking-[0.18em] text-text-muted">
              {title}
            </h4>
            <p className="truncate text-xs text-text-muted">{src || resolvedPlaceholder}</p>
          </div>

          {showControls ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-status-quest/40 px-2 py-1 text-xs font-bold text-status-quest transition hover:bg-status-quest/10 focus:outline-none focus:ring-2 focus:ring-status-quest"
              >
                <Maximize2 size={13} aria-hidden />
                {t('embeddedFrame.expand')}
              </button>
              <button
                type="button"
                onClick={openInNewTab}
                aria-label={t('embeddedFrame.openInNewTab').replace('{title}', title)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gaming-border text-text-secondary transition hover:border-status-quest hover:text-status-quest focus:outline-none focus:ring-2 focus:ring-status-quest"
              >
                <ExternalLink size={13} aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <div className="h-28 overflow-hidden rounded-xl border border-dashed border-gaming-border bg-gaming-card/70">
          {src ? frame : (
            <div className="flex h-full items-center justify-center text-center text-xs text-text-muted">
              {resolvedPlaceholder}
            </div>
          )}
        </div>
      </section>

      {isFullScreen ? (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gaming-base/95 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-gaming-border bg-gaming-card p-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-black text-text-primary">{title}</h3>
              <p className="truncate text-xs text-text-muted">{src}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openInNewTab}
                className="inline-flex items-center gap-2 rounded-full border border-gaming-border px-3 py-2 text-xs font-bold text-text-secondary transition hover:border-status-quest hover:text-status-quest focus:outline-none focus:ring-2 focus:ring-status-quest"
              >
                <ExternalLink size={14} aria-hidden />
                {t('embeddedFrame.newTab')}
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(false)}
                className="inline-flex items-center gap-2 rounded-full border border-status-quest/40 px-3 py-2 text-xs font-bold text-status-quest transition hover:bg-status-quest/10 focus:outline-none focus:ring-2 focus:ring-status-quest"
              >
                <Minimize2 size={14} aria-hidden />
                {t('common.close')}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-gaming-border bg-gaming-card">
            {frame}
          </div>
        </div>
      ) : null}
    </>
  );
}

export default EmbeddedFrame;
