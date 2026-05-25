import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import { InfoBar, type InfoBarAction, type InfoBarTone } from '../../molecules/InfoBar';
import { cn } from '../../../utils/cn';

export interface HeaderNotification {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: InfoBarTone;
  action?: InfoBarAction;
}

export interface HeaderNotificationButtonProps {
  count: number;
  label?: string;
  isOpen?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface HeaderNotificationAreaProps {
  notifications: HeaderNotification[];
  isOpen?: boolean;
  isExpanded?: boolean;
  visibleLimit?: number;
  dismissLabel?: string;
  emptyLabel?: ReactNode;
  onDismiss: (id: string) => void;
  onAction?: (id: string) => void;
  className?: string;
}

export function HeaderNotificationButton({
  count,
  label = 'Notifications',
  isOpen = false,
  onClick,
  className,
}: HeaderNotificationButtonProps) {
  return (
    <button
      type="button"
      aria-label={`${label}: ${count} active`}
      aria-expanded={isOpen}
      onClick={onClick}
      className={cn(
        'relative flex h-10 w-10 items-center justify-center rounded-full border border-gaming-border bg-gaming-base/70 text-text-secondary shadow-sm transition hover:bg-gaming-base hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40',
        isOpen && 'border-primary/50 bg-primary/15 text-primary',
        className
      )}
    >
      <Bell size={21} aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-primary-content shadow-md">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function HeaderNotificationArea({
  notifications,
  isOpen = true,
  isExpanded = false,
  visibleLimit = 2,
  dismissLabel = 'Dismiss notification',
  emptyLabel,
  onDismiss,
  onAction,
  className,
}: HeaderNotificationAreaProps) {
  const visibleNotifications = isExpanded ? notifications : notifications.slice(0, visibleLimit);

  if (notifications.length === 0 && !emptyLabel) return null;

  return (
    <section
      aria-live="polite"
      aria-label="Header notifications"
      className={cn(
        'grid w-full transition-all duration-300 ease-out',
        isOpen
          ? 'grid-rows-[1fr] opacity-100'
          : 'pointer-events-none grid-rows-[0fr] -translate-y-2 opacity-0',
        className
      )}
    >
      <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
        {visibleNotifications.map((notification) => (
          <InfoBar
            key={notification.id}
            title={notification.title}
            description={notification.description}
            meta={notification.meta}
            icon={notification.icon}
            tone={notification.tone}
            action={notification.action}
            dismissLabel={dismissLabel}
            onDismiss={() => onDismiss(notification.id)}
            onAction={() => onAction?.(notification.id)}
          />
        ))}

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-gaming-border bg-gaming-card/70 px-4 py-3 text-xs text-text-muted shadow-sm">
            {emptyLabel}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default HeaderNotificationArea;
