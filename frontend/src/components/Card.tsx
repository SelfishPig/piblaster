import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  bodyClassName = "",
}: {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card bg-base-100 shadow-sm ${className}`}>
      <div className={`card-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
