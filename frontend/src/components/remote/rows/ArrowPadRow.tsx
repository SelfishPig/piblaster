import { RemoteArrowPad } from "../blocks/RemoteArrowPad";
import type { RemoteRowProps } from "./types";

export function ArrowPadRow({ buttons }: RemoteRowProps) {
  return (
    <RemoteArrowPad
      up={buttons[0]}
      right={buttons[1]}
      down={buttons[2]}
      left={buttons[3]}
      center={buttons[4]}
    />
  );
}
