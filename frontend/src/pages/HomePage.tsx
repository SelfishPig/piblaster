import { RadioTower } from "lucide-react";
import { useEffect, useState } from "react";
import { commandsAPI } from "../api/commands";
import { remotesAPI } from "../api/remotes";
import { Card } from "../components/Card";
import { RemotePad } from "../components/RemotePad";
import { useToast } from "../hooks/useToast";
import type { Command, Remote } from "../types";

export function HomePage() {
  const [remotes, setRemotes] = useState<Remote[]>([]);
  const [commands, setCommands] = useState<Record<number, Command[]>>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;

    void remotesAPI
      .list()
      .then(async (items) => {
        const entries = await Promise.all(
          items.map(
            async (remote) =>
              [remote.id, await commandsAPI.list(remote.id)] as const,
          ),
        );
        if (!active) return;
        setRemotes(items);
        setCommands(Object.fromEntries(entries));
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        showToast(
          reason instanceof Error ? reason.message : "Could not load remotes",
          "error",
        );
      });

    return () => {
      active = false;
    };
  }, [showToast]);

  const remote = remotes.find((item) => item.id === selectedId);

  if (!remote) {
    return (
      <Card
        className="mx-auto max-w-lg"
        bodyClassName="items-center py-14 text-center"
      >
        <RadioTower className="mx-auto size-10 text-base-content/40" />
        <h2 className="card-title mt-4">No remotes yet</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Create one in Remotes, then learn its first command.
        </p>
      </Card>
    );
  }

  return (
    <RemotePad
      remote={remote}
      remotes={remotes}
      commands={commands[remote.id] ?? []}
      onRemoteChange={setSelectedId}
    />
  );
}
