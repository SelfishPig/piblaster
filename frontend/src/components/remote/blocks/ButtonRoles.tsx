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
  Undo2,
  Volume1,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";

type ButtonRole = {
  label: string;
  icon: LucideIcon | null;
  className: string;
};

export const buttonRoles = {
  none: { label: "No role", icon: null, className: "" },
  custom: { label: "Custom (circle)", icon: Circle, className: "" },
  power: { label: "Power", icon: Power, className: "btn-error btn-soft" },
  input: { label: "Input", icon: MonitorUp, className: "" },
  up: { label: "Up", icon: ChevronUp, className: "" },
  right: { label: "Right", icon: ChevronRight, className: "" },
  down: { label: "Down", icon: ChevronDown, className: "" },
  left: { label: "Left", icon: ChevronLeft, className: "" },
  ok: { label: "OK / Select", icon: CircleDot, className: "btn-primary" },
  back: { label: "Back", icon: Undo2, className: "" },
  home: { label: "Home", icon: House, className: "" },
  menu: { label: "Menu", icon: Menu, className: "" },
  "volume-up": { label: "Volume up", icon: Volume2, className: "" },
  "volume-down": { label: "Volume down", icon: Volume1, className: "" },
  mute: { label: "Mute", icon: VolumeX, className: "" },
  "channel-up": { label: "Channel up", icon: CircleArrowUp, className: "" },
  "channel-down": {
    label: "Channel down",
    icon: CircleArrowDown,
    className: "",
  },
} satisfies Record<string, ButtonRole>;

export type ButtonRoleName = keyof typeof buttonRoles;

export const buttonRoleOptions = (
  Object.keys(buttonRoles) as ButtonRoleName[]
).map((role) => ({ role, label: buttonRoles[role].label }));

export function getButtonRole(role: string = "custom"): ButtonRole {
  return Object.hasOwn(buttonRoles, role)
    ? buttonRoles[role as ButtonRoleName]
    : buttonRoles.custom;
}
