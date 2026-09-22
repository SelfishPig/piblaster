import { request } from "./client";
import type { Remote } from "../types";

export type RemoteInput = {
  name: string;
  slug?: string;
  description?: string | null;
};

export const remotesAPI = {
  list: () => request<Remote[]>("/api/remotes"),
  create: (data: RemoteInput) =>
    request<Remote>("/api/remotes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<RemoteInput>) =>
    request<Remote>(`/api/remotes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/api/remotes/${id}`, { method: "DELETE" }),
};
