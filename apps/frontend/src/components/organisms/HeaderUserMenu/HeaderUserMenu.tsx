import type { User } from '@eduquest/shared';
import { StatusIndicator } from '../../atoms/StatusIndicator';
import { Settings, Circle, MinusCircle, Moon } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../utils/cn';

export interface HeaderUserMenuProps {
  user: User;
  onStatusChange: (newStatus: 'online' | 'offline' | 'busy') => void;
  onOpenProfile: () => void;
}

export function HeaderUserMenu({ user, onStatusChange, onOpenProfile }: HeaderUserMenuProps) {
  const { t } = useTranslation();
  const currentStatus = user.userStatus || 'offline';
  const isAutoBusy = currentStatus === 'busy';
  const statusItemClass = (status: 'online' | 'offline' | 'busy') =>
    cn(
      'flex w-full items-center gap-2 py-2 text-left',
      currentStatus === status && 'bg-gaming-base/60'
    );

  // Map user status to StatusIndicator prop
  const getIndicatorStatus = () => {
    switch (currentStatus) {
      case 'online':
        return 'success';
      case 'busy':
        return 'error';
      case 'offline':
      default:
        return 'offline';
    }
  };

  const indicator = (
    <StatusIndicator
      status={getIndicatorStatus()}
      className="absolute bottom-0 right-0 border-2 border-gaming-card w-3.5 h-3.5"
    />
  );

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        className="btn btn-ghost btn-circle avatar relative"
        aria-label={t('header.userMenu.openMenu')}
      >
        <div className="w-10 rounded-full bg-gaming-base">
          <img
            alt={t('header.userMenu.avatarAlt')}
            src={
              user.avatarUrl ||
              user.githubAvatarUrl ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            }
            className="w-full h-full object-cover"
          />
        </div>
        {isAutoBusy ? (
          <div
            className="tooltip tooltip-left absolute bottom-0 right-0"
            data-tip={t('header.userMenu.inGuildActivity')}
          >
            {indicator}
          </div>
        ) : (
          indicator
        )}
      </button>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-gaming-card border border-gaming-border rounded-box z-[50] mt-3 w-56 p-2 shadow-xl"
      >
        <li>
          <button
            type="button"
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onOpenProfile();
            }}
            className="flex items-center gap-2 py-2"
          >
            <Settings size={16} className="text-text-secondary" />
            <span className="font-medium">{t('header.userMenu.profileSettings')}</span>
          </button>
        </li>
        <li className="divider my-1" aria-hidden="true"></li>
        <li className="menu-title px-4 py-1 text-xs uppercase tracking-wider text-text-muted">
          {t('header.userMenu.setStatus')}
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('online');
            }}
            className={statusItemClass('online')}
          >
            <Circle size={14} className="text-status-completed fill-status-completed" />
            <span>{t('header.userMenu.online')}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('busy');
            }}
            className={statusItemClass('busy')}
          >
            <MinusCircle size={14} className="text-status-boss fill-status-boss" />
            <span>{t('header.userMenu.busy')}</span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('offline');
            }}
            className={statusItemClass('offline')}
          >
            <Moon size={14} className="text-status-locked fill-status-locked" />
            <span>{t('header.userMenu.offline')}</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
