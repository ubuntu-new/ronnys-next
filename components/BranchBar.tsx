"use client";

import { useBranch } from "@/lib/branch";
import { useLang } from "@/lib/i18n";

/**
 * ფილიალის ამრჩევი.
 *
 * განზრახ არ ვბლოკავთ პირველ ვიზიტს მოდალით — არჩევანის გარეშე მთელი მენიუ ჩანს,
 * უბრალოდ მინიშნებით. ფილიალი checkout-ზე ხდება სავალდებულო.
 */
export default function BranchBar() {
  const { branches, branchId, setBranchId, ready } = useBranch();
  const { lang } = useLang();

  if (!ready || branches.length === 0) return null;

  const label = (b: { name: string; name_ka: string }) => (lang === "ka" ? b.name_ka : b.name);

  return (
    <div className={`branch-bar${branchId ? "" : " branch-bar-unset"}`}>
      <span className="branch-bar-label">
        {lang === "ka" ? "ფილიალი" : "Branch"}
      </span>

      <select
        className="branch-bar-select"
        value={branchId ?? ""}
        onChange={(e) => setBranchId(e.target.value || null)}
      >
        <option value="">{lang === "ka" ? "ყველა ფილიალი" : "All branches"}</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {label(b)}
          </option>
        ))}
      </select>

      {!branchId && (
        <span className="branch-bar-hint">
          {lang === "ka"
            ? "აირჩიე ფილიალი — დაინახავ, რა არის დღეს ხელმისაწვდომი"
            : "Pick a branch to see what's available today"}
        </span>
      )}
    </div>
  );
}
