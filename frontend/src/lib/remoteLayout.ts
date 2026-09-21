import { commandRole } from "./commandRole";
import type {
  Command,
  RemoteLayoutBlock,
  RemoteLayoutBlockType,
  RemoteLayoutButton,
} from "../types";

export const layoutBlockOptions: {
  type: RemoteLayoutBlockType;
  label: string;
  description: string;
}[] = [
  {
    type: "button-1",
    label: "1 button row",
    description: "One full-width control",
  },
  {
    type: "button-2",
    label: "2 button row",
    description: "Two evenly spaced controls",
  },
  {
    type: "button-3",
    label: "3 button row",
    description: "Three evenly spaced controls",
  },
  {
    type: "arrow-wheel",
    label: "Arrow wheel",
    description: "Directions with a center action",
  },
  {
    type: "volume-channel",
    label: "Volume · mute · channel",
    description: "Two vertical rockers and mute",
  },
  {
    type: "rocker-buttons",
    label: "Volume rocker + 2 buttons",
    description: "A volume rocker with two stacked actions",
  },
];

const rolesByType: Record<RemoteLayoutBlockType, string[]> = {
  "button-1": ["custom"],
  "button-2": ["custom", "custom"],
  "button-3": ["custom", "custom", "custom"],
  "arrow-wheel": ["up", "right", "down", "left", "ok"],
  "volume-channel": [
    "volume-up",
    "volume-down",
    "mute",
    "channel-up",
    "channel-down",
  ],
  "rocker-buttons": ["volume-up", "volume-down", "custom", "custom"],
};

export function blockLabel(type: RemoteLayoutBlockType): string {
  return (
    layoutBlockOptions.find((option) => option.type === type)?.label ?? type
  );
}

export function createLayoutBlock(
  type: RemoteLayoutBlockType,
  commands: Command[],
): RemoteLayoutBlock {
  const claimed = new Set<number>();
  const controls = rolesByType[type].map((role): RemoteLayoutButton => {
    const match =
      role === "custom"
        ? undefined
        : commands.find(
            (command) =>
              !claimed.has(command.id) && commandRole(command.slug) === role,
          );
    if (match) claimed.add(match.id);
    return {
      commandId: match?.id ?? null,
      icon: role,
    };
  });

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    type,
    controls,
  };
}

export function controlFallback(
  role: string | undefined,
  index: number,
): string {
  const labels: Record<string, string> = {
    up: "Up",
    right: "Right",
    down: "Down",
    left: "Left",
    ok: "OK",
    "volume-up": "Volume up",
    "volume-down": "Volume down",
    mute: "Mute",
    "channel-up": "Channel up",
    "channel-down": "Channel down",
  };
  return labels[role ?? ""] ?? `Button ${index + 1}`;
}
