import { request } from "./client";
import type { IRSignal } from "../types";

export type LearningStatus = { active: boolean; receiverAvailable: boolean };

export const learnAPI = {
  status: () => request<LearningStatus>("/api/learn/status"),
  start: () => request<LearningStatus>("/api/learn/start", { method: "POST" }),
  stop: () => request<LearningStatus>("/api/learn/stop", { method: "POST" }),
  injectMock: () =>
    request<IRSignal>("/api/dev/mock-signal", { method: "POST" }),
};
