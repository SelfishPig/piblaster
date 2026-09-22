import { RemoteButton } from "../blocks/RemoteButton";
import { RemoteRocker } from "../blocks/RemoteRocker";
import type { RemoteRowProps } from "./types";

export function VolumeChannelRow({ buttons }: RemoteRowProps) {
  return (
    <div className="grid grid-cols-3 items-center justify-items-center gap-4">
      <RemoteRocker label="Volume" up={buttons[0]} down={buttons[1]} />
      <RemoteButton {...buttons[2]} size="xl" />
      <RemoteRocker label="Channel" up={buttons[3]} down={buttons[4]} />
    </div>
  );
}
