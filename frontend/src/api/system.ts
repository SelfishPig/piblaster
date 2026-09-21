import { request } from "./client";
import type { SystemStatus } from "../types";

export const systemAPI = {
  status: () => request<SystemStatus>("/api/system/status"),
};
