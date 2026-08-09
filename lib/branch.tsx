"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface BranchInfo {
  id: string; // ბაზის id (br-avlabari)
  code: string;
  name: string;
  name_ka: string;
  address: string;
  address_ka: string;
}

/** რომელი პროდუქტები არ იყიდება რომელ ფილიალში. */
export interface AvailabilityMap {
  [branchId: string]: { pizzas: number[]; items: string[] };
}

interface Ctx {
  branches: BranchInfo[];
  branchId: string | null;
  branch: BranchInfo | null;
  setBranchId: (id: string | null) => void;
  ready: boolean;
}

const C = createContext<Ctx | null>(null);
const KEY = "ronnys-branch";

export function BranchProvider({
  branches,
  children,
}: {
  branches: BranchInfo[];
  children: ReactNode;
}) {
  const [branchId, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // არჩევანი რჩება რეფრეშსა და /en ⇄ /ka გადართვაზე
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved && branches.some((b) => b.id === saved)) setId(saved);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [branches]);

  const setBranchId = useCallback((id: string | null) => {
    setId(id);
    try {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const branch = useMemo(
    () => branches.find((b) => b.id === branchId) ?? null,
    [branches, branchId],
  );

  return (
    <C.Provider value={{ branches, branchId, branch, setBranchId, ready }}>{children}</C.Provider>
  );
}

export function useBranch() {
  const v = useContext(C);
  if (!v) throw new Error("useBranch: BranchProvider აკლია");
  return v;
}
