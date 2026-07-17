import Link from "next/link";

// Root-level fallback. Because the root layout lives under app/[lang]/,
// this global not-found renders its own <html>/<body>.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#fff", color: "#2C2520" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "96px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 40 }}>404</h1>
          <p style={{ marginTop: 8, color: "#8A7E6F" }}>Page not found.</p>
          <p style={{ marginTop: 24 }}>
            <Link href="/" style={{ color: "#C8692E", fontWeight: 600 }}>← Back to Ronny&apos;s</Link>
          </p>
        </div>
      </body>
    </html>
  );
}
