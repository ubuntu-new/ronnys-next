"use client";

import { LangProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import type { Lang } from "@/lib/data";
import AppViewport from "@/components/AppViewport";
import Header from "@/components/Header";
import TrustBar from "@/components/TrustBar";
import CatNav from "@/components/CatNav";
import MenuBody from "@/components/MenuBody";
import Customizer from "@/components/Customizer";
import HalfHalf from "@/components/HalfHalf";
import StickBuilder from "@/components/StickBuilder";
import ComboBuilder from "@/components/ComboBuilder";
import CartDrawer from "@/components/CartDrawer";
import Checkout from "@/components/Checkout";
import Toast from "@/components/Toast";

export default function ClientApp({ lang }: { lang: Lang }) {
  return (
    <LangProvider initialLang={lang}>
      <CartProvider>
        <AppViewport>
          <Header />
          <TrustBar />
          <CatNav />
          <MenuBody />
          <Customizer />
          <HalfHalf />
          <StickBuilder />
          <ComboBuilder />
          <CartDrawer />
          <Checkout />
          <Toast />
        </AppViewport>
      </CartProvider>
    </LangProvider>
  );
}
