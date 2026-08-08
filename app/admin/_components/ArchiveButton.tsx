"use client";

import { useState, useTransition } from "react";

interface Props {
  action: () => Promise<void>;
  /** რა გადადის არქივში — სახელი */
  subject: string;
  /** კონკრეტული შედეგები ამ ჩანაწერისთვის (გვერდი ითვლის ბაზიდან) */
  consequences: string[];
  label?: string;
}

/**
 * არქივში გადატანა — ფიზიკური წაშლა არასდროს ხდება.
 * ღილაკი ხსნის პანელს, სადაც ყველა შედეგი ჩამოთვლილია, და მხოლოდ მერე ადასტურებ.
 */
export default function ArchiveButton({ action, subject, consequences, label = "არქივში გადატანა" }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: "var(--a-danger)", borderColor: "#f3d5d2" }}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      style={{
        border: "1px solid #f3d5d2",
        background: "#fffaf9",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
        არქივში გადავიდეს „{subject}“?
      </p>

      <p className="hint" style={{ margin: "0 0 8px" }}>
        რა მოხდება:
      </p>
      <ul style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 14, lineHeight: 1.7 }}>
        {consequences.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
        <li>
          <b>ბაზიდან არაფერი იშლება</b> — ჩანაწერი და მისი ისტორია რჩება.
        </li>
        <li>
          „არქივი“ გვერდიდან ნებისმიერ დროს დააბრუნებ — ჩართულობის სტატუსიც უცვლელი
          დაბრუნდება.
        </li>
      </ul>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          className="btn"
          disabled={pending}
          style={{ background: "var(--a-danger)" }}
          onClick={() => start(() => void action())}
        >
          {pending ? "მიმდინარეობს…" : "დიახ, არქივში"}
        </button>
        <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => setOpen(false)}>
          გაუქმება
        </button>
      </div>
    </div>
  );
}
