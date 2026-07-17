"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Pizza, Item, Combo } from "./data";
import type { ToppingsState } from "./pricing";

export interface AddedTopping { name: string; qty: number; zone: "whole" | "left" | "right"; }

export interface PizzaLine {
  kind: "pizza";
  pizzaId: number;
  sizeIdx: number;
  crustIdx: number;
  sauceIdx: number;
  toppings: ToppingsState;
  removed: Record<string, boolean>;
  added: AddedTopping[];
  removedList: string[];
  price: number;
  qty: number;
}

export interface SimpleLine {
  kind: "simple";
  itemId: string;
  name: string;
  price: number;
  detail: string;
  qty: number;
}

export interface HHLine {
  kind: "hh";
  leftId: number;
  rightId: number;
  sizeIdx: number;
  crustIdx: number;
  sauceIdx: number;
  toppings: ToppingsState;
  added: { name: string; qty: number; zone: "whole" | "left" | "right" }[];
  price: number;
  qty: number;
}

export type CartLine = PizzaLine | SimpleLine | HHLine;

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  cartOpen: boolean;
  customizerPizza: Pizza | null;
  editingIdx: number | null;
  hhOpen: boolean;
  hhInit: { leftId: number | null; rightId: number | null };
  editingHHIdx: number | null;
  stickItem: Item | null;
  checkoutOpen: boolean;
  comboItem: Combo | null;
  toast: string | null;
  openCart: () => void;
  closeCart: () => void;
  openCustomizer: (pizza: Pizza, editingIdx?: number | null) => void;
  closeCustomizer: () => void;
  openHH: (leftId?: number | null, rightId?: number | null, editingIdx?: number | null) => void;
  closeHH: () => void;
  openStick: (item: Item) => void;
  closeStick: () => void;
  openCombo: (combo: Combo) => void;
  closeCombo: () => void;
  openCheckout: () => void;
  closeCheckout: () => void;
  clearCart: () => void;
  commitPizza: (line: Omit<PizzaLine, "kind" | "qty">, editingIdx: number | null) => void;
  commitHH: (line: Omit<HHLine, "kind" | "qty">, editingIdx: number | null) => void;
  addSimple: (itemId: string, name: string, price: number) => void;
  addConfigured: (itemId: string, name: string, price: number, detail: string) => void;
  setQty: (idx: number, delta: number) => void;
  showToast: (msg: string) => void;
}

const Ctx = createContext<CartCtx | null>(null);

