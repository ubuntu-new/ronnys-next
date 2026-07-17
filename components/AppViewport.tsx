"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";

// Replicates the v12 applyViewportClass + FAB behavior:
//   < 600px  → (no class)   600–999 → .medium   ≥1000 → .wide
export default function AppViewport({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cls, setCls] = useState("");
  const [showFab, setShowFab] = useState(false);
  const { customizerPizza, cartOpen, hhOpen, stickItem, checkoutOpen, comboItem } = useCart();
  const locked = !!customizerPizza || cartOpen || hhOpen || !!stickItem || checkoutOpen || !!comboItem;

  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      setCls(w >= 1000 ? "wide" : w >= 600 ? "medium" : "");
    };
    apply();
    let raf = 0;
    const onResize = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        apply();
      });
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (el) setShowFab(el.scrollTop > 180);
  };

  return (
    <div
      id="app"
      ref={ref}
      className={`app-viewport${cls ? " " + cls : ""}`}
      onScroll={onScroll}
      style={locked ? { overflow: "hidden" } : undefined}
    >
      {children}
      <button
        type="button"
        className={`fab-scroll-top${showFab ? " visible" : ""}`}
        aria-label="Back to top"
        onClick={() => ref.current?.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </div>
  );
}
