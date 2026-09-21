import { CircleAlert, CircleCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  ok: boolean;
  children: string;
  activeIcon?: LucideIcon;
  inactiveIcon?: LucideIcon;
};

export function StatusBadge({
  ok,
  children,
  activeIcon = CircleCheck,
  inactiveIcon = CircleAlert,
}: Props) {
  const Icon = ok ? activeIcon : inactiveIcon;
  return (
    <span className={`badge gap-2 ${ok ? "badge-success" : "badge-ghost"}`}>
      <Icon className="size-3.5" />
      {children}
    </span>
  );
}
