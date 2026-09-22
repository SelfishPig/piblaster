import type { Command, CommandRole } from "../types";

export function commandRole(
  command: Pick<Command, "role" | "slug">,
): CommandRole {
  return command.role ?? inferCommandRole(command.slug);
}

export function inferCommandRole(slug: string): CommandRole {
  const normalized = slug.toLowerCase();
  if (/vol(ume)?-?(up|plus)|volume\+/.test(normalized)) return "volume-up";
  if (/vol(ume)?-?(down|minus)|volume-/.test(normalized)) return "volume-down";
  if (/chan(nel)?-?(up|plus)/.test(normalized)) return "channel-up";
  if (/chan(nel)?-?(down|minus)/.test(normalized)) return "channel-down";
  for (const role of [
    "power",
    "mute",
    "up",
    "down",
    "left",
    "right",
    "ok",
    "back",
    "home",
    "menu",
    "input",
  ] as const) {
    if (normalized === role || normalized.endsWith(`-${role}`)) return role;
  }
  return "custom";
}
