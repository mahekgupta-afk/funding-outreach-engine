import { z } from "zod";
import { generateJson } from "./gemini";
import type { Thesis } from "./thesis";
import type { Extraction } from "./extract";
import type { FitScore } from "./fit-score";

const DraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type Draft = z.infer<typeof DraftSchema>;

const SYSTEM_INSTRUCTION = `You write a short, personalised outreach email from an accelerator
to a startup that just raised a pre-seed or seed round. Rules:
- Under ~150 words, plain text, warm and specific — no hype, no exclamation-mark energy.
- Mention at least two concrete details unique to this startup: what it builds, a named
  investor from its round, the round size, or a specific detail from its website text.
- State briefly why this specific accelerator fits this specific startup, using the program
  pitch provided — do not invent accelerator details not given to you.
- End with one clear, low-friction next step (e.g. a short call).
- Never fabricate metrics, customer counts, or claims not present in the data given to you.
- The email must read as written for this one startup — it should not be reusable verbatim
  for a different company without edits.
- Do not include a greeting placeholder like "[Name]" — if no founder name is known, open
  with the company name instead (e.g. "Hi there," or address the team generally).
- Sign off with the sender's name and title as given.`;

function buildPrompt(thesis: Thesis, extraction: Extraction, fit: FitScore, websiteText: string): string {
  return `## Sender
Name: ${thesis.sender_name ?? "(unknown — omit a signature name if not given)"}
Title: ${thesis.sender_title ?? ""}
Accelerator: ${thesis.accelerator_name}
Program pitch: ${thesis.program_pitch ?? "(not provided — do not invent program details)"}

## Startup
Name: ${extraction.startup_name}
Stage: ${extraction.stage}
Amount raised: ${extraction.amount_raw ?? extraction.amount_usd ?? "unknown"}
Investors: ${extraction.investors.join(", ") || "unknown"}
Founders: ${extraction.founders.join(", ") || "unknown"}
Sector: ${extraction.sector ?? "unknown"}
One-line description: ${extraction.one_line_description}

## Why this startup fits (from our scoring)
${fit.reason}
Matched criteria: ${fit.matched_criteria.join(", ") || "(none listed)"}

## Startup website text (may be empty)
${websiteText || "(no website text available)"}

Write the outreach email now.`;
}

export async function draftEmail(
  thesis: Thesis,
  extraction: Extraction,
  fit: FitScore,
  websiteText: string
): Promise<Draft> {
  return generateJson({
    schema: DraftSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildPrompt(thesis, extraction, fit, websiteText),
  });
}
