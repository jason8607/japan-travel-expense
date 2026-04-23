import type { ReactNode } from "react";

interface StatCardProps {
  gradient: string;
  emoji: ReactNode;
  title: string;
  children: ReactNode;
}

export function StatCard({ gradient, emoji, title, children }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs font-medium opacity-80 mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}
