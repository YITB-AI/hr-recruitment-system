// Matches NotificationBell's real trigger button size (Button size="icon" ->
// size-8, rounded-full) so streaming it in via <Suspense> never shifts
// layout — this renders instantly while NotificationBellData's queries run.
export function NotificationBellSkeleton() {
  return <div className="size-8 animate-pulse rounded-full bg-muted" aria-hidden="true" />;
}
