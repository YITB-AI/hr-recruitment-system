import { connectDB } from "@/server/db/connect";
import { User } from "@/models/User";
import type { SessionUser } from "@/types/user";

const FALLBACK_USER: SessionUser = {
  id: "no-users-seeded",
  name: "No user found",
  email: "-",
  role: "-",
  avatarUrl: null,
};

// Placeholder until NextAuth (Auth.js) session wiring is built: reads the
// first real user from the database rather than hardcoding one. Swap the body
// of this function for a real `auth()` call once that step lands.
export async function getCurrentUser(): Promise<SessionUser> {
  await connectDB();
  const user = await User.findOne().sort({ createdAt: 1 }).lean();

  if (!user) return FALLBACK_USER;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.title ?? user.role,
    avatarUrl: user.avatarUrl ?? null,
  };
}
