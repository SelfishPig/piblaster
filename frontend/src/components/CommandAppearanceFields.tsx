import { inferCommandRole } from "../lib/commandRole";
import { buttonRoles, buttonRoleOptions } from "./remote/blocks/ButtonRoles";
import type { CommandRole } from "../types";
import { Field, Input, selectClass } from "./Field";

export function CommandAppearanceFields({
  role,
  buttonText,
  slug,
  onRoleChange,
  onButtonTextChange,
}: {
  role: CommandRole | "auto";
  buttonText: string;
  slug: string;
  onRoleChange: (role: CommandRole | "auto") => void;
  onButtonTextChange: (text: string) => void;
}) {
  return (
    <>
      <Field label="Button role">
        <select
          className={selectClass}
          aria-label="Button role"
          value={role}
          onChange={(event) =>
            onRoleChange(event.target.value as CommandRole | "auto")
          }
        >
          <option value="auto">
            Automatic — {buttonRoles[inferCommandRole(slug)].label}
          </option>
          {buttonRoleOptions.map((option) => (
            <option key={option.role} value={option.role}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-sm text-base-content/60">
          Sets the button icon. Choose No role for a button without an icon.
        </p>
      </Field>
      <Field label="Button text (optional)">
        <Input
          aria-label="Button text"
          value={buttonText}
          onChange={(event) => onButtonTextChange(event.target.value)}
          maxLength={120}
          placeholder="e.g. Netflix"
        />
        <p className="text-sm text-base-content/60">
          Shown on the button alongside its icon, if any.
        </p>
      </Field>
    </>
  );
}
