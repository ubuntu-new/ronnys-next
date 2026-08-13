"use client";

import { useState } from "react";

/**
 * Contextual help — collapsed by default so it never gets in the way,
 * but always present for whoever needs it.
 *
 * Written as a component rather than static text so the same pattern
 * works on every screen and reads consistently.
 */
export default function HelpNote({
  title = "How this works",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="help-note">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">{open ? "▾" : "▸"}</span> {title}
      </button>
      {open && <div className="help-note-body">{children}</div>}
    </div>
  );
}
