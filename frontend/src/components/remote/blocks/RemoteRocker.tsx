import { RemoteButton } from "./RemoteButton";
import type { RemoteControl } from "./types";

export function RemoteRocker({
  label,
  up,
  down,
}: {
  label: string;
  up: RemoteControl;
  down: RemoteControl;
}) {
  return (
    <div className="text-center">
      <span className="mb-1 block text-[10px] font-bold tracking-widest opacity-50 uppercase">
        {label}
      </span>
      <div className="join join-vertical shadow-md">
        <RemoteButton {...up} shape="default" className="join-item min-h-15" />
        <RemoteButton {...down} shape="default" className="join-item min-h-15" />
      </div>
    </div>
  );
}
