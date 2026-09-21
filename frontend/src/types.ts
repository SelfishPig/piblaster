export type RemoteLayoutButton = {
  commandId: number | null;
  label?: string;
  icon?: string;
  size?: "normal" | "wide";
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

export type RemoteLayout = {
  version?: 2;
  rows?: RemoteLayoutBlock[];
  // Kept for remotes created by older versions of PiBlaster.
  buttons?: RemoteLayoutButton[];
};

export type Remote = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  layout: RemoteLayout | null;
  createdAt: string;
  updatedAt: string;
};

export type Command = {
  id: number;
  remoteId: number;
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
