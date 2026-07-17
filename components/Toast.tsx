"use client";

import { useCart } from "@/lib/cart";

export default function Toast() {
  const { toast } = useCart();
  if (!toast) return null;
  return (
    <div className="toast" style={{ position: "fixed" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{toast}</span>
    </div>
  );
}
