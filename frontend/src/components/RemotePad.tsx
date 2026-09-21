import { Tv } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { commandsAPI } from "../api/commands";
import { commandRole } from "../lib/commandRole";
import { controlFallback } from "../lib/remoteLayout";
import type {
  Command,
  Remote,
  RemoteLayoutBlock,
  RemoteLayoutButton,
} from "../types";
import { RemoteButton } from "./RemoteButton";

const mainRoles = new Set([
  "power",
  "volume-up",
  "volume-down",
  "mute",
  "channel-up",
  "channel-down",
  "up",
  "down",
  "left",
  "right",
  "ok",
  "back",
  "home",
  "menu",
  "input",
]);

type ControlOptions = {
  className?: string;
  shape?: "circle" | "default" | "pill" | "square";
  size?: "sm" | "md" | "lg" | "xl" | "dpad";
  tone?: "default" | "primary" | "error" | "ghost";
  wide?: boolean;
};

export function RemotePad({
  remote,
  remotes,
  commands,
  onRemoteChange,
}: {
  remote: Remote;
  remotes: Remote[];
  commands: Command[];
  onRemoteChange: (id: number) => void;
}) {
  const [ledOn, setLedOn] = useState(false);
  const ledTimer = useRef<number | null>(null);
  const byRole = useMemo(
    () =>
      new Map(commands.map((command) => [commandRole(command.slug), command])),
    [commands],
  );
  const byId = useMemo(
    () => new Map(commands.map((command) => [command.id, command])),
    [commands],
  );

  useEffect(
    () => () => {
      if (ledTimer.current !== null) window.clearTimeout(ledTimer.current);
    },
    [],
  );

  const send = (command?: Command) => {
    if (!command) return;
    setLedOn(true);
    if (ledTimer.current !== null) window.clearTimeout(ledTimer.current);
    ledTimer.current = window.setTimeout(() => setLedOn(false), 260);
    void commandsAPI.send(command.id).catch(() => undefined);
  };
  const control = (
    role: string,
    fallback: string,
    options: ControlOptions = {},
  ) => {
    const command = byRole.get(role);
    return (
      <RemoteButton
        key={role}
        role={role}
        label={command?.name ?? fallback}
        disabled={!command}
        onPress={() => send(command)}
        {...options}
      />
    );
  };
  const others = commands.filter(
    (command) => !mainRoles.has(commandRole(command.slug)),
  );
  const legacyLayout = remote.layout?.buttons?.length
    ? remote.layout.buttons
    : null;
  const customRows = Array.isArray(remote.layout?.rows)
    ? remote.layout.rows
    : null;

  return (
    <div className="card mx-auto min-h-[44rem] w-full max-w-sm bg-neutral text-neutral-content shadow-2xl">
      <div className="card-body gap-0 px-5 py-6 sm:px-7 sm:py-8">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span
            className={`status status-error ${ledOn ? "animate-ping" : "opacity-40"}`}
            aria-hidden="true"
          />
          <span className="text-[10px] font-bold tracking-[0.18em] opacity-50 uppercase">
            {ledOn ? "Transmitting" : "IR ready"}
          </span>
          <span className="sr-only" role="status" aria-live="polite">
            {ledOn ? "Transmitting" : "Ready"}
          </span>
        </div>
        <div
          className={`grid items-center gap-3 ${
            customRows
              ? "mx-auto w-full max-w-64 grid-cols-1"
              : "grid-cols-[auto_minmax(0,1fr)_auto]"
          }`}
        >
          {!customRows &&
            control("input", "Input", { size: "lg", tone: "ghost" })}
          <label className="select select-primary h-12 min-w-0 w-full">
            <Tv className="size-5 shrink-0" />
            <select
              aria-label="Choose remote"
              value={remote.id}
              onChange={(event) => onRemoteChange(Number(event.target.value))}
            >
              {remotes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {!customRows &&
            control("power", "Power", { size: "lg", tone: "ghost" })}
        </div>

        {customRows ? (
          <div className="mt-9 grid gap-7">
            {customRows.map((row) => (
              <LayoutBlock key={row.id} row={row} byId={byId} onPress={send} />
            ))}
            {customRows.length === 0 && (
              <p className="py-16 text-center text-sm opacity-50">
                This remote does not have any controls yet.
              </p>
            )}
          </div>
        ) : legacyLayout ? (
          <div className="mt-12 grid grid-cols-3 justify-items-center gap-5">
            {legacyLayout.map((button, index) => {
              const command =
                button.commandId === null
                  ? undefined
                  : byId.get(button.commandId);
              return (
                <RemoteButton
                  key={`${button.commandId}-${button.label ?? index}`}
                  label={button.label ?? command?.name ?? "Unavailable"}
                  role={button.icon ?? commandRole(command?.slug ?? "")}
                  disabled={!command}
                  wide={button.size === "wide"}
                  size="lg"
                  onPress={() => send(command)}
                />
              );
            })}
          </div>
        ) : (
          <>
            <div className="relative mx-auto mt-14 aspect-square w-full max-w-80 rounded-full bg-neutral-content/15 shadow-inner">
              {control("up", "Up", {
                size: "xl",
                tone: "ghost",
                className: "absolute top-4 left-1/2 -translate-x-1/2",
              })}
              {control("right", "Right", {
                size: "xl",
                tone: "ghost",
                className: "absolute top-1/2 right-4 -translate-y-1/2",
              })}
              {control("down", "Down", {
                size: "xl",
                tone: "ghost",
                className: "absolute bottom-4 left-1/2 -translate-x-1/2",
              })}
              {control("left", "Left", {
                size: "xl",
                tone: "ghost",
                className: "absolute top-1/2 left-4 -translate-y-1/2",
              })}
              {control("ok", "OK", {
                size: "dpad",
                tone: "default",
                className:
                  "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xl",
              })}
            </div>

            <div className="mt-14 grid grid-cols-3 items-center justify-items-center gap-3">
              {control("back", "Back", { size: "xl" })}
              {control("home", "Home", { shape: "pill", size: "xl" })}
              {control("menu", "Menu", { size: "xl" })}
            </div>

            <div className="mt-10 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
              {control("mute", "Mute", { size: "xl" })}
              <div className="grid gap-4">
                <ControlBar label="Volume">
                  {control("volume-down", "Volume down", {
                    shape: "default",
                    size: "xl",
                    className: "join-item flex-1",
                  })}
                  {control("volume-up", "Volume up", {
                    shape: "default",
                    size: "xl",
                    className: "join-item flex-1",
                  })}
                </ControlBar>
                <ControlBar label="Channel">
                  {control("channel-down", "Channel down", {
                    shape: "default",
                    size: "lg",
                    className: "join-item flex-1",
                  })}
                  {control("channel-up", "Channel up", {
                    shape: "default",
                    size: "lg",
                    className: "join-item flex-1",
                  })}
                </ControlBar>
              </div>
            </div>

            {others.length > 0 && (
              <div className="mt-8 grid grid-cols-4 justify-items-center gap-3">
                {others.map((command) => (
                  <RemoteButton
                    key={command.id}
                    label={command.name}
                    role={commandRole(command.slug)}
                    size="lg"
                    onPress={() => send(command)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LayoutBlock({
  row,
  byId,
  onPress,
}: {
  row: RemoteLayoutBlock;
  byId: Map<number, Command>;
  onPress: (command?: Command) => void;
}) {
  const button = (
    control: RemoteLayoutButton | undefined,
    index: number,
    options: ControlOptions = {},
  ) => {
    const command =
      control?.commandId === null || control?.commandId === undefined
        ? undefined
        : byId.get(control.commandId);
    const role =
      control?.icon && control.icon !== "custom"
        ? control.icon
        : commandRole(command?.slug ?? "");
    return (
      <RemoteButton
        key={index}
        label={control?.label ?? command?.name ?? controlFallback(role, index)}
        role={role}
        disabled={!command}
        size="lg"
        onPress={() => onPress(command)}
        {...options}
      />
    );
  };

  if (row.type.startsWith("button-")) {
    const columns = Number(row.type.slice(-1));
    return (
      <div
        className="grid items-center justify-items-center gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {row.controls.map((control, index) =>
          button(control, index, {
            shape: columns === 1 ? "pill" : "circle",
            className: columns === 1 ? "w-full" : "",
          }),
        )}
      </div>
    );
  }

  if (row.type === "arrow-wheel") {
    return (
      <div className="relative mx-auto aspect-square w-full max-w-72 rounded-full bg-neutral-content/15 shadow-inner">
        {button(row.controls[0], 0, {
          size: "xl",
          tone: "ghost",
          className: "absolute top-3 left-1/2 -translate-x-1/2",
        })}
        {button(row.controls[1], 1, {
          size: "xl",
          tone: "ghost",
          className: "absolute top-1/2 right-3 -translate-y-1/2",
        })}
        {button(row.controls[2], 2, {
          size: "xl",
          tone: "ghost",
          className: "absolute bottom-3 left-1/2 -translate-x-1/2",
        })}
        {button(row.controls[3], 3, {
          size: "xl",
          tone: "ghost",
          className: "absolute top-1/2 left-3 -translate-y-1/2",
        })}
        {button(row.controls[4], 4, {
          size: "dpad",
          className:
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xl",
        })}
      </div>
    );
  }

  if (row.type === "volume-channel") {
    return (
      <div className="grid grid-cols-3 items-center justify-items-center gap-4">
        <VerticalRocker label="Volume">
          {button(row.controls[0], 0, {
            shape: "default",
            className: "join-item",
          })}
          {button(row.controls[1], 1, {
            shape: "default",
            className: "join-item",
          })}
        </VerticalRocker>
        {button(row.controls[2], 2, { size: "xl" })}
        <VerticalRocker label="Channel">
          {button(row.controls[3], 3, {
            shape: "default",
            className: "join-item",
          })}
          {button(row.controls[4], 4, {
            shape: "default",
            className: "join-item",
          })}
        </VerticalRocker>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 items-center justify-items-center gap-5">
      <VerticalRocker label="Volume">
        {button(row.controls[0], 0, {
          shape: "default",
          className: "join-item",
        })}
        {button(row.controls[1], 1, {
          shape: "default",
          className: "join-item",
        })}
      </VerticalRocker>
      <div className="grid gap-3">
        {button(row.controls[2], 2, { shape: "circle" })}
        {button(row.controls[3], 3, { shape: "circle" })}
      </div>
    </div>
  );
}

function VerticalRocker({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="text-center">
      <span className="mb-1 block text-[10px] font-bold tracking-widest opacity-50 uppercase">
        {label}
      </span>
      <div className="join join-vertical shadow-md">{children}</div>
    </div>
  );
}

function ControlBar({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-bold tracking-widest opacity-50 uppercase">
        {label}
      </span>
      <div className="join flex w-full shadow-md">{children}</div>
    </div>
  );
}
