import React, { useState, useRef, useEffect, useId } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '../../../utils/cn';
import { useTranslation } from '../../../hooks/useTranslation';

export type HoldToConfirmButtonShape = 'default' | 'round';

export interface HoldToConfirmButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    | 'children'
    | 'className'
    | 'disabled'
    | 'onConfirm'
    | 'onPointerDown'
    | 'onPointerUp'
    | 'onPointerLeave'
    | 'onPointerCancel'
    | 'onKeyDown'
    | 'onKeyUp'
    | 'onBlur'
  > {
  onConfirm: () => void;
  holdDuration?: number;
  children: React.ReactNode;
  className?: string;
  variant?: string;
  shape?: HoldToConfirmButtonShape;
  disabled?: boolean;
  progressTarget?: number;
  progressValue?: number;
  holdHint?: string;
}

export function HoldToConfirmButton({
  onConfirm,
  holdDuration = 1500,
  children,
  className,
  variant = 'btn-error',
  shape = 'default',
  disabled = false,
  progressTarget = 1,
  progressValue = 0,
  holdHint,
  title,
  'aria-describedby': ariaDescribedBy,
  ...buttonProps
}: HoldToConfirmButtonProps) {
  const { t } = useTranslation();
  const controls = useAnimation();
  const buttonControls = useAnimation();

  const [isSuccess, setIsSuccess] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const isHeld = useRef(false);
  const isMounted = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const holdStartTimeRef = useRef<number>(0);

  const holdHintId = useId();
  const isRound = shape === 'round';
  const resolvedHoldHint = showWarning
    ? t('common.holdBrieflyWarning')
    : holdHint ?? t('common.holdToConfirm');

  const describedBy = [ariaDescribedBy, holdHintId].filter(Boolean).join(' ') || undefined;
  const resolvedProgressTarget = Math.min(1, Math.max(0, progressTarget));
  const resolvedProgressValue = Math.min(1, Math.max(0, progressValue));
  const idleProgressState = isRound
    ? { pathLength: resolvedProgressValue, opacity: resolvedProgressValue > 0 ? 0.85 : 0 }
    : { scaleX: resolvedProgressValue, opacity: resolvedProgressValue > 0 ? 0.2 : 0.2 };

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      isHeld.current = false;
      clearTimeout(timeoutRef.current);
      clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isHeld.current || isSuccess) return;
    controls.set(idleProgressState);
  }, [controls, idleProgressState, isSuccess]);

  const startHold = () => {
    if (disabled || !isMounted.current) return;
    clearTimeout(timeoutRef.current);
    setShowWarning(false);
    clearTimeout(warningTimeoutRef.current);

    isHeld.current = true;
    holdStartTimeRef.current = Date.now();
    setIsHolding(true);
    setIsSuccess(false);

    void controls.start({
      ...(isRound ? { pathLength: resolvedProgressTarget, opacity: 0.85 } : { scaleX: resolvedProgressTarget }),
      transition: { duration: holdDuration / 1000, ease: 'linear' },
    });

    timeoutRef.current = setTimeout(() => {
      if (isHeld.current && isMounted.current) {
        setIsSuccess(true);
        onConfirm();
        setIsHolding(false);
        void controls
          .start({ opacity: 0, transition: { duration: 0.2 } })
          .then(() => {
            if (!isMounted.current) return;
            controls.set(idleProgressState);
            setIsSuccess(false);
          })
          .catch(() => {
            // The row can unmount immediately after confirmation, for example after deletion.
          });
      }
    }, holdDuration);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only respond to primary interaction
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    startHold();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    startHold();
  };

  const cancelHold = () => {
    const elapsed = Date.now() - holdStartTimeRef.current;
    isHeld.current = false;
    setIsHolding(false);
    clearTimeout(timeoutRef.current);

    if (elapsed > 10 && elapsed < 450 && !isSuccess) {
      setShowWarning(true);
      void buttonControls.start({
        x: [-6, 6, -6, 6, -3, 3, 0],
        transition: { duration: 0.4 }
      });
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = setTimeout(() => {
        if (isMounted.current) {
          setShowWarning(false);
        }
      }, 2000);
    }

    if (!isSuccess && isMounted.current) {
      void controls.start({
        ...idleProgressState,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    }
  };

  const buttonClassName = cn(
    'btn group/hold relative overflow-hidden transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40',
    isRound && 'btn-circle min-h-0 overflow-visible rounded-full p-0',
    variant,
    isHolding && 'scale-[1.03] shadow-lg ring-4 ring-current/25',
    isSuccess && 'animate-pulse',
    disabled && 'btn-disabled cursor-not-allowed opacity-60',
    className
  );

  const backgroundCircleClassName = cn(
    'opacity-70 transition-opacity',
    !disabled && 'group-hover/hold:opacity-90 group-focus-visible/hold:opacity-90'
  );

  const innerBorderClassName = cn(
    'pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-current/60'
  );

  const hintClassName = cn(
    'pointer-events-none absolute z-20 whitespace-nowrap rounded-full border px-2 py-0.5 font-display text-[0.55rem] font-black uppercase leading-none tracking-[0.16em] shadow-lg transition-all duration-300',
    isRound ? 'left-1/2 top-full mt-1 -translate-x-1/2' : 'bottom-1 left-1/2 -translate-x-1/2',
    showWarning
      ? 'opacity-100 border-status-danger bg-status-danger text-white scale-110 shadow-status-danger/30'
      : cn(
          'border-current/25 bg-gaming-base/90 text-current opacity-0',
          !disabled && 'group-hover/hold:opacity-100 group-focus-visible/hold:opacity-100',
          isHolding && 'opacity-100'
        )
  );

  return (
    <motion.button
      type="button"
      animate={buttonControls}
      className={buttonClassName}
      disabled={disabled}
      title={title ?? resolvedHoldHint}
      aria-describedby={describedBy}
      {...(buttonProps as any)}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={cancelHold}
      onBlur={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span id={holdHintId} className="sr-only">
        {resolvedHoldHint}
      </span>
      {isRound ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-[-0.25rem] h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] -rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="6"
            className={backgroundCircleClassName}
          />
          <motion.circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="8"
            initial={idleProgressState}
            animate={controls}
          />
        </svg>
      ) : (
        <>
          <span aria-hidden className={innerBorderClassName} />
          <motion.div
            className="pointer-events-none absolute inset-0 origin-left bg-current opacity-20"
            initial={{ scaleX: 0, opacity: 0.2 }}
            animate={controls}
          />
        </>
      )}
      <span aria-hidden className={hintClassName}>
        {resolvedHoldHint}
      </span>
      <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
        {children}
      </span>
    </motion.button>
  );
}
