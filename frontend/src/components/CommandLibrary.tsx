import { Pencil, Play, Plus, RadioTower, Trash2 } from "lucide-react";
import { useState } from "react";
import { commandsAPI } from "../api/commands";
import { remotesAPI } from "../api/remotes";
import { useToast } from "../hooks/useToast";
import { slugify } from "../lib/slug";
import type { Command, CommandRole, Remote } from "../types";
import { Button } from "./Button";
import { Card } from "./Card";
import { CommandAppearanceFields } from "./CommandAppearanceFields";
import { Field, Input } from "./Field";
import { Modal } from "./Modal";

type Action =
  | { kind: "edit-command" | "delete-command"; item: Command }
  | { kind: "edit-remote" | "delete-remote"; item: Remote };

export function CommandLibrary({
  remotes,
  commands,
  loading,
  onAddRemote,
  onCommandUpdated,
  onCommandDeleted,
  onRemoteUpdated,
  onRemoteDeleted,
}: {
  remotes: Remote[];
  commands: Command[];
  loading: boolean;
  onAddRemote: () => void;
  onCommandUpdated: (command: Command) => void;
  onCommandDeleted: (id: number) => void;
  onRemoteUpdated: (remote: Remote) => void;
  onRemoteDeleted: (id: number) => void;
}) {
  const [action, setAction] = useState<Action | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<CommandRole | "auto">("auto");
  const [buttonText, setButtonText] = useState("");
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const editing =
    action?.kind === "edit-command" || action?.kind === "edit-remote";
  const normalizedSlug = slugify(slug);
  const invalidEdit = editing && (!name.trim() || !normalizedSlug);
  const groups = remotes.map((remote) => ({
    remote,
    commands: commands
      .filter((command) => command.remoteId === remote.id)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  const open = (next: Action) => {
    setName(next.item.name);
    setSlug(next.item.slug);
    if (next.kind === "edit-command") {
      setRole(next.item.role ?? "auto");
      setButtonText(next.item.buttonText ?? "");
    }
    if (next.kind === "edit-remote")
      setDescription(next.item.description ?? "");
    setAction(next);
  };
  const confirm = async () => {
    if (!action || busy || invalidEdit) return;
    setBusy(true);
    try {
      switch (action.kind) {
        case "edit-command": {
          const command = await commandsAPI.update(action.item.id, {
            name: name.trim(),
            slug: normalizedSlug,
            role: role === "auto" ? null : role,
            buttonText: buttonText.trim() || null,
          });
          onCommandUpdated(command);
          break;
        }
        case "delete-command":
          await commandsAPI.remove(action.item.id);
          onCommandDeleted(action.item.id);
          break;
        case "edit-remote": {
          const remote = await remotesAPI.update(action.item.id, {
            name: name.trim(),
            slug: normalizedSlug,
            description: description.trim() || null,
          });
          onRemoteUpdated(remote);
          break;
        }
        case "delete-remote":
          await remotesAPI.remove(action.item.id);
          onRemoteDeleted(action.item.id);
          break;
      }
      showToast(
        `${editing ? name.trim() : action.item.name} ${editing ? "updated" : "deleted"}`,
        "success",
      );
      setAction(null);
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Operation failed",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const run = async (command: Command) => {
    if (busy) return;
    setBusy(true);
    try {
      await commandsAPI.send(command.id);
      showToast(`${command.name} sent`, "success");
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Could not send command",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 grid gap-4" aria-label="Saved commands">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Saved commands</h2>
          <p className="mt-1 text-sm text-base-content/60">
            Organized by remote. Use these commands in any layout.
          </p>
        </div>
        <Button
          variant="secondary"
          disabled={loading || busy}
          onClick={onAddRemote}
        >
          <Plus className="size-4" /> Add remote
        </Button>
      </div>
      {loading ? (
        <p className="py-8 text-center opacity-60">Loading commands…</p>
      ) : groups.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-base-content/60">
            Create a remote above, then learn its first command.
          </p>
        </Card>
      ) : (
        groups.map(({ remote, commands: items }) => (
          <Card key={remote.id}>
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-base-300 pb-4">
              <div>
                <h3 className="card-title">
                  <RadioTower className="size-5" />
                  {remote.name}
                  <span className="badge badge-neutral">{items.length}</span>
                </h3>
                {remote.description && (
                  <p className="mt-1 text-sm text-base-content/60">
                    {remote.description}
                  </p>
                )}
                <p className="mt-1 text-xs text-base-content/50">
                  /api/send/{remote.slug}/&#123;command&#125;
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  className="btn-square"
                  variant="ghost"
                  disabled={busy}
                  aria-label={`Edit remote ${remote.name}`}
                  onClick={() => open({ kind: "edit-remote", item: remote })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  className="btn-square"
                  variant="danger"
                  disabled={busy}
                  aria-label={`Delete remote ${remote.name}`}
                  onClick={() => open({ kind: "delete-remote", item: remote })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="list gap-2">
              {items.map((command) => (
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
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Run ${remote.name}: ${command.name}`}
                    onClick={() => void run(command)}
                  >
                    <Play className="size-4" />
                  </Button>
                  <Button
                    className="btn-square"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Edit ${remote.name}: ${command.name}`}
                    onClick={() =>
                      open({ kind: "edit-command", item: command })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    className="btn-square"
                    variant="danger"
                    disabled={busy}
                    aria-label={`Delete ${remote.name}: ${command.name}`}
                    onClick={() =>
                      open({ kind: "delete-command", item: command })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {items.length === 0 && (
                <p className="py-6 text-center text-sm text-base-content/60">
                  No commands yet. Select this remote above to learn one.
                </p>
              )}
            </div>
          </Card>
        ))
      )}
      <Modal
        open={action !== null}
        title={`${editing ? "Edit" : "Delete"} ${action?.item.name ?? "command"}${editing ? "" : "?"}`}
        onClose={() => {
          if (!busy) setAction(null);
        }}
        actions={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant={editing ? "primary" : "danger"}
              disabled={busy || invalidEdit}
              onClick={() => void confirm()}
            >
              {busy ? "Saving…" : editing ? "Save" : "Delete"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4">
            <Field label="Name">
              <Input
                autoFocus
                aria-label={
                  action?.kind === "edit-command"
                    ? "Command name"
                    : "Remote name"
                }
                value={name}
                maxLength={120}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Slug">
              <Input
                aria-label="Slug"
                value={slug}
                maxLength={120}
                required
                onChange={(event) => setSlug(event.target.value)}
                onBlur={() => setSlug(normalizedSlug)}
              />
            </Field>
            {action?.kind === "edit-command" && (
              <CommandAppearanceFields
                role={role}
                buttonText={buttonText}
                slug={normalizedSlug}
                onRoleChange={setRole}
                onButtonTextChange={setButtonText}
              />
            )}
            {action?.kind === "edit-remote" && (
              <Field label="Description">
                <Input
                  value={description}
                  maxLength={1000}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            )}
          </div>
        ) : (
          <p>
            {action?.kind === "delete-remote"
              ? "This deletes the remote and all its learned commands. Their layout controls will become unassigned."
              : "This deletes the learned command and unassigns it from every layout."}
          </p>
        )}
      </Modal>
    </section>
  );
}
