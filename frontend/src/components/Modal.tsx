import { useEffect, useRef, type ReactNode } from "react";

export function Modal({
  open,
  title,
  children,
  actions,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  actions: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) {
      dialog.current.showModal();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box">
        <h2 className="text-lg font-bold">{title}</h2>
        {children && <div className="py-4">{children}</div>}
        <div className="modal-action">{actions}</div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </form>
    </dialog>
  );
}