function pizzaMatchKey(l: PizzaLine): string {
  return JSON.stringify([l.pizzaId, l.sizeIdx, l.crustIdx, l.sauceIdx, l.toppings, l.removed]);
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customizerPizza, setCustomizerPizza] = useState<Pizza | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hhOpen, setHhOpen] = useState(false);
  const [hhInit, setHhInit] = useState<{ leftId: number | null; rightId: number | null }>({ leftId: null, rightId: null });
  const [editingHHIdx, setEditingHHIdx] = useState<number | null>(null);
  const [stickItem, setStickItem] = useState<Item | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [comboItem, setComboItem] = useState<Combo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaded = useRef(false);

  // Persist the cart so switching /en ⇄ /ka (or refreshing) keeps the order.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("ronnys-cart");
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem("ronnys-cart", JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const openCustomizer = useCallback((pizza: Pizza, idx: number | null = null) => {
    setCustomizerPizza(pizza);
    setEditingIdx(idx);
    setCartOpen(false);
  }, []);
  const closeCustomizer = useCallback(() => {
    setCustomizerPizza(null);
    setEditingIdx(null);
  }, []);

  const openHH = useCallback(
    (leftId: number | null = null, rightId: number | null = null, editIdx: number | null = null) => {
      setHhInit({ leftId, rightId });
      setEditingHHIdx(editIdx);
      setHhOpen(true);
      setCartOpen(false);
    },
    [],
  );
  const closeHH = useCallback(() => {
    setHhOpen(false);
    setEditingHHIdx(null);
  }, []);

  const commitHH = useCallback(
    (partial: Omit<HHLine, "kind" | "qty">, editIdx: number | null) => {
      const line: HHLine = { kind: "hh", qty: 1, ...partial };
      setLines((prev) => {
        if (editIdx !== null && editIdx !== undefined && prev[editIdx]) {
          const next = prev.slice();
          const keepQty = prev[editIdx].qty || 1;
          next[editIdx] = { ...line, qty: keepQty };
          return next;
        }
        const key = JSON.stringify([line.leftId, line.rightId, line.sizeIdx, line.crustIdx, line.sauceIdx, line.toppings]);
        const dup = prev.findIndex(
          (l) => l.kind === "hh" && JSON.stringify([l.leftId, l.rightId, l.sizeIdx, l.crustIdx, l.sauceIdx, l.toppings]) === key,
        );
        if (dup !== -1) {
          const next = prev.slice();
          next[dup] = { ...(next[dup] as HHLine), qty: (next[dup] as HHLine).qty + 1 };
          return next;
        }
        return [...prev, line];
      });
    },
    [],
  );

  const commitPizza = useCallback(
    (partial: Omit<PizzaLine, "kind" | "qty">, editIdx: number | null) => {
      const line: PizzaLine = { kind: "pizza", qty: 1, ...partial };
      setLines((prev) => {
        if (editIdx !== null && editIdx !== undefined && prev[editIdx]) {
          const next = prev.slice();
          const keepQty = (next[editIdx] as PizzaLine).qty || 1;
          next[editIdx] = { ...line, qty: keepQty };
          return next;
        }
        // stack identical configs
        const key = pizzaMatchKey(line);
        const dup = prev.findIndex((l) => l.kind === "pizza" && pizzaMatchKey(l) === key);
        if (dup !== -1) {
          const next = prev.slice();
          next[dup] = { ...(next[dup] as PizzaLine), qty: (next[dup] as PizzaLine).qty + 1 };
          return next;
        }
        return [...prev, line];
      });
    },
    [],
  );

  const addSimple = useCallback((itemId: string, name: string, price: number) => {
    setLines((prev) => {
      const dup = prev.findIndex((l) => l.kind === "simple" && l.itemId === itemId);
      if (dup !== -1) {
        const next = prev.slice();
        next[dup] = { ...(next[dup] as SimpleLine), qty: (next[dup] as SimpleLine).qty + 1, name };
        return next;
      }
      return [...prev, { kind: "simple", itemId, name, price, detail: "", qty: 1 }];
    });
  }, []);

  // A configured simple line (e.g. sticks + dips) stacks only on identical itemId keys.
  const addConfigured = useCallback((itemId: string, name: string, price: number, detail: string) => {
    setLines((prev) => {
      const dup = prev.findIndex((l) => l.kind === "simple" && l.itemId === itemId);
      if (dup !== -1) {
        const next = prev.slice();
        next[dup] = { ...(next[dup] as SimpleLine), qty: (next[dup] as SimpleLine).qty + 1 };
        return next;
      }
      return [...prev, { kind: "simple", itemId, name, price, detail, qty: 1 }];
    });
  }, []);

  const openStick = useCallback((item: Item) => {
    setStickItem(item);
    setCartOpen(false);
  }, []);
  const closeStick = useCallback(() => setStickItem(null), []);

  const openCombo = useCallback((combo: Combo) => {
    setComboItem(combo);
    setCartOpen(false);
  }, []);
  const closeCombo = useCallback(() => setComboItem(null), []);

  const openCheckout = useCallback(() => setCheckoutOpen(true), []);
  const closeCheckout = useCallback(() => setCheckoutOpen(false), []);
  const clearCart = useCallback(() => setLines([]), []);

  const setQty = useCallback((idx: number, delta: number) => {
    setLines((prev) => {
      const next = prev.slice();
      const l = next[idx];
      if (!l) return prev;
      const q = l.qty + delta;
      if (q <= 0) {
        next.splice(idx, 1);
      } else {
        next[idx] = { ...l, qty: q } as CartLine;
      }
      return next;
    });
  }, []);

  const count = useMemo(() => lines.reduce((n, l) => n + l.qty, 0), [lines]);
  const subtotal = useMemo(
    () => Math.round(lines.reduce((s, l) => s + l.price * l.qty, 0) * 100) / 100,
    [lines],
  );

  return (
    <Ctx.Provider
      value={{
        lines, count, subtotal,
        cartOpen, customizerPizza, editingIdx, toast,
        hhOpen, hhInit, editingHHIdx,
        stickItem, checkoutOpen,
        comboItem,
        openCart, closeCart, openCustomizer, closeCustomizer,
        openHH, closeHH, commitHH,
        openStick, closeStick, openCheckout, closeCheckout, clearCart,
        openCombo, closeCombo,
        commitPizza, addSimple, addConfigured, setQty, showToast,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
