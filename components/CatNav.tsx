"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

const TABS: { key: string; target: string }[] = [
  { key: "nav_combos", target: "section-combos" },
  { key: "nav_pizza", target: "section-pizza" },
  { key: "nav_extras", target: "section-extras" },
  { key: "nav_drinks", target: "section-drinks" },
  { key: "nav_about", target: "section-about" },
];

export default function CatNav() {
  const { t } = useLang();
  const [active, setActive] = useState("section-pizza");

  const go = (target: string) => {
    setActive(target);
    document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="cat-nav">
      {TABS.map((tab) => (
        <button
          key={tab.target}
          className={`cat-tab${active === tab.target ? " active" : ""}`}
          onClick={() => go(tab.target)}
        >
          <span>{t(tab.key)}</span>
        </button>
      ))}
    </nav>
  );
}
