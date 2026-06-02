import { GraduationCap, School, User } from 'lucide-react';

type CardSkeletonVariant = 'school' | 'cohort' | 'student';

export function CardSkeleton({
  label,
  variant = 'student',
  loading = false,
}: {
  label: string;
  variant?: CardSkeletonVariant;
  loading?: boolean;
}) {
  const Icon = variant === 'school' ? School : variant === 'cohort' ? GraduationCap : User;

  if (loading) {
    return (
      <div className="flex h-full min-h-[18rem] flex-col gap-4 p-5" aria-hidden="true">
        <div className="mx-auto h-16 w-16 animate-pulse rounded-2xl bg-gaming-base/70" />
        <div className="space-y-3">
          <div className="mx-auto h-4 w-3/5 animate-pulse rounded-full bg-gaming-base/70" />
          <div className="mx-auto h-3 w-4/5 animate-pulse rounded-full bg-gaming-base/50" />
          <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-gaming-base/50" />
        </div>
        <div className="mt-auto grid grid-cols-3 gap-2">
          <div className="h-14 animate-pulse rounded-xl bg-gaming-base/50" />
          <div className="h-14 animate-pulse rounded-xl bg-gaming-base/60" />
          <div className="h-14 animate-pulse rounded-xl bg-gaming-base/50" />
        </div>
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-4 p-5 text-center text-text-muted">
      <Icon size={42} aria-hidden className="text-[color:var(--playing-card-accent)]" />
      <p className="max-w-48 text-xs font-display uppercase tracking-widest">{label}</p>
    </div>
  );
}
