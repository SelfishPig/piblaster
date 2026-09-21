import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ToastContext,
  type ToastContextValue,
  type ToastTone,
} from "./toast-context";

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

const badgeClasses: Record<ToastTone, string> = {
  success: "badge-success",
  error: "badge-error",
  info: "badge-info",
};

const icons = {
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = ++nextId.current;
      setItems((current) => [...current, { id, message, tone }]);
      const timer = window.setTimeout(
        () => dismiss(id),
        tone === "error" ? 6000 : 3500,
      );
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast toast-top toast-end z-50" aria-live="polite">
        {items.map((item) => {
          const Icon = icons[item.tone];
          return (
            <div
              key={item.id}
              role={item.tone === "error" ? "alert" : "status"}
              className={`badge badge-lg pointer-events-auto gap-2 ${badgeClasses[item.tone]}`}
            >
              <Icon className="size-5" />
              <span>{item.message}</span>
              <button
                type="button"
                className="btn btn-ghost btn-circle btn-xs"
                aria-label="Dismiss notification"
                onClick={() => dismiss(item.id)}
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
