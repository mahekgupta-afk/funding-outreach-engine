"use client";

import { useState } from "react";
import DraftCard from "@/components/DraftCard";
import type { DraftRow } from "@/lib/dashboard-data";

const TABS = [
  { key: "pending_review", label: "Pending review" },
  { key: "approved", label: "Approved" },
  { key: "sent", label: "Sent" },
  { key: "discarded", label: "Discarded" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function EmailTabs({ drafts }: { drafts: DraftRow[] }) {
  const [tab, setTab] = useState<TabKey>("pending_review");

  const counts = Object.fromEntries(
    TABS.map((t) => [t.key, drafts.filter((d) => d.status === t.key).length])
  ) as Record<TabKey, number>;

  const visible = drafts.filter((d) => d.status === tab);

  return (
    <div className="stack">
      <div className="row">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`button ${tab === t.key ? "buttonPrimary" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card emptyState">
          {tab === "pending_review"
            ? "No pending drafts right now. Check back after the next scheduled run, or trigger one from the Thesis page."
            : `No ${TABS.find((t) => t.key === tab)?.label.toLowerCase()} emails.`}
        </div>
      ) : (
        <div className="stack">
          {visible.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}
    </div>
  );
}
