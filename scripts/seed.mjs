import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  readFileSync(new URL("./serviceAccount.json", import.meta.url))
);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const ORG_ID = "ronnys";

async function seed() {
  await db.doc(`organizations/${ORG_ID}`).set({
    name: { en: "Ronnys Pizza", ka: "Ronnys Pizza" },
    logo: "", active: true, createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log("OK organization");

  await db.doc("settings/global").set({
    social: [
      { id: "facebook",  label: "Facebook",  href: "", enabled: true  },
      { id: "instagram", label: "Instagram", href: "", enabled: true  },
      { id: "tiktok",    label: "TikTok",    href: "", enabled: true  },
      { id: "x",         label: "X",         href: "", enabled: false },
    ],
    order:            { minOrder: 25, deliveryFee: 5.5, freeDeliveryThreshold: 60, maxToppings: 6, currency: "GEL" },
    loyalty:          { enabled: true, pointsPerGel: 1, redeemRate: 0.1, minRedeem: 100 },
    employeeDiscount: { enabled: true, value: 30, mode: "percent", appliesEverywhere: true },
    discountRules:    { stackable: false, excludeCombos: true, excludePromoProducts: true },
    discountVerification: "manual",
    tax:              { rate: 0, inclusive: true },
    updatedAt: FieldValue.serverTimestamp(), updatedBy: "seed",
  }, { merge: true });
  console.log("OK settings/global");

  console.log("Done.");
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
