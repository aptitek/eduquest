
import { User } from '@eduquest/shared';
import { StatusIndicator } from '../../atoms/StatusIndicator';
import { Settings, Circle, MinusCircle, Moon } from 'lucide-react';

export interface HeaderUserMenuProps {
  user: User;
  onStatusChange: (newStatus: 'online' | 'offline' | 'busy') => void;
  onOpenProfile: () => void;
}

export function HeaderUserMenu({ user, onStatusChange, onOpenProfile }: HeaderUserMenuProps) {
  const currentStatus = user.userStatus || 'offline';
  const isAutoBusy = currentStatus === 'busy' && !user.statusOverride;

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
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar relative">
        <div className="w-10 rounded-full bg-gaming-base">
          <img 
            alt="User Avatar" 
            src={user.avatarUrl || user.githubAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'} 
            className="w-full h-full object-cover"
          />
        </div>
        {isAutoBusy ? (
          <div className="tooltip tooltip-left absolute bottom-0 right-0" data-tip="In Guild Activity">
            {indicator}
          </div>
        ) : (
          indicator
        )}
      </div>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-gaming-card border border-gaming-border rounded-box z-[50] mt-3 w-56 p-2 shadow-xl"
      >
        <li>
          <a onClick={() => {
              // Close dropdown by blurring active element
              (document.activeElement as HTMLElement)?.blur();
              onOpenProfile();
            }} 
            className="flex items-center gap-2 py-2"
          >
            <Settings size={16} className="text-text-secondary" />
            <span className="font-medium">Profile Settings</span>
          </a>
        </li>
        <div className="divider my-1"></div>
        <li className="menu-title px-4 py-1 text-xs uppercase tracking-wider text-text-muted">
          Set Status
        </li>
        <li>
          <a onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('online');
            }} 
            className={`flex items-center gap-2 py-2 ${currentStatus === 'online' ? 'bg-gaming-base/60' : ''}`}
          >
            <Circle size={14} className="text-status-completed fill-status-completed" />
            <span>Online</span>
          </a>
        </li>
        <li>
          <a onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('busy');
            }} 
            className={`flex items-center gap-2 py-2 ${currentStatus === 'busy' ? 'bg-gaming-base/60' : ''}`}
          >
            <MinusCircle size={14} className="text-status-boss fill-status-boss" />
            <span>Busy (Do not disturb)</span>
          </a>
        </li>
        <li>
          <a onClick={() => {
              (document.activeElement as HTMLElement)?.blur();
              onStatusChange('offline');
            }} 
            className={`flex items-center gap-2 py-2 ${currentStatus === 'offline' ? 'bg-gaming-base/60' : ''}`}
          >
            <Moon size={14} className="text-status-locked fill-status-locked" />
            <span>Offline (Invisible)</span>
          </a>
        </li>
      </ul>
    </div>
  );
}
