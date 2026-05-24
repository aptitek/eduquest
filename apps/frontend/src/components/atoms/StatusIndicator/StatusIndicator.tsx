import { cn } from '../../../utils/cn';

export interface StatusIndicatorProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'offline';
  isPulsing?: boolean;
  className?: string;
}

const colorMap = {
  success: 'bg-success',
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  offline: 'bg-neutral',
};

export function StatusIndicator({ status, isPulsing = false, className }: StatusIndicatorProps) {
  return (
    <span
      className={cn(
        'rounded-full inline-block w-3 h-3',
        colorMap[status],
        isPulsing && 'animate-pulse',
        className
      )}
    />
  );
}
