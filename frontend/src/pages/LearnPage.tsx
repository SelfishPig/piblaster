import {
  Radio,
  RadioTower,
  RotateCcw,
  Save,
  Send,
  Square,
  WandSparkles,
  Wifi,
  WifiOff,
  FlaskConical,
} from "lucide-react";
import { useEffect, useState } from "react";
import { commandsAPI } from "../api/commands";
import { learnAPI } from "../api/learn";
import { remotesAPI } from "../api/remotes";
import { systemAPI } from "../api/system";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Field, Input, selectClass } from "../components/Field";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { useLearningSession } from "../hooks/useLearningSession";
import { useToast } from "../hooks/useToast";
import { slugify } from "../lib/slug";
import type { Remote } from "../types";

export function LearnPage() {
  const session = useLearningSession();
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [remoteId, setRemoteId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newRemoteOpen, setNewRemoteOpen] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    void Promise.all([remotesAPI.list(), systemAPI.status()])
      .then(([items, status]) => {
        setRemotes(items);
        setRemoteId(items[0]?.id ?? null);
        setIsMock(status.irBackend === "mock");
      })
      .catch((reason: unknown) =>
        showToast(
          reason instanceof Error
            ? reason.message
            : "Could not load learning data",
          "error",
        ),
      );
  }, [showToast]);

  useEffect(() => {
    if (session.signal) setSaved(false);
  }, [session.signal]);

  useEffect(() => {
    if (session.error) showToast(session.error, "error");
  }, [session.error, showToast]);
  const updateName = (value: string) => {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  };
  const perform = async (
    operation: () => Promise<unknown>,
    success?: string,
  ): Promise<boolean> => {
    setBusy(true);
    try {
      await operation();
      if (success) showToast(success, "success");
      return true;
    } catch (reason) {
      showToast(
        reason instanceof Error ? reason.message : "Something went wrong",
        "error",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!session.signal || remoteId === null) return;
    const signal = session.signal;
    const saved = await perform(
      () =>
        commandsAPI.create(remoteId, {
          name,
          slug,
          protocol: signal.protocol,
          address: signal.address,
          command: signal.command,
          carrierFrequency: signal.carrierFrequency,
          rawSignal: signal.raw,
        }),
      `${name} saved`,
    );
    if (!saved) return;
    setSaved(true);
    session.setSignal(null);
    setName("");
    setSlug("");
    setSlugEdited(false);
  };
  const createRemote = async () => {
    const remoteName = newRemoteName.trim();
    if (!remoteName) return;
    const created = await perform(async () => {
      const remote = await remotesAPI.create({ name: remoteName });
      setRemotes((items) => [...items, remote]);
      setRemoteId(remote.id);
    }, `${remoteName} created`);
    if (created) {
      setNewRemoteOpen(false);
      setNewRemoteName("");
    }
  };

  return (
    <div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.8fr)]">
        <Card>
          <ul className="steps mb-6 w-full">
            <li className="step step-primary">Capture</li>
            <li className={`step ${session.signal ? "step-primary" : ""}`}>
              Review
            </li>
            <li className={`step ${saved ? "step-primary" : ""}`}>Save</li>
          </ul>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge
                ok={session.connection === "connected"}
                activeIcon={Wifi}
                inactiveIcon={WifiOff}
              >
                {`Socket ${session.connection}`}
              </StatusBadge>
              <StatusBadge
                ok={session.active}
                activeIcon={RadioTower}
                inactiveIcon={Radio}
              >
                {session.active ? "Learning active" : "Learning stopped"}
              </StatusBadge>
            </div>
            {isMock && (
              <span className="badge badge-secondary badge-soft">
                <FlaskConical className="size-3.5" />
                Mock tools enabled
              </span>
            )}
          </div>

          <Field label="Remote">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <select
                className={selectClass}
                value={remoteId ?? ""}
                onChange={(event) => setRemoteId(Number(event.target.value))}
              >
                {remotes.length === 0 && (
                  <option value="">Create a remote first</option>
                )}
                {remotes.map((remote) => (
                  <option key={remote.id} value={remote.id}>
                    {remote.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setNewRemoteOpen(true)}
              >
                New
              </Button>
            </div>
          </Field>

          <div className="mt-4 flex flex-wrap gap-2">
            {!session.active ? (
              <Button
                disabled={busy || remoteId === null}
                onClick={() => {
                  setSaved(false);
                  void perform(session.start);
                }}
              >
                <WandSparkles className="size-4" /> Start learning
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void perform(session.stop)}
              >
                <Square className="size-4" /> Stop
              </Button>
            )}
            {isMock && session.active && (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void perform(learnAPI.injectMock)}
              >
                <Radio className="size-4" /> Simulate signal
              </Button>
            )}
          </div>

          {!session.signal ? (
            <div className="hero mt-8 rounded-box bg-base-200 px-5 py-14 text-center">
              <Radio
                className={`mx-auto size-10 ${session.active ? "animate-pulse text-primary" : "text-base-content/40"}`}
              />
              <h2 className="mt-4 font-semibold">
                {session.active
                  ? "Waiting for an IR signal"
                  : "Ready when you are"}
              </h2>
              <p className="mt-1 text-sm text-base-content/60">
                {session.active
                  ? "Point the physical remote at the receiver and press a button."
                  : "Choose a remote and start learning."}
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Command name">
                  <Input
                    value={name}
                    onChange={(event) => updateName(event.target.value)}
                    placeholder="Volume Up"
                  />
                </Field>
                <Field label="Slug">
                  <Input
                    value={slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setSlug(slugify(event.target.value));
                    }}
                    placeholder="volume-up"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={busy}
                  variant="secondary"
                  onClick={() =>
                    void perform(
                      () => commandsAPI.testSignal(session.signal!),
                      "Test signal sent",
                    )
                  }
                >
                  <Send className="size-4" /> Test
                </Button>
                <Button
                  disabled={busy || !name.trim() || !slug}
                  onClick={() => void save()}
                >
                  <Save className="size-4" /> Save command
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    session.setSignal(null);
                    setSaved(false);
                  }}
                >
                  <RotateCcw className="size-4" /> Discard & learn again
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="card-title">Captured signal</h2>
          {session.signal ? (
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <SignalValue
                label="Protocol"
                value={session.signal.protocol ?? "Raw / unknown"}
              />
              <SignalValue
                label="Carrier"
                value={`${session.signal.carrierFrequency.toLocaleString()} Hz`}
              />
              <SignalValue
                label="Address"
                value={session.signal.address ?? "—"}
              />
              <SignalValue
                label="Command"
                value={session.signal.command ?? "—"}
              />
              <div className="col-span-2">
                <dt className="text-base-content/60">
                  Raw waveform · {session.signal.raw.length} timings
                </dt>
                <dd className="mockup-code mt-2 max-h-60 overflow-auto text-xs">
                  <pre data-prefix="$">
                    <code>{session.signal.raw.join(", ")}</code>
                  </pre>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-base-content/60">
              Decoded details and every raw pulse/space timing will appear here.
            </p>
          )}
        </Card>
      </div>
      <Modal
        open={newRemoteOpen}
        title="Create remote"
        onClose={() => setNewRemoteOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setNewRemoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newRemoteName.trim()}
              onClick={() => void createRemote()}
            >
              Create
            </Button>
          </>
        }
      >
        <Field label="Remote name">
          <Input
            autoFocus
            value={newRemoteName}
            onChange={(event) => setNewRemoteName(event.target.value)}
            placeholder="Living Room TV"
          />
        </Field>
      </Modal>
    </div>
  );
}

function SignalValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-base-content/60">{label}</dt>
      <dd className="mt-1 font-mono font-semibold">{value}</dd>
    </div>
  );
}
