import { getButtonRole } from "./ButtonRoles";
import type { RemoteControl } from "./types";

const positions = {
  up: "top-3 left-1/2 -translate-x-1/2",
  right: "top-1/2 right-3 -translate-y-1/2",
  down: "bottom-3 left-1/2 -translate-x-1/2",
  left: "top-1/2 left-3 -translate-y-1/2",
  center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-xl",
};

type Direction = keyof typeof positions;

export function RemoteArrowPad(controls: Record<Direction, RemoteControl>) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-65 rounded-full bg-neutral-content/15 shadow-inner">
      {(Object.keys(positions) as Direction[]).map((direction) => {
        const control = controls[direction];
        const { icon: Icon, className: roleClasses } = getButtonRole(
          control.role,
        );
        const center = direction === "center";
        return (
          <button
            key={direction}
            type="button"
            disabled={control.disabled}
            onClick={control.onPress}
            aria-label={control.label}
            data-tip={control.label}
            className={`tooltip btn btn-circle absolute touch-manipulation select-none ${positions[direction]} ${center ? `[--size:6.5rem] ${roleClasses}` : "btn-xl btn-ghost"} ${control.buttonText ? "flex-col gap-0.5 px-1" : ""}`}
          >
            {Icon && (
              <Icon className={`${center ? "size-8" : "size-5"} shrink-0`} />
            )}
            {control.buttonText && (
              <span className="block max-w-full truncate text-xs leading-tight">
                {control.buttonText}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
