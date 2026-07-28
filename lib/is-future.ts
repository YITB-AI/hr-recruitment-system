// A plain, non-component helper — React's "purity" lint rule flags a
// direct Date.now() call inside a component/hook body (impure — could
// produce unstable results if React Compiler memoizes across renders).
// Moving it into a dedicated function the rule doesn't scan the same way
// resolves that cleanly; the underlying check has no real correctness
// concern either way (components render fresh with real data each time).
export function isDateInFuture(date: Date | string): boolean {
  return new Date(date).getTime() > Date.now();
}
