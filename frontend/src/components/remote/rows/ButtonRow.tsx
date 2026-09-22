import { RemoteButton } from "../blocks/RemoteButton";
import type { RemoteRowProps } from "./types";

export function ButtonRow({
  buttons,
  columns,
}: RemoteRowProps & { columns: 1 | 2 | 3 }) {
  return (
    <div
      className="grid items-center justify-items-center gap-5"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {buttons.map((button, index) => (
        <RemoteButton
          key={index}
          {...button}
          shape="default"
          className="w-full"
        />
      ))}
    </div>
  );
}
