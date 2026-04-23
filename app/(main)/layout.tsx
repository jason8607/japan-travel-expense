import { BottomNav } from "@/components/layout/bottom-nav";
import { GuestMigrationDialog } from "@/components/layout/guest-migration-dialog";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col">
      <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      <BottomNav />
      <GuestMigrationDialog />
    </div>
  );
}
