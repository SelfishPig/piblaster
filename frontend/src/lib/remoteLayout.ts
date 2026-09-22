import { commandRole } from "./commandRole";
import type {
  Command,
  RemoteLayoutBlock,
  RemoteLayoutBlockType,
  RemoteLayoutButton,
} from "../types";

type LayoutBlockDefinition = {
  label: string;
  description: string;
  roles: string[];
  editorGridClass: string;
};

export const layoutBlocks: Record<
  RemoteLayoutBlockType,
  LayoutBlockDefinition
> = {
  "button-1": {
    label: "1 button row",
    description: "One full-width control",
    roles: ["custom"],
    editorGridClass: "grid-cols-1",
  },
  "button-2": {
    label: "2 button row",
    description: "Two evenly spaced controls",
    roles: ["custom", "custom"],
    editorGridClass: "grid-cols-2",
  },
  "button-3": {
    label: "3 button row",
    description: "Three evenly spaced controls",
    roles: ["custom", "custom", "custom"],
    editorGridClass: "grid-cols-3",
  },
  "arrow-wheel": {
    label: "Arrow wheel",
    description: "Directions with a center action",
    roles: ["up", "right", "down", "left", "ok"],
    editorGridClass: "grid-cols-2 sm:grid-cols-3",
  },
  "volume-channel": {
    label: "Volume · mute · channel",
    description: "Two vertical rockers and mute",
    roles: ["volume-up", "volume-down", "mute", "channel-up", "channel-down"],
    editorGridClass: "grid-cols-2",
  },
  "rocker-buttons": {
    label: "Volume rocker + 2 buttons",
    description: "A volume rocker with two stacked actions",
    roles: ["volume-up", "volume-down", "custom", "custom"],
    editorGridClass: "grid-cols-2",
  },
};

export const layoutBlockOptions = (
  Object.keys(layoutBlocks) as RemoteLayoutBlockType[]
).map((type) => ({ type, ...layoutBlocks[type] }));

export function blockLabel(type: RemoteLayoutBlockType): string {
  return layoutBlocks[type].label;
}

export function createLayoutBlock(
  type: RemoteLayoutBlockType,
  commands: Command[],
): RemoteLayoutBlock {
  const claimed = new Set<number>();
  const controls = layoutBlocks[type].roles.map((role): RemoteLayoutButton => {
    const match =
      role === "custom"
        ? undefined
        : commands.find(
            (command) =>
              !claimed.has(command.id) && commandRole(command) === role,
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
  role: string | null | undefined,
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
