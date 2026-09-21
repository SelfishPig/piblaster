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
import { RemoteLayoutEditor } from "../components/RemoteLayoutEditor";
import { useToast } from "../hooks/useToast";
import type { Command, Remote, RemoteLayoutBlock } from "../types";

type PendingAction =
  | { kind: "delete-remote"; item: Remote }
  | { kind: "rename-command"; item: Command }
  | { kind: "delete-command"; item: Command };

type EditorMode = "create" | "edit" | null;

export function RemotesPage() {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [commands, setCommands] = useState<Command[]>([]);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [editName, setEditName] = useState("");
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftRows, setDraftRows] = useState<RemoteLayoutBlock[]>([]);
  const [savingRemote, setSavingRemote] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const items = await remotesAPI.list();
    setRemotes(items);
    setSelectedId((current) =>
      current !== null && items.some((item) => item.id === current)
        ? current
        : (items[0]?.id ?? null),
    );
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

  const selected = remotes.find((remote) => remote.id === selectedId);

  const openCreate = () => {
    setDraftName("");
    setDraftDescription("");
    setDraftRows([]);
    setEditorMode("create");
  };

  const openEdit = (remote: Remote) => {
    setDraftName(remote.name);
    setDraftDescription(remote.description ?? "");
    setDraftRows(rowsForEditing(remote));
    setEditorMode("edit");
  };

  const saveRemote = async () => {
    if (!draftName.trim() || savingRemote) return;
    setSavingRemote(true);
    try {
      const data = {
        name: draftName.trim(),
        description: draftDescription.trim() || null,
        layout: { version: 2 as const, rows: draftRows },
      };
      const remote =
        editorMode === "edit" && selected
          ? await remotesAPI.update(selected.id, data)
          : await remotesAPI.create(data);
      const wasEditing = editorMode === "edit";
      setEditorMode(null);
      await load();
      setSelectedId(remote.id);
      showToast(
        `${remote.name} ${wasEditing ? "updated" : "created"}`,
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save remote",
        "error",
      );
    } finally {
      setSavingRemote(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const action = pending;
    try {
      if (action.kind === "delete-remote") {
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
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Remotes</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Create a remote, then arrange its controls into blocks.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add new remote
        </Button>
      </div>

      <Card bodyClassName="p-3">
        {remotes.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {remotes.map((remote) => (
              <button
                key={remote.id}
                className={`flex min-w-0 items-center gap-3 rounded-box border p-3 text-left transition-colors ${
                  remote.id === selectedId
                    ? "border-primary bg-primary/10"
                    : "border-base-300 hover:bg-base-200"
                }`}
                onClick={() => setSelectedId(remote.id)}
              >
                <RadioTower
                  className={`size-5 shrink-0 ${remote.id === selectedId ? "text-primary" : "text-base-content/50"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {remote.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-base-content/50">
                    <Link2 className="size-3" /> {remote.slug}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <button
            className="flex w-full flex-col items-center rounded-box border border-dashed border-base-300 py-9 text-base-content/60 hover:bg-base-200"
            onClick={openCreate}
          >
            <Plus className="mb-2 size-6" />
            <span className="text-sm font-semibold">
              Create your first remote
            </span>
          </button>
        )}
      </Card>

      <Card>
        {selected ? (
          <>
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
                <Button variant="secondary" onClick={() => openEdit(selected)}>
                  <Pencil className="size-4" /> Edit remote
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
                    onClick={() => {
                      setEditName(command.name);
                      setPending({ kind: "rename-command", item: command });
                    }}
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
                  No commands yet. Open Learn to capture one, then edit this
                  remote to assign it.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="py-14 text-center text-sm text-base-content/60">
            Add a remote to get started.
          </p>
        )}
      </Card>

      <Modal
        open={editorMode !== null}
        title={
          editorMode === "edit"
            ? `Edit ${selected?.name ?? "remote"}`
            : "Add remote"
        }
        onClose={() => setEditorMode(null)}
        boxClassName="max-h-[90dvh] w-11/12 max-w-5xl overflow-y-auto"
        actions={
          <>
            <Button variant="ghost" onClick={() => setEditorMode(null)}>
              Cancel
            </Button>
            <Button
              disabled={!draftName.trim() || savingRemote}
              onClick={() => void saveRemote()}
            >
              {savingRemote
                ? "Saving…"
                : editorMode === "edit"
                  ? "Save changes"
                  : "Create remote"}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="grid content-start gap-4">
            <Field label="Name">
              <Input
                autoFocus
                value={draftName}
                required
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Living Room TV"
              />
            </Field>
            <Field label="Description">
              <Input
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="Optional"
              />
            </Field>
            <div className="rounded-box bg-base-200 p-3 text-sm text-base-content/60">
              {commands.length > 0 && editorMode === "edit"
                ? "Choose a learned command for each control. Unassigned controls stay disabled on the remote."
                : editorMode === "create"
                  ? "Build the layout now. After learning commands, edit the remote again to assign them."
                  : "Learn commands for this remote, then return here to assign them."}
            </div>
          </div>
          <RemoteLayoutEditor
            rows={draftRows}
            commands={editorMode === "edit" ? commands : []}
            onChange={setDraftRows}
          />
        </div>
      </Modal>

      <Modal
        open={pending !== null}
        title={
          pending?.kind === "rename-command"
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
                pending?.kind === "rename-command" ? "primary" : "danger"
              }
              disabled={pending?.kind === "rename-command" && !editName.trim()}
              onClick={() => void confirmPending()}
            >
              {pending?.kind === "rename-command" ? "Save" : "Delete"}
            </Button>
          </>
        }
      >
        {pending?.kind === "rename-command" ? (
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

function rowsForEditing(remote: Remote): RemoteLayoutBlock[] {
  if (Array.isArray(remote.layout?.rows)) return remote.layout.rows;
  const buttons = remote.layout?.buttons ?? [];
  return buttons.map((button, index) => ({
    id: `legacy-${remote.id}-${index}`,
    type: "button-1",
    controls: [button],
  }));
}
