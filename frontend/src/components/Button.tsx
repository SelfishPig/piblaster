import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variants = {
  primary: "btn-primary",
  secondary: "",
  danger: "btn-error btn-soft",
  ghost: "btn-ghost",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: Props) {
  return (
    <button className={`btn ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
