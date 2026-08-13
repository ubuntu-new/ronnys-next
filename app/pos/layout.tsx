import type { Metadata, Viewport } from "next";
import "./pos.css";

export const metadata: Metadata = {
  title: "Ronny's — POS",
  robots: { index: false, follow: false },
};

/** A till is a fixed screen: no zoom, no accidental pinch mid-order. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pos-body">{children}</body>
    </html>
  );
}
