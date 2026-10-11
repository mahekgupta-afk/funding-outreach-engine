import { z } from "zod";
import { generateJson } from "./gemini";
import type { Thesis } from "./thesis";
import type { Extraction } from "./extract";

const FitScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(),
  matched_criteria: z.array(z.string()),
  red_flags: z.array(z.string()),
});

export type FitScore = z.infer<typeof FitScoreSchema>;

const SYSTEM_INSTRUCTION = `You score how well a startup fits a specific accelerator's
investment thesis, from 0 (no fit) to 100 (ideal fit). Rules:
- Score strictly against the thesis provided in this prompt. Do not use outside knowledge
  of what a "good startup" looks like in general.
- Heavily penalise (score well below the threshold) any startup in one of the thesis's
  excluded sectors, even if everything else matches.
- Treat missing or unknown data (e.g. no geography found, no website text) as uncertainty,
  not as a match — do not give credit for criteria you cannot verify.
- "matched_criteria" should list the specific thesis criteria this startup satisfies.
- "red_flags" should list any concerns, including excluded-sector hits or missing data
  that makes the fit uncertain.
- "reason" is a 2-3 sentence plain-language rationale a human can quickly read.`;

function buildPrompt(thesis: Thesis, extraction: Extraction, websiteText: string): string {
  return `## Accelerator thesis
Name: ${thesis.accelerator_name}
Description: ${thesis.description}
Target sectors: ${thesis.target_sectors.join(", ") || "(none specified)"}
Excluded sectors: ${thesis.excluded_sectors.join(", ") || "(none specified)"}
Target geographies: ${thesis.target_geographies.join(", ") || "(none specified)"}
Target stages: ${thesis.stages.join(", ")}
Round size range: ${thesis.min_round_usd ?? "(no min)"} - ${thesis.max_round_usd ?? "(no max)"} USD

## Startup (extracted from a funding announcement)
Name: ${extraction.startup_name}
Stage: ${extraction.stage}
Amount: ${extraction.amount_usd ?? "unknown"} USD (raw: ${extraction.amount_raw ?? "unknown"})
Sector: ${extraction.sector ?? "unknown"}
Geography: ${extraction.geography ?? "unknown"}
Investors: ${extraction.investors.join(", ") || "unknown"}
Founders: ${extraction.founders.join(", ") || "unknown"}
Description: ${extraction.one_line_description}

## Startup website text (may be empty if the site couldn't be reached)
${websiteText || "(no website text available)"}

Score this startup's fit against the thesis above.`;
}

export async function scoreFit(
  thesis: Thesis,
  extraction: Extraction,
  websiteText: string
): Promise<FitScore> {
  return generateJson({
    schema: FitScoreSchema,
    systemInstruction: SYSTEM_INSTRUCTION,
    prompt: buildPrompt(thesis, extraction, websiteText),
  });
}
