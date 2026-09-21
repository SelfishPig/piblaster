export type RemoteLayoutButton = {
  commandId: number;
  label?: string;
  icon?: string;
  size?: "normal" | "wide";
};

export type RemoteLayout = {
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
