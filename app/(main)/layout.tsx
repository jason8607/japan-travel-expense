import { GuestMigrationDialog } from "@/components/layout/guest-migration-dialog";
import { LoadingState } from "@/components/layout/loading-state";
import { MainShell } from "@/components/layout/main-shell";
import { Suspense } from "react";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense fallback={<LoadingState variant="screen" />}>
        <MainShell>{children}</MainShell>
      </Suspense>
      <GuestMigrationDialog />
    </div>
  );
}
