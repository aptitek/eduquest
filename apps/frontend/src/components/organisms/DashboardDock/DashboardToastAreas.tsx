export function DashboardToastAreas() {
  return (
    <>
      <div
        aria-live="polite"
        aria-label="Cohort announcement toast area"
        className="pointer-events-none fixed left-3 top-20 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2"
      />
      <div
        aria-live="polite"
        aria-label="Reward toast area"
        className="pointer-events-none fixed right-3 top-20 z-50 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col gap-2"
      />
    </>
  );
}
