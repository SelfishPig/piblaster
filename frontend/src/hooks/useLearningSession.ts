import { useCallback, useEffect, useRef, useState } from "react";
import { learnAPI } from "../api/learn";
import type { IRSignal } from "../types";

type Connection = "connecting" | "connected" | "disconnected";
type LearningEvent =
  | { type: "state"; active: boolean }
  | { type: "signal"; signal: IRSignal }
  | { type: "error"; message: string };

export function useLearningSession() {
  const [active, setActive] = useState(false);
  const [signal, setSignal] = useState<IRSignal | null>(null);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [error, setError] = useState<string | null>(null);
  const retry = useRef<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    const connect = () => {
      if (disposed) return;
      setConnection("connecting");
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/ws/learn`);
      socket.onopen = () => setConnection("connected");
      socket.onmessage = (message) => {
        const event = JSON.parse(message.data as string) as LearningEvent;
        if (event.type === "state") setActive(event.active);
        if (event.type === "signal") setSignal(event.signal);
        if (event.type === "error") setError(event.message);
      };
      socket.onclose = () => {
        setConnection("disconnected");
        if (!disposed) retry.current = window.setTimeout(connect, 1500);
      };
    };
    connect();
    void learnAPI.status().then((status) => setActive(status.active));
    return () => {
      disposed = true;
      if (retry.current !== null) window.clearTimeout(retry.current);
      socket?.close();
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setSignal(null);
    const status = await learnAPI.start();
    setActive(status.active);
  }, []);

  const stop = useCallback(async () => {
    const status = await learnAPI.stop();
    setActive(status.active);
  }, []);

  return { active, signal, setSignal, connection, error, start, stop };
}
