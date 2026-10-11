"use client";

import { useEffect, useState } from "react";
import type { Thesis } from "@/lib/thesis";

function toCsv(arr: string[]): string {
  return arr.join(", ");
}

function fromCsv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ThesisForm({ thesis }: { thesis: Thesis }) {
  const [form, setForm] = useState({
    accelerator_name: thesis.accelerator_name,
    description: thesis.description,
    target_sectors: toCsv(thesis.target_sectors),
    excluded_sectors: toCsv(thesis.excluded_sectors),
    target_geographies: toCsv(thesis.target_geographies),
    stages: toCsv(thesis.stages),
    min_round_usd: thesis.min_round_usd?.toString() ?? "",
    max_round_usd: thesis.max_round_usd?.toString() ?? "",
    fit_threshold: thesis.fit_threshold.toString(),
    sender_name: thesis.sender_name ?? "",
    sender_title: thesis.sender_title ?? "",
    program_pitch: thesis.program_pitch ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Formatted client-side only: server/client locale or timezone can differ,
  // which would otherwise cause a hydration mismatch on this text.
  const [updatedAtLabel, setUpdatedAtLabel] = useState<string | null>(null);

  useEffect(() => {
    setUpdatedAtLabel(new Date(thesis.updated_at).toLocaleString());
  }, [thesis.updated_at]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/thesis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accelerator_name: form.accelerator_name,
          description: form.description,
          target_sectors: fromCsv(form.target_sectors),
          excluded_sectors: fromCsv(form.excluded_sectors),
          target_geographies: fromCsv(form.target_geographies),
          stages: fromCsv(form.stages),
          min_round_usd: form.min_round_usd ? Number(form.min_round_usd) : null,
          max_round_usd: form.max_round_usd ? Number(form.max_round_usd) : null,
          fit_threshold: Number(form.fit_threshold),
          sender_name: form.sender_name || null,
          sender_title: form.sender_title || null,
          program_pitch: form.program_pitch || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Save failed (${res.status})`);
      }
      setMessage("Saved. Future runs will use this thesis immediately — no redeploy needed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card stack" onSubmit={handleSubmit}>
      <label className="label">
        Accelerator name
        <input
          className="input"
          value={form.accelerator_name}
          onChange={(e) => set("accelerator_name", e.target.value)}
          required
        />
      </label>

      <label className="label">
        Thesis description (free text passed to the AI)
        <textarea
          className="textarea"
          rows={4}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          required
        />
      </label>

      <div className="formGrid">
        <label className="label">
          Target sectors (comma-separated)
          <input
            className="input"
            value={form.target_sectors}
            onChange={(e) => set("target_sectors", e.target.value)}
          />
        </label>
        <label className="label">
          Excluded sectors (comma-separated)
          <input
            className="input"
            value={form.excluded_sectors}
            onChange={(e) => set("excluded_sectors", e.target.value)}
          />
        </label>
        <label className="label">
          Target geographies (comma-separated)
          <input
            className="input"
            value={form.target_geographies}
            onChange={(e) => set("target_geographies", e.target.value)}
          />
        </label>
        <label className="label">
          Stages (comma-separated)
          <input
            className="input"
            value={form.stages}
            onChange={(e) => set("stages", e.target.value)}
          />
        </label>
        <label className="label">
          Min round (USD)
          <input
            className="input"
            type="number"
            value={form.min_round_usd}
            onChange={(e) => set("min_round_usd", e.target.value)}
          />
        </label>
        <label className="label">
          Max round (USD)
          <input
            className="input"
            type="number"
            value={form.max_round_usd}
            onChange={(e) => set("max_round_usd", e.target.value)}
          />
        </label>
        <label className="label">
          Fit threshold (0-100)
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={form.fit_threshold}
            onChange={(e) => set("fit_threshold", e.target.value)}
            required
          />
        </label>
      </div>

      <div className="formGrid">
        <label className="label">
          Sender name
          <input
            className="input"
            value={form.sender_name}
            onChange={(e) => set("sender_name", e.target.value)}
          />
        </label>
        <label className="label">
          Sender title
          <input
            className="input"
            value={form.sender_title}
            onChange={(e) => set("sender_title", e.target.value)}
          />
        </label>
      </div>

      <label className="label">
        Program pitch (used in drafts)
        <textarea
          className="textarea"
          rows={3}
          value={form.program_pitch}
          onChange={(e) => set("program_pitch", e.target.value)}
        />
      </label>

      <div className="row">
        <button className="button buttonPrimary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save thesis"}
        </button>
        <span className="helperText">Last updated {updatedAtLabel ?? "…"}</span>
      </div>

      {message && <p className="helperText">{message}</p>}
    </form>
  );
}
