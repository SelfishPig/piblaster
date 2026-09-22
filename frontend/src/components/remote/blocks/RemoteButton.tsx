import { getButtonRole } from "./ButtonRoles";
import type { RemoteControl } from "./types";

type RemoteButtonProps = RemoteControl & {
  shape?: "circle" | "default" | "square";
  size?: "lg" | "xl";
  className?: string;
};

const sizes = {
  lg: { button: "btn-lg", icon: "size-5" },
  xl: { button: "btn-xl", icon: "size-7" },
};
const shapes = { default: "", circle: "btn-circle", square: "btn-square" };

export function RemoteButton({
  label,
  buttonText,
  role,
  disabled,
  shape = "default",
  size = "lg",
  className = "",
  onPress,
}: RemoteButtonProps) {
  const { icon: Icon, className: roleClasses } = getButtonRole(role);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPress}
      aria-label={label}
      className={`tooltip btn touch-manipulation select-none ${sizes[size].button} ${shapes[shape]} ${roleClasses} ${className}`}
      data-tip={label}
    >
      {Icon && <Icon className={`${sizes[size].icon}`} />}
      {buttonText && (
        <span className="text-xs">
          {buttonText}
        </span>
      )}
    </button>
  );
}
