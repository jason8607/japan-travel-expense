import { BottomNav } from "@/components/layout/bottom-nav";
import { GuestMigrationDialog } from "@/components/layout/guest-migration-dialog";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <BottomNav />
      <GuestMigrationDialog />
    </>
  );
}
