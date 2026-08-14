import type { Metadata, Viewport } from "next";
import "./driver.css";

export const metadata: Metadata = {
  title: "Ronny's — Driver",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1c1917",
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="drv-body">{children}</body>
    </html>
  );
}
