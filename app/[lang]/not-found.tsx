import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
      <h1 style={{ fontFamily: "var(--ff-display)", fontStyle: "italic", fontSize: 40, color: "var(--ink-1)" }}>404</h1>
      <p style={{ marginTop: 8, color: "var(--ink-3)" }}>That pizza isn&apos;t on the menu.</p>
      <p style={{ marginTop: 24 }}>
        <Link href="/" style={{ color: "var(--orange)", fontWeight: 600 }}>← Back to menu</Link>
      </p>
    </div>
  );
}
