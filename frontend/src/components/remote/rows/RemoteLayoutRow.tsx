import { commandRole } from "../../../lib/commandRole";
import { controlFallback, layoutBlocks } from "../../../lib/remoteLayout";
import type { Command, RemoteLayoutBlock } from "../../../types";
import type { RemoteControl } from "../blocks/types";
import { ArrowPadRow } from "./ArrowPadRow";
import { ButtonRow } from "./ButtonRow";
import { RockerButtonsRow } from "./RockerButtonsRow";
import { VolumeChannelRow } from "./VolumeChannelRow";

export function RemoteLayoutRow({
  row,
  commandsById,
  onPress,
}: {
  row: RemoteLayoutBlock;
  commandsById: ReadonlyMap<number, Command>;
  onPress: (command: Command) => void;
}) {
  const buttons = layoutBlocks[row.type].roles.map(
    (_, index): RemoteControl => {
      const control = row.controls[index];
      const command =
        control?.commandId == null
          ? undefined
          : commandsById.get(control.commandId);
      const role = command
        ? commandRole(command)
        : (control?.icon ?? undefined);

      return {
        label:
          command?.buttonText ||
          control?.label ||
          command?.name ||
          controlFallback(role, index),
        buttonText: command?.buttonText,
        role,
        disabled: !command,
        onPress: () => {
          if (command) onPress(command);
        },
      };
    },
  );

  switch (row.type) {
    case "button-1":
      return <ButtonRow buttons={buttons} columns={1} />;
    case "button-2":
      return <ButtonRow buttons={buttons} columns={2} />;
    case "button-3":
      return <ButtonRow buttons={buttons} columns={3} />;
    case "arrow-wheel":
      return <ArrowPadRow buttons={buttons} />;
    case "volume-channel":
      return <VolumeChannelRow buttons={buttons} />;
    case "rocker-buttons":
      return <RockerButtonsRow buttons={buttons} />;
  }
}
