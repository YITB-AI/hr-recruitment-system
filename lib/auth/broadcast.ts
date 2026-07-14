// Client-safe constant shared between the logout trigger (profile-menu.tsx)
// and the cross-tab listener (auth-tab-sync.tsx) — writing this localStorage
// key fires a `storage` event in every other open tab on the same origin,
// which is how a logout in one tab forces the others to /login too.
export const LOGOUT_BROADCAST_KEY = "hr-platform:logout-broadcast";
