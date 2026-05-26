import { BookOpen, Compass, Flame, Hammer, HelpCircle, Lock, Shield, Snowflake, Swords, User, Users } from 'lucide-react';
import type { ActivityType } from '@eduquest/shared';
import { cn } from '../../utils/cn';
import { getActivityVisualVariant } from '../../features/game/activityPresentation';

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
      case 'onboarding':
        return <Compass size={20} />;
      case 'character_creation':
        return <User size={20} />;
      case 'tavern':
        return <Users size={20} />;
      case 'tutorial':
        return <BookOpen size={20} />;
      case 'ice_breaker':
        return <Snowflake size={20} />;
      case 'campfire':
        return <Flame size={20} />;
      case 'quiz':
        return <HelpCircle size={20} />;
      case 'practical':
        return <Hammer size={20} />;
      case 'mini_boss':
        return <Shield size={20} />;
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
      return 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer motion-safe:hover:scale-110 shadow-lg';
    }
    switch (getActivityVisualVariant(type)) {
      case 'campfire':
        return 'bg-status-campfire/10 border-status-campfire text-status-campfire hover:border-status-campfire cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-pulse';
      case 'quest':
        return 'bg-status-quest/10 border-status-quest text-status-quest hover:border-status-quest cursor-pointer motion-safe:hover:scale-110';
      case 'boss':
        return 'bg-status-boss/10 border-status-boss text-status-boss hover:border-status-boss cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-bounce';
    }
  };

  return (
    <button
      type="button"
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
