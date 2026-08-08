"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login } from "../actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/admin";
  const [error, action, pending] = useActionState(login, null);

  return (
    <div className="login-wrap">
      <form className="login-card" action={action}>
        <h1>
          Ronny&apos;s <span>Admin</span>
        </h1>
        <p className="sub">შედი სამუშაო ანგარიშით</p>

        {error && <div className="alert alert-error">{error}</div>}

        <input type="hidden" name="next" value={next} />

        <div className="admin-form">
          <div className="field">
            <label htmlFor="email">ელფოსტა</label>
            <input id="email" name="email" type="text" autoComplete="username" autoFocus required />
          </div>
          <div className="field">
            <label htmlFor="password">პაროლი</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn" type="submit" disabled={pending}>
            {pending ? "მოწმდება…" : "შესვლა"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
