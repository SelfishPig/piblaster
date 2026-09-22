import { useEffect, useMemo, useRef, useState } from "react";
import { commandsAPI } from "../api/commands";
import type { Command, Layout } from "../types";
import { RemoteLayoutRow } from "./remote/rows/RemoteLayoutRow";

export function RemotePad({
  layout,
  layouts,
  commands,
  onLayoutChange,
}: {
  layout: Layout;
  layouts: Layout[];
  commands: Command[];
  onLayoutChange: (id: number) => void;
}) {
  const [ledOn, setLedOn] = useState(false);
  const ledTimer = useRef<number | null>(null);
  const commandsById = useMemo(
    () => new Map(commands.map((command) => [command.id, command])),
    [commands],
  );

  useEffect(
    () => () => {
      if (ledTimer.current !== null) window.clearTimeout(ledTimer.current);
    },
    [],
  );

  const send = (command: Command) => {
    setLedOn(true);
    if (ledTimer.current !== null) window.clearTimeout(ledTimer.current);
    ledTimer.current = window.setTimeout(() => setLedOn(false), 260);
    void commandsAPI.send(command.id).catch(() => undefined);
  };
  const rows = layout.rows;

  return (
    <div className="card mx-auto w-full max-w-sm bg-neutral/70 text-neutral-content shadow-xl shadow-base-300 border border-base-300">
      <div className="card-body gap-6">
        <div
            className={`status ${ledOn ? "status-error" : "opacity-40"} size-4 absolute top-0 left-1/2`}
            aria-hidden="true"
        />
        <select
            aria-label="Choose layout"
            className="select w-full"
            value={layout.id}
            onChange={(event) => onLayoutChange(Number(event.target.value))}
          >
            {layouts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        <div className="grid gap-6">
          {rows.map((row) => (
            <RemoteLayoutRow
              key={row.id}
              row={row}
              commandsById={commandsById}
              onPress={send}
            />
          ))}
          {rows.length === 0 && (
            <p className="py-16 text-center text-sm opacity-50">
              This layout does not have any controls yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
