import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '../../../utils/cn';

export type HoldToConfirmButtonShape = 'default' | 'round';

export interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  holdDuration?: number;
  children: React.ReactNode;
  className?: string;
  variant?: string;
  shape?: HoldToConfirmButtonShape;
  disabled?: boolean;
}

export function HoldToConfirmButton({
  onConfirm,
  holdDuration = 1500,
  children,
  className,
  variant = 'btn-error',
  shape = 'default',
  disabled = false,
}: HoldToConfirmButtonProps) {
  const controls = useAnimation();
  const [isSuccess, setIsSuccess] = useState(false);
  const isHeld = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isRound = shape === 'round';
  const idleProgressState = isRound ? { pathLength: 0, opacity: 0 } : { scaleX: 0, opacity: 0.2 };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const startHold = () => {
    if (disabled) return;
    clearTimeout(timeoutRef.current);

    isHeld.current = true;
    setIsSuccess(false);

    controls.start({
      ...(isRound ? { pathLength: 1, opacity: 0.85 } : { scaleX: 1 }),
      transition: { duration: holdDuration / 1000, ease: 'linear' },
    });

    timeoutRef.current = setTimeout(() => {
      if (isHeld.current) {
        setIsSuccess(true);
        onConfirm();
        controls.start({ opacity: 0, transition: { duration: 0.2 } }).then(() => {
          controls.set(idleProgressState);
          setIsSuccess(false);
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
    isHeld.current = false;
    clearTimeout(timeoutRef.current);
    if (!isSuccess) {
      controls.start({
        ...idleProgressState,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'btn relative overflow-hidden transition-shadow hover:shadow-lg',
        isRound && 'btn-circle min-h-0 overflow-visible rounded-full p-0',
        variant,
        isSuccess && 'animate-pulse',
        disabled && 'btn-disabled cursor-not-allowed opacity-60',
        className
      )}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={handleKeyDown}
      onKeyUp={cancelHold}
      onBlur={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
    >
      {isRound ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-[-0.25rem] h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] -rotate-90"
        >
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
        <motion.div
          className="pointer-events-none absolute inset-0 origin-left bg-current opacity-20"
          initial={{ scaleX: 0, opacity: 0.2 }}
          animate={controls}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
        {children}
      </span>
    </button>
  );
}
