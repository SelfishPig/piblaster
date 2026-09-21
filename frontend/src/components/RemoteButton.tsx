import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleArrowDown,
  CircleArrowUp,
  CircleDot,
  House,
  Menu,
  MonitorUp,
  Power,
  Radio,
  Undo2,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  back: Undo2,
  "channel-down": CircleArrowDown,
  "channel-up": CircleArrowUp,
  down: ChevronDown,
  home: House,
  input: MonitorUp,
  left: ChevronLeft,
  menu: Menu,
  mute: VolumeX,
  ok: CircleDot,
  power: Power,
  right: ChevronRight,
  up: ChevronUp,
  "volume-down": Volume1,
  "volume-up": Volume2,
};

type Props = {
  label: string;
  role?: string;
  disabled?: boolean;
  wide?: boolean;
  shape?: "circle" | "default" | "pill" | "square";
  size?: "sm" | "md" | "lg" | "xl" | "dpad";
  tone?: "default" | "primary" | "error" | "ghost";
  className?: string;
  onPress: () => void;
};

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
  xl: "btn-xl",
  dpad: "[--size:6.5rem]",
};

const tones = {
  default: "",
  primary: "btn-primary",
  error: "btn-error btn-soft",
  ghost: "btn-ghost",
};

export function RemoteButton({
  label,
  role = "",
  disabled,
  wide,
  shape = "circle",
  size = "md",
  tone,
  className = "",
  onPress,
}: Props) {
  const Icon = icons[role] ?? (role.startsWith("channel") ? Radio : Circle);
  const toneClass =
    tone === undefined
      ? role === "power"
        ? tones.error
        : role === "ok"
          ? tones.primary
          : tones.default
      : tones[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label={label}
      className={`tooltip btn touch-manipulation select-none ${sizes[size]} ${wide ? "btn-block col-span-2" : shape === "square" ? "btn-square" : shape === "pill" ? "rounded-full px-8" : shape === "circle" ? "btn-circle" : ""} ${toneClass} ${className}`}
      data-tip={label}
    >
      <Icon
        className={`${size === "dpad" ? "size-8" : size === "xl" ? "size-7" : "size-5"} shrink-0`}
      />
    </button>
  );
}
