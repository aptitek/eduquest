import { Activity } from '@eduquest/shared';
import { GenericGraph, GraphNode } from '../molecules/GenericGraph';
import { Flame, Compass, Swords, Lock } from 'lucide-react';

interface GameMapProps {
  activities: Activity[];
  completedActivityIds: string[];
  playerLevel: number;
  onSelectNode: (activity: Activity) => void;
}

export function GameMap({
  activities,
  completedActivityIds,
  playerLevel,
  onSelectNode,
}: GameMapProps) {
  // Déterminer si une activité est verrouillée
  const isNodeLocked = (activity: Activity) => {
    // 1. Niveau requis
    if (activity.requiredLevel && playerLevel < activity.requiredLevel) {
      return true;
    }
    // 2. Activités précédentes requises
    if (activity.unlockRule?.requiredCompletedActivities) {
      const allPreReqsCompleted = activity.unlockRule.requiredCompletedActivities.every((id) =>
        completedActivityIds.includes(id)
      );
      if (!allPreReqsCompleted) {
        return true;
      }
    }
    return false;
  };

  const getIcon = (type: string, isLocked: boolean) => {
    if (isLocked) return <Lock size={20} />;
    switch (type) {
      case 'campfire':
        return <Flame size={20} />;
      case 'quest':
        return <Compass size={20} />;
      case 'boss':
        return <Swords size={20} />;
      default:
        return <Compass size={20} />;
    }
  };

  const getColors = (type: string, isCompleted: boolean, isLocked: boolean) => {
    if (isLocked) {
      return 'bg-gaming-base border-status-locked text-text-muted cursor-not-allowed';
    }
    if (isCompleted) {
      return 'bg-status-completed/10 border-status-completed text-status-completed hover:border-status-completed cursor-pointer motion-safe:hover:scale-110 shadow-lg';
    }
    switch (type) {
      case 'campfire':
        return 'bg-status-campfire/10 border-status-campfire text-status-campfire hover:border-status-campfire cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-pulse';
      case 'quest':
        return 'bg-status-quest/10 border-status-quest text-status-quest hover:border-status-quest cursor-pointer motion-safe:hover:scale-110';
      case 'boss':
        return 'bg-status-boss/10 border-status-boss text-status-boss hover:border-status-boss cursor-pointer motion-safe:hover:scale-110 motion-safe:animate-bounce';
      default:
        return '';
    }
  };

  // Convert Activity list to reusable Generic GraphNode list (KISS)
  const graphNodes: GraphNode<Activity>[] = activities.map((act) => {
    const completed = completedActivityIds.includes(act.id);
    const locked = isNodeLocked(act);

    return {
      id: act.id,
      label: act.title,
      prerequisites: act.unlockRule?.requiredCompletedActivities,
      isCompleted: completed,
      isLocked: locked,
      icon: getIcon(act.type, locked),
      customClass: getColors(act.type, completed, locked),
      metadata: act,
    };
  });

  return (
    <GenericGraph
      nodes={graphNodes}
      width={800}
      height={600}
      onSelectNode={(node) => {
        if (node.metadata) onSelectNode(node.metadata);
      }}
    />
  );
}

export default GameMap;
