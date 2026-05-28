type CardSkeletonVariant = 'school' | 'cohort' | 'student';

export function CardSkeleton({
  label,
  variant = 'student',
}: {
  label: string;
  variant?: CardSkeletonVariant;
}) {
  if (variant === 'school') {
    return (
      <div className="h-full min-h-[18rem] p-5 pt-10">
        <div className="flex h-full flex-col gap-5">
          <div className="h-32 w-full rounded-2xl border border-gaming-border bg-gaming-base/60" />
          <div className="h-7 w-2/3 rounded-full bg-gaming-base/70" />
          <div className="grid gap-3">
            <div className="h-4 w-1/2 rounded-full bg-gaming-base/60" />
            <div className="h-4 w-5/6 rounded-full bg-gaming-base/50" />
            <div className="h-4 w-2/3 rounded-full bg-gaming-base/40" />
          </div>
          <div className="mt-auto text-center text-xs font-display uppercase tracking-widest text-text-muted">
            {label}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'cohort') {
    return (
      <div className="h-full min-h-[18rem] p-5 pt-10">
        <div className="flex h-full flex-col gap-5">
          <div className="h-32 w-full rounded-2xl border border-gaming-border bg-gaming-base/60" />
          <div className="h-7 w-3/4 rounded-full bg-gaming-base/70" />
          <div className="h-16 w-full rounded-xl bg-gaming-base/50" />
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-20 rounded-full border border-gaming-border bg-gaming-base/50" />
            <div className="h-6 w-24 rounded-full border border-gaming-border bg-gaming-base/50" />
            <div className="h-6 w-16 rounded-full border border-gaming-border bg-gaming-base/50" />
          </div>
          <div className="mt-auto text-center text-xs font-display uppercase tracking-widest text-text-muted">
            {label}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[18rem] p-5">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="h-20 w-20 rounded-full bg-gaming-base/70" />
          <div className="flex flex-1 flex-col gap-3 pt-2">
            <div className="h-5 w-2/3 rounded-full bg-gaming-base/70" />
            <div className="h-3 w-1/2 rounded-full bg-gaming-base/60" />
            <div className="h-6 w-28 rounded-full border border-gaming-border bg-gaming-base/50" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full rounded-full bg-gaming-base/60" />
          <div className="h-3 w-5/6 rounded-full bg-gaming-base/50" />
          <div className="h-3 w-3/4 rounded-full bg-gaming-base/40" />
        </div>
        <div className="mt-auto text-center text-xs font-display uppercase tracking-widest text-text-muted">
          {label}
        </div>
      </div>
    </div>
  );
}
