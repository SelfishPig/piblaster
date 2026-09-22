import type { ButtonRoleName } from "./components/remote/blocks/ButtonRoles";

export type RemoteLayoutButton = {
  commandId: number | null;
  label?: string | null;
  icon?: string | null;
};

export type RemoteLayoutBlockType =
  | "button-1"
  | "button-2"
  | "button-3"
  | "arrow-wheel"
  | "volume-channel"
  | "rocker-buttons";

export type RemoteLayoutBlock = {
  id: string;
  type: RemoteLayoutBlockType;
  controls: RemoteLayoutButton[];
};

export type Layout = {
  id: number;
  name: string;
  description: string | null;
  rows: RemoteLayoutBlock[];
  createdAt: string;
  updatedAt: string;
};

export type Remote = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommandRole = ButtonRoleName;

export type Command = {
  id: number;
  remoteId: number;
  role: CommandRole | null;
  buttonText: string | null;
  name: string;
  slug: string;
  protocol: string | null;
  address: string | null;
  command: string | null;
  carrierFrequency: number;
  rawSignal: number[];
  createdAt: string;
  updatedAt: string;
};

export type IRSignal = {
  carrierFrequency: number;
  raw: number[];
  protocol: string | null;
  address: string | null;
  command: string | null;
  timestamp: string;
};

export type SystemStatus = {
  version: string;
  irBackend: string;
  receiverAvailable: boolean;
  transmitterAvailable: boolean;
  learning: boolean;
  database: string;
  uptimeSeconds: number;
};
