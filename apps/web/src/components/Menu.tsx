import { type ReactNode, useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  /** What the button shows, e.g. "⋯" or an avatar letter. */
  trigger: ReactNode;
  /** Gets a close function, so an item can close the menu after acting. */
  children(close: () => void): ReactNode;
}

/** A small popover menu that closes on an outside click or Escape. */
export function Menu({ label, trigger, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="menu-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && <div className="menu-panel stack">{children(() => setOpen(false))}</div>}
    </div>
  );
}
