"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PromoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rejected/${id}/promote`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 4 }}>
      <button className="button buttonPrimary" onClick={handleClick} disabled={loading}>
        {loading ? "Promoting…" : "Promote to draft"}
      </button>
      {error && (
        <span className="helperText" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
