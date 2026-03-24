import { BottomNav } from "@/components/layout/bottom-nav";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="pb-16">{children}</main>
      <BottomNav />
    </>
  );
}
