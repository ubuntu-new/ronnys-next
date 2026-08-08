"use client";

import { useRef, useState } from "react";

interface Props {
  name: string;
  label?: string;
  defaultValue?: string | null;
  hint?: string;
}

/** ფოტოს ველი: ატვირთვა ფაილიდან ან URL-ის ჩასმა. მნიშვნელობა hidden input-ში ჯდება. */
export default function ImageField({ name, label = "ფოტო", defaultValue, hint }: Props) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ატვირთვა ვერ მოხერხდა");
      setUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ატვირთვა ვერ მოხერხდა");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="field">
      <label>{label}</label>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div
          style={{
            width: 92,
            height: 92,
            flex: "0 0 92px",
            border: "1px solid var(--a-line)",
            borderRadius: 8,
            background: "#f5f5f4",
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
          }}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <span className="hint">ცარიელი</span>
          )}
        </div>

        <div style={{ flex: 1, display: "grid", gap: 8 }}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://… ან ატვირთე ფაილი"
          />
          <input type="hidden" name={name} value={url} />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "იტვირთება…" : "ფაილის ატვირთვა"}
            </button>
            {url && (
              <button type="button" className="btn btn-ghost" onClick={() => setUrl("")}>
                მოცილება
              </button>
            )}
          </div>

          {error && <span style={{ color: "var(--a-danger)", fontSize: 13 }}>{error}</span>}
          {hint && <span className="hint">{hint}</span>}
          <span className="hint">JPG · PNG · WebP · AVIF · GIF, მაქს. 5 MB</span>
        </div>
      </div>
    </div>
  );
}
