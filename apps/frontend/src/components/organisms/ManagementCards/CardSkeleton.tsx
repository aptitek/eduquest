export function CardSkeleton({ label }: { label: string }) {
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
