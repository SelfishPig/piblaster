import {
  ArrowDown,
  ArrowUp,
  CirclePlus,
  GripVertical,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import {
  blockLabel,
  controlFallback,
  createLayoutBlock,
  layoutBlockOptions,
} from "../lib/remoteLayout";
import type {
  Command,
  RemoteLayoutBlock,
  RemoteLayoutBlockType,
} from "../types";
import { Button } from "./Button";

export function RemoteLayoutEditor({
  rows,
  commands,
  onChange,
}: {
  rows: RemoteLayoutBlock[];
  commands: Command[];
  onChange: (rows: RemoteLayoutBlock[]) => void;
}) {
  const [addType, setAddType] = useState<RemoteLayoutBlockType>("button-1");

  const addBlock = () => {
    onChange([...rows, createLayoutBlock(addType, commands)]);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= rows.length) return;
    const next = [...rows];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };

  const updateCommand = (
    blockIndex: number,
    controlIndex: number,
    value: string,
  ) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === blockIndex
          ? {
              ...row,
              controls: row.controls.map((control, itemIndex) =>
                itemIndex === controlIndex
                  ? { ...control, commandId: value ? Number(value) : null }
                  : control,
              ),
            }
          : row,
      ),
    );
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-box border border-base-300 bg-base-200/60 p-3">
        <p className="mb-2 text-sm font-semibold">Add a block</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="select min-w-0 flex-1"
            aria-label="Block type"
            value={addType}
            onChange={(event) =>
              setAddType(event.target.value as RemoteLayoutBlockType)
            }
          >
            {layoutBlockOptions.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
          <Button type="button" onClick={addBlock}>
            <CirclePlus className="size-4" /> Add block
          </Button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-[2rem] bg-neutral px-4 pt-5 pb-6 text-neutral-content shadow-xl">
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="status status-error" aria-hidden="true" />
          <span className="text-[10px] font-bold tracking-[0.18em] opacity-60 uppercase">
            IR activity
          </span>
        </div>

        <div className="grid gap-3">
          {rows.map((row, rowIndex) => (
            <div
              key={row.id}
              className="rounded-box border border-neutral-content/15 bg-neutral-content/5 p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <GripVertical className="size-4 opacity-40" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {blockLabel(row.type)}
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label={`Move ${blockLabel(row.type)} up`}
                  disabled={rowIndex === 0}
                  onClick={() => moveBlock(rowIndex, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label={`Move ${blockLabel(row.type)} down`}
                  disabled={rowIndex === rows.length - 1}
                  onClick={() => moveBlock(rowIndex, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square text-error"
                  aria-label={`Remove ${blockLabel(row.type)}`}
                  onClick={() =>
                    onChange(rows.filter((_, index) => index !== rowIndex))
                  }
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <ControlGrid type={row.type}>
                {row.controls.map((control, controlIndex) => (
                  <label
                    key={`${row.id}-${controlIndex}`}
                    className="grid min-w-0 gap-1"
                  >
                    <span className="truncate text-[10px] font-bold tracking-wide opacity-60 uppercase">
                      {controlFallback(control.icon, controlIndex)}
                    </span>
                    <select
                      className="select select-sm w-full bg-neutral text-neutral-content"
                      aria-label={`${blockLabel(row.type)} ${controlFallback(control.icon, controlIndex)}`}
                      value={control.commandId ?? ""}
                      onChange={(event) =>
                        updateCommand(
                          rowIndex,
                          controlIndex,
                          event.target.value,
                        )
                      }
                    >
                      <option value="">Unassigned</option>
                      {commands.map((command) => (
                        <option key={command.id} value={command.id}>
                          {command.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </ControlGrid>
            </div>
          ))}
          {rows.length === 0 && (
            <div className="rounded-box border border-dashed border-neutral-content/25 px-6 py-12 text-center">
              <p className="font-semibold">Your remote is empty</p>
              <p className="mt-1 text-sm opacity-60">
                Add a block above to start building the layout.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlGrid({
  type,
  children,
}: {
  type: RemoteLayoutBlockType;
  children: React.ReactNode;
}) {
  const classes =
    type === "button-1"
      ? "grid-cols-1"
      : type === "button-2"
        ? "grid-cols-2"
        : type === "button-3"
          ? "grid-cols-3"
          : type === "arrow-wheel"
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2";
  return <div className={`grid gap-2 ${classes}`}>{children}</div>;
}
