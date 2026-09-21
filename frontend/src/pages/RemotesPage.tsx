import {
  Link2,
  Pencil,
  Play,
  Plus,
  Radio,
  RadioTower,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { commandsAPI } from "../api/commands";
import { remotesAPI } from "../api/remotes";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field, Input } from "../components/Field";
import { Modal } from "../components/Modal";
import { useToast } from "../hooks/useToast";
import type { Command, Remote } from "../types";

type PendingAction =
  | { kind: "rename-remote"; item: Remote }
  | { kind: "delete-remote"; item: Remote }
  | { kind: "rename-command"; item: Command }
  | { kind: "delete-command"; item: Command };

export function RemotesPage() {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [editName, setEditName] = useState("");
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const items = await remotesAPI.list();
    setRemotes(items);
    setSelectedId((current) => current ?? items[0]?.id ?? null);
  }, []);
  useEffect(() => {
    void load().catch((error: unknown) =>
      showToast(
        error instanceof Error ? error.message : "Could not load remotes",
        "error",
      ),
    );
  }, [load, showToast]);
  useEffect(() => {
    if (selectedId === null) {
      setCommands([]);
      return;
    }
    void commandsAPI
      .list(selectedId)
      .then(setCommands)
      .catch((error: unknown) =>
        showToast(
          error instanceof Error ? error.message : "Could not load commands",
          "error",
        ),
      );
  }, [selectedId, showToast]);

  const createRemote = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const remote = await remotesAPI.create({
        name,
        description: description || null,
      });
      setName("");
      setDescription("");
      await load();
      setSelectedId(remote.id);
      showToast(`${remote.name} created`, "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not create remote",
        "error",
      );
    }
  };
  const confirmPending = async () => {
    if (!pending) return;
    const action = pending;
    try {
      if (action.kind === "rename-remote") {
        await remotesAPI.update(action.item.id, { name: editName.trim() });
        await load();
        showToast(`${editName.trim()} renamed`, "success");
      } else if (action.kind === "delete-remote") {
        await remotesAPI.remove(action.item.id);
        setSelectedId(null);
        await load();
        showToast(`${action.item.name} deleted`, "success");
      } else if (action.kind === "rename-command") {
        const updated = await commandsAPI.update(action.item.id, {
          name: editName.trim(),
        });
        setCommands((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        showToast(`${editName.trim()} renamed`, "success");
      } else {
        await commandsAPI.remove(action.item.id);
        setCommands((items) =>
          items.filter((item) => item.id !== action.item.id),
        );
        showToast(`${action.item.name} deleted`, "success");
      }
      setPending(null);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Operation failed",
        "error",
      );
    }
  };

  const openRename = (action: PendingAction) => {
    setEditName(action.item.name);
    setPending(action);
  };

  const testCommand = (command: Command) => {
    void commandsAPI
      .send(command.id)
      .then(() => showToast(`${command.name} sent`, "success"))
      .catch((error: unknown) =>
        showToast(
          error instanceof Error ? error.message : "Could not send command",
          "error",
        ),
      );
  };

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <Card>
            <h2 className="card-title">Create remote</h2>
            <form
              className="mt-4 grid gap-3"
              onSubmit={(event) => void createRemote(event)}
            >
              <Field label="Name">
                <Input
                  value={name}
                  required
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Living Room TV"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Button
                className="btn-block"
                type="submit"
                disabled={!name.trim()}
              >
                <Plus className="size-4" /> Add remote
              </Button>
            </form>
          </Card>
          <Card bodyClassName="p-2">
            <ul className="menu w-full p-0">
              {remotes.map((remote) => (
                <li key={remote.id}>
                  <button
                    className={remote.id === selectedId ? "menu-active" : ""}
                    onClick={() => setSelectedId(remote.id)}
                  >
                    <RadioTower className="size-4" />
                    <span className="min-w-0 flex-1 truncate">
                      {remote.name}
                    </span>
                    <span className="badge badge-ghost badge-sm">
                      <Link2 className="size-3" />
                      {remote.slug}
                    </span>
                  </button>
                </li>
              ))}
              {remotes.length === 0 && (
                <li className="menu-disabled">
                  <span>No remotes created.</span>
                </li>
              )}
            </ul>
          </Card>
        </div>

        <Card>
          {selectedId !== null ? (
            <>
              {(() => {
                const selected = remotes.find(
                  (remote) => remote.id === selectedId,
                );
                return selected ? (
                  <div className="mb-5 flex items-start justify-between gap-4 border-b border-base-300 pb-5">
                    <div>
                      <h2 className="card-title">
                        {selected.name}
                        <span className="badge badge-neutral">
                          <Radio className="size-3.5" />
                          {commands.length}
                        </span>
                      </h2>
                      <p className="mt-1 text-sm text-base-content/60">
                        {selected.description ||
                          `Friendly URL: /api/send/${selected.slug}/{command}`}
                      </p>
                    </div>
                    <div className="card-actions">
                      <Button
                        className="btn-square"
                        aria-label="Rename remote"
                        variant="ghost"
                        onClick={() =>
                          openRename({ kind: "rename-remote", item: selected })
                        }
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        className="btn-square"
                        aria-label="Delete remote"
                        variant="danger"
                        onClick={() =>
                          setPending({ kind: "delete-remote", item: selected })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : null;
              })()}
              <div className="list gap-2">
                {commands.map((command) => (
                  <div key={command.id} className="list-row items-center">
                    <div className="list-col-grow min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {command.name}
                      </p>
                      <p className="truncate text-xs text-base-content/60">
                        {command.slug} · {command.protocol ?? "raw"} ·{" "}
                        {command.rawSignal.length} timings
                      </p>
                    </div>
                    <Button
                      className="btn-square"
                      aria-label={`Test ${command.name}`}
                      variant="ghost"
                      onClick={() => testCommand(command)}
                    >
                      <Play className="size-4" />
                    </Button>
                    <Button
                      className="btn-square"
                      aria-label={`Rename ${command.name}`}
                      variant="ghost"
                      onClick={() =>
                        openRename({ kind: "rename-command", item: command })
                      }
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      className="btn-square"
                      aria-label={`Delete ${command.name}`}
                      variant="danger"
                      onClick={() =>
                        setPending({ kind: "delete-command", item: command })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                {commands.length === 0 && (
                  <p className="py-10 text-center text-sm text-base-content/60">
                    No commands yet. Open Learn to capture one.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="py-14 text-center text-sm text-base-content/60">
              Select or create a remote.
            </p>
          )}
        </Card>
      </div>
      <Modal
        open={pending !== null}
        title={
          pending?.kind.startsWith("rename")
            ? `Rename ${pending.item.name}`
            : `Delete ${pending?.item.name ?? "item"}?`
        }
        onClose={() => setPending(null)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant={
                pending?.kind.startsWith("delete") ? "danger" : "primary"
              }
              disabled={pending?.kind.startsWith("rename") && !editName.trim()}
              onClick={() => void confirmPending()}
            >
              {pending?.kind.startsWith("delete") ? "Delete" : "Save"}
            </Button>
          </>
        }
      >
        {pending?.kind.startsWith("rename") ? (
          <Field label="Name">
            <Input
              autoFocus
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
            />
          </Field>
        ) : (
          <p>
            {pending?.kind === "delete-remote"
              ? "This also deletes every learned command on the remote."
              : "This learned command will be permanently deleted."}
          </p>
        )}
      </Modal>
    </div>
  );
}
