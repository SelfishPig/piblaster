import { request } from "./client";
import type { Layout, RemoteLayoutBlock } from "../types";

export type LayoutInput = {
  name: string;
  description?: string | null;
  rows: RemoteLayoutBlock[];
};

export const layoutsAPI = {
  list: () => request<Layout[]>("/api/layouts"),
  create: (data: LayoutInput) =>
    request<Layout>("/api/layouts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<LayoutInput>) =>
    request<Layout>(`/api/layouts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  remove: (id: number) =>
    request<void>(`/api/layouts/${id}`, { method: "DELETE" }),
};
