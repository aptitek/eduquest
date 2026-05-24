import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { cn } from '../../../utils/cn';

export interface HoldToConfirmButtonProps {
  onConfirm: () => void;
  holdDuration?: number;
  children: React.ReactNode;
  className?: string;
  variant?: string;
}

export function HoldToConfirmButton({
  onConfirm,
  holdDuration = 1500,
  children,
  className,
  variant = 'btn-error',
}: HoldToConfirmButtonProps) {
  const controls = useAnimation();
  const [isSuccess, setIsSuccess] = useState(false);
  const isHeld = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only respond to primary interaction
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isHeld.current = true;
    setIsSuccess(false);

    controls.start({
      scaleX: 1,
      transition: { duration: holdDuration / 1000, ease: 'linear' },
    });

    timeoutRef.current = setTimeout(() => {
      if (isHeld.current) {
        setIsSuccess(true);
        onConfirm();
        controls.start({ opacity: 0, transition: { duration: 0.2 } }).then(() => {
          controls.set({ scaleX: 0, opacity: 0.2 });
          setIsSuccess(false);
        });
      }
    }, holdDuration);
  };

  const cancelHold = () => {
    isHeld.current = false;
    clearTimeout(timeoutRef.current);
    if (!isSuccess) {
      controls.start({
        scaleX: 0,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    }
  };

  return (
    <button
      className={cn(
        'btn relative overflow-hidden transition-shadow hover:shadow-lg',
        variant,
        isSuccess && 'animate-pulse',
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
    >
      <motion.div
        className="absolute inset-0 bg-current opacity-20 pointer-events-none origin-left"
        initial={{ scaleX: 0, opacity: 0.2 }}
        animate={controls}
      />
      <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
        {children}
      </span>
    </button>
  );
}
