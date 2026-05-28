import { GraduationCap, School, User } from 'lucide-react';

type CardSkeletonVariant = 'school' | 'cohort' | 'student';

export function CardSkeleton({
  label,
  variant = 'student',
}: {
  label: string;
  variant?: CardSkeletonVariant;
}) {
  const Icon = variant === 'school' ? School : variant === 'cohort' ? GraduationCap : User;

  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 p-5 text-center text-text-muted">
      <Icon size={42} aria-hidden className="text-[color:var(--playing-card-accent)]" />
      <p className="max-w-48 text-xs font-display uppercase tracking-widest">{label}</p>
    </div>
  );
}
