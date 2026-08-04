import { PlatformShell } from "@/components/layout/platform-shell";

export default function PlatformGroupLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
