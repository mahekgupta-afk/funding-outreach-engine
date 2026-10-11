"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DraftRow } from "@/lib/dashboard-data";
import { isSampleSource } from "@/lib/constants";

function formatAmount(amountUsd: number | null, currencyRaw: string | null): string {
  if (amountUsd == null) return currencyRaw || "Amount unknown";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountUsd);
  return currencyRaw && currencyRaw !== formatted ? `${formatted} (${currencyRaw})` : formatted;
}

export default function DraftCard({ draft }: { draft: DraftRow }) {
  const router = useRouter();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [toEmail, setToEmail] = useState(draft.to_email ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const startup = draft.startups;
  const sample = isSampleSource(startup?.source_url);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  async function patch(fields: Record<string, unknown>, label: string) {
    setSaving(label);
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      showToast(label === "save" ? "Saved" : `Marked ${fields.status}`);
      setDirty(false);
      if (fields.status && fields.status !== "pending_review") {
        router.refresh();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(null);
    }
  }

  function copyBody() {
    navigator.clipboard
      .writeText(body)
      .then(() => showToast("Copied email body"))
      .catch(() => showToast("Couldn't copy — select and copy manually"));
  }

  const mailtoHref = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong style={{ fontSize: "1.05rem" }}>{startup?.name}</strong>
          {startup?.stage && <span className="badge">{startup.stage}</span>}
          {startup?.fit_score != null && (
            <span className="badge badgeSuccess">fit {startup.fit_score}</span>
          )}
          {sample && <span className="badge sampleBadge">sample data</span>}
        </div>
        {startup?.source_url && !sample && (
          <a className="helperText" href={startup.source_url} target="_blank" rel="noreferrer">
            source ↗
          </a>
        )}
      </div>

      <div className="helperText">
        {formatAmount(startup?.amount_usd ?? null, startup?.currency_raw ?? null)}
        {startup?.investors?.length ? ` · ${startup.investors.join(", ")}` : ""}
        {startup?.geography ? ` · ${startup.geography}` : ""}
      </div>

      {startup?.fit_reason && <p className="helperText">{startup.fit_reason}</p>}

      <label className="label">
        To email (often unknown — fill in before sending)
        <input
          className="input"
          type="email"
          placeholder="founder@startup.com"
          value={toEmail}
          onChange={(e) => {
            setToEmail(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <label className="label">
        Subject
        <input
          className="input"
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <label className="label">
        Body
        <textarea
          className="textarea"
          rows={8}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
        />
      </label>

      <div className="row">
        {dirty && (
          <button
            className="button buttonPrimary"
            disabled={saving !== null}
            onClick={() => patch({ subject, body, to_email: toEmail || null }, "save")}
          >
            {saving === "save" ? "Saving…" : "Save changes"}
          </button>
        )}
        <button className="button" onClick={copyBody}>
          Copy email
        </button>
        <a className="button" href={mailtoHref}>
          Open in mail client
        </a>
        <button
          className="button"
          disabled={saving !== null}
          onClick={() => patch({ status: "approved" }, "approved")}
        >
          Mark approved
        </button>
        <button
          className="button buttonPrimary"
          disabled={saving !== null}
          onClick={() => patch({ status: "sent" }, "sent")}
        >
          Mark sent
        </button>
        <button
          className="button buttonDanger"
          disabled={saving !== null}
          onClick={() => patch({ status: "discarded" }, "discarded")}
        >
          Discard
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
