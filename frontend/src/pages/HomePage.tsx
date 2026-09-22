import { PanelsTopLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { commandsAPI } from "../api/commands";
import { layoutsAPI } from "../api/layouts";
import { Card } from "../components/Card";
import { RemotePad } from "../components/RemotePad";
import { useToast } from "../hooks/useToast";
import type { Command, Layout } from "../types";

export function HomePage() {
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    let active = true;
    void Promise.all([layoutsAPI.list(), commandsAPI.list()])
      .then(([items, allCommands]) => {
        if (!active) return;
        setLayouts(items);
        setCommands(allCommands);
        setSelectedId(items[0]?.id ?? null);
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

  const layout = layouts.find((item) => item.id === selectedId);
  if (loading)
    return <p className="py-14 text-center opacity-60">Loading layouts...</p>;
  if (!layout) {
    return (
      <Card
        className="mx-auto max-w-lg"
        bodyClassName="items-center text-center"
      >
        <PanelsTopLeft className="size-10" />
        <h2 className="card-title">No layouts yet</h2>
        <p>
          Learn commands, then combine them into a layout.
        </p>
        <Link className="btn btn-primary" to="/layouts">
          Create a layout
        </Link>
      </Card>
    );
  }
  return (
    <RemotePad
      layout={layout}
      layouts={layouts}
      commands={commands}
      onLayoutChange={setSelectedId}
    />
  );
}
