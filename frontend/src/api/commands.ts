import { request } from "./client";
import type { Command, IRSignal } from "../types";

export type CommandInput = {
  name: string;
  slug?: string;
  protocol?: string | null;
  address?: string | null;
  command?: string | null;
  carrierFrequency: number;
  rawSignal: number[];
};

export const commandsAPI = {
  list: (remoteId: number) =>
    request<Command[]>(`/api/remotes/${remoteId}/commands`),
  create: (remoteId: number, data: CommandInput) =>
    request<Command>(`/api/remotes/${remoteId}/commands`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<CommandInput>) =>
    request<Command>(`/api/commands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/api/commands/${id}`, { method: "DELETE" }),
  send: (id: number) =>
    request<{ sent: boolean }>(`/api/commands/${id}/send`, { method: "POST" }),
  testSignal: (signal: IRSignal) =>
    request<{ sent: boolean }>("/api/learn/test", {
      method: "POST",
      body: JSON.stringify(signal),
    }),
};
