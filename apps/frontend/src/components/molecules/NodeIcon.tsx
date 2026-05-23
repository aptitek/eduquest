import { Flame, Compass, Swords, Lock } from 'lucide-react';
import { ActivityType } from '@eduquest/shared';
import { cn } from '../../utils/cn';

interface NodeIconProps {
  type: ActivityType;
  isCompleted: boolean;
  isLocked: boolean;
  onClick?: () => void;
}

export function NodeIcon({ type, isCompleted, isLocked, onClick }: NodeIconProps) {
  const getIcon = () => {
    if (isLocked) return <Lock size={20} />;
    switch (type) {
      case 'campfire':
        return <Flame size={20} />;
      case 'quest':
        return <Compass size={20} />;
      case 'boss':
        return <Swords size={20} />;
    }
  };

  // Pure design token progression (KISS - no hardcoded arbitary colors)
  const getColors = () => {
    if (isLocked) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed';
    }
    if (isCompleted) {
      return 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer hover:scale-110 shadow-lg';
    }
    switch (type) {
      case 'campfire':
        return 'bg-status-campfire/10 border-status-campfire text-status-campfire hover:border-status-campfire cursor-pointer hover:scale-110 animate-pulse';
      case 'quest':
        return 'bg-status-quest/10 border-status-quest text-status-quest hover:border-status-quest cursor-pointer hover:scale-110';
      case 'boss':
        return 'bg-status-boss/10 border-status-boss text-status-boss hover:border-status-boss cursor-pointer hover:scale-110 animate-bounce';
    }
  };

  return (
    <button
      onClick={!isLocked ? onClick : undefined}
      className={cn(
        'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300',
        getColors()
      )}
      disabled={isLocked}
    >
      {getIcon()}
    </button>
  );
}

export default NodeIcon;
