import Link from "next/link";
import type { Step } from "@/lib/setup-checklist";

/**
 * Setup checklist — the software teaching the user what to do next.
 *
 * Blocking steps come first, then unfinished ones, then completed. That
 * ordering matters: a checklist that always shows step 1 at the top stops
 * being read once step 1 is done.
 */
export default function SetupChecklist({
  steps,
  done,
  total,
}: {
  steps: Step[];
  done: number;
  total: number;
}) {
  const sorted = [...steps].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
    return 0;
  });

  const complete = done === total;

  return (
    <div className="admin-panel">
      <h2>
        Getting started <span className="hint">· {done}/{total}</span>
      </h2>

      <div className="setup-progress">
        <div style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </div>

      {complete ? (
        <p className="hint" style={{ margin: 0 }}>
          Everything is set up. The numbers on this page are now based on real data.
        </p>
      ) : (
        <p className="hint" style={{ marginTop: -6, marginBottom: 4 }}>
          Each step explains what it unlocks. Red steps block a whole feature.
        </p>
      )}

      {sorted.map((s) => (
        <div className="setup-step" key={s.id}>
          <span
            className={`setup-mark ${
              s.done ? "setup-mark-done" : s.blocking ? "setup-mark-block" : "setup-mark-todo"
            }`}
          >
            {s.done ? "✓" : s.blocking ? "!" : "•"}
          </span>
          <div className="setup-step-body">
            <b style={s.done ? { color: "var(--a-muted)", fontWeight: 500 } : undefined}>{s.title}</b>
            <span>{s.done ? s.detail : s.why}</span>
            {!s.done && (
              <>
                {s.detail && (
                  <span style={{ display: "block" }}>
                    <i>{s.detail}</i>
                  </span>
                )}
                <Link href={s.href}>Open →</Link>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
