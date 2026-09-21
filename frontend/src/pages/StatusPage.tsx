import {
  CheckCircle2,
  Clock3,
  CircleAlert,
  Cpu,
  Palette,
  RefreshCw,
  Server,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { systemAPI } from "../api/system";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { selectClass } from "../components/Field";
import { themeOptions, useTheme, type Theme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import type { SystemStatus } from "../types";

export function StatusPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const refresh = useCallback(
    async (confirm = false) => {
      try {
        setStatus(await systemAPI.status());
        if (confirm) showToast("System status refreshed", "success");
      } catch (reason) {
        showToast(
          reason instanceof Error ? reason.message : "Backend unavailable",
          "error",
        );
      }
    },
    [showToast],
  );
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          className="btn-square"
          aria-label="Refresh system status"
          variant="secondary"
          onClick={() => void refresh(true)}
        >
          <RefreshCw className="size-4" />
        </Button>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-center gap-3">
            <div className="avatar avatar-placeholder">
              <div className="w-10 rounded-full bg-primary text-primary-content">
                <Server className="size-5" />
              </div>
            </div>
            <div>
              <h2 className="card-title">System</h2>
              <p className="text-xs text-base-content/60">
                Live backend information
              </p>
            </div>
          </div>
          <dl className="list mt-5">
            <Row
              icon={Tag}
              label="Application version"
              value={status?.version ?? "—"}
            />
            <Row
              icon={Cpu}
              label="IR backend"
              value={status ? capitalize(status.irBackend) : "—"}
            />
            <HealthRow label="IR receiver" ok={status?.receiverAvailable} />
            <HealthRow
              label="IR transmitter"
              ok={status?.transmitterAvailable}
            />
            <HealthRow
              label="Learning"
              ok={status?.learning}
              activeLabel="Active"
              inactiveLabel="Inactive"
            />
            <HealthRow label="Database" ok={status?.database === "ok"} />
            <Row
              icon={Clock3}
              label="Backend uptime"
              value={status ? formatDuration(status.uptimeSeconds) : "—"}
            />
          </dl>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="avatar avatar-placeholder">
              <div className="w-10 rounded-full bg-secondary text-secondary-content">
                <Palette className="size-5" />
              </div>
            </div>
            <div>
              <h2 className="card-title">Appearance</h2>
              <p className="text-xs text-base-content/60">
                Stored only in this browser
              </p>
            </div>
          </div>
          <label className="fieldset mt-5 grid gap-2">
            <span className="fieldset-legend">Theme</span>
            <select
              className={selectClass}
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
            >
              <option value="system">Use system setting</option>
              {themeOptions.map((option) => (
                <option key={option} value={option}>
                  {themeLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 text-sm leading-6 text-base-content/60">
            System follows your operating system's light or dark preference.
            Named daisyUI themes are stored only in this browser.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="list-row items-center">
      <dt className="list-col-grow opacity-60">{label}</dt>
      <dd className="badge badge-ghost gap-1.5 font-semibold">
        <Icon className="size-3.5" />
        {value}
      </dd>
    </div>
  );
}

function HealthRow({
  label,
  ok,
  activeLabel = "Available",
  inactiveLabel = "Unavailable",
}: {
  label: string;
  ok?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="list-row items-center">
      <dt className="list-col-grow opacity-60">{label}</dt>
      <dd
        className={`badge gap-1.5 font-semibold ${ok ? "badge-success" : "badge-ghost"}`}
      >
        {ok ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <CircleAlert className="size-4" />
        )}
        {ok ? activeLabel : inactiveLabel}
      </dd>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function themeLabel(value: string) {
  if (value === "cmyk") return "CMYK";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function formatDuration(total: number) {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${total % 60}s`;
}
