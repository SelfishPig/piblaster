import { RemoteButton } from "../blocks/RemoteButton";
import { RemoteRocker } from "../blocks/RemoteRocker";
import type { RemoteRowProps } from "./types";

export function RockerButtonsRow({ buttons }: RemoteRowProps) {
  return (
    <div className="grid grid-cols-2 items-center justify-items-center gap-4">
      <RemoteRocker label="Volume" up={buttons[0]} down={buttons[1]} />
      <div className="grid gap-3">
        <RemoteButton {...buttons[2]} />
        <RemoteButton {...buttons[3]} />
      </div>
    </div>
  );
}
