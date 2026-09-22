import { PanelsTopLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { layoutsAPI, type LayoutInput } from "../api/layouts";
import { commandsAPI } from "../api/commands";
import { remotesAPI } from "../api/remotes";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field, Input } from "../components/Field";
import { Modal } from "../components/Modal";
import { RemoteLayoutEditor } from "../components/RemoteLayoutEditor";
import { useToast } from "../hooks/useToast";
import type { Command, Layout, Remote } from "../types";

type Draft = LayoutInput & { id?: number };

export function LayoutsPage() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Layout | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    void Promise.all([layoutsAPI.list(), commandsAPI.list(), remotesAPI.list()])
      .then(([items, allCommands, groups]) => {
        if (!active) return;
        setLayouts(items);
        setCommands(allCommands);
        setRemotes(groups);
      })
      .catch((reason: unknown) => {
        if (active)
          showToast(
            reason instanceof Error ? reason.message : "Could not load layouts",
            "error",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [showToast]);

  const save = async () => {
    if (!draft?.name.trim() || busy) return;
    setBusy(true);
    try {
      const data = {
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        rows: draft.rows,
      };
      const layout =
        draft.id === undefined
          ? await layoutsAPI.create(data)
          : await layoutsAPI.update(draft.id, data);
      setLayouts((items) =>
        [...items.filter((item) => item.id !== layout.id), layout].sort(
          (a, b) => a.name.localeCompare(b.name),
        ),
      );
      setDraft(null);
      showToast(`${layout.name} saved`, "success");
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Could not save layout",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await layoutsAPI.remove(deleting.id);
      setLayouts((items) => items.filter((item) => item.id !== deleting.id));
      showToast(`${deleting.name} deleted`, "success");
      setDeleting(null);
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Could not delete layout",
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Layouts</h1>
          <p className="mt-1 text-sm text-base-content/60">
            Build controls using commands from any remote.
          </p>
        </div>
        <Button
          disabled={loading}
          onClick={() => setDraft({ name: "", description: "", rows: [] })}
        >
          <Plus className="size-4" /> Add layout
        </Button>
      </div>
      {loading ? (
        <p className="py-10 text-center opacity-60">Loading layouts…</p>
      ) : layouts.length === 0 ? (
        <Card bodyClassName="items-center py-14 text-center">
          <PanelsTopLeft className="size-10 opacity-40" />
          <h2 className="card-title">No layouts yet</h2>
          <p className="text-sm text-base-content/60">
            Add a layout, then arrange and assign its controls.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {layouts.map((layout) => (
            <Card key={layout.id}>
              <h2 className="card-title">{layout.name}</h2>
              {layout.description && (
                <p className="text-sm text-base-content/60">
                  {layout.description}
                </p>
              )}
              <p className="text-sm text-base-content/60">
                {layout.rows.length} rows ·{" "}
                {layout.rows.reduce(
                  (count, row) =>
                    count +
                    row.controls.filter((control) => control.commandId !== null)
                      .length,
                  0,
                )}{" "}
                assigned controls
              </p>
              <div className="card-actions justify-end mt-3">
                <Button
                  variant="secondary"
                  aria-label={`Edit ${layout.name}`}
                  onClick={() =>
                    setDraft({
                      id: layout.id,
                      name: layout.name,
                      description: layout.description,
                      rows: layout.rows,
                    })
                  }
                >
                  <Pencil className="size-4" /> Edit layout
                </Button>
                <Button
                  variant="danger"
                  className="btn-square"
                  aria-label={`Delete ${layout.name}`}
                  onClick={() => setDeleting(layout)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={draft !== null}
        title={draft?.id === undefined ? "Add layout" : `Edit ${draft.name}`}
        onClose={() => {
          if (!busy) setDraft(null);
        }}
        boxClassName="max-h-[90dvh] w-11/12 max-w-5xl overflow-y-auto"
        actions={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setDraft(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={busy || !draft?.name.trim()}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save layout"}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <Field label="Name">
                <Input
                  autoFocus
                  aria-label="Layout name"
                  value={draft.name}
                  maxLength={120}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Living Room"
                />
              </Field>
              <Field label="Description">
                <Input
                  value={draft.description ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  placeholder="Optional"
                />
              </Field>
              <p className="rounded-box bg-base-200 p-3 text-sm text-base-content/60">
                Choose commands from any remote. Unassigned controls stay
                disabled. Manage your commands on Learn.
              </p>
            </div>
            <RemoteLayoutEditor
              rows={draft.rows}
              commands={commands}
              remotes={remotes}
              onChange={(rows) => setDraft({ ...draft, rows })}
            />
          </div>
        )}
      </Modal>
      <Modal
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? "layout"}?`}
        onClose={() => {
          if (!busy) setDeleting(null);
        }}
        actions={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => void remove()}
            >
              Delete layout
            </Button>
          </>
        }
      >
        <p>
          This deletes the layout. Your remotes and learned commands will remain
          available.
        </p>
      </Modal>
    </div>
  );
}
