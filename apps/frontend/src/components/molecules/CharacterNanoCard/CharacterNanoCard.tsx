import type { GameCharacter, User } from '@eduquest/shared';
import type { CSSProperties } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { formatUserDisplayName } from '../../../utils/displayName';

export interface CharacterNanoCardProps {
  user: User;
  character: GameCharacter;
  className?: string;
}

const CHARACTER_CLASS_ACCENT: Record<GameCharacter['characterClass'], string> = {
  scholar: 'var(--color-accent-scholar)',
  champion: 'var(--color-accent-champion)',
  guide: 'var(--color-accent-guide)',
  specialist: 'var(--color-accent-specialist)',
};

export function CharacterNanoCard({ user, character, className }: CharacterNanoCardProps) {
  const displayName = formatUserDisplayName(user);
  const imageUrl = user.avatarUrl || user.githubAvatarUrl || '';
  const accentColor = CHARACTER_CLASS_ACCENT[character.characterClass] || 'var(--color-status-quest)';

  return (
    <div className={cn('group/nano relative h-12 w-[2.15rem] overflow-visible', className)}>
      <article
        style={{ '--character-nano-accent': accentColor } as CSSProperties}
        aria-label={displayName}
        className={cn(
          'absolute left-1/2 top-1/2 h-12 w-[2.15rem] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--character-nano-accent)] bg-gaming-card p-0.5 shadow-lg',
          'origin-top transition-transform duration-300 ease-out hover:translate-y-1 hover:scale-[1.72] hover:shadow-xl focus-within:translate-y-1 focus-within:scale-[1.72] focus-within:shadow-xl group-hover/nano:translate-y-1 group-hover/nano:scale-[1.72] group-hover/nano:shadow-xl'
        )}
      >
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-[color:var(--character-nano-accent)] opacity-10" />
        <div className="relative flex h-full flex-col overflow-hidden rounded-md border border-gaming-border bg-gaming-base">
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={displayName}
                className="h-full w-full object-cover object-center transition duration-300 group-hover/nano:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[color:var(--character-nano-accent)]">
                <Shield size={16} aria-hidden />
              </div>
            )}
          </div>
          <div className="border-t border-[color:var(--character-nano-accent)] bg-gaming-card/95 px-0.5 py-0.5">
            <p className="truncate text-center font-display text-[0.5rem] font-bold leading-none text-text-primary">
              {displayName}
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}

export default CharacterNanoCard;
